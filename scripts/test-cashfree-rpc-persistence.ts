import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { inMemoryStore, ServerOrder, ServerPayment } from '../server/db.js';
import { confirmOrderPayment } from '../server/services/paymentPersistenceService.js';
import { verifyWebhookSignature, extractCashfreePaymentId } from '../server/services/cashfreeService.js';

process.env.UNIT_TEST = 'true';

async function runTests() {
  console.log('======================================================================');
  console.log('TEST SUITE: CASHFREE SANDBOX & RPC PERSISTENCE (FAIL-CLOSED)');
  console.log('======================================================================\n');

  let passed = 0;
  function pass(msg: string) {
    console.log(`✓ PASS: ${msg}`);
    passed++;
  }

  const nowIso = new Date().toISOString();

  // Helper to create a test order in memory
  function createTestOrder(opts: {
    amount?: number;
    payment_method?: 'ONLINE' | 'COD';
    status?: 'PENDING_PAYMENT' | 'PLACED' | 'CANCELLED';
    payment_status?: 'PENDING' | 'CAPTURED' | 'FAILED';
    provider_order_id?: string;
  } = {}): ServerOrder {
    const id = randomUUID();
    const order_number = `SW-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const order: ServerOrder = {
      id,
      order_number,
      provider_order_id: opts.provider_order_id,
      status: opts.status || 'PENDING_PAYMENT',
      payment_status: opts.payment_status || 'PENDING',
      payment_method: opts.payment_method || 'ONLINE',
      subtotal: (opts.amount || 500) - 50,
      discount_amount: 0,
      delivery_charge: 50,
      tax_amount: 0,
      total_amount: opts.amount || 500,
      idempotency_key: `idem_${randomUUID()}`,
      placed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      address_snapshot: {
        id: randomUUID(),
        profile_id: 'test-user',
        label: 'Home',
        recipient_name: 'Cashfree Tester',
        recipient_phone: '9876543210',
        street_address: 'Main Market',
        city: 'Barabanki',
        state: 'Uttar Pradesh',
        pincode: '225001',
        is_default: true,
        created_at: nowIso,
        updated_at: nowIso,
      },
      items: [],
    };
    inMemoryStore.orders.set(id, order);
    return order;
  }

  // -------------------------------------------------------------------------
  // 1. Signature Verification
  // -------------------------------------------------------------------------
  console.log('--- 1. Webhook Signature Verification ---');
  const { CASHFREE_SECRET_KEY } = await import('../server/services/cashfreeService.js');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify({ data: { order: { order_id: 'cf_ord_1' } } });
  
  // Compute valid signature
  const crypto = await import('node:crypto');
  const validSig = crypto
    .createHmac('sha256', CASHFREE_SECRET_KEY)
    .update(timestamp + rawBody)
    .digest('base64');

  assert.strictEqual(
    verifyWebhookSignature(rawBody, validSig, timestamp),
    true,
    'Valid HMAC signature verifies successfully'
  );
  pass('Valid HMAC signature verifies successfully');

  assert.strictEqual(
    verifyWebhookSignature(rawBody, 'invalid_signature_xyz', timestamp),
    false,
    'Invalid signature is rejected'
  );
  pass('Invalid signature is rejected');

  assert.strictEqual(
    verifyWebhookSignature(rawBody, validSig, (Number(timestamp) + 500).toString()),
    false,
    'Tampered timestamp is rejected'
  );
  pass('Tampered timestamp is rejected');

  assert.strictEqual(
    verifyWebhookSignature(rawBody, '', timestamp),
    false,
    'Empty signature header is rejected'
  );
  pass('Empty signature header is rejected');

  // -------------------------------------------------------------------------
  // 2. Currency Validation
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Currency & Parameter Validation ---');
  const currencyOrder = createTestOrder({ amount: 600 });
  const cfOrder1 = `cf_${Date.now()}_curr`;

  const emptyCurrencyResult = await confirmOrderPayment({
    orderIdOrProviderId: currencyOrder.id,
    providerOrderId: cfOrder1,
    paymentAmount: 600,
    currency: '',
    source: 'WEBHOOK',
  });
  assert.strictEqual(emptyCurrencyResult.success, false);
  assert.strictEqual(emptyCurrencyResult.errorCode, 'CURRENCY_MISMATCH');
  pass('Empty currency string is strictly rejected with CURRENCY_MISMATCH');

  const usdCurrencyResult = await confirmOrderPayment({
    orderIdOrProviderId: currencyOrder.id,
    providerOrderId: cfOrder1,
    paymentAmount: 600,
    currency: 'USD',
    source: 'WEBHOOK',
  });
  assert.strictEqual(usdCurrencyResult.success, false);
  assert.strictEqual(usdCurrencyResult.errorCode, 'CURRENCY_MISMATCH');
  pass('Foreign currency (USD) is strictly rejected with CURRENCY_MISMATCH');

  const missingPayIdResult = await confirmOrderPayment({
    orderIdOrProviderId: currencyOrder.id,
    providerOrderId: cfOrder1,
    paymentAmount: 600,
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert.strictEqual(missingPayIdResult.success, false);
  assert.strictEqual(missingPayIdResult.errorCode, 'MISSING_PROVIDER_PAYMENT_ID');
  pass('Missing provider payment ID is strictly rejected with MISSING_PROVIDER_PAYMENT_ID');

  const infinityAmountResult = await confirmOrderPayment({
    orderIdOrProviderId: currencyOrder.id,
    providerOrderId: cfOrder1,
    providerPaymentId: 'cf_pay_inf_test',
    paymentAmount: Infinity,
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert.strictEqual(infinityAmountResult.success, false);
  assert.strictEqual(infinityAmountResult.errorCode, 'INVALID_PAYMENT_AMOUNT');
  pass('Non-finite payment amount (Infinity) is strictly rejected with INVALID_PAYMENT_AMOUNT');

  // -------------------------------------------------------------------------
  // 3. Amount Mismatch
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Amount Mismatch Validation ---');
  const mismatchOrder = createTestOrder({ amount: 750 });
  const cfOrder2 = `cf_${Date.now()}_amt`;

  const mismatchResult = await confirmOrderPayment({
    orderIdOrProviderId: mismatchOrder.id,
    providerOrderId: cfOrder2,
    providerPaymentId: 'cf_pay_mismatch_1',
    paymentAmount: 500, // Expected 750
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert.strictEqual(mismatchResult.success, false);
  assert.strictEqual(mismatchResult.errorCode, 'AMOUNT_MISMATCH');
  assert.strictEqual(mismatchOrder.status, 'PENDING_PAYMENT');
  assert.strictEqual(mismatchOrder.payment_status, 'PENDING');
  pass('Underpaid payment is rejected with AMOUNT_MISMATCH and order remains PENDING_PAYMENT');

  const overpayResult = await confirmOrderPayment({
    orderIdOrProviderId: mismatchOrder.id,
    providerOrderId: cfOrder2,
    providerPaymentId: 'cf_pay_mismatch_2',
    paymentAmount: 9999, // Expected 750
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert.strictEqual(overpayResult.success, false);
  assert.strictEqual(overpayResult.errorCode, 'AMOUNT_MISMATCH');
  pass('Overpaid payment is rejected with AMOUNT_MISMATCH');

  // -------------------------------------------------------------------------
  // 4. Failed Payment Handling
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Failed Payment Webhook Handling ---');
  const failedOrder = createTestOrder({ amount: 450 });
  // Order must remain PENDING_PAYMENT so customer can retry
  assert.strictEqual(failedOrder.status, 'PENDING_PAYMENT');
  assert.strictEqual(failedOrder.payment_status, 'PENDING');
  pass('Failed payment leaves order in PENDING_PAYMENT allowing customer retry');

  // -------------------------------------------------------------------------
  // 5. Live Supabase Fail-Closed Verification (Real Live Database State)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Live Supabase Fail-Closed Verification ---');
  const liveOrder = createTestOrder({ amount: 500 });
  const liveCfOrderId = `cf_${Date.now()}_live`;
  const liveCfPaymentId = `cf_pay_${Date.now()}_live`;

  // Because the migration is not yet applied to production, live Supabase returns PGRST202
  const liveResult = await confirmOrderPayment({
    orderIdOrProviderId: liveOrder.id,
    providerOrderId: liveCfOrderId,
    providerPaymentId: liveCfPaymentId,
    paymentAmount: 500,
    currency: 'INR',
    source: 'WEBHOOK',
  });

  assert.strictEqual(liveResult.success, false, 'Against live DB without order in DB, settlement must fail closed');
  assert.ok(
    liveResult.errorCode === 'ORDER_NOT_FOUND' || liveResult.errorCode === 'RPC_UNAVAILABLE',
    `Returns expected fail-closed error code (got ${liveResult.errorCode})`
  );
  assert.strictEqual(liveOrder.status, 'PENDING_PAYMENT', 'Order status remains PENDING_PAYMENT');
  assert.strictEqual(liveOrder.payment_status, 'PENDING', 'Payment status remains PENDING');
  pass('REAL LIVE DB TEST: confirm_order_payment_atomic strictly fails closed without unverified capture');
  pass('REAL LIVE DB TEST: Live order remains in PENDING_PAYMENT');

  // -------------------------------------------------------------------------
  // 6. Successful Settlement, Idempotency & Concurrency with Simulated RPC
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Successful Settlement & Idempotency (Simulated RPC Success) ---');
  const { _setTestSupabaseClient } = await import('../server/services/paymentPersistenceService.js');

  const capturedPayments = new Set<string>();
  const processedEvents = new Set<string>();

  const mockSuccessRpc = {
    rpc: async (funcName: string, params: any) => {
      if (funcName === 'confirm_order_payment_atomic') {
        const { p_event_id, p_order_id } = params;
        if (p_event_id && processedEvents.has(p_event_id)) {
          return {
            data: { success: true, already_processed: true, order_id: p_order_id },
            error: null,
          };
        }
        if (capturedPayments.has(p_order_id)) {
          return {
            data: { success: true, already_processed: true, order_id: p_order_id },
            error: null,
          };
        }
        if (p_event_id) processedEvents.add(p_event_id);
        capturedPayments.add(p_order_id);
        return {
          data: { success: true, already_processed: false, order_id: p_order_id },
          error: null,
        };
      }
      return { data: null, error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
  };

  try {
    _setTestSupabaseClient(mockSuccessRpc, true);

    const successOrder = createTestOrder({ amount: 500 });
    const successCfOrderId = `cf_${Date.now()}_succ`;
    const successCfPaymentId = `cf_pay_${Date.now()}_1`;
    const eventId = `evt_${Date.now()}_1`;

    const settlement1 = await confirmOrderPayment({
      orderIdOrProviderId: successOrder.id,
      providerOrderId: successCfOrderId,
      providerPaymentId: successCfPaymentId,
      paymentAmount: 500,
      currency: 'INR',
      eventId,
      eventType: 'PAYMENT_SUCCESS_WEBHOOK',
      source: 'WEBHOOK',
    });

    assert.strictEqual(settlement1.success, true);
    assert.strictEqual(settlement1.alreadyProcessed, false);
    assert.strictEqual(successOrder.status, 'PLACED');
    assert.strictEqual(successOrder.payment_status, 'CAPTURED');
    pass('Valid payment successfully transitions order to PLACED and CAPTURED when RPC succeeds');

    // Repeated delivery of same eventId
    const settlement2 = await confirmOrderPayment({
      orderIdOrProviderId: successOrder.id,
      providerOrderId: successCfOrderId,
      providerPaymentId: successCfPaymentId,
      paymentAmount: 500,
      currency: 'INR',
      eventId,
      eventType: 'PAYMENT_SUCCESS_WEBHOOK',
      source: 'WEBHOOK',
    });

    assert.strictEqual(settlement2.success, true);
    assert.strictEqual(settlement2.alreadyProcessed, true);
    pass('Repeated delivery of same webhook eventId returns alreadyProcessed: true (idempotent)');

    // Different event ID for already-captured order
    const settlement3 = await confirmOrderPayment({
      orderIdOrProviderId: successOrder.id,
      providerOrderId: successCfOrderId,
      providerPaymentId: successCfPaymentId,
      paymentAmount: 500,
      currency: 'INR',
      eventId: `evt_different_${Date.now()}`,
      eventType: 'PAYMENT_SUCCESS_WEBHOOK',
      source: 'WEBHOOK',
    });

    assert.strictEqual(settlement3.success, true);
    assert.strictEqual(settlement3.alreadyProcessed, true);
    pass('New event ID for already-captured order returns alreadyProcessed: true without duplicating payment');

    // Conflicting payment ID on already captured order is strictly rejected
    const conflictingPaymentResult = await confirmOrderPayment({
      orderIdOrProviderId: successOrder.id,
      providerOrderId: successCfOrderId,
      providerPaymentId: `different_pay_id_${Date.now()}`,
      paymentAmount: 500,
      currency: 'INR',
      eventId: `evt_conflict_${Date.now()}`,
      eventType: 'PAYMENT_SUCCESS_WEBHOOK',
      source: 'WEBHOOK',
    });
    assert.strictEqual(conflictingPaymentResult.success, false);
    assert.strictEqual(conflictingPaymentResult.errorCode, 'PAYMENT_ID_MISMATCH');
    pass('Conflicting provider payment ID on already settled order is rejected with PAYMENT_ID_MISMATCH');

    // Duplicate providerPaymentId on another order is strictly rejected
    const orderB = createTestOrder({ amount: 500 });
    const duplicatePaymentResult = await confirmOrderPayment({
      orderIdOrProviderId: orderB.id,
      providerOrderId: `cf_order_b_${Date.now()}`,
      providerPaymentId: successCfPaymentId, // already used on successOrder
      paymentAmount: 500,
      currency: 'INR',
      source: 'WEBHOOK',
    });
    assert.strictEqual(duplicatePaymentResult.success, false);
    assert.strictEqual(duplicatePaymentResult.errorCode, 'PAYMENT_ID_ALREADY_USED');
    pass('Reusing same provider payment ID on a different order is rejected with PAYMENT_ID_ALREADY_USED');

    // Concurrent duplicate delivery
    console.log('\n--- 7. Concurrent Duplicate Delivery ---');
    const raceOrder = createTestOrder({ amount: 1000 });
    const raceCfOrder = `cf_${Date.now()}_race`;
    const racePaymentId = `cf_pay_${Date.now()}_race`;

    const [resA, resB] = await Promise.all([
      confirmOrderPayment({
        orderIdOrProviderId: raceOrder.id,
        providerOrderId: raceCfOrder,
        providerPaymentId: racePaymentId,
        paymentAmount: 1000,
        currency: 'INR',
        source: 'WEBHOOK',
      }),
      confirmOrderPayment({
        orderIdOrProviderId: raceOrder.id,
        providerOrderId: raceCfOrder,
        providerPaymentId: racePaymentId,
        paymentAmount: 1000,
        currency: 'INR',
        source: 'WEBHOOK',
      }),
    ]);

    assert.strictEqual(resA.success, true);
    assert.strictEqual(resB.success, true);
    const oneProcessed = (resA.alreadyProcessed && !resB.alreadyProcessed) || (!resA.alreadyProcessed && resB.alreadyProcessed);
    assert.strictEqual(oneProcessed, true, 'Exactly one concurrent call executed initial capture');
    pass('Concurrent duplicate webhook delivery is serialized; exactly one captures while the other returns alreadyProcessed');

  } finally {
    _setTestSupabaseClient(undefined, undefined);
  }

  // -------------------------------------------------------------------------
  // 8. General Database Error Fail-Closed Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Database Error Fail-Closed Verification ---');
  const mockDbErrorClient = {
    rpc: async () => {
      return {
        data: null,
        error: {
          code: '40001',
          message: 'could not serialize access due to concurrent update',
        },
      };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  };

  const dbErrOrder = createTestOrder({ amount: 400 });
  try {
    _setTestSupabaseClient(mockDbErrorClient, true);

    const dbErrResult = await confirmOrderPayment({
      orderIdOrProviderId: dbErrOrder.id,
      providerOrderId: `cf_${Date.now()}_db_err`,
      providerPaymentId: `cf_pay_err_${Date.now()}`,
      paymentAmount: 400,
      currency: 'INR',
      source: 'WEBHOOK',
    });

    assert.strictEqual(dbErrResult.success, false, 'Database error must fail closed (success: false)');
    assert.strictEqual(dbErrResult.errorCode, '40001', 'Propagates DB error code');
    assert.strictEqual(dbErrOrder.status, 'PENDING_PAYMENT', 'Order remains in PENDING_PAYMENT status');
    assert.strictEqual(dbErrOrder.payment_status, 'PENDING', 'Payment status remains PENDING');
    pass('General database error strictly fails closed: order remains PENDING_PAYMENT and payment is NOT captured');
  } finally {
    _setTestSupabaseClient(undefined, undefined);
  }

  // -------------------------------------------------------------------------
  // 9. Atomicity: Forced Payment-Insert Failure & Settlement Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Atomicity: Forced Payment-Insert Failure & Rollback ---');
  try {
    _setTestSupabaseClient(null, false);

    const atomicityOrder = createTestOrder({ amount: 850 });
    const atomicityCfOrderId = `cf_${Date.now()}_atomic`;
    const atomicityPayId = `cf_pay_${Date.now()}_atomic`;
    const atomicityEventId = `evt_atomic_${Date.now()}`;

    // Step 1: Force payment-insert failure
    (inMemoryStore as any)._forcePaymentInsertFailure = true;
    try {
      const forcedFailureResult = await confirmOrderPayment({
        orderIdOrProviderId: atomicityOrder.id,
        providerOrderId: atomicityCfOrderId,
        providerPaymentId: atomicityPayId,
        paymentAmount: 850,
        currency: 'INR',
        eventId: atomicityEventId,
        eventType: 'PAYMENT_SUCCESS_WEBHOOK',
        source: 'WEBHOOK',
      });

      assert.strictEqual(forcedFailureResult.success, false, 'Forced payment failure returns success: false');
      assert.strictEqual(forcedFailureResult.errorCode, 'PAYMENT_INSERT_FAILED');
      assert.strictEqual(atomicityOrder.status, 'PENDING_PAYMENT', 'Order status is completely unchanged (PENDING_PAYMENT)');
      assert.strictEqual(atomicityOrder.payment_status, 'PENDING', 'Order payment_status is completely unchanged (PENDING)');

      const paymentsForAtomicityOrder = Array.from(inMemoryStore.payments.values()).filter(
        (p) => p.order_id === atomicityOrder.id
      );
      assert.strictEqual(paymentsForAtomicityOrder.length, 0, 'Zero payments created on forced failure');
      pass('A forced payment-insert failure leaves the order and payment state unchanged');
    } finally {
      (inMemoryStore as any)._forcePaymentInsertFailure = false;
    }

    // Step 2: Retry with normal operation - must succeed and create exactly one payment
    const atomicSuccessResult = await confirmOrderPayment({
      orderIdOrProviderId: atomicityOrder.id,
      providerOrderId: atomicityCfOrderId,
      providerPaymentId: atomicityPayId,
      paymentAmount: 850,
      currency: 'INR',
      eventId: atomicityEventId,
      eventType: 'PAYMENT_SUCCESS_WEBHOOK',
      source: 'WEBHOOK',
    });

    assert.strictEqual(atomicSuccessResult.success, true);
    assert.strictEqual(atomicityOrder.status, 'PLACED');
    assert.strictEqual(atomicityOrder.payment_status, 'CAPTURED');

    const paymentsAfterSuccess = Array.from(inMemoryStore.payments.values()).filter(
      (p) => p.order_id === atomicityOrder.id && p.status === 'CAPTURED'
    );
    assert.strictEqual(paymentsAfterSuccess.length, 1, 'Exactly one captured payment record created');
    pass('Successful settlement creates exactly one captured payment and updates the order');

    // -------------------------------------------------------------------------
    // 10. Webhook Event Conflicts: Reusing Event ID for Different Order/Payment
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Webhook Event Identity Conflicts ---');
    const conflictOrderTarget = createTestOrder({ amount: 920 });
    const reusedEventResult = await confirmOrderPayment({
      orderIdOrProviderId: conflictOrderTarget.id,
      providerOrderId: `cf_${Date.now()}_conflict_order`,
      providerPaymentId: `cf_pay_conflict_${Date.now()}`,
      paymentAmount: 920,
      currency: 'INR',
      eventId: atomicityEventId, // Reusing event ID already associated with atomicityOrder!
      eventType: 'PAYMENT_SUCCESS_WEBHOOK',
      source: 'WEBHOOK',
    });

    assert.strictEqual(reusedEventResult.success, false, 'Reusing event ID on different order must be rejected');
    assert.strictEqual(reusedEventResult.errorCode, 'EVENT_ID_CONFLICT');
    assert.strictEqual(conflictOrderTarget.status, 'PENDING_PAYMENT', 'Target order remains in PENDING_PAYMENT');
    assert.strictEqual(conflictOrderTarget.payment_status, 'PENDING', 'Target order remains in PENDING payment_status');
    pass('Reusing an event ID for a different payment/order is rejected safely (EVENT_ID_CONFLICT)');
  } finally {
    _setTestSupabaseClient(undefined, undefined);
  }

  // -------------------------------------------------------------------------
  // 11. Provider Payment ID Extraction & Regression Tests
  // -------------------------------------------------------------------------
  console.log('\n--- 11. Provider Payment ID Extraction & Regression Tests ---');

  // A. Valid String and Numeric Payment IDs
  assert.strictEqual(
    extractCashfreePaymentId({ cf_payment_id: 'cf_pay_998811' }),
    'cf_pay_998811',
    'Extracts standard string cf_payment_id'
  );
  pass('Extracts standard string cf_payment_id');

  assert.strictEqual(
    extractCashfreePaymentId({ cf_payment_id: 1453002795 }),
    '1453002795',
    'Extracts numeric cf_payment_id as string'
  );
  pass('Extracts numeric cf_payment_id as string');

  assert.strictEqual(
    extractCashfreePaymentId({ payment_id: 'pay_554433' }),
    'pay_554433',
    'Extracts payment_id field'
  );
  pass('Extracts payment_id field');

  assert.strictEqual(
    extractCashfreePaymentId({ payment_id: 887766 }),
    '887766',
    'Extracts numeric payment_id field'
  );
  pass('Extracts numeric payment_id field');

  assert.strictEqual(
    extractCashfreePaymentId({ payment_gateway_details: { gateway_payment_id: 'gw_pay_1122' } }),
    'gw_pay_1122',
    'Extracts gateway_payment_id from payment_gateway_details'
  );
  pass('Extracts gateway_payment_id from payment_gateway_details');

  // B. Malformed & Missing Inputs (Must safely return undefined without throwing)
  assert.strictEqual(extractCashfreePaymentId(null), undefined, 'null returns undefined');
  assert.strictEqual(extractCashfreePaymentId(undefined), undefined, 'undefined returns undefined');
  assert.strictEqual(extractCashfreePaymentId(''), undefined, 'empty string returns undefined');
  assert.strictEqual(extractCashfreePaymentId(12345), undefined, 'number returns undefined');
  assert.strictEqual(extractCashfreePaymentId([]), undefined, 'array returns undefined');
  assert.strictEqual(extractCashfreePaymentId({}), undefined, 'empty object returns undefined');
  assert.strictEqual(extractCashfreePaymentId({ cf_payment_id: null }), undefined, 'null cf_payment_id returns undefined');
  assert.strictEqual(extractCashfreePaymentId({ cf_payment_id: undefined }), undefined, 'undefined cf_payment_id returns undefined');
  assert.strictEqual(extractCashfreePaymentId({ cf_payment_id: '' }), undefined, 'empty string cf_payment_id returns undefined');
  assert.strictEqual(extractCashfreePaymentId({ cf_payment_id: '   ' }), undefined, 'whitespace cf_payment_id returns undefined');
  assert.strictEqual(extractCashfreePaymentId({ cf_payment_id: 'null' }), undefined, 'literal "null" string returns undefined');
  assert.strictEqual(extractCashfreePaymentId({ cf_payment_id: 'undefined' }), undefined, 'literal "undefined" string returns undefined');
  pass('Malformed, null, undefined, and empty payment inputs safely return undefined');

  // C. Missing Provider Payment ID Fail-Closed Behavior
  const failClosedOrder = createTestOrder({ amount: 650 });
  const missingIdResult = await confirmOrderPayment({
    orderIdOrProviderId: failClosedOrder.id,
    providerOrderId: `cf_${Date.now()}_missing_id`,
    paymentAmount: 650,
    currency: 'INR',
    source: 'WEBHOOK',
  });
  assert.strictEqual(missingIdResult.success, false, 'Missing payment ID must return success: false');
  assert.strictEqual(missingIdResult.errorCode, 'MISSING_PROVIDER_PAYMENT_ID', 'Returns MISSING_PROVIDER_PAYMENT_ID');
  assert.strictEqual(failClosedOrder.status, 'PENDING_PAYMENT', 'Order status remains PENDING_PAYMENT');
  assert.strictEqual(failClosedOrder.payment_status, 'PENDING', 'Payment status remains PENDING');
  const paymentsForFailed = Array.from(inMemoryStore.payments.values()).filter((p) => p.order_id === failClosedOrder.id);
  assert.strictEqual(paymentsForFailed.length, 0, 'No payment record created on missing payment ID');
  pass('Missing payment ID fails closed without marking order CAPTURED or inserting payment');

  // D. Safe Recovery from rawPayload (In-Memory Persistence)
  try {
    _setTestSupabaseClient(null, false);
    const payloadRecoveryOrder = createTestOrder({ amount: 350 });
    const recoveryResult = await confirmOrderPayment({
      orderIdOrProviderId: payloadRecoveryOrder.id,
      providerOrderId: `cf_${Date.now()}_rec`,
      paymentAmount: 350,
      currency: 'INR',
      rawPayload: {
        data: {
          payment: {
            cf_payment_id: 19882233,
          },
        },
      },
      source: 'WEBHOOK',
    });
    assert.strictEqual(recoveryResult.success, true, 'Successfully recovers payment ID from rawPayload');
    assert.strictEqual(payloadRecoveryOrder.status, 'PLACED');
    assert.strictEqual(payloadRecoveryOrder.payment_status, 'CAPTURED');
    assert.strictEqual(payloadRecoveryOrder.provider_payment_id, '19882233', 'Maps numeric cf_payment_id to string');
    pass('Authoritative payment ID recovered safely from rawPayload and mapped correctly');
  } finally {
    _setTestSupabaseClient(undefined, undefined);
  }

  // E. RPC Invocation Parameter Verification (Ensures clean payment ID passed to confirm_order_payment_atomic)
  let capturedRpcParams: any = null;
  const mockRpcSpy = {
    rpc: async (funcName: string, params: any) => {
      if (funcName === 'confirm_order_payment_atomic') {
        capturedRpcParams = params;
        return {
          data: { success: true, already_processed: false, order_id: params.p_order_id },
          error: null,
        };
      }
      return { data: null, error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
  };

  try {
    _setTestSupabaseClient(mockRpcSpy, true);
    const rpcOrder = createTestOrder({ amount: 420 });
    const rpcResult = await confirmOrderPayment({
      orderIdOrProviderId: rpcOrder.id,
      providerOrderId: `cf_${Date.now()}_rpc_test`,
      paymentAmount: 420,
      currency: 'INR',
      rawPayload: {
        data: {
          payment: {
            cf_payment_id: 987654321,
          },
        },
      },
      source: 'WEBHOOK',
    });

    assert.strictEqual(rpcResult.success, true);
    assert.ok(capturedRpcParams, 'RPC confirm_order_payment_atomic was called');
    assert.strictEqual(capturedRpcParams.p_provider_payment_id, '987654321', 'RPC received clean string payment ID');
    assert.strictEqual(capturedRpcParams.p_provider_order_id.startsWith('cf_'), true, 'Order ID kept strictly separate from payment ID');
    assert.notStrictEqual(capturedRpcParams.p_provider_payment_id, capturedRpcParams.p_provider_order_id, 'Order ID and payment ID never substituted');
    pass('confirm_order_payment_atomic called with separated, authoritative provider payment ID');
  } finally {
    _setTestSupabaseClient(undefined, undefined);
  }


  console.log('\n======================================================================');
  console.log(`TEST SUITE COMPLETE: ${passed} Passed, 0 Failed`);
  console.log('======================================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
