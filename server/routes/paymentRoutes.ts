import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../authMiddleware';
import {
  inMemoryStore,
  ServerOrder,
  expireUnpaidOrders,
  isLiveSupabase,
  supabaseServer,
  findOrderInSupabase,
} from '../db';
import {
  fetchCashfreeOrderDetails,
  verifyWebhookSignature,
} from '../services/cashfreeService';
import {
  confirmOrderPayment,
  isWebhookEventProcessed,
} from '../services/paymentPersistenceService';

const router = Router();

/**
 * POST /api/payments/verify
 * Validates Cashfree frontend checkout success and persists order & payment atomically
 */
router.post('/verify', async (req: AuthenticatedRequest, res: Response) => {
  const { order_id, cashfree_order_id } = req.body;

  const targetOrderId = cashfree_order_id || order_id;
  if (!targetOrderId) {
    res.status(400).json({
      error: 'MISSING_PAYMENT_FIELDS',
      message: 'cashfree_order_id is required.',
    });
    return;
  }

  // 1. Verify payment status directly with Cashfree's authoritative API
  const cashfreeDetails = await fetchCashfreeOrderDetails(targetOrderId);

  if (cashfreeDetails.status === 'ACTIVE') {
    res.status(200).json({
      success: false,
      pending: true,
      message: 'Payment verification pending. We are waiting for Cashfree to confirm.',
    });
    return;
  }

  if (cashfreeDetails.status !== 'PAID') {
    res.status(400).json({
      error: 'PAYMENT_NOT_PAID',
      message: 'Payment was not successful or has failed.',
    });
    return;
  }

  // 2. Authorize order ownership
  let order: ServerOrder | undefined = inMemoryStore.orders.get(order_id);
  if (!order) {
    order = Array.from(inMemoryStore.orders.values()).find(
      (o) => o.provider_order_id === targetOrderId || o.order_number === targetOrderId || o.id === targetOrderId
    );
  }

  if (!order && isLiveSupabase && supabaseServer) {
    const { order: dbOrder, error: dbErr } = await findOrderInSupabase(targetOrderId);
    if (dbErr) {
      console.error(`[PaymentRoutes] Database lookup failure during payment verification:`, dbErr);
      res.status(500).json({
        error: 'DATABASE_LOOKUP_ERROR',
        message: 'Failed to query order from database. Please retry.',
      });
      return;
    }
    if (dbOrder) order = dbOrder;
  }

  if (!order) {
    res.status(404).json({
      error: 'ORDER_NOT_FOUND',
      message: 'Order not found.',
    });
    return;
  }

  // 2. Authorization and phone verification check
  const isGuestOrder = !order.user_id;

  if (isGuestOrder) {
    // For guest orders (no user_id) REQUIRE a matching phone
    const guestPhone = req.body?.phone || req.body?.guest_phone;
    if (!guestPhone || typeof guestPhone !== 'string' || !guestPhone.trim()) {
      res.status(400).json({
        error: 'PHONE_REQUIRED_FOR_GUEST',
        message: 'Mobile number used at checkout is required for guest order verification.',
      });
      return;
    }

    const cleanInputPhone = guestPhone.replace(/\D/g, '').slice(-10);
    if (cleanInputPhone.length !== 10) {
      res.status(400).json({
        error: 'INVALID_PHONE',
        message: 'A valid 10-digit mobile number is required.',
      });
      return;
    }

    const orderPhone1 = (order.guest_phone || '').replace(/\D/g, '').slice(-10);
    const orderPhone2 = (order.address_snapshot?.recipient_phone || '').replace(/\D/g, '').slice(-10);

    if (cleanInputPhone !== orderPhone1 && cleanInputPhone !== orderPhone2) {
      res.status(404).json({
        error: 'ORDER_NOT_FOUND',
        message: 'Order not found.',
      });
      return;
    }
  } else {
    // Registered account order
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required to verify this registered account order.',
      });
      return;
    }

    if (req.user.role === 'CUSTOMER' && order.user_id !== req.user.id) {
      res.status(404).json({
        error: 'ORDER_NOT_FOUND',
        message: 'Order not found.',
      });
      return;
    }
  }

  // 3. Confirm and persist payment reliably via unified service
  const confirmResult = await confirmOrderPayment({
    orderIdOrProviderId: targetOrderId,
    providerOrderId: targetOrderId,
    paymentAmount: cashfreeDetails.orderAmount,
    currency: cashfreeDetails.orderCurrency,
    source: 'VERIFY',
  });

  if (!confirmResult.success) {
    res.status(500).json({
      error: confirmResult.errorCode || 'PERSISTENCE_FAILED',
      message: confirmResult.error || 'Failed to persist verified payment. Please retry.',
    });
    return;
  }

  const finalOrder = confirmResult.order || order;

  if (isGuestOrder) {
    // Return trimmed projection (same as guest-status) instead of full internal order object
    const rawRecipientPhone = finalOrder.address_snapshot?.recipient_phone || finalOrder.guest_phone || '';
    const digits = rawRecipientPhone.replace(/\D/g, '');
    const maskedPhone = digits.length >= 4 ? `******${digits.slice(-4)}` : '******';

    const projectedOrder = {
      order_number: finalOrder.order_number,
      status: finalOrder.status,
      payment_status: finalOrder.payment_status,
      payment_method: finalOrder.payment_method,
      placed_at: finalOrder.placed_at,
      total_amount: finalOrder.total_amount,
      subtotal: finalOrder.subtotal,
      discount_amount: finalOrder.discount_amount || 0,
      delivery_charge: finalOrder.delivery_charge || 0,
      coupon_code: finalOrder.coupon_code,
      recipient_name: finalOrder.address_snapshot?.recipient_name,
      recipient_phone_masked: maskedPhone,
      address_snapshot: finalOrder.address_snapshot ? {
        recipient_name: finalOrder.address_snapshot.recipient_name,
        street_address: finalOrder.address_snapshot.street_address,
        landmark: finalOrder.address_snapshot.landmark,
        city: finalOrder.address_snapshot.city,
        state: finalOrder.address_snapshot.state,
        pincode: finalOrder.address_snapshot.pincode,
      } : undefined,
      items: (finalOrder.items || []).map((item: any) => ({
        product_name: item.product_name,
        variant_label: item.variant_label,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
      is_paid: finalOrder.payment_status === 'CAPTURED',
      tracking_status: finalOrder.status,
    };

    res.status(200).json({
      success: true,
      idempotent: confirmResult.alreadyProcessed,
      message: 'Online payment verified successfully! Sweets preparation has begun.',
      order: projectedOrder,
    });
    return;
  }

  res.status(200).json({
    success: true,
    idempotent: confirmResult.alreadyProcessed,
    message: 'Online payment verified successfully! Sweets preparation has begun.',
    order: confirmResult.order,
  });
});

/**
 * POST /api/payments/webhook/cashfree
 * Handles Cashfree webhook events with signature verification and persistent idempotency
 */
router.post('/webhook/cashfree', async (req: Request, res: Response) => {
  const signatureHeader = req.headers['x-webhook-signature'] as string;
  const timestampHeader = req.headers['x-webhook-timestamp'] as string;

  if (!signatureHeader || !timestampHeader) {
    res.status(400).json({
      error: 'MISSING_SIGNATURE_HEADER',
      message: 'Cashfree signature headers required.',
    });
    return;
  }

  const rawBody: Buffer | undefined = (req as any).rawBody;

  if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
    res.status(400).json({
      error: 'MISSING_RAW_BODY',
      message: 'Original raw request body is required for signature verification.',
    });
    return;
  }

  const isValid = verifyWebhookSignature(rawBody, signatureHeader, timestampHeader);
  if (!isValid) {
    console.error('[Cashfree Webhook] Invalid webhook signature detected');
    res.status(400).json({
      error: 'INVALID_WEBHOOK_SIGNATURE',
      message: 'Webhook signature validation failed.',
    });
    return;
  }

  const payload = req.body;
  const event = payload?.type;
  const cfOrderId = payload?.data?.order?.order_id?.toString();
  const cfPaymentId = payload?.data?.payment?.cf_payment_id?.toString();

  if (!cfOrderId) {
    res.status(400).json({
      error: 'MISSING_ORDER_ID',
      message: 'Order ID is required in webhook payload.',
    });
    return;
  }

  // Choose stable event identifier for database-level idempotency
  let eventId = payload?.event_id;
  if (!eventId) {
    if (event === 'REFUND_STATUS_WEBHOOK') {
      const rfId = payload?.data?.refund?.cf_refund_id || payload?.data?.refund?.refund_id || cfOrderId;
      const rfStatus = payload?.data?.refund?.refund_status || '';
      eventId = `REFUND_${rfId}_${rfStatus}`;
    } else if (cfPaymentId) {
      eventId = `${event}_${cfPaymentId}`;
    } else if (cfOrderId) {
      eventId = `${event}_${cfOrderId}`;
    } else {
      eventId = `${event}_${Date.now()}`;
    }
  }

  // Idempotency check: Return HTTP 200 immediately if event already processed
  const alreadyProcessed = await isWebhookEventProcessed(eventId);
  if (alreadyProcessed) {
    console.log(`[Cashfree Webhook] Event ${eventId} already processed. Returning 200.`);
    res.status(200).json({ status: 'already_processed', event_id: eventId });
    return;
  }

  const nowIso = new Date().toISOString();

  // Event Handling: PAYMENT_SUCCESS_WEBHOOK
  if (event === 'PAYMENT_SUCCESS_WEBHOOK') {
    // 1. Authoritatively verify status with Cashfree API: Never trust webhook payload alone
    const gatewayDetails = await fetchCashfreeOrderDetails(cfOrderId);

    if (gatewayDetails.isNetworkError) {
      console.warn(`[Cashfree Webhook] Network error verifying order ${cfOrderId} with gateway. Responding 500 for retry.`);
      res.status(500).json({
        error: 'GATEWAY_VERIFICATION_UNAVAILABLE',
        message: 'Could not contact payment gateway to verify status. Event will be retried.',
        retryable: true,
      });
      return;
    }

    if (gatewayDetails.status !== 'PAID') {
      console.error(
        `[Cashfree Webhook] Webhook claimed PAYMENT_SUCCESS, but Cashfree API reports status '${gatewayDetails.status}' for order ${cfOrderId}! Rejecting payment confirmation.`
      );
      res.status(400).json({
        error: 'UNCONFIRMED_GATEWAY_PAYMENT',
        message: `Gateway reports order status as ${gatewayDetails.status}`,
      });
      return;
    }

    const paymentAmount =
      gatewayDetails.orderAmount ||
      payload?.data?.payment?.payment_amount ||
      payload?.data?.order?.order_amount;
    const paymentCurrency =
      gatewayDetails.orderCurrency ||
      payload?.data?.payment?.payment_currency ||
      payload?.data?.order?.order_currency;
    const paymentMethod =
      payload?.data?.payment?.payment_group ||
      payload?.data?.payment?.payment_method?.type ||
      'ONLINE';
    const paidAt = payload?.data?.payment?.payment_time || nowIso;

    const confirmResult = await confirmOrderPayment({
      orderIdOrProviderId: cfOrderId,
      providerOrderId: cfOrderId,
      providerPaymentId: cfPaymentId,
      paymentAmount,
      currency: paymentCurrency,
      paymentMethod,
      paidAt,
      eventId,
      eventType: event,
      rawPayload: payload,
      source: 'WEBHOOK',
    });

    if (!confirmResult.success) {
      console.error(`[Cashfree Webhook] Payment confirmation failed: ${confirmResult.error}`);
      res.status(500).json({
        error: confirmResult.errorCode || 'PERSISTENCE_FAILED',
        message: confirmResult.error,
        retryable: true,
      });
      return;
    }

    res.status(200).json({ status: 'ok', event, processed: true });
    return;
  }

  // Event Handling: PAYMENT_FAILED_WEBHOOK
  // Note: Do not change order status on payment attempt failure!
  // Customers on the checkout page can retry with an alternate payment method.
  // We log the event, record it in webhook_events, and leave the order in PENDING_PAYMENT.
  if (event === 'PAYMENT_FAILED_WEBHOOK') {
    console.warn(
      `[Cashfree Webhook] Payment attempt failed for order ${cfOrderId}. Leaving order PENDING_PAYMENT to allow customer retry.`
    );

    let order = Array.from(inMemoryStore.orders.values()).find(
      (o) => o.provider_order_id === cfOrderId || o.order_number === cfOrderId || o.id === cfOrderId
    );

    // Look up in Supabase if not found in memory (e.g. server restart)
    if (!order && isLiveSupabase && supabaseServer) {
      const { order: dbOrder, error: dbErr } = await findOrderInSupabase(cfOrderId);
      if (dbErr) {
        console.warn(`[Cashfree Webhook] Error fetching order for PAYMENT_FAILED_WEBHOOK: ${dbErr.message}`);
      } else if (dbOrder) {
        order = dbOrder;
      }
    }

    // Record failure event in webhook_events without changing order status
    if (isLiveSupabase && supabaseServer) {
      try {
        await supabaseServer.from('webhook_events').upsert(
          {
            event_id: eventId,
            event_type: event,
            provider: 'CASHFREE',
            provider_order_id: cfOrderId,
            order_id: order?.id || null,
            status: 'PROCESSED',
            payload,
            processed_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: 'event_id' }
        );
      } catch (weErr: any) {
        console.warn(`[Cashfree Webhook] Warning recording PAYMENT_FAILED_WEBHOOK in webhook_events: ${weErr.message}`);
      }
    }
    inMemoryStore.processedWebhookEvents.add(eventId);

    res.status(200).json({
      status: 'ok',
      event,
      processed: true,
      order_status: order?.status || 'PENDING_PAYMENT',
      message: 'Payment attempt failure recorded; order remains PENDING_PAYMENT to permit retry.',
    });
    return;
  }

  // Event Handling: REFUND_STATUS_WEBHOOK
  if (event === 'REFUND_STATUS_WEBHOOK') {
    const cfRefundId = payload.data?.refund?.cf_refund_id?.toString();
    const refundId = payload.data?.refund?.refund_id;
    const cfRefundStatus = payload.data?.refund?.refund_status;
    const refundArn = payload.data?.refund?.refund_arn;

    let order = Array.from(inMemoryStore.orders.values()).find(
      (o) => o.provider_order_id === cfOrderId || o.order_number === cfOrderId || o.id === cfOrderId
    );
    let refund = Array.from(inMemoryStore.refunds.values()).find(
      (r) => r.refund_id === refundId || (cfRefundId && r.cf_refund_id === cfRefundId)
    );

    if (refund) {
      const localPaymentStatus =
        cfRefundStatus === 'SUCCESS' ? 'REFUNDED' : cfRefundStatus === 'FAILED' ? 'REFUND_FAILED' : 'REFUND_PENDING';

      refund.refund_status = cfRefundStatus === 'SUCCESS' ? 'SUCCESS' : cfRefundStatus === 'FAILED' ? 'FAILED' : 'PENDING';
      if (cfRefundId) refund.cf_refund_id = cfRefundId;
      if (refundArn) refund.refund_arn = refundArn;
      refund.updated_at = nowIso;
      inMemoryStore.refunds.set(refund.id, refund);

      if (isLiveSupabase && supabaseServer) {
        supabaseServer
          .from('refunds')
          .update({
            refund_status: refund.refund_status,
            cf_refund_id: refund.cf_refund_id,
            refund_arn: refund.refund_arn,
            updated_at: nowIso,
          })
          .eq('id', refund.id)
          .then(() => {});
      }

      if (order) {
        order.payment_status = localPaymentStatus as any;
        if (cfRefundStatus === 'SUCCESS') order.status = 'REFUNDED';
        order.updated_at = nowIso;
        inMemoryStore.orders.set(order.id, order);

        if (isLiveSupabase && supabaseServer) {
          supabaseServer
            .from('orders')
            .update({
              status: order.status,
              payment_status: order.payment_status,
              updated_at: nowIso,
            })
            .eq('id', order.id)
            .then(() => {});
        }
      }

      if (isLiveSupabase && supabaseServer) {
        supabaseServer
          .from('webhook_events')
          .upsert(
            {
              event_id: eventId,
              event_type: event,
              provider: 'CASHFREE',
              provider_order_id: cfOrderId,
              order_id: order?.id || null,
              status: 'PROCESSED',
              payload,
              processed_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: 'event_id' }
          )
          .then(() => {});
      }
      inMemoryStore.processedWebhookEvents.add(eventId);
    }

    res.status(200).json({ status: 'ok', event, processed: true });
    return;
  }

  // Any other webhook event
  res.status(200).json({ status: 'ok', event, processed: true });
});

router.post('/expire-check', async (_req: Request, res: Response) => {
  const expiredCount = await expireUnpaidOrders();
  res.json({
    success: true,
    expiredCount,
    message: `Processed unpaid orders cleanup past the 15-minute window.`,
  });
});

export default router;
