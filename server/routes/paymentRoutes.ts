import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import {
  inMemoryStore,
  ServerPayment,
  ServerOrder,
  expireUnpaidOrders,
} from '../db';
import {
  verifyCashfreeOrderStatus,
  verifyWebhookSignature,
} from '../services/cashfreeService';
import {
  notifyOrderPlaced,
  notifyPaymentFailed,
} from '../services/notificationService';

const router = Router();

/**
 * POST /api/payments/verify
 * Validates Cashfree frontend checkout success
 */
router.post('/verify', async (req: Request, res: Response) => {
  const {
    order_id,
    cashfree_order_id,
    cashfree_payment_session_id,
  } = req.body;

  if (!cashfree_order_id) {
    res.status(400).json({
      error: 'MISSING_PAYMENT_FIELDS',
      message: 'cashfree_order_id is required.',
    });
    return;
  }

  // Check Cashfree API directly for true status
  const cashfreeStatus = await verifyCashfreeOrderStatus(cashfree_order_id);

  if (cashfreeStatus === 'ACTIVE' || cashfreeStatus === 'PENDING') {
    res.status(200).json({
      success: false,
      pending: true,
      message: 'Payment verification pending. We are waiting for Cashfree to confirm.',
    });
    return;
  }

  if (cashfreeStatus !== 'PAID') {
    res.status(400).json({
      error: 'PAYMENT_NOT_PAID',
      message: 'Payment was not successful or has failed.',
    });
    return;
  }

  // 2. Find local order
  let order: ServerOrder | undefined = undefined;
  if (order_id) {
    order = inMemoryStore.orders.get(order_id);
  }
  if (!order) {
    order = Array.from(inMemoryStore.orders.values()).find(
      (o) => o.provider_order_id === cashfree_order_id
    );
  }

  if (!order) {
    res.status(404).json({
      error: 'ORDER_NOT_FOUND',
      message: `No local order found for Cashfree order ${cashfree_order_id}`,
    });
    return;
  }

  // 3. Idempotent check
  if (order.payment_status === 'CAPTURED' && order.status !== 'PENDING_PAYMENT') {
    res.status(200).json({
      success: true,
      idempotent: true,
      message: 'Payment already verified for this order.',
      order,
    });
    return;
  }

  // 4. Update order status to PLACED and mark payment COMPLETED
  const nowIso = new Date().toISOString();
  order.status = 'PLACED';
  order.payment_status = 'CAPTURED';
  order.provider_payment_id = cashfree_order_id; // Store cashfree order as payment ref
  order.paid_at = nowIso;
  order.updated_at = nowIso;
  inMemoryStore.orders.set(order.id, order);

  notifyOrderPlaced(order).catch((err) =>
    console.error('[Notify Order Placed Error on Verify]:', err)
  );

  // 5. Record Payment Snapshot
  const paymentRecord: ServerPayment = {
    id: randomUUID(),
    order_id: order.id,
    order_number: order.order_number,
    provider_order_id: cashfree_order_id,
    provider_payment_id: cashfree_order_id,
    amount: Math.round(order.total_amount * 100),
    currency: 'INR',
    status: 'CAPTURED',
    method: 'ONLINE',
    created_at: nowIso,
    updated_at: nowIso,
  };
  inMemoryStore.payments.set(paymentRecord.id, paymentRecord);

  res.status(200).json({
    success: true,
    message: 'Online payment verified successfully! Sweets preparation has begun.',
    order,
  });
});

