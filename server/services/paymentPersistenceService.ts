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
import { extractCashfreePaymentId, fetchCashfreeOrderPayments } from './cashfreeService';

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
  const isLive = getActiveIsLive();
  const client = getActiveClient();

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

  // 3. Strict Provider Payment ID Validation & Authoritative Resolution
  // Never substitute order ID for payment ID
  let cleanProvPaymentId = (providerPaymentId || '').trim();

  // If missing from params, attempt extraction from rawPayload
  if (!cleanProvPaymentId && rawPayload) {
    cleanProvPaymentId =
      extractCashfreePaymentId(rawPayload?.data?.payment) ||
      extractCashfreePaymentId(rawPayload?.payment) ||
      extractCashfreePaymentId(rawPayload?.data) ||
      extractCashfreePaymentId(rawPayload) ||
      '';
  }

  // If still missing and order is already captured, preserve existing captured payment ID
  if (!cleanProvPaymentId && order && order.payment_status === 'CAPTURED' && order.provider_payment_id) {
    cleanProvPaymentId = order.provider_payment_id;
  }

  // If still missing, query Cashfree's authoritative order payments endpoint
  if (!cleanProvPaymentId) {
    const gatewayLookup = providerOrderId || order?.provider_order_id || order?.order_number;
    if (gatewayLookup) {
      try {
        const paymentList = await fetchCashfreeOrderPayments(gatewayLookup);
        const successfulPayment = paymentList.find(
          (p) => p.payment_status?.toUpperCase() === 'SUCCESS' || p.payment_status?.toUpperCase() === 'PAID'
        ) || paymentList[0];
        cleanProvPaymentId = extractCashfreePaymentId(successfulPayment) || '';
      } catch (cfErr: any) {
        console.warn(`[PaymentPersistence] Warning querying gateway payments for ${gatewayLookup}: ${cfErr.message}`);
      }
    }
  }

  if (!cleanProvPaymentId) {
    console.error(`[PaymentPersistence] Missing or blank provider payment ID for order '${orderIdOrProviderId}'`);
    return {
      success: false,
      alreadyProcessed: false,
      error: 'Valid provider payment ID is required for successful online settlement',
      errorCode: 'MISSING_PROVIDER_PAYMENT_ID',
    };
  }

  // 4. Strict Payment Method Validation (Reject COD immediately)
  if (order.payment_method === 'COD' || (paymentMethod && paymentMethod.toUpperCase() === 'COD')) {
    console.error(`[PaymentPersistence] Cannot settle COD order #${order.order_number} via online settlement`);
    return {
      success: false,
      alreadyProcessed: false,
      error: 'COD orders cannot be settled via online gateway settlement',
      errorCode: 'INVALID_PAYMENT_METHOD',
    };
  }

  // 5. Conflict & Strict Mapping Checks
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

  // B. Check if order's existing provider_payment_id conflicts with incoming providerPaymentId on captured orders
  if (
    order.payment_status === 'CAPTURED' &&
    order.provider_payment_id &&
    cleanProvPaymentId &&
    order.provider_payment_id !== cleanProvPaymentId
  ) {
    console.error(
      `[PaymentPersistence] Provider payment ID mismatch for order #${order.order_number}: expected '${order.provider_payment_id}', received '${cleanProvPaymentId}'`
    );
    return {
      success: false,
      alreadyProcessed: false,
      error: `Order is already linked to provider payment '${order.provider_payment_id}', cannot settle with different payment ID '${cleanProvPaymentId}'`,
      errorCode: 'PAYMENT_ID_MISMATCH',
    };
  }

  // C. Check if incoming providerPaymentId is already used on another captured order
  if (cleanProvPaymentId) {
    const conflictingPayment = Array.from(inMemoryStore.payments.values()).find(
      (p) => p.provider_payment_id === cleanProvPaymentId && p.order_id !== order!.id && p.status === 'CAPTURED'
    );
    if (conflictingPayment) {
      console.error(
        `[PaymentPersistence] Provider payment ID '${cleanProvPaymentId}' is already used on order #${conflictingPayment.order_number || conflictingPayment.order_id}`
      );
      return {
        success: false,
        alreadyProcessed: false,
        error: `Provider payment '${cleanProvPaymentId}' is already assigned to a different order`,
        errorCode: 'PAYMENT_ID_ALREADY_USED',
      };
    }
  }

  // D. Check if incoming providerOrderId is already linked to a DIFFERENT order
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

    if (isLive && client) {
      try {
        const { data: conflictingDbOrder } = await client
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

  // 6. Idempotency Check for Webhook Events (with identity conflict validation)
  if (eventId) {
    if (isLive && client) {
      const { data: existingEvt } = await client
        .from('webhook_events')
        .select('id, status, order_id, provider_order_id, provider_payment_id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (existingEvt) {
        if (
          (existingEvt.order_id && existingEvt.order_id !== order.id) ||
          (existingEvt.provider_order_id && providerOrderId && existingEvt.provider_order_id !== providerOrderId) ||
          (existingEvt.provider_payment_id && cleanProvPaymentId && existingEvt.provider_payment_id !== cleanProvPaymentId)
        ) {
          console.error(
            `[PaymentPersistence] Duplicate event '${eventId}' targets order '${order.id}', but was previously associated with a different order or payment!`
          );
          return {
            success: false,
            alreadyProcessed: false,
            error: `Event ID was already processed or recorded for a different order or payment`,
            errorCode: 'EVENT_ID_CONFLICT',
          };
        }

        if (existingEvt.status === 'PROCESSED') {
          inMemoryStore.processedWebhookEvents.add(eventId);
          return {
            success: true,
            alreadyProcessed: true,
            order,
          };
        }
      }
    } else {
      const memEvt = inMemoryStore.webhookEvents.get(eventId);
      if (memEvt) {
        if (
          (memEvt.orderId && memEvt.orderId !== order.id) ||
          (memEvt.providerOrderId && providerOrderId && memEvt.providerOrderId !== providerOrderId) ||
          (memEvt.providerPaymentId && cleanProvPaymentId && memEvt.providerPaymentId !== cleanProvPaymentId)
        ) {
          console.error(
            `[PaymentPersistence] Duplicate event '${eventId}' targets order '${order.id}', but was previously associated with a different order or payment!`
          );
          return {
            success: false,
            alreadyProcessed: false,
            error: `Event ID was already processed or recorded for a different order or payment`,
            errorCode: 'EVENT_ID_CONFLICT',
          };
        }

        if (memEvt.status === 'PROCESSED') {
          inMemoryStore.processedWebhookEvents.add(eventId);
          return {
            success: true,
            alreadyProcessed: true,
            order,
          };
        }
      } else if (inMemoryStore.processedWebhookEvents.has(eventId)) {
        console.log(`[PaymentPersistence] Event ${eventId} already processed (source: ${source})`);
        return {
          success: true,
          alreadyProcessed: true,
          order,
        };
      }
    }
  }

  // 7. Check if order is already captured
  if (order.payment_status === 'CAPTURED' && order.status !== 'PENDING_PAYMENT') {
    console.log(`[PaymentPersistence] Order #${order.order_number} already in CAPTURED state`);
    if (eventId && isLive && client && typeof client.from === 'function') {
      try {
        const table = client.from('webhook_events');
        if (typeof table?.upsert === 'function') {
          table
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
        }
      } catch (upsertErr: any) {
        console.warn(`[PaymentPersistence] Warning upserting webhook event: ${upsertErr.message}`);
      }
      inMemoryStore.processedWebhookEvents.add(eventId);
    }
    return {
      success: true,
      alreadyProcessed: true,
      order,
    };
  }

  // 8. Strict Authoritative Payment Amount Validation & Explicit Unit Handling
  if (
    paymentAmount === undefined ||
    paymentAmount === null ||
    isNaN(Number(paymentAmount)) ||
    !isFinite(Number(paymentAmount)) ||
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

  // Explicit unit validation
  if (amountUnit && amountUnit !== 'RUPEES' && amountUnit !== 'PAISE') {
    return {
      success: false,
      alreadyProcessed: false,
      error: 'Amount unit must be RUPEES or PAISE',
      errorCode: 'INVALID_AMOUNT_UNIT',
    };
  }

  // Enforce exact paise equality (zero difference permitted)
  const expectedPaise = Math.round(order.total_amount * 100);
  const receivedPaise =
    amountUnit === 'PAISE'
      ? Math.round(Number(paymentAmount))
      : Math.round(Number(paymentAmount) * 100);

  if (expectedPaise !== receivedPaise) {
    console.error(
      `[PaymentPersistence] Amount mismatch for order #${order.order_number}: expected ₹${(expectedPaise / 100).toFixed(2)}, got ₹${(receivedPaise / 100).toFixed(2)}`
    );
    return {
      success: false,
      alreadyProcessed: false,
      error: `Amount mismatch: expected ₹${(expectedPaise / 100).toFixed(2)}, received ₹${(receivedPaise / 100).toFixed(2)}`,
      errorCode: 'AMOUNT_MISMATCH',
    };
  }

  const receivedRupees = Number((receivedPaise / 100).toFixed(2));
  const verifiedAmountRupees = receivedRupees;

  // 6. Database Persistence (Strictly transactional via confirm_order_payment_atomic RPC; strictly fails closed if unavailable)
  let persistedInDb = false;

  if (isLive && client) {
    const validDbMethod = 'ONLINE'; // Store payments.method strictly as 'ONLINE', preserving raw gateway group in raw_webhook_payload

    // Attempt Atomic RPC
    try {
      const { data: rpcData, error: rpcError } = await client.rpc('confirm_order_payment_atomic', {
        p_event_id: eventId || null,
        p_event_type: eventType,
        p_provider_order_id: providerOrderId,
        p_provider_payment_id: cleanProvPaymentId,
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
              if (cleanProvPaymentId) order.provider_payment_id = cleanProvPaymentId;
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
  // Atomic settlement for in-memory store: Snapshot order so that if payment insertion fails,
  // the order remains completely unmodified.
  const originalStatus = order.status;
  const originalPaymentStatus = order.payment_status;
  const originalPaidAt = order.paid_at;
  const originalConfirmedAt = order.confirmed_at;
  const originalUpdatedAt = order.updated_at;
  const originalProviderOrderId = order.provider_order_id;
  const originalProviderPaymentId = order.provider_payment_id;

  try {
    if ((inMemoryStore as any)._forcePaymentInsertFailure) {
      throw new Error('Forced payment insertion failure for atomicity testing');
    }

    const paymentRecord: ServerPayment = {
      id: randomUUID(),
      order_id: order.id,
      order_number: order.order_number,
      provider_order_id: providerOrderId,
      provider_payment_id: cleanProvPaymentId || undefined,
      amount: receivedRupees, // in rupees, consistent with database payments.amount NUMERIC(10, 2)
      currency: 'INR',
      status: 'CAPTURED',
      method: 'ONLINE',
      created_at: nowIso,
      updated_at: nowIso,
    };
    inMemoryStore.payments.set(paymentRecord.id, paymentRecord);

    order.status = 'PLACED';
    order.payment_status = 'CAPTURED';
    order.paid_at = paidAtIso;
    order.confirmed_at = order.confirmed_at || nowIso;
    order.updated_at = nowIso;
    order.provider_order_id = providerOrderId;
    order.provider_payment_id = cleanProvPaymentId || undefined;

    inMemoryStore.orders.set(order.id, order);

    if (eventId) {
      inMemoryStore.processedWebhookEvents.add(eventId);
      inMemoryStore.webhookEvents.set(eventId, {
        eventId,
        eventType,
        status: 'PROCESSED',
        orderId: order.id,
        providerOrderId,
        providerPaymentId: cleanProvPaymentId,
        payload: rawPayload,
      });
    }

    console.log(
      `[PaymentPersistence] SUCCESS: Order #${order.order_number} confirmed as PLACED & CAPTURED for ₹${receivedRupees} (source: ${source})`
    );
  } catch (insertErr: any) {
    // Atomic rollback: restore order to pre-settlement state
    order.status = originalStatus;
    order.payment_status = originalPaymentStatus;
    order.paid_at = originalPaidAt;
    order.confirmed_at = originalConfirmedAt;
    order.updated_at = originalUpdatedAt;
    order.provider_order_id = originalProviderOrderId;
    order.provider_payment_id = originalProviderPaymentId;
    inMemoryStore.orders.set(order.id, order);

    console.error(`[PaymentPersistence] Payment insertion failed. Atomically rolled back order: ${insertErr.message}`);
    return {
      success: false,
      alreadyProcessed: false,
      error: `Payment insertion failed: ${insertErr.message}`,
      errorCode: 'PAYMENT_INSERT_FAILED',
    };
  }

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
