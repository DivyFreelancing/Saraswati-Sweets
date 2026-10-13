// Guarantee complete test isolation before importing server modules
process.env.ENABLE_ORDER_CLEANUP = 'true';
process.env.UNIT_TEST = 'true';
process.env.NODE_ENV = 'test';

import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import type { ServerOrder } from '../server/db';

async function runOrderCleanupJobTests() {
  const {
    inMemoryStore,
    expireUnpaidOrders,
    orderCleanupTracker,
    clearOrderCleanupTracker,
    getNextBackoffDelay,
  } = await import('../server/db');
  const { fetchCashfreeOrderDetails } = await import('../server/services/cashfreeService');

  // Clear in-memory store orders so stray seed orders don't interfere with test assertions
  inMemoryStore.orders.clear();

  console.log('======================================================================');
  console.log('SARASWATI SWEETS: ORDER CLEANUP JOB COMPREHENSIVE TEST SUITE (MOCKS ONLY)');
  console.log('======================================================================');

  const originalFetch = globalThis.fetch;
  let simulatedResponse: { status: number; ok: boolean; data?: any; throws?: boolean } = {
    status: 200,
    ok: true,
    data: { order_status: 'ACTIVE', order_amount: 500, order_currency: 'INR' },
  };
  let fetchCallCount = 0;

  globalThis.fetch = async (url: any, init?: any) => {
    const urlStr = String(url);
    if (urlStr.includes('/orders/')) {
      fetchCallCount++;
      if (simulatedResponse.throws) {
        throw new Error('Network timeout / connection refused');
      }
      return {
        ok: simulatedResponse.ok,
        status: simulatedResponse.status,
        json: async () => simulatedResponse.data || {},
      } as any;
    }
    return originalFetch(url, init);
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: configError / 401 / 429 / 5xx / timeout NEVER cancel
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Verification: configError / 401 / 429 / 5xx / timeout never cancel ---');
    clearOrderCleanupTracker();

    // 1a. Missing order ID
    const emptyOrderRes = await fetchCashfreeOrderDetails('');
    assert.strictEqual(emptyOrderRes.status, 'UNKNOWN');
    assert.strictEqual(emptyOrderRes.reason, 'configError');
    console.log('✓ PASS: Empty orderId returns UNKNOWN with reason=configError');

    // 1b. HTTP 401
    simulatedResponse = { status: 401, ok: false };
    const res401 = await fetchCashfreeOrderDetails('cf_test_401');
    assert.strictEqual(res401.status, 'UNKNOWN');
    assert.strictEqual(res401.reason, 'configError');
    console.log('✓ PASS: HTTP 401 returns UNKNOWN with reason=configError (never FAILED/EXPIRED)');

    // 1c. HTTP 403
    simulatedResponse = { status: 403, ok: false };
    const res403 = await fetchCashfreeOrderDetails('cf_test_403');
    assert.strictEqual(res403.status, 'UNKNOWN');
    assert.strictEqual(res403.reason, 'configError');
    console.log('✓ PASS: HTTP 403 returns UNKNOWN with reason=configError');

    // 1d. HTTP 429
    simulatedResponse = { status: 429, ok: false };
    const res429 = await fetchCashfreeOrderDetails('cf_test_429');
    assert.strictEqual(res429.status, 'UNKNOWN');
    assert.strictEqual(res429.reason, 'transient');
    assert.strictEqual(res429.isNetworkError, true);
    console.log('✓ PASS: HTTP 429 returns UNKNOWN with reason=transient');

    // 1e. HTTP 500 / 503
    simulatedResponse = { status: 503, ok: false };
    const res503 = await fetchCashfreeOrderDetails('cf_test_503');
    assert.strictEqual(res503.status, 'UNKNOWN');
    assert.strictEqual(res503.reason, 'transient');
    assert.strictEqual(res503.isNetworkError, true);
    console.log('✓ PASS: HTTP 503 returns UNKNOWN with reason=transient');

    // 1f. Timeout / Throw
    simulatedResponse = { status: 0, ok: false, throws: true };
    const resTimeout = await fetchCashfreeOrderDetails('cf_test_timeout');
    assert.strictEqual(resTimeout.status, 'UNKNOWN');
    assert.strictEqual(resTimeout.reason, 'transient');
    assert.strictEqual(resTimeout.isNetworkError, true);
    console.log('✓ PASS: Timeout/Fetch throw returns UNKNOWN with reason=transient');

    // Verify none of these ever cause expireUnpaidOrders to cancel an order
    const transientOrderId = randomUUID();
    const transientOrder: ServerOrder = {
      id: transientOrderId,
      order_number: `SS-TRANSIENT-${Date.now()}`,
      provider_order_id: `cf_transient_${Date.now()}`,
      status: 'PENDING_PAYMENT',
      payment_status: 'PENDING',
      payment_method: 'ONLINE',
      total_amount: 500,
      currency: 'INR',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      items: [],
      delivery_address: {
        recipient_name: 'Test',
        phone: '9876543210',
        address_line1: 'Barabanki',
        city: 'Barabanki',
        pincode: '225001',
      },
    };
    inMemoryStore.orders.set(transientOrderId, transientOrder);

    // Run cleanup with HTTP 503 error
    simulatedResponse = { status: 503, ok: false, throws: false };
    const expiredCountTransient = await expireUnpaidOrders();
    assert.strictEqual(expiredCountTransient, 0, 'No orders expired on transient gateway 503');
    assert.strictEqual(transientOrder.status, 'PENDING_PAYMENT', 'Order remains PENDING_PAYMENT on 503');

    // Run cleanup with network timeout
    simulatedResponse = { status: 0, ok: false, throws: true };
    const trackingObj = orderCleanupTracker.get(transientOrderId)!;
    trackingObj.nextCheckAt = Date.now() - 1000; // force past cooldown
    const expiredCountTimeout = await expireUnpaidOrders();
    assert.strictEqual(expiredCountTimeout, 0, 'No orders expired on network timeout');
    assert.strictEqual(transientOrder.status, 'PENDING_PAYMENT', 'Order remains PENDING_PAYMENT on timeout');
    console.log('✓ PASS: Transient errors and timeouts strictly defer without cancelling');

    inMemoryStore.orders.delete(transientOrderId);
    clearOrderCleanupTracker();

    // -------------------------------------------------------------------------
    // TEST 2: EXPIRED, TERMINATED, FAILED cancel; PAID reconciled; ACTIVE & TERMINATION_REQUESTED defer
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Terminal Gateway Statuses vs Non-Terminal Statuses ---');

    async function testOrderStatusBehavior(
      simStatus: string,
      httpStatus: number = 200
    ): Promise<{ finalStatus: string; expiredCount: number }> {
      clearOrderCleanupTracker();
      const testId = randomUUID();
      const testOrder: ServerOrder = {
        id: testId,
        order_number: `SS-TEST-${simStatus}-${Date.now()}`,
        provider_order_id: `cf_${testId}`,
        status: 'PENDING_PAYMENT',
        payment_status: 'PENDING',
        payment_method: 'ONLINE',
        total_amount: 600,
        currency: 'INR',
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        items: [],
        delivery_address: {
          recipient_name: 'Customer',
          phone: '9876543210',
          address_line1: 'Barabanki',
          city: 'Barabanki',
          pincode: '225001',
        },
      };
      inMemoryStore.orders.set(testId, testOrder);

      simulatedResponse = {
        status: httpStatus,
        ok: httpStatus === 200,
        data: httpStatus === 200 ? { order_status: simStatus, order_amount: 600, order_currency: 'INR' } : {},
        throws: false,
      };

      const count = await expireUnpaidOrders();
      const resOrder = inMemoryStore.orders.get(testId)!;
      inMemoryStore.orders.delete(testId);
      clearOrderCleanupTracker();
      return { finalStatus: resOrder.status, expiredCount: count };
    }

    // 2a. EXPIRED -> CANCELLED
    const rExpired = await testOrderStatusBehavior('EXPIRED');
    assert.strictEqual(rExpired.finalStatus, 'CANCELLED');
    assert.strictEqual(rExpired.expiredCount, 1);
    console.log('✓ PASS: Cashfree EXPIRED results in order cancellation');

    // 2b. TERMINATED -> CANCELLED
    const rTerminated = await testOrderStatusBehavior('TERMINATED');
    assert.strictEqual(rTerminated.finalStatus, 'CANCELLED');
    assert.strictEqual(rTerminated.expiredCount, 1);
    console.log('✓ PASS: Cashfree TERMINATED results in order cancellation');

    // 2c. FAILED -> CANCELLED
    const rFailed = await testOrderStatusBehavior('FAILED');
    assert.strictEqual(rFailed.finalStatus, 'CANCELLED');
    assert.strictEqual(rFailed.expiredCount, 1);
    console.log('✓ PASS: Cashfree FAILED results in order cancellation');

    // 2d. Explicit 404 (never-created) -> CANCELLED
    const r404 = await testOrderStatusBehavior('', 404);
    assert.strictEqual(r404.finalStatus, 'CANCELLED');
    assert.strictEqual(r404.expiredCount, 1);
    console.log('✓ PASS: Explicit 404 (order not found on gateway) results in order cancellation');

    // 2e. PAID -> Reconciled to PLACED
    const rPaid = await testOrderStatusBehavior('PAID');
    assert.strictEqual(rPaid.finalStatus, 'PLACED');
    assert.strictEqual(rPaid.expiredCount, 0);
    console.log('✓ PASS: Cashfree PAID reconciles order to PLACED without cancelling');

    // 2f. ACTIVE -> DEFER
    const rActive = await testOrderStatusBehavior('ACTIVE');
    assert.strictEqual(rActive.finalStatus, 'PENDING_PAYMENT');
    assert.strictEqual(rActive.expiredCount, 0);
    console.log('✓ PASS: Cashfree ACTIVE defers cancellation (order remains PENDING_PAYMENT)');

    // 2g. TERMINATION_REQUESTED -> DEFER
    const rTermReq = await testOrderStatusBehavior('TERMINATION_REQUESTED');
    assert.strictEqual(rTermReq.finalStatus, 'PENDING_PAYMENT');
    assert.strictEqual(rTermReq.expiredCount, 0);
    console.log('✓ PASS: Cashfree TERMINATION_REQUESTED defers cancellation');

    // -------------------------------------------------------------------------
    // TEST 3: Backoff schedule progression across simulated cycles
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Backoff Schedule Progression Across Cycles ---');
    clearOrderCleanupTracker();

    // Verify backoff delays function
    assert.strictEqual(getNextBackoffDelay(1), 2 * 60 * 1000, 'Check 1 backoff is +2 min');
    assert.strictEqual(getNextBackoffDelay(2), 10 * 60 * 1000, 'Check 2 backoff is +10 min');
    assert.strictEqual(getNextBackoffDelay(3), 30 * 60 * 1000, 'Check 3 backoff is +30 min');
    assert.strictEqual(getNextBackoffDelay(4), 2 * 60 * 60 * 1000, 'Check 4 backoff is +2 hours');
    assert.strictEqual(getNextBackoffDelay(5), 24 * 60 * 60 * 1000, 'Check 5+ backoff is +24 hours');
    console.log('✓ PASS: getNextBackoffDelay calculates correct progression (+2m, +10m, +30m, +2h, +24h)');

    const backoffOrderId = randomUUID();
    const backoffOrder: ServerOrder = {
      id: backoffOrderId,
      order_number: `SS-BACKOFF-${Date.now()}`,
      provider_order_id: `cf_backoff_${Date.now()}`,
      status: 'PENDING_PAYMENT',
      payment_status: 'PENDING',
      payment_method: 'ONLINE',
      total_amount: 450,
      currency: 'INR',
      created_at: new Date(Date.now() - 26 * 60 * 1000).toISOString(), // > 25 min
      updated_at: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
      items: [],
      delivery_address: {
        recipient_name: 'Backoff Test',
        phone: '9876543210',
        address_line1: 'Barabanki',
        city: 'Barabanki',
        pincode: '225001',
      },
    };
    inMemoryStore.orders.set(backoffOrderId, backoffOrder);

    simulatedResponse = {
      status: 200,
      ok: true,
      data: { order_status: 'ACTIVE', order_amount: 450, order_currency: 'INR' },
      throws: false,
    };

    // Cycle 1: First check at 25 min -> queries Cashfree
    fetchCallCount = 0;
    await expireUnpaidOrders();
    assert.strictEqual(fetchCallCount, 1, 'First check calls Cashfree API');
    const bState1 = orderCleanupTracker.get(backoffOrderId)!;
    assert.strictEqual(bState1.checkCount, 1);
    assert(bState1.nextCheckAt > Date.now(), 'Next check is in future');
    console.log(`✓ PASS: Cycle 1 executed. Next check set in ${Math.round((bState1.nextCheckAt - Date.now()) / 1000)}s`);

    // Cycle 2: Simulated next tick after 30 seconds (still within +2 min cooldown)
    fetchCallCount = 0;
    await expireUnpaidOrders();
    assert.strictEqual(fetchCallCount, 0, 'Redundant call skipped during +2m cooldown window');
    console.log('✓ PASS: Cycle 2 skipped early check (0 Cashfree API calls made)');

    // Cycle 3: Fast-forward time past 2 minutes -> Check 2 executes and sets +10 min
    bState1.nextCheckAt = Date.now() - 1000;
    fetchCallCount = 0;
    await expireUnpaidOrders();
    assert.strictEqual(fetchCallCount, 1, 'Cashfree queried once cooldown elapsed');
    const bState2 = orderCleanupTracker.get(backoffOrderId)!;
    assert.strictEqual(bState2.checkCount, 2);
    assert.strictEqual(bState2.nextCheckAt - bState2.lastCheckedAt, 10 * 60 * 1000, 'Backoff interval escalated to 10m');
    console.log('✓ PASS: Cycle 3 escalated backoff interval to +10m');

    inMemoryStore.orders.delete(backoffOrderId);
    clearOrderCleanupTracker();

    // -------------------------------------------------------------------------
    // TEST 4: Failed cancel update (error and zero rows) counted and stops after 5 attempts
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Failed Cancel Update Retry Limiting (Max 5 Attempts) ---');
    clearOrderCleanupTracker();

    const stuckCancelOrderId = randomUUID();
    const stuckCancelOrder: ServerOrder = {
      id: stuckCancelOrderId,
      order_number: `SS-STUCK-CANCEL-${Date.now()}`,
      provider_order_id: `cf_stuck_${Date.now()}`,
      status: 'PENDING_PAYMENT',
      payment_status: 'PENDING',
      payment_method: 'ONLINE',
      total_amount: 700,
      currency: 'INR',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      items: [],
      delivery_address: {
        recipient_name: 'Stuck Cancel Customer',
        phone: '9876543210',
        address_line1: 'Barabanki',
        city: 'Barabanki',
        pincode: '225001',
      },
    };
    inMemoryStore.orders.set(stuckCancelOrderId, stuckCancelOrder);

    // Mock DB client where update returns an error (or 0 rows)
    let simulatedUpdateError: any = { message: 'Database connection locked / conflict' };
    let simulatedUpdatedRows: any[] = [];

    const mockFailingDbClient: any = {
      from: () => ({
        select: () => ({
          eq: () => ({
            lt: () => ({
              order: () => ({
                limit: async () => ({ data: [stuckCancelOrder], error: null }),
              }),
            }),
          }),
        }),
        update: () => {
          const chain: any = {
            eq: () => chain,
            select: async () => ({
              data: simulatedUpdatedRows,
              error: simulatedUpdateError,
            }),
            then: (resolve: any) =>
              resolve({
                data: simulatedUpdatedRows,
                error: simulatedUpdateError,
              }),
          };
          return chain;
        },
      }),
    };

    simulatedResponse = {
      status: 200,
      ok: true,
      data: { order_status: 'EXPIRED', order_amount: 700, order_currency: 'INR' },
      throws: false,
    };

    // Simulate 4 failed cancel attempts
    for (let i = 1; i <= 4; i++) {
      const state = orderCleanupTracker.get(stuckCancelOrderId);
      if (state) state.nextCheckAt = Date.now() - 1000;

      await expireUnpaidOrders(mockFailingDbClient);
      const curState = orderCleanupTracker.get(stuckCancelOrderId)!;
      assert.strictEqual(curState.failedCancelAttempts, i);
      assert.strictEqual(curState.needsReview, false);
      assert.strictEqual(stuckCancelOrder.status, 'PENDING_PAYMENT');
    }
    console.log('✓ PASS: Failed cancel attempts 1-4 incremented counter without prematurely flagging');

    // 5th attempt: should flag order for manual review and stop further attempts
    const stateBefore5 = orderCleanupTracker.get(stuckCancelOrderId)!;
    stateBefore5.nextCheckAt = Date.now() - 1000;
    await expireUnpaidOrders(mockFailingDbClient);

    const state5 = orderCleanupTracker.get(stuckCancelOrderId)!;
    assert.strictEqual(state5.failedCancelAttempts, 5);
    assert.strictEqual(state5.needsReview, true);
    assert(state5.reviewReason?.includes('Exceeded 5 failed cancel attempts'));
    assert.strictEqual(stuckCancelOrder.needs_review, true);
    console.log('✓ PASS: On 5th failed cancel attempt, order flagged with needs_review=true');

    // 6th cycle: Order is flagged with needsReview=true -> must be skipped without any API calls or update attempts
    fetchCallCount = 0;
    await expireUnpaidOrders(mockFailingDbClient);
    assert.strictEqual(fetchCallCount, 0, 'Flagged order is strictly skipped and not re-checked every cycle');
    console.log('✓ PASS: Flagged order is permanently skipped on subsequent cycles');

    inMemoryStore.orders.delete(stuckCancelOrderId);
    clearOrderCleanupTracker();

    // -------------------------------------------------------------------------
    // TEST 5: COD pending orders never touched; Online missing provider_order_id flagged
    // -------------------------------------------------------------------------
    console.log('\n--- 5. COD Orders & Missing Provider Order ID Rules ---');
    clearOrderCleanupTracker();

    // 5a. COD pending order
    const codOrderId = randomUUID();
    const codOrder: ServerOrder = {
      id: codOrderId,
      order_number: `SS-COD-${Date.now()}`,
      status: 'PENDING_PAYMENT',
      payment_status: 'PENDING',
      payment_method: 'COD',
      total_amount: 300,
      currency: 'INR',
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour old
      updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      items: [],
      delivery_address: {
        recipient_name: 'COD Customer',
        phone: '9876543210',
        address_line1: 'Barabanki',
        city: 'Barabanki',
        pincode: '225001',
      },
    };
    inMemoryStore.orders.set(codOrderId, codOrder);

    fetchCallCount = 0;
    await expireUnpaidOrders();
    assert.strictEqual(fetchCallCount, 0, 'COD order never causes Cashfree gateway call');
    assert.strictEqual(codOrder.status, 'PENDING_PAYMENT', 'COD order is never cancelled by cleanup job');
    console.log('✓ PASS: COD pending orders are strictly skipped and never cancelled');

    inMemoryStore.orders.delete(codOrderId);

    // 5b. Online order missing provider_order_id
    const noProvOrderId = randomUUID();
    const noProvOrder: ServerOrder = {
      id: noProvOrderId,
      order_number: `SS-NO-PROV-${Date.now()}`,
      status: 'PENDING_PAYMENT',
      payment_status: 'PENDING',
      payment_method: 'ONLINE',
      total_amount: 550,
      currency: 'INR',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      items: [],
      delivery_address: {
        recipient_name: 'No Provider Customer',
        phone: '9876543210',
        address_line1: 'Barabanki',
        city: 'Barabanki',
        pincode: '225001',
      },
    };
    inMemoryStore.orders.set(noProvOrderId, noProvOrder);

    fetchCallCount = 0;
    await expireUnpaidOrders();
    assert.strictEqual(fetchCallCount, 0, 'No gateway call possible without provider_order_id');
    assert.strictEqual(noProvOrder.status, 'PENDING_PAYMENT', 'Missing provider ID order is NOT cancelled');
    assert.strictEqual(noProvOrder.needs_review, true, 'Missing provider ID order is flagged for manual review');
    const noProvTracker = orderCleanupTracker.get(noProvOrderId)!;
    assert.strictEqual(noProvTracker.needsReview, true);
    assert.strictEqual(noProvTracker.reviewReason, 'Online order missing provider_order_id');
    console.log('✓ PASS: Online order missing provider_order_id is flagged for review, never cancelled');

    inMemoryStore.orders.delete(noProvOrderId);
    clearOrderCleanupTracker();

    // -------------------------------------------------------------------------
    // TEST 6: List query selects limited columns, limit(200), ordered by created_at
    // -------------------------------------------------------------------------
    console.log('\n--- 6. List Query Optimization (limit 200, ordered, limited columns) ---');

    let capturedSelectColumns = '';
    let capturedLimit = 0;
    let capturedOrderColumn = '';
    let capturedOrderAscending: boolean | null = null;

    const mockSpiedDbClient: any = {
      from: (table: string) => {
        assert.strictEqual(table, 'orders', 'Queries orders table');
        return {
          select: (columns: string) => {
            capturedSelectColumns = columns;
            return {
              eq: (field: string, val: any) => {
                assert.strictEqual(field, 'status');
                assert.strictEqual(val, 'PENDING_PAYMENT');
                return {
                  lt: (timeField: string) => {
                    assert.strictEqual(timeField, 'created_at');
                    return {
                      order: (col: string, opts: any) => {
                        capturedOrderColumn = col;
                        capturedOrderAscending = opts?.ascending ?? null;
                        return {
                          limit: async (limitNum: number) => {
                            capturedLimit = limitNum;
                            return { data: [], error: null };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    await expireUnpaidOrders(mockSpiedDbClient);

    assert.notStrictEqual(capturedSelectColumns, '*', 'List query does NOT use select=*');
    assert.strictEqual(
      capturedSelectColumns,
      'id, order_number, status, payment_status, payment_method, total_amount, provider_order_id, delivery_slot_id, created_at, updated_at',
      'List query selects strictly required columns'
    );
    assert.strictEqual(capturedLimit, 200, 'List query explicitly applies limit(200)');
    assert.strictEqual(capturedOrderColumn, 'created_at', 'List query explicitly orders by created_at');
    assert.strictEqual(capturedOrderAscending, true, 'List query orders ascending');
    console.log('✓ PASS: List query verified: selects specific columns, limit(200), order by created_at ASC');

    console.log('\n======================================================================');
    console.log('ALL ORDER CLEANUP JOB TESTS PASSED CLEANLY (100% MOCKED)!');
    console.log('======================================================================');
    process.exit(0);
  } finally {
    globalThis.fetch = originalFetch;
    clearOrderCleanupTracker();
  }
}

runOrderCleanupJobTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
