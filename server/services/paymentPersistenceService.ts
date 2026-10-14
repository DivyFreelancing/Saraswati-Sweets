import { randomUUID } from 'crypto';
import {
  inMemoryStore,
  ServerOrder,
  ServerPayment,
  isLiveSupabase,
  supabaseServer,
  findOrderInSupabase,
} from '../db';
import { notifyOrderPlaced } from './notificationService';

let testClientOverride: any = undefined;
let testIsLiveOverride: boolean | undefined = undefined;

export function _setTestSupabaseClient(client: any, isLive?: boolean) {
  testClientOverride = client;
  testIsLiveOverride = isLive;
}

function getActiveClient() {
  return testClientOverride !== undefined ? testClientOverride : supabaseServer;
}

function getActiveIsLive() {
  return testIsLiveOverride !== undefined ? testIsLiveOverride : isLiveSupabase;
}

export interface ConfirmPaymentParams {
  orderIdOrProviderId: string;
  providerOrderId: string;
  providerPaymentId?: string;
  paymentAmount?: number;
  amountUnit?: 'RUPEES' | 'PAISE';
  currency?: string;
  paymentMethod?: string;
  paidAt?: string;
  eventId?: string;
  eventType?: string;
  rawPayload?: any;
  source: 'WEBHOOK' | 'VERIFY' | 'STATUS_POLL' | 'CLEANUP_RECONCILE';
}

export interface ConfirmPaymentResult {
  success: boolean;
  alreadyProcessed: boolean;
  order?: ServerOrder;
  error?: string;
  errorCode?: string;
}

// In-flight mutex to serialize simultaneous requests for the same order in Node.js
const inFlightSettlements = new Map<string, Promise<ConfirmPaymentResult>>();

/**
 * Checks whether a webhook event has already been successfully processed.
 * Checks persistent Supabase `webhook_events` table first, with in-memory fallback.
 * Failed/incomplete events return false so they remain fully retryable.
 */
export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  if (!eventId) return false;

  // Fast-path in-memory check
  if (inMemoryStore.processedWebhookEvents.has(eventId)) {
    return true;
  }

  // Persistent database check: only 'PROCESSED' events short-circuit
  const isLive = getActiveIsLive();
  const client = getActiveClient();
  if (isLive && client) {
    try {
      const { data, error } = await client
        .from('webhook_events')
        .select('status')
        .eq('event_id', eventId)
        .maybeSingle();

      if (!error && data && data.status === 'PROCESSED') {
        inMemoryStore.processedWebhookEvents.add(eventId);
        return true;
      }
    } catch (err: any) {
      console.warn(`[WebhookIdempotency] Failed to query webhook_events table: ${err.message}`);
    }
  }

  return false;
}

/**
 * Centrally validates and persists payment confirmation across all payment flows:
 * - Cashfree Webhook (PAYMENT_SUCCESS_WEBHOOK)
 * - Frontend Redirect Verification (/api/payments/verify)
 * - Status Polling (/api/checkout/order-status/:orderId)
 * - Background Unpaid-Orders Reconciliation (expireUnpaidOrders)
 */
export async function confirmOrderPayment(params: ConfirmPaymentParams): Promise<ConfirmPaymentResult> {
  const lockKey = (params.providerOrderId || params.orderIdOrProviderId || '').trim();

  if (lockKey && inFlightSettlements.has(lockKey)) {
    console.log(`[PaymentPersistence] In-flight settlement in progress for ${lockKey}. Awaiting existing settlement.`);
    const settledResult = await inFlightSettlements.get(lockKey)!;
    return {
      ...settledResult,
      alreadyProcessed: settledResult.success ? true : settledResult.alreadyProcessed,
    };
  }

  const settlementPromise = executeConfirmOrderPayment(params);
  if (lockKey) {
    inFlightSettlements.set(lockKey, settlementPromise);
  }

  try {
    return await settlementPromise;
  } finally {
    if (lockKey) {
      inFlightSettlements.delete(lockKey);
    }
  }
}

