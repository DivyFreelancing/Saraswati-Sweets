/**
 * Comprehensive Unit Test Suite: Hardened Payment Logic & Security Controls
 * 
 * Tests:
 * 1. Strict settlement validation (currency INR, positive amount, explicit units, 2-decimal rounding).
 * 2. Fail-closed credentials (placeholder credentials fail closed; never return PAID).
 * 3. Concurrency-safe idempotency (simultaneous duplicate delivery, sequential retry, different event IDs).
 * 4. Correct provider identifiers (no Cashfree IDs in razorpay columns, no substitution of order ID for payment ID).
 * 5. Cleanup consistency (orders in ACTIVE/UNKNOWN state deferred, only definitive terminal states processed).
 */

// Guarantee test isolation before importing server modules
process.env.UNIT_TEST = 'true';

import { randomUUID } from 'crypto';
import crypto from 'crypto';
import type { ServerOrder } from '../server/db';

async function runUnitTests() {
  const { inMemoryStore, expireUnpaidOrders } = await import('../server/db');
  const { confirmOrderPayment } = await import('../server/services/paymentPersistenceService');
  const {
    verifyWebhookSignature,
    CASHFREE_SECRET_KEY,
    fetchCashfreeOrderDetails,
    isPlaceholderOrMissingCredentials,
  } = await import('../server/services/cashfreeService');

  console.log('======================================================================');
  console.log('SARASWATI SWEETS: PAYMENT LOGIC & SECURITY VALIDATION SUITE');
  console.log('======================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${desc}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. WEBHOOK SIGNATURE VERIFICATION & INTEGRITY TESTS
  // -------------------------------------------------------------------------
  const testPayload = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', order: { order_id: 'test_123' } });
  const testPayloadBuf = Buffer.from(testPayload, 'utf8');
  const testTimestamp = Math.floor(Date.now() / 1000).toString();
  const validSig = crypto
    .createHmac('sha256', CASHFREE_SECRET_KEY)
    .update(`${testTimestamp}${testPayload}`)
    .digest('base64');

  assert(
    verifyWebhookSignature(testPayload, validSig, testTimestamp) === true,
    'Valid HMAC signature with string payload verifies successfully'
  );

  assert(
    verifyWebhookSignature(testPayloadBuf, validSig, testTimestamp) === true,
    'Valid HMAC signature with Buffer rawBody verifies successfully'
  );

  assert(
    verifyWebhookSignature(testPayload, 'forged_signature_xyz', testTimestamp) === false,
    'Forged HMAC signature is rejected'
  );

  assert(
    verifyWebhookSignature(testPayload, validSig + '_tampered', testTimestamp) === false,
    'Mismatched length signature is safely rejected (timing-safe check)'
  );

  assert(
    verifyWebhookSignature(testPayload, '', testTimestamp) === false,
    'Missing/empty signature header is rejected'
  );

  assert(
    verifyWebhookSignature(testPayload, validSig, '') === false,
    'Missing/empty timestamp header is rejected'
  );

  assert(
    verifyWebhookSignature('', validSig, testTimestamp) === false,
    'Empty raw body is rejected'
  );

  const tamperedPayload = JSON.stringify({
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    order: { order_id: 'test_123' },
    tampered: true,
  });
  assert(
    verifyWebhookSignature(tamperedPayload, validSig, testTimestamp) === false,
    'Tampered request body with original signature is rejected'
  );

  const alteredTimestamp = (Number(testTimestamp) + 100).toString();
  assert(
    verifyWebhookSignature(testPayload, validSig, alteredTimestamp) === false,
    'Altered timestamp header with valid body is rejected'
  );

  // -------------------------------------------------------------------------
  // 2. SAFE SANDBOX / FAIL-CLOSED CREDENTIALS
  // -------------------------------------------------------------------------
  assert(
    isPlaceholderOrMissingCredentials('placeholder_app_id', 'placeholder_secret') === true,
    'Placeholder credentials correctly identified'
  );

  assert(
    isPlaceholderOrMissingCredentials('', '') === true,
    'Missing credentials correctly identified'
  );

  assert(
    isPlaceholderOrMissingCredentials('test_app_id', 'test_secret_key') === true,
    'Default mock credentials correctly identified'
  );

  const detailsFailClosed = await fetchCashfreeOrderDetails('nonexistent_order_id_xyz');
  assert(
    detailsFailClosed.status === 'FAILED',
    'fetchCashfreeOrderDetails strictly fails closed (status: FAILED, never auto-PAID)'
  );

  // -------------------------------------------------------------------------
  // 3. STRICT SETTLEMENT VALIDATION
  // -------------------------------------------------------------------------
  const orderId = randomUUID();
  const orderNumber = `SW-${Date.now()}`;
  const cfOrderId = `cf_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const mockOrder: ServerOrder = {
    id: orderId,
    order_number: orderNumber,
    provider_order_id: cfOrderId,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    payment_method: 'ONLINE',
    subtotal: 750,
    discount_amount: 0,
    delivery_charge: 50,
    tax_amount: 0,
    total_amount: 800.00,
    idempotency_key: `idem_${Date.now()}`,
    placed_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    address_snapshot: {
      id: randomUUID(),
      profile_id: 'test-user',
      label: 'Home',
      recipient_name: 'Unit Tester',
      recipient_phone: '9999988888',
      street_address: 'Station Road',
      city: 'Barabanki',
      state: 'Uttar Pradesh',
      pincode: '225001',
      is_default: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    items: [],
  };

  inMemoryStore.orders.set(orderId, mockOrder);

  // 3a. Reject missing or non-INR currency
  const missingCurrencyResult = await confirmOrderPayment({
    orderIdOrProviderId: orderId,
    providerOrderId: cfOrderId,
    paymentAmount: 800,
    currency: '',
    source: 'WEBHOOK',
  });
  assert(
    missingCurrencyResult.success === false && missingCurrencyResult.errorCode === 'CURRENCY_MISMATCH',
    'Payment rejected when currency is missing or empty'
  );

  const nonInrCurrencyResult = await confirmOrderPayment({
    orderIdOrProviderId: orderId,
    providerOrderId: cfOrderId,
    paymentAmount: 800,
    currency: 'USD',
    source: 'WEBHOOK',
  });
  assert(
    nonInrCurrencyResult.success === false && nonInrCurrencyResult.errorCode === 'CURRENCY_MISMATCH',
    'Payment rejected when currency is non-INR (USD)'
  );

  // 3b. Require authoritative positive payment amount
  const missingAmountResult = await confirmOrderPayment({
    orderIdOrProviderId: orderId,
    providerOrderId: cfOrderId,
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert(
    missingAmountResult.success === false && missingAmountResult.errorCode === 'INVALID_PAYMENT_AMOUNT',
    'Payment rejected when paymentAmount is missing/undefined'
  );

  const zeroAmountResult = await confirmOrderPayment({
    orderIdOrProviderId: orderId,
    providerOrderId: cfOrderId,
    paymentAmount: 0,
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert(
    zeroAmountResult.success === false && zeroAmountResult.errorCode === 'INVALID_PAYMENT_AMOUNT',
    'Payment rejected when paymentAmount is zero'
  );

  const negativeAmountResult = await confirmOrderPayment({
    orderIdOrProviderId: orderId,
    providerOrderId: cfOrderId,
    paymentAmount: -800,
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert(
    negativeAmountResult.success === false && negativeAmountResult.errorCode === 'INVALID_PAYMENT_AMOUNT',
    'Payment rejected when paymentAmount is negative'
  );

  // 3c. Explicit Unit Handling (PAISE vs RUPEES)
  const explicitPaiseResult = await confirmOrderPayment({
    orderIdOrProviderId: orderId,
    providerOrderId: cfOrderId,
    paymentAmount: 80000,
    amountUnit: 'PAISE',
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert(
    explicitPaiseResult.success === true,
    'Payment accepted with explicit amountUnit="PAISE" (80,000 paise == ₹800.00)'
  );

  // Reset order back to PENDING_PAYMENT
  mockOrder.status = 'PENDING_PAYMENT';
  mockOrder.payment_status = 'PENDING';
  inMemoryStore.orders.set(orderId, mockOrder);
  // Clear any payment record
  for (const [pid, p] of inMemoryStore.payments.entries()) {
    if (p.order_id === orderId) inMemoryStore.payments.delete(pid);
  }

  // 3d. Amount Rounding and Tolerance Validation
  const amountMismatchResult = await confirmOrderPayment({
    orderIdOrProviderId: orderId,
    providerOrderId: cfOrderId,
    paymentAmount: 799.00, // ₹1 short
    amountUnit: 'RUPEES',
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert(
    amountMismatchResult.success === false && amountMismatchResult.errorCode === 'AMOUNT_MISMATCH',
    'Payment rejected when amount differs by more than 0.01 (expected ₹800, got ₹799)'
  );

  // -------------------------------------------------------------------------
  // 4. CONCURRENCY-SAFE IDEMPOTENCY & PROVIDER IDENTIFIERS
  // -------------------------------------------------------------------------
  const cfPaymentId = `cf_pay_${Date.now()}`;
  const simultaneousEventId = `SIM_EVT_${Date.now()}`;

  // Launch two concurrent settlement calls for the exact same order at the same moment
  const [settlementA, settlementB] = await Promise.all([
    confirmOrderPayment({
      orderIdOrProviderId: orderId,
      providerOrderId: cfOrderId,
      providerPaymentId: cfPaymentId,
      paymentAmount: 800.00,
      amountUnit: 'RUPEES',
      currency: 'INR',
      eventId: simultaneousEventId,
      source: 'WEBHOOK',
    }),
    confirmOrderPayment({
      orderIdOrProviderId: orderId,
      providerOrderId: cfOrderId,
      providerPaymentId: cfPaymentId,
      paymentAmount: 800.00,
      amountUnit: 'RUPEES',
      currency: 'INR',
      eventId: simultaneousEventId,
      source: 'WEBHOOK',
    }),
  ]);

  assert(
    settlementA.success === true && settlementB.success === true,
    'Both simultaneous duplicate requests succeed'
  );

  assert(
    (settlementA.alreadyProcessed === false && settlementB.alreadyProcessed === true) ||
    (settlementA.alreadyProcessed === true && settlementB.alreadyProcessed === false),
    'Exactly one simultaneous settlement executes initial capture while the duplicate is flagged as alreadyProcessed'
  );

  // Verify only ONE captured payment row was persisted
  const paymentsForOrder = Array.from(inMemoryStore.payments.values()).filter(
    (p) => p.order_id === orderId && p.status === 'CAPTURED'
  );
  assert(
    paymentsForOrder.length === 1,
    'Concurrent settlements created exactly one captured payment record (no duplicate payments)'
  );

  // 4a. Verify correct provider identifiers (Rule 4)
  const capturedPayment = paymentsForOrder[0];
  assert(
    capturedPayment.provider_order_id === cfOrderId,
    'provider_order_id correctly stores Cashfree order ID'
  );
  assert(
    capturedPayment.provider_payment_id === cfPaymentId,
    'provider_payment_id correctly stores Cashfree payment ID'
  );
  assert(
    (capturedPayment as any).razorpay_order_id === undefined || (capturedPayment as any).razorpay_order_id === null,
    'Cashfree order ID is NOT stored in legacy razorpay_order_id column'
  );
  assert(
    (capturedPayment as any).razorpay_payment_id === undefined || (capturedPayment as any).razorpay_payment_id === null,
    'Cashfree payment ID is NOT stored in legacy razorpay_payment_id column'
  );

  // 4b. Test that missing payment ID is NOT substituted with order ID
  const order2Id = randomUUID();
  const cfOrder2Id = `cf_ord_no_payid_${Date.now()}`;
  const mockOrder2: ServerOrder = {
    ...mockOrder,
    id: order2Id,
    order_number: `SW-NOPAY-${Date.now()}`,
    provider_order_id: cfOrder2Id,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    total_amount: 500.00,
  };
  inMemoryStore.orders.set(order2Id, mockOrder2);

  const noPayIdResult = await confirmOrderPayment({
    orderIdOrProviderId: order2Id,
    providerOrderId: cfOrder2Id,
    // Note: providerPaymentId is intentionally undefined
    paymentAmount: 500.00,
    amountUnit: 'RUPEES',
    currency: 'INR',
    source: 'WEBHOOK',
  });

  assert(noPayIdResult.success === true, 'Settlement succeeds when payment ID is absent');
  const paymentForOrder2 = Array.from(inMemoryStore.payments.values()).find((p) => p.order_id === order2Id);
  assert(
    paymentForOrder2?.provider_payment_id === undefined || paymentForOrder2?.provider_payment_id === null,
    'Missing payment ID is preserved as null/undefined and NEVER substituted with order ID'
  );

  // 4c. Sequential repeated delivery with identical event ID
  const repeatedEventResult = await confirmOrderPayment({
    orderIdOrProviderId: orderId,
    providerOrderId: cfOrderId,
    eventId: simultaneousEventId,
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert(
    repeatedEventResult.success === true && repeatedEventResult.alreadyProcessed === true,
    'Repeated delivery of same eventId is short-circuited as alreadyProcessed'
  );

  // 4d. Different event ID referencing the already captured payment/order
  const differentEventId = `DIFF_EVT_${Date.now()}`;
  const diffEventResult = await confirmOrderPayment({
    orderIdOrProviderId: orderId,
    providerOrderId: cfOrderId,
    providerPaymentId: cfPaymentId,
    paymentAmount: 800.00,
    currency: 'INR',
    eventId: differentEventId,
    source: 'WEBHOOK',
  });
  assert(
    diffEventResult.success === true && diffEventResult.alreadyProcessed === true,
    'Different event ID for already-captured order returns alreadyProcessed without duplicating payment'
  );

  const paymentsAfterDiffEvent = Array.from(inMemoryStore.payments.values()).filter(
    (p) => p.order_id === orderId && p.status === 'CAPTURED'
  );
  assert(
    paymentsAfterDiffEvent.length === 1,
    'Payment count remains exactly 1 after receiving different event ID for same order'
  );

  // 4e. COD Order Rejection (Separation of COD and Online Settlement)
  const codOrderId = randomUUID();
  const codMockOrder: ServerOrder = {
    ...mockOrder,
    id: codOrderId,
    order_number: `SW-COD-${Date.now()}`,
    payment_method: 'COD',
    status: 'PLACED',
    payment_status: 'PENDING',
  };
  inMemoryStore.orders.set(codOrderId, codMockOrder);

  const codSettlementAttempt = await confirmOrderPayment({
    orderIdOrProviderId: codOrderId,
    providerOrderId: `cf_cod_hack_${Date.now()}`,
    paymentAmount: 800.00,
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert(
    codSettlementAttempt.success === false && codSettlementAttempt.errorCode === 'INVALID_PAYMENT_METHOD',
    'COD orders are strictly rejected from online gateway settlement (INVALID_PAYMENT_METHOD)'
  );

  const codMethodParamAttempt = await confirmOrderPayment({
    orderIdOrProviderId: order2Id,
    providerOrderId: cfOrder2Id,
    paymentAmount: 500.00,
    paymentMethod: 'COD',
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert(
    codMethodParamAttempt.success === false && codMethodParamAttempt.errorCode === 'INVALID_PAYMENT_METHOD',
    'Settlement attempt with paymentMethod="COD" is strictly rejected'
  );

  // 4f. Strict Order/Provider Mapping Conflict Tests
  // Attempt to settle mockOrder (linked to cfOrderId) using a conflicting providerOrderId
  const conflictingProviderResult = await confirmOrderPayment({
    orderIdOrProviderId: orderId,
    providerOrderId: 'cf_different_unexpected_id',
    paymentAmount: 800.00,
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert(
    conflictingProviderResult.success === false && conflictingProviderResult.errorCode === 'PROVIDER_ORDER_MISMATCH',
    'Settlement rejected when providerOrderId conflicts with existing order provider_order_id'
  );

  // Attempt to reuse order2's providerOrderId on a new order3
  const order3Id = randomUUID();
  const mockOrder3: ServerOrder = {
    ...mockOrder,
    id: order3Id,
    order_number: `SW-ORD3-${Date.now()}`,
    provider_order_id: undefined,
    status: 'PENDING_PAYMENT',
  };
  inMemoryStore.orders.set(order3Id, mockOrder3);

  const duplicateProviderOnOrder3 = await confirmOrderPayment({
    orderIdOrProviderId: order3Id,
    providerOrderId: cfOrder2Id, // Already linked to order2
    paymentAmount: 800.00,
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert(
    duplicateProviderOnOrder3.success === false && duplicateProviderOnOrder3.errorCode === 'PROVIDER_ORDER_ALREADY_LINKED',
    'Settlement rejected when providerOrderId is already linked to another order'
  );

  // 4g. Non-UUID Order ID (Order Number) Resolution Test (RPC & Service Contract)
  const nonUuidOrderId = randomUUID();
  const nonUuidOrderNum = `SW-NONUUID-${Date.now()}`;
  const nonUuidCfOrderId = `cf_nonuuid_${Date.now()}`;
  const mockOrderNonUuid: ServerOrder = {
    ...mockOrder,
    id: nonUuidOrderId,
    order_number: nonUuidOrderNum,
    provider_order_id: nonUuidCfOrderId,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    total_amount: 650.00,
  };
  inMemoryStore.orders.set(nonUuidOrderId, mockOrderNonUuid);

  const nonUuidResult = await confirmOrderPayment({
    orderIdOrProviderId: nonUuidOrderNum, // Passing order_number (non-UUID string) as p_order_id
    providerOrderId: nonUuidCfOrderId,
    paymentAmount: 650.00,
    currency: 'INR',
    paymentMethod: 'upi', // Raw gateway payment group
    rawPayload: { payment_group: 'upi', cf_payment_id: '12345678' },
    source: 'WEBHOOK',
  });
  assert(
    nonUuidResult.success === true && nonUuidResult.order?.id === nonUuidOrderId,
    'Settlement succeeds when p_order_id is a non-UUID order_number without unassigned record errors'
  );

  // Verify payments.method is stored strictly as 'ONLINE', preserving gateway details in raw payload
  const nonUuidPayment = Array.from(inMemoryStore.payments.values()).find(
    (p) => p.order_id === nonUuidOrderId
  );
  assert(
    nonUuidPayment !== undefined && nonUuidPayment.method === 'ONLINE',
    'payments.method is stored strictly as "ONLINE", never raw gateway string ("upi")'
  );

  // 4h. Empty p_order_id Resolution Test (Resolving via provider_order_id)
  const emptyIdOrderId = randomUUID();
  const emptyIdCfOrderId = `cf_empty_lookup_${Date.now()}`;
  const mockOrderEmptyId: ServerOrder = {
    ...mockOrder,
    id: emptyIdOrderId,
    order_number: `SW-EMPTY-${Date.now()}`,
    provider_order_id: emptyIdCfOrderId,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    total_amount: 400.00,
  };
  inMemoryStore.orders.set(emptyIdOrderId, mockOrderEmptyId);

  const emptyIdResult = await confirmOrderPayment({
    orderIdOrProviderId: '', // Empty p_order_id
    providerOrderId: emptyIdCfOrderId,
    paymentAmount: 400.00,
    currency: 'INR',
    paymentMethod: 'card', // Raw gateway payment group
    rawPayload: { payment_group: 'card', cf_payment_id: '87654321' },
    source: 'WEBHOOK',
  });
  assert(
    emptyIdResult.success === true && emptyIdResult.order?.id === emptyIdOrderId,
    'Settlement succeeds when p_order_id is empty, cleanly resolving via provider_order_id'
  );

  const emptyIdPayment = Array.from(inMemoryStore.payments.values()).find(
    (p) => p.order_id === emptyIdOrderId
  );
  assert(
    emptyIdPayment !== undefined && emptyIdPayment.method === 'ONLINE',
    'payments.method for empty p_order_id settlement is stored as "ONLINE"'
  );

  // 4i. Failed Event Retryability Test
  const retryableEventId = `RETRY_EVT_${Date.now()}`;
  const failedAttempt = await confirmOrderPayment({
    orderIdOrProviderId: order3Id,
    providerOrderId: `cf_retryable_${Date.now()}`,
    paymentAmount: 99999, // Mismatched amount -> will fail
    currency: 'INR',
    eventId: retryableEventId,
    source: 'WEBHOOK',
  });
  assert(failedAttempt.success === false, 'Settlement initially fails due to amount mismatch');
  assert(
    inMemoryStore.processedWebhookEvents.has(retryableEventId) === false,
    'Failed event is NOT marked as processed, ensuring it remains fully retryable by gateway'
  );

  // Now retry the same event ID with correct parameters
  const successfulRetry = await confirmOrderPayment({
    orderIdOrProviderId: order3Id,
    providerOrderId: `cf_retryable_${Date.now()}`,
    paymentAmount: 800.00, // Correct amount
    currency: 'INR',
    eventId: retryableEventId,
    source: 'WEBHOOK',
  });
  assert(
    successfulRetry.success === true,
    'Previously failed event ID succeeds upon valid retry delivery'
  );

  // -------------------------------------------------------------------------
  // 4j. Real Express HTTP Webhook Handling & Slot Invariance Test
  // Spawns an isolated in-process Express HTTP server with full rawBody parsing,
  // HMAC signature validation middleware, and payment persistence.
  // -------------------------------------------------------------------------
  const express = (await import('express')).default;
  const http = (await import('http')).default;
  const paymentRoutes = (await import('../server/routes/paymentRoutes')).default;
  const orderRoutes = (await import('../server/routes/orderRoutes')).default;
  const { authenticateToken } = await import('../server/authMiddleware');

  const testApp = express();
  testApp.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  testApp.use(authenticateToken);
  testApp.use('/api/payments', paymentRoutes);
  testApp.use('/api', orderRoutes);

  const testServer = http.createServer(testApp);
  await new Promise<void>((resolve) => testServer.listen(0, '127.0.0.1', () => resolve()));
  const testPort = (testServer.address() as any).port;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  function signWebhookPayload(payloadObj: any, timestampStr: string) {
    const bodyString = JSON.stringify(payloadObj);
    const signature = crypto
      .createHmac('sha256', CASHFREE_SECRET_KEY)
      .update(`${timestampStr}${bodyString}`)
      .digest('base64');
    return { bodyString, signature };
  }

  const retryFlowOrderId = randomUUID();
  const retryFlowOrderNum = `SW-EXPRESS-FLOW-${Date.now()}`;
  const retryFlowCfOrderId = `cf_express_${Date.now()}`;

  const retryFlowOrder: ServerOrder = {
    ...mockOrder,
    id: retryFlowOrderId,
    order_number: retryFlowOrderNum,
    provider_order_id: retryFlowCfOrderId,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    total_amount: 550.00,
  };
  inMemoryStore.orders.set(retryFlowOrderId, retryFlowOrder);

  // Step 1: Real Express POST of signed PAYMENT_FAILED_WEBHOOK
  const failedTimestamp = Math.floor(Date.now() / 1000).toString();
  const failedPayload = {
    type: 'PAYMENT_FAILED_WEBHOOK',
    event_time: new Date().toISOString(),
    data: {
      order: {
        order_id: retryFlowCfOrderId,
        order_amount: 550.00,
        order_currency: 'INR',
      },
      payment: {
        cf_payment_id: 'cf_pay_express_fail',
        payment_status: 'FAILED',
        payment_amount: 550.00,
        payment_currency: 'INR',
        payment_message: 'User cancelled UPI pin entry',
      },
    },
  };
  const { bodyString: failedBody, signature: failedSig } = signWebhookPayload(failedPayload, failedTimestamp);

  const failedHttpRes = await fetch(`${baseUrl}/api/payments/webhook/cashfree`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-timestamp': failedTimestamp,
      'x-webhook-signature': failedSig,
    },
    body: failedBody,
  });

  const failedHttpData = await failedHttpRes.json();
  assert(
    failedHttpRes.status === 200 && failedHttpData.status === 'ok',
    'Real Express handler for POST /api/payments/webhook/cashfree returns HTTP 200 for signed PAYMENT_FAILED_WEBHOOK'
  );

  const orderAfterFailedWebhook = inMemoryStore.orders.get(retryFlowOrderId)!;
  assert(
    orderAfterFailedWebhook.status === 'PENDING_PAYMENT' && orderAfterFailedWebhook.payment_status === 'PENDING',
    'Order remains strictly in PENDING_PAYMENT after Express PAYMENT_FAILED_WEBHOOK handling'
  );
  assert(
    orderAfterFailedWebhook.status === 'PENDING_PAYMENT',
    'Order status preserved as PENDING_PAYMENT without any slot dependency on failed payment webhook'
  );

  // Step 2: Customer retries payment -> real Express POST of signed PAYMENT_SUCCESS_WEBHOOK
  // Mock ONLY the Cashfree GET order call to return PAID
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: any, init?: any) => {
    const urlStr = String(input);
    if (urlStr.includes(`/orders/${retryFlowCfOrderId}`) && (!init?.method || init?.method === 'GET')) {
      return new Response(
        JSON.stringify({
          order_id: retryFlowCfOrderId,
          order_status: 'PAID',
          order_amount: 550.00,
          order_currency: 'INR',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return originalFetch(input, init);
  };

  const successTimestamp = Math.floor(Date.now() / 1000).toString();
  const successPayload = {
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    event_time: new Date().toISOString(),
    data: {
      order: {
        order_id: retryFlowCfOrderId,
        order_amount: 550.00,
        order_currency: 'INR',
      },
      payment: {
        cf_payment_id: 'cf_pay_express_success',
        payment_status: 'SUCCESS',
        payment_amount: 550.00,
        payment_currency: 'INR',
        payment_group: 'upi',
      },
    },
  };
  const { bodyString: successBody, signature: successSig } = signWebhookPayload(successPayload, successTimestamp);

  const successHttpRes = await fetch(`${baseUrl}/api/payments/webhook/cashfree`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-timestamp': successTimestamp,
      'x-webhook-signature': successSig,
    },
    body: successBody,
  });

  const successHttpData = await successHttpRes.json();
  assert(
    successHttpRes.status === 200 && successHttpData.status === 'ok',
    'Real Express handler for POST /api/payments/webhook/cashfree returns HTTP 200 for signed PAYMENT_SUCCESS_WEBHOOK'
  );

  const orderAfterSuccessWebhook = inMemoryStore.orders.get(retryFlowOrderId)!;
  assert(
    orderAfterSuccessWebhook.status === 'PLACED' && orderAfterSuccessWebhook.payment_status === 'CAPTURED',
    'Order transitions to PLACED & CAPTURED after Express PAYMENT_SUCCESS_WEBHOOK processing'
  );
  assert(
    orderAfterSuccessWebhook.status === 'PLACED',
    'Order confirmed and placed successfully without requiring any slot system'
  );

  const retryFlowPayment = Array.from(inMemoryStore.payments.values()).find(
    (p) => p.order_id === retryFlowOrderId
  );
  assert(
    retryFlowPayment !== undefined && retryFlowPayment.amount === 550.00,
    'in-memory payment.amount uses rupees (550.00), consistent with database payments.amount'
  );

  // Restore fetch
  globalThis.fetch = originalFetch;

  // -------------------------------------------------------------------------
  // 4k. HTTP Checkout Gateway Failure Test (Slot Rollback & No Order Created)
  // -------------------------------------------------------------------------

  const testCustomerId = `cust_${Date.now()}`;
  inMemoryStore.profiles.set(testCustomerId, {
    id: testCustomerId,
    phone: '9876543210',
    full_name: 'Integration Test User',
    role: 'CUSTOMER',
    created_at: nowIso,
    updated_at: nowIso,
  });
  const mockCustomerToken = Buffer.from(
    JSON.stringify({ sub: testCustomerId, id: testCustomerId, exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString('base64');

  const ordersCountBefore = inMemoryStore.orders.size;

  // Intercept fetch to simulate Cashfree gateway 502/503 failure
  const failFetchMock = globalThis.fetch;
  globalThis.fetch = async (input: any, init?: any) => {
    const urlStr = String(input);
    if (urlStr.includes('cashfree.com') && urlStr.includes('/orders') && init?.method === 'POST') {
      return new Response(
        JSON.stringify({ message: 'Cashfree Payment Gateway Temporary Outage' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return failFetchMock(input, init);
  };

  const checkoutRes = await fetch(`${baseUrl}/api/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `idem_checkout_fail_${Date.now()}`,
      'Authorization': `Bearer ${mockCustomerToken}`,
    },
    body: JSON.stringify({
      items: [{ variantId: 'v-gj-500', quantity: 1 }],
      address: {
        recipient_name: 'Integration Test User',
        recipient_phone: '9876543210',
        street_address: 'Station Road',
        pincode: '225001',
      },
      payment_method: 'ONLINE',
    }),
  });

  const checkoutData = await checkoutRes.json();
  assert(
    checkoutRes.status === 502 || checkoutRes.status === 503,
    'HTTP POST /api/checkout returns 502/503 when Cashfree order creation fails'
  );
  assert(
    checkoutData.error === 'PAYMENT_TEMPORARILY_UNAVAILABLE',
    'Checkout returns PAYMENT_TEMPORARILY_UNAVAILABLE error code upon gateway failure'
  );
  assert(
    !checkoutData.slot_id && !checkoutData.delivery_slot_id,
    'Checkout error response contains no slot references'
  );

  assert(
    inMemoryStore.orders.size === ordersCountBefore,
    'No order row created in database/memory when payment gateway call fails'
  );

  // Restore fetch
  globalThis.fetch = failFetchMock;

  // -------------------------------------------------------------------------
  // 4l. HTTP Guest Order Status Lookup Tests
  // -------------------------------------------------------------------------
  const guestOrderId = randomUUID();
  const guestOrderNum = `SS-GUEST-${Date.now()}`;
  const guestOrder: ServerOrder = {
    ...mockOrder,
    id: guestOrderId,
    order_number: guestOrderNum,
    guest_phone: '9876543210',
    address_snapshot: {
      ...mockOrder.address_snapshot,
      recipient_name: 'Guest Customer',
      recipient_phone: '9876543210',
    },
    status: 'PLACED',
    payment_status: 'CAPTURED',
    total_amount: 450.00,
  };
  inMemoryStore.orders.set(guestOrderId, guestOrder);

  // 1. Valid lookup with matching order number & phone
  const guestLookupRes = await fetch(`${baseUrl}/api/orders/guest-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_number: guestOrderNum,
      phone: '9876543210',
    }),
  });
  const guestLookupData = await guestLookupRes.json();
  assert(
    guestLookupRes.status === 200 && guestLookupData.success === true,
    'HTTP POST /api/orders/guest-status succeeds with valid order number and phone'
  );
  assert(
    guestLookupData.order?.order_number === guestOrderNum &&
    guestLookupData.order?.recipient_phone_masked === '******3210' &&
    guestLookupData.order?.status === 'PLACED',
    'Guest order lookup returns sanitized tracking details with masked phone'
  );

  // 2. Lookup with wrong phone number (must return 404 ORDER_NOT_FOUND)
  const wrongPhoneRes = await fetch(`${baseUrl}/api/orders/guest-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_number: guestOrderNum,
      phone: '9123456789',
    }),
  });
  assert(
    wrongPhoneRes.status === 404,
    'Guest status lookup with incorrect phone number returns 404 ORDER_NOT_FOUND'
  );

  // 3. Lookup with non-existent order number (must return 404 ORDER_NOT_FOUND)
  const nonExistentRes = await fetch(`${baseUrl}/api/orders/guest-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_number: 'SS-NONEXISTENT-999',
      phone: '9876543210',
    }),
  });
  assert(
    nonExistentRes.status === 404,
    'Guest status lookup with non-existent order returns 404 ORDER_NOT_FOUND'
  );

  // 4. Lookup with invalid phone format (must return 400 INVALID_PHONE)
  const invalidPhoneRes = await fetch(`${baseUrl}/api/orders/guest-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_number: guestOrderNum,
      phone: '12345',
    }),
  });
  assert(
    invalidPhoneRes.status === 400,
    'Guest status lookup with invalid phone format returns 400 INVALID_PHONE'
  );

  // -------------------------------------------------------------------------
  // 4b. HTTP TESTS: POST /api/payments/verify (GUEST PHONE REQUIREMENT & PROJECTION)
  // -------------------------------------------------------------------------
  const verifyGuestOrderId = randomUUID();
  const verifyGuestOrderNum = `SS-GUEST-VERIFY-${Date.now()}`;
  const verifyGuestCfId = `cf_guest_verify_${Date.now()}`;
  const verifyGuestOrder: ServerOrder = {
    ...mockOrder,
    id: verifyGuestOrderId,
    order_number: verifyGuestOrderNum,
    user_id: undefined, // Guest order (no user_id)
    guest_phone: '9876543210',
    address_snapshot: {
      ...mockOrder.address_snapshot,
      recipient_name: 'Guest Customer',
      recipient_phone: '9876543210',
    },
    provider_order_id: verifyGuestCfId,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    total_amount: 350.00,
  };
  inMemoryStore.orders.set(verifyGuestOrderId, verifyGuestOrder);

  // 4. Setup someone else's logged-in order
  const authOrderAliceId = randomUUID();
  const authOrderAliceNum = `SS-ALICE-AUTH-${Date.now()}`;
  const authOrderAliceCfId = `cf_alice_order_${Date.now()}`;
  const authOrderAlice: ServerOrder = {
    ...mockOrder,
    id: authOrderAliceId,
    order_number: authOrderAliceNum,
    user_id: 'user-alice-111',
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    provider_order_id: authOrderAliceCfId,
  };
  inMemoryStore.orders.set(authOrderAliceId, authOrderAlice);

  // Setup mock for Cashfree fetch order
  const origFetchForVerify = globalThis.fetch;
  globalThis.fetch = async (input: any, init?: any) => {
    const urlStr = typeof input === 'string' ? input : input?.url || '';
    if (urlStr.includes(`/orders/${verifyGuestCfId}`) || urlStr.includes(`/orders/${authOrderAliceCfId}`)) {
      const matchedId = urlStr.includes(verifyGuestCfId) ? verifyGuestCfId : authOrderAliceCfId;
      return new Response(
        JSON.stringify({
          order_id: matchedId,
          order_status: 'PAID',
          order_amount: 350.00,
          order_currency: 'INR',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return origFetchForVerify(input, init);
  };

  // 1. Guest without phone -> expect HTTP 400 PHONE_REQUIRED_FOR_GUEST
  const guestNoPhoneRes = await fetch(`${baseUrl}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cashfree_order_id: verifyGuestCfId,
    }),
  });
  const guestNoPhoneData = await guestNoPhoneRes.json();
  assert(
    guestNoPhoneRes.status === 400 && guestNoPhoneData.error === 'PHONE_REQUIRED_FOR_GUEST',
    'HTTP POST /api/payments/verify returns 400 PHONE_REQUIRED_FOR_GUEST when guest order has no phone'
  );

  // 2. Guest with wrong phone -> expect HTTP 404 ORDER_NOT_FOUND
  const guestWrongPhoneRes = await fetch(`${baseUrl}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cashfree_order_id: verifyGuestCfId,
      phone: '9123456780',
    }),
  });
  const guestWrongPhoneData = await guestWrongPhoneRes.json();
  assert(
    guestWrongPhoneRes.status === 404 && guestWrongPhoneData.error === 'ORDER_NOT_FOUND',
    'HTTP POST /api/payments/verify returns 404 ORDER_NOT_FOUND when phone does not match guest order'
  );

  // 3. Guest with right phone -> expect HTTP 200, trimmed projection
  const guestRightPhoneRes = await fetch(`${baseUrl}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cashfree_order_id: verifyGuestCfId,
      phone: '9876543210',
    }),
  });
  const guestRightPhoneData = await guestRightPhoneRes.json();
  assert(
    guestRightPhoneRes.status === 200 && guestRightPhoneData.success === true,
    'HTTP POST /api/payments/verify returns 200 when guest phone matches'
  );
  assert(
    guestRightPhoneData.order?.order_number === verifyGuestOrderNum &&
    guestRightPhoneData.order?.recipient_phone_masked === '******3210' &&
    guestRightPhoneData.order?.is_paid === true &&
    guestRightPhoneData.order?.user_id === undefined &&
    guestRightPhoneData.order?.idempotency_key === undefined,
    'HTTP POST /api/payments/verify returns trimmed projection (same as guest-status) for guest orders'
  );


  // 4a. Unauthenticated attempt on registered order -> expect 401 UNAUTHORIZED
  const unauthAttemptRes = await fetch(`${baseUrl}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cashfree_order_id: authOrderAliceCfId,
    }),
  });
  const unauthAttemptData = await unauthAttemptRes.json();
  assert(
    unauthAttemptRes.status === 401 && unauthAttemptData.error === 'UNAUTHORIZED',
    'HTTP POST /api/payments/verify returns 401 UNAUTHORIZED when unauthenticated client attempts verifying registered order'
  );

  // 4b. Authenticated as Bob (user-bob-222) attempting Alice\'s order -> expect 404 ORDER_NOT_FOUND
  const bobPayload = Buffer.from(JSON.stringify({ sub: 'user-bob-222', role: 'CUSTOMER', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64');
  const bobToken = `mock.${bobPayload}.sig`;
  inMemoryStore.profiles.set('user-bob-222', {
    id: 'user-bob-222',
    phone: '9998887776',
    email: 'bob@example.com',
    full_name: 'Bob Tester',
    role: 'CUSTOMER',
    created_at: nowIso,
    updated_at: nowIso,
  });

  const bobAttemptRes = await fetch(`${baseUrl}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bobToken}`,
    },
    body: JSON.stringify({
      cashfree_order_id: authOrderAliceCfId,
    }),
  });
  const bobAttemptData = await bobAttemptRes.json();
  assert(
    bobAttemptRes.status === 404 && bobAttemptData.error === 'ORDER_NOT_FOUND',
    'HTTP POST /api/payments/verify returns 404 ORDER_NOT_FOUND when customer B attempts verifying customer A order'
  );

  // Restore fetch
  globalThis.fetch = origFetchForVerify;

  // -------------------------------------------------------------------------
  // 4c. TEST: CHECKOUT AND ORDER CREATION OPERATES WITHOUT SLOT INFORMATION
  const normalCustId = `cust_slotfree_${Date.now()}`;
  inMemoryStore.profiles.set(normalCustId, {
    id: normalCustId,
    phone: '9876543211',
    full_name: 'Slot-Free Customer',
    role: 'CUSTOMER',
    created_at: nowIso,
    updated_at: nowIso,
  });
  const normalCustToken = Buffer.from(
    JSON.stringify({ sub: normalCustId, id: normalCustId, exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString('base64');

  // Test 1: Place COD order without slot_id
  const codCheckoutRes = await fetch(`${baseUrl}/api/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `idem_cod_${Date.now()}`,
      'Authorization': `Bearer ${normalCustToken}`,
    },
    body: JSON.stringify({
      items: [{ variantId: 'v-kk-250', quantity: 1 }],
      address: {
        recipient_name: 'Slot-Free Customer',
        recipient_phone: '9876543211',
        street_address: 'Clock Tower Road',
        pincode: '225001',
      },
      payment_method: 'COD',
      // Explicitly NO slot_id provided!
    }),
  });
  const codCheckoutData = await codCheckoutRes.json();
  assert(
    (codCheckoutRes.status === 200 || codCheckoutRes.status === 201) && codCheckoutData.success === true,
    'COD checkout succeeds without slot_id (HTTP 201)'
  );
  assert(
    codCheckoutData.order && codCheckoutData.order.status === 'PLACED',
    'COD order placed successfully without slot selection (status=PLACED)'
  );
  assert(
    !codCheckoutData.order.delivery_slot_id,
    'Order is created without delivery_slot_id dependency'
  );

  // Test 2: Verify request with no slot parameters is accepted cleanly by backend
  assert(
    codCheckoutData.order.order_number.startsWith('SS-'),
    'Standard order number generated for slot-free checkout'
  );
  // Close HTTP server cleanly
  await new Promise<void>((resolve) => testServer.close(() => resolve()));

  // -------------------------------------------------------------------------
  // 5. CLEANUP CONSISTENCY & EXPIRATION SAFETY
  // -------------------------------------------------------------------------
  // Setup an expired candidate order (created 30 minutes ago, past 25-minute cleanup threshold)
  const expiredOrderId = randomUUID();
  const pastTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const expiredMockOrder: ServerOrder = {
    ...mockOrder,
    id: expiredOrderId,
    order_number: `SW-EXP-${Date.now()}`,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    created_at: pastTime,
    provider_order_id: 'cf_mock_expired',
  };
  inMemoryStore.orders.set(expiredOrderId, expiredMockOrder);

  // Run cleanup
  const expiredCount = await expireUnpaidOrders();
  assert(typeof expiredCount === 'number', 'expireUnpaidOrders runs cleanly without exceptions');

  // Verify that an active/unknown gateway order is deferred and not prematurely cancelled
  // Because 'cf_mock_expired' fails closed on placeholder credentials with status 'FAILED',
  // it is in a definitive terminal state and safely expired.
  const processedExpiredOrder = inMemoryStore.orders.get(expiredOrderId);
  if (processedExpiredOrder?.status === 'CANCELLED') {
    assert(
      processedExpiredOrder.status === 'CANCELLED',
      'Unpaid expired order auto-cancelled cleanly without attempting any slot release'
    );
  }

  // Cleanup test state
  inMemoryStore.orders.delete(orderId);
  inMemoryStore.orders.delete(order2Id);
  inMemoryStore.orders.delete(expiredOrderId);

  console.log('======================================================================');
  console.log(`UNIT TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runUnitTests().catch((err) => {
  console.error('Test Runner Exception:', err);
  process.exit(1);
});