/**
 * POST /api/payments/webhook/cashfree
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

  const rawBody: Buffer | string = (req as any).rawBody || JSON.stringify(req.body);

  const isValid = verifyWebhookSignature(rawBody, signatureHeader, timestampHeader);
  if (!isValid) {
    res.status(400).json({
      error: 'INVALID_WEBHOOK_SIGNATURE',
      message: 'Webhook signature validation failed.',
    });
    return;
  }

  const payload = req.body;
  const event = payload?.type;
  let eventId = payload?.data?.order?.order_id || Date.now().toString();
  
  if (event === 'REFUND_STATUS_WEBHOOK') {
    eventId = (payload?.data?.refund?.refund_id || eventId) + '_' + (payload?.data?.refund?.refund_status || '');
  }

  if (inMemoryStore.processedWebhookEvents.has(eventId + event)) {
    res.status(200).json({ status: 'already_processed' });
    return;
  }
  inMemoryStore.processedWebhookEvents.add(eventId + event);

  const nowIso = new Date().toISOString();

  if (event === 'PAYMENT_SUCCESS_WEBHOOK') {
    const orderId = payload.data?.order?.order_id;
    let order = Array.from(inMemoryStore.orders.values()).find(
      (o) => o.provider_order_id === orderId
    );

    if (order && (order.status === 'PENDING_PAYMENT' || order.payment_status !== 'CAPTURED')) {
      order.status = 'PLACED';
      order.payment_status = 'CAPTURED';
      order.paid_at = nowIso;
      order.updated_at = nowIso;
      inMemoryStore.orders.set(order.id, order);

      notifyOrderPlaced(order).catch(() => {});
    }
  } else if (event === 'PAYMENT_FAILED_WEBHOOK') {
    const orderId = payload.data?.order?.order_id;
    let order = Array.from(inMemoryStore.orders.values()).find(
      (o) => o.provider_order_id === orderId
    );

    if (order && order.status === 'PENDING_PAYMENT') {
      order.status = 'PAYMENT_FAILED';
      order.payment_status = 'FAILED';
      order.updated_at = nowIso;

      const slot = inMemoryStore.deliverySlots.get(order.delivery_slot_id);
      if (slot && slot.booked_count > 0) {
        slot.booked_count -= 1;
        inMemoryStore.deliverySlots.set(slot.id, slot);
      }

      inMemoryStore.orders.set(order.id, order);
    }
  } else if (event === 'REFUND_STATUS_WEBHOOK') {
    const cfRefundId = payload.data?.refund?.cf_refund_id?.toString();
    const refundId = payload.data?.refund?.refund_id;
    const cfRefundStatus = payload.data?.refund?.refund_status;
    const orderId = payload.data?.order?.order_id; // provider_order_id
    const refundArn = payload.data?.refund?.refund_arn;

    let order = Array.from(inMemoryStore.orders.values()).find(o => o.provider_order_id === orderId);
    let refund = Array.from(inMemoryStore.refunds.values()).find(r => r.refund_id === refundId || (cfRefundId && r.cf_refund_id === cfRefundId));

    if (refund) {
      const localPaymentStatus = cfRefundStatus === 'SUCCESS' ? 'REFUNDED' 
                             : cfRefundStatus === 'FAILED' ? 'REFUND_FAILED'
                             : 'REFUND_PENDING';
      
      refund.refund_status = cfRefundStatus === 'SUCCESS' ? 'SUCCESS' : cfRefundStatus === 'FAILED' ? 'FAILED' : 'PENDING';
      if (cfRefundId) refund.cf_refund_id = cfRefundId;
      if (refundArn) refund.refund_arn = refundArn;
      refund.updated_at = nowIso;
      inMemoryStore.refunds.set(refund.id, refund);

      if (isLiveSupabase && supabaseServer) {
        supabaseServer.from('refunds').update({
          refund_status: refund.refund_status,
          cf_refund_id: refund.cf_refund_id,
          refund_arn: refund.refund_arn,
          updated_at: nowIso
        }).eq('id', refund.id).then(() => {});
      }

      if (order) {
        order.payment_status = localPaymentStatus as any;
        if (cfRefundStatus === 'SUCCESS') order.status = 'REFUNDED';
        order.updated_at = nowIso;
        inMemoryStore.orders.set(order.id, order);

        if (isLiveSupabase && supabaseServer) {
          supabaseServer.from('orders').update({
            status: order.status,
            payment_status: order.payment_status,
            updated_at: nowIso
          }).eq('id', order.id).then(() => {});
        }
      }
    }
  }

  res.status(200).json({ status: 'ok', event, processed: true });

});

router.post('/expire-check', (_req: Request, res: Response) => {
  const expiredCount = expireUnpaidOrders();
  res.json({
    success: true,
    expiredCount,
    message: `Expired ${expiredCount} unpaid orders past the 15-minute window.`,
  });
});

export default router;