async function executeConfirmOrderPayment(params: ConfirmPaymentParams): Promise<ConfirmPaymentResult> {
  const {
    orderIdOrProviderId,
    providerOrderId,
    providerPaymentId,
    paymentAmount,
    amountUnit = 'RUPEES',
    currency,
    paymentMethod = 'ONLINE',
    paidAt,
    eventId,
    eventType = 'PAYMENT_SUCCESS',
    rawPayload,
    source,
  } = params;

  const nowIso = new Date().toISOString();
  const paidAtIso = paidAt || nowIso;

  // 1. Strict Currency Validation (INR only)
  if (!currency || currency.trim().toUpperCase() !== 'INR') {
    console.error(`[PaymentPersistence] Currency mismatch for order '${orderIdOrProviderId}': expected INR, got '${currency}'`);
    return {
      success: false,
      alreadyProcessed: false,
      error: `Invalid or missing currency: expected INR, received '${currency}'`,
      errorCode: 'CURRENCY_MISMATCH',
    };
  }

  // 2. Strict Order Resolution (Explicit UUID, order_number, or provider_order_id ONLY)
  let order: ServerOrder | undefined = undefined;
  let resolvedByInternal = false;

  if (orderIdOrProviderId) {
    order = inMemoryStore.orders.get(orderIdOrProviderId);
    if (!order) {
      order = Array.from(inMemoryStore.orders.values()).find(
        (o) => o.id === orderIdOrProviderId || o.order_number === orderIdOrProviderId
      );
    }
    if (order) resolvedByInternal = true;
  }

  // If not found by internal ID, look up strictly by provider_order_id
  if (!order && providerOrderId) {
    order = Array.from(inMemoryStore.orders.values()).find(
      (o) => o.provider_order_id === providerOrderId
    );
  }

  // Database fallback if not in memory
  const isLive = getActiveIsLive();
  const client = getActiveClient();
  if (!order && isLive && client) {
    if (orderIdOrProviderId) {
      const { order: dbOrder, error: dbErr } = await findOrderInSupabase(orderIdOrProviderId);
      if (dbErr) {
        console.error(`[PaymentPersistence] Error fetching order from DB by orderIdOrProviderId: ${dbErr.message}`);
        return {
          success: false,
          alreadyProcessed: false,
          error: `Database lookup failure: ${dbErr.message}`,
          errorCode: 'DB_LOOKUP_ERROR',
        };
      }
      if (dbOrder) {
        order = dbOrder;
        resolvedByInternal = true;
      }
    }
    if (!order && providerOrderId) {
      const { order: dbOrderByProv, error: dbProvErr } = await findOrderInSupabase(providerOrderId);
      if (dbProvErr) {
        console.error(`[PaymentPersistence] Error fetching order from DB by providerOrderId: ${dbProvErr.message}`);
        return {
          success: false,
          alreadyProcessed: false,
          error: `Database lookup failure: ${dbProvErr.message}`,
          errorCode: 'DB_LOOKUP_ERROR',
        };
      }
      if (dbOrderByProv) order = dbOrderByProv;
    }
  }

  if (!order) {
    console.error(`[PaymentPersistence] ORDER_NOT_FOUND for identifier '${orderIdOrProviderId}' (source: ${source})`);
    if (eventId && isLiveSupabase && supabaseServer) {
      supabaseServer
        .from('webhook_events')
        .upsert(
          {
            event_id: eventId,
            event_type: eventType,
            provider: 'CASHFREE',
            provider_order_id: providerOrderId,
            status: 'FAILED',
            error_message: `Order '${orderIdOrProviderId}' not found`,
            updated_at: nowIso,
          },
          { onConflict: 'event_id' }
        )
        .then(() => {}, () => {});
    }
    return {
      success: false,
      alreadyProcessed: false,
      error: `Order not found for identifier ${orderIdOrProviderId}`,
      errorCode: 'ORDER_NOT_FOUND',
    };
  }

  // 3. Strict Payment Method Validation (Reject COD immediately)
  if (order.payment_method === 'COD' || (paymentMethod && paymentMethod.toUpperCase() === 'COD')) {
    console.error(`[PaymentPersistence] Cannot settle COD order #${order.order_number} via online settlement`);
    return {
      success: false,
      alreadyProcessed: false,
      error: 'COD orders cannot be settled via online gateway settlement',
      errorCode: 'INVALID_PAYMENT_METHOD',
    };
  }

  // 4. Conflict & Strict Mapping Checks
  // A. Check if order's existing provider_order_id conflicts with incoming providerOrderId
  if (order.provider_order_id && providerOrderId && order.provider_order_id !== providerOrderId) {
    console.error(
      `[PaymentPersistence] Provider order ID mismatch for order #${order.order_number}: expected '${order.provider_order_id}', received '${providerOrderId}'`
    );
    return {
      success: false,
      alreadyProcessed: false,
      error: `Order is linked to provider order '${order.provider_order_id}', cannot settle with '${providerOrderId}'`,
      errorCode: 'PROVIDER_ORDER_MISMATCH',
    };
  }

  // B. Check if incoming providerOrderId is already linked to a DIFFERENT order
  if (providerOrderId) {
    const conflictingMemOrder = Array.from(inMemoryStore.orders.values()).find(
      (o) => o.provider_order_id === providerOrderId && o.id !== order!.id
    );
    if (conflictingMemOrder) {
      console.error(
        `[PaymentPersistence] Provider order ID '${providerOrderId}' is already linked to order #${conflictingMemOrder.order_number}`
      );
      return {
        success: false,
        alreadyProcessed: false,
        error: `Provider order '${providerOrderId}' is already assigned to a different order`,
        errorCode: 'PROVIDER_ORDER_ALREADY_LINKED',
      };
    }

    if (isLiveSupabase && supabaseServer) {
      try {
        const { data: conflictingDbOrder } = await supabaseServer
          .from('orders')
          .select('id, order_number')
          .eq('order_number', providerOrderId)
          .neq('id', order.id)
          .maybeSingle();

        if (conflictingDbOrder) {
          console.error(
            `[PaymentPersistence] Provider order ID '${providerOrderId}' is already linked to DB order #${conflictingDbOrder.order_number}`
          );
          return {
            success: false,
            alreadyProcessed: false,
            error: `Provider order '${providerOrderId}' is already assigned to a different order`,
            errorCode: 'PROVIDER_ORDER_ALREADY_LINKED',
          };
        }
      } catch (checkEx: any) {
        console.warn(`[PaymentPersistence] Warning checking provider_order_id link: ${checkEx.message}`);
      }
    }
  }

  // 5. Idempotency Check for Webhook Events (with payload conflict validation)
  if (eventId && (await isWebhookEventProcessed(eventId))) {
    console.log(`[PaymentPersistence] Event ${eventId} already processed (source: ${source})`);

    // Validate that this event ID was actually processed for THIS order
    if (isLiveSupabase && supabaseServer) {
      const { data: existingEvt } = await supabaseServer
        .from('webhook_events')
        .select('order_id, provider_order_id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (existingEvt && existingEvt.order_id && existingEvt.order_id !== order.id) {
        console.error(
          `[PaymentPersistence] Duplicate event '${eventId}' targets order '${order.id}', but was previously processed for order '${existingEvt.order_id}'!`
        );
        return {
          success: false,
          alreadyProcessed: false,
          error: `Event ID was already processed for a different order`,
          errorCode: 'EVENT_ORDER_MISMATCH',
        };
      }
    }

    return {
      success: true,
      alreadyProcessed: true,
      order,
    };
  }

  // 4. Check if order is already captured
  if (order.payment_status === 'CAPTURED' && order.status !== 'PENDING_PAYMENT') {
    console.log(`[PaymentPersistence] Order #${order.order_number} already in CAPTURED state`);
    if (eventId && isLiveSupabase && supabaseServer) {
      supabaseServer
        .from('webhook_events')
        .upsert(
          {
            event_id: eventId,
            event_type: eventType,
            provider: 'CASHFREE',
            provider_order_id: providerOrderId,
            provider_payment_id: providerPaymentId || null,
            order_id: order.id,
            status: 'PROCESSED',
            payload: rawPayload || null,
            processed_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: 'event_id' }
        )
        .then(() => {}, () => {});
      inMemoryStore.processedWebhookEvents.add(eventId);
    }
    return {
      success: true,
      alreadyProcessed: true,
      order,
    };
  }

  // 5. Strict Authoritative Payment Amount Validation & Explicit Unit Handling
  if (
    paymentAmount === undefined ||
    paymentAmount === null ||
    isNaN(Number(paymentAmount)) ||
    Number(paymentAmount) <= 0
  ) {
    console.error(`[PaymentPersistence] Missing or invalid payment amount for order #${order.order_number}: ${paymentAmount}`);
    return {
      success: false,
      alreadyProcessed: false,
      error: 'Authoritative payment amount is required and must be a positive number',
      errorCode: 'INVALID_PAYMENT_AMOUNT',
    };
  }

  // Explicit unit conversion without heuristics
  const verifiedAmountRupees =
    amountUnit === 'PAISE' ? Number(paymentAmount) / 100 : Number(paymentAmount);

  const expectedRupees = Number(order.total_amount.toFixed(2));
  const receivedRupees = Number(verifiedAmountRupees.toFixed(2));

  // Enforce exact 2-decimal precision comparison (tolerance <= 0.01)
  if (Math.abs(expectedRupees - receivedRupees) > 0.01) {
    console.error(
      `[PaymentPersistence] Amount mismatch for order #${order.order_number}: expected ₹${expectedRupees.toFixed(2)}, got ₹${receivedRupees.toFixed(2)}`
    );
    return {
      success: false,
      alreadyProcessed: false,
      error: `Amount mismatch: expected ₹${expectedRupees.toFixed(2)}, received ₹${receivedRupees.toFixed(2)}`,
      errorCode: 'AMOUNT_MISMATCH',
    };
  }

  // 6. Database Persistence (Transactional via RPC where available, with safe direct fallback)
  let persistedInDb = false;

  if (isLive && client) {
    const validDbMethod = 'ONLINE'; // Store payments.method strictly as 'ONLINE', preserving raw gateway group in raw_webhook_payload

    // Attempt Atomic RPC
    try {
      const { data: rpcData, error: rpcError } = await client.rpc('confirm_order_payment_atomic', {
        p_event_id: eventId || null,
        p_event_type: eventType,
        p_provider_order_id: providerOrderId,
        p_provider_payment_id: providerPaymentId || null,
        p_order_id: order.id,
        p_amount: receivedRupees,
        p_currency: 'INR',
        p_payment_method: validDbMethod,
        p_paid_at: paidAtIso,
        p_raw_payload: rawPayload || null,
        p_amount_unit: 'RUPEES',
      });

      if (!rpcError && rpcData) {
        if (rpcData.success) {
          persistedInDb = true;
          if (rpcData.already_processed) {
            if (eventId) inMemoryStore.processedWebhookEvents.add(eventId);
            if (order.status !== 'PLACED' || order.payment_status !== 'CAPTURED') {
              order.status = 'PLACED';
              order.payment_status = 'CAPTURED';
              order.provider_order_id = providerOrderId;
              if (providerPaymentId) order.provider_payment_id = providerPaymentId;
              inMemoryStore.orders.set(order.id, order);
            }
            return {
              success: true,
              alreadyProcessed: true,
              order,
            };
          }
        } else {
          // RPC executed and returned success === false: fail closed immediately
          console.error(`[PaymentPersistence] RPC settlement rejected confirmation: ${rpcData.error} - ${rpcData.message}`);
          return {
            success: false,
            alreadyProcessed: false,
            error: rpcData.message || 'Payment settlement rejected by database',
            errorCode: rpcData.error || 'RPC_SETTLEMENT_REJECTED',
          };
        }
      } else if (rpcError) {
        const isRpcMissing =
          rpcError.code === 'PGRST202' ||
          rpcError.message?.includes('PGRST202') ||
          rpcError.message?.toLowerCase().includes('could not find the function') ||
          (rpcError.message?.includes('confirm_order_payment_atomic') && rpcError.message?.includes('does not exist'));

        if (isRpcMissing) {
          console.error(
            `[PaymentPersistence] CRITICAL ERROR: confirm_order_payment_atomic RPC missing in Supabase (PGRST202). Failing closed! Order #${order.order_number} (${order.id}) will NOT be marked as captured until database migration is applied.`
          );
          return {
            success: false,
            alreadyProcessed: false,
            error: 'Payment settlement service temporarily unavailable (RPC missing). Please apply database migration.',
            errorCode: 'RPC_UNAVAILABLE',
          };
        } else {
          console.error(`[PaymentPersistence] RPC invocation failed with database error (${rpcError.code}): ${rpcError.message}`);
          return {
            success: false,
            alreadyProcessed: false,
            error: `Database payment settlement error: ${rpcError.message}`,
            errorCode: rpcError.code || 'RPC_INVOCATION_ERROR',
          };
        }
      }
    } catch (rpcEx: any) {
      const isRpcMissing =
        rpcEx.code === 'PGRST202' ||
        rpcEx.message?.includes('PGRST202') ||
        rpcEx.message?.toLowerCase().includes('could not find the function');

      if (isRpcMissing) {
        console.error(
          `[PaymentPersistence] CRITICAL ERROR: confirm_order_payment_atomic RPC missing in Supabase (PGRST202). Failing closed! Order #${order.order_number} (${order.id}) will NOT be marked as captured until database migration is applied.`
        );
        return {
          success: false,
          alreadyProcessed: false,
          error: 'Payment settlement service temporarily unavailable (RPC missing). Please apply database migration.',
          errorCode: 'RPC_UNAVAILABLE',
        };
      } else {
        console.error(`[PaymentPersistence] RPC invocation exception: ${rpcEx.message}`);
        return {
          success: false,
          alreadyProcessed: false,
          error: `Database payment settlement exception: ${rpcEx.message}`,
          errorCode: 'RPC_INVOCATION_EXCEPTION',
        };
      }
    }

    // Fail closed guard: when live Supabase is active, settlement MUST have succeeded in database
    if (!persistedInDb) {
      console.error(
        `[PaymentPersistence] Order #${order.order_number} (${order.id}): Database settlement not confirmed. Failing closed.`
      );
      return {
        success: false,
        alreadyProcessed: false,
        error: 'Database settlement was not confirmed. Order cannot be marked as captured.',
        errorCode: 'DB_SETTLEMENT_NOT_CONFIRMED',
      };
    }
  }

  // 7. Update In-Memory Store ONLY after database write has succeeded
  order.status = 'PLACED';
  order.payment_status = 'CAPTURED';
  order.paid_at = paidAtIso;
  order.updated_at = nowIso;
  order.provider_order_id = providerOrderId;
  order.provider_payment_id = providerPaymentId || undefined;

  inMemoryStore.orders.set(order.id, order);

  const paymentRecord: ServerPayment = {
    id: randomUUID(),
    order_id: order.id,
    order_number: order.order_number,
    provider_order_id: providerOrderId,
    provider_payment_id: providerPaymentId || undefined,
    amount: receivedRupees, // in rupees, consistent with database payments.amount NUMERIC(10, 2)
    currency: 'INR',
    status: 'CAPTURED',
    method: 'ONLINE',
    created_at: nowIso,
    updated_at: nowIso,
  };
  inMemoryStore.payments.set(paymentRecord.id, paymentRecord);

  if (eventId) {
    inMemoryStore.processedWebhookEvents.add(eventId);
  }

  console.log(
    `[PaymentPersistence] SUCCESS: Order #${order.order_number} confirmed as PLACED & CAPTURED for ₹${receivedRupees} (source: ${source})`
  );

  // 8. Dispatch notifications asynchronously (safe from duplicate calls)
  notifyOrderPlaced(order).catch((err) =>
    console.error(`[PaymentPersistence] Failed to dispatch order placed notification: ${err.message}`)
  );

  return {
    success: true,
    alreadyProcessed: false,
    order,
  };
}
