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
    isOrderCleanupRunning,
    resetCleanupInProgressGuard,
    resetNeedsReviewColumnMissingGuard,
    hasNeedsReviewColumnWarningLogged,
    isOrderCleanupEnabled,
    persistOrderNeedsReview,
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
    const transientOrder: any = {
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
      const testOrder: any = {
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
    const backoffOrder: any = {
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
    const stuckCancelOrder: any = {
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
    const codOrder: any = {
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
    const noProvOrder: any = {
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
      'id, order_number, status, payment_status, payment_method, total_amount, delivery_slot_id, created_at, updated_at',
      'List query selects strictly required columns'
    );
    assert.strictEqual(capturedLimit, 200, 'List query explicitly applies limit(200)');
    assert.strictEqual(capturedOrderColumn, 'created_at', 'List query explicitly orders by created_at');
    assert.strictEqual(capturedOrderAscending, true, 'List query orders ascending');
    console.log('✓ PASS: List query verified: selects specific columns, limit(200), order by created_at ASC');

    // -------------------------------------------------------------------------
    // TEST 7: Single-flight guard (concurrent invocation returns immediately)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Single-Flight Guard: Concurrent runs return immediately ---');
    resetCleanupInProgressGuard();
    clearOrderCleanupTracker();
    inMemoryStore.orders.clear();

    let resumeDbSelect: () => void;
    const dbSelectPromise = new Promise<void>((resolve) => {
      resumeDbSelect = resolve;
    });

    const mockSlowDbClient: any = {
      from: () => ({
        select: () => ({
          eq: () => ({
            lt: () => ({
              order: () => ({
                limit: async () => {
                  await dbSelectPromise;
                  return { data: [], error: null };
                },
              }),
            }),
          }),
        }),
      }),
    };

    // Launch first cleanup run asynchronously
    const run1Promise = expireUnpaidOrders(mockSlowDbClient);

    // Verify cleanup guard state while run 1 is active
    assert.strictEqual(isOrderCleanupRunning(), true, 'Cleanup job is marked as running during active execution');

    // Launch second concurrent cleanup run
    const run2Result = await expireUnpaidOrders(mockSlowDbClient);
    assert.strictEqual(run2Result, 0, 'Second concurrent run returned immediately (returned 0)');

    // Resume run 1 and await completion
    resumeDbSelect!();
    const run1Result = await run1Promise;
    assert.strictEqual(typeof run1Result, 'number', 'First run completed cleanly');
    assert.strictEqual(isOrderCleanupRunning(), false, 'Single-flight guard released after first run completes');
    console.log('✓ PASS: Single-flight guard verified: concurrent call returns immediately without executing duplicate job');

    // -------------------------------------------------------------------------
    // TEST 8A: needs_review missing in DB + Cashfree EXPIRED => order IS cancelled
    // -------------------------------------------------------------------------
    console.log('\n--- 8A. Cancellation Independent of needs_review: missing column + EXPIRED => order cancelled ---');
    clearOrderCleanupTracker();
    inMemoryStore.orders.clear();

    const expOrderId = randomUUID();
    const expOrderNum = `SS-EXP-NO-NR-${Date.now()}`;
    const expOrder: any = {
      id: expOrderId,
      order_number: expOrderNum,
      customer_id: 'cust-exp-1',
      status: 'PENDING_PAYMENT',
      payment_status: 'PENDING',
      payment_method: 'ONLINE',
      total_amount: 750,
      provider_order_id: 'cf_exp_no_nr_1',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      items: [],
    };
    inMemoryStore.orders.set(expOrderId, expOrder);

    simulatedResponse = {
      status: 200,
      ok: true,
      data: { order_status: 'EXPIRED' },
    };

    let cancelUpdateCalled = false;
    let cancelUpdatedColumns: any = null;

    // Database client that succeeds on cancel update (which updates status, payment_status, etc.)
    // but fails with 42703 if needs_review were updated
    const mockDbClientNoNeedsReview: any = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            lt: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
        update: (fields: any) => {
          if (fields.needs_review !== undefined || fields.review_reason !== undefined) {
            return {
              eq: async () => ({
                data: null,
                error: { code: '42703', message: 'column orders.needs_review does not exist' },
              }),
            };
          }
          cancelUpdateCalled = true;
          cancelUpdatedColumns = fields;
          return {
            eq: () => ({
              eq: () => ({
                select: async () => ({
                  data: [{ id: expOrderId, delivery_slot_id: null }],
                  error: null,
                }),
              }),
            }),
          };
        },
      }),
    };

    const expiredCancelCount = await expireUnpaidOrders(mockDbClientNoNeedsReview);
    assert.strictEqual(expiredCancelCount, 1, 'Job reports 1 order expired/cancelled');
    assert.strictEqual(cancelUpdateCalled, true, 'Cancellation update was issued to DB');
    assert.strictEqual(cancelUpdatedColumns?.status, 'CANCELLED', 'Order status cancelled in DB');
    assert.strictEqual(cancelUpdatedColumns?.payment_status, 'FAILED', 'Payment status failed in DB');
    assert.strictEqual(cancelUpdatedColumns?.needs_review, undefined, 'Cancellation update does NOT touch needs_review');

    const inMemoryExpOrder = inMemoryStore.orders.get(expOrderId);
    assert.strictEqual(inMemoryExpOrder?.status, 'CANCELLED', 'In-memory order is CANCELLED');
    assert.strictEqual(inMemoryExpOrder?.payment_status, 'FAILED', 'In-memory payment_status is FAILED');
    console.log('✓ PASS: needs_review missing + Cashfree EXPIRED => order is successfully cancelled');

    // -------------------------------------------------------------------------
    // TEST 8B: Postgres 42703 when flagging for manual review: log once, keep in memory, never count as failed cancel
    // -------------------------------------------------------------------------
    console.log('\n--- 8B. Postgres Error 42703: Log once, keep in memory, never count as failed cancel ---');
    resetNeedsReviewColumnMissingGuard();
    clearOrderCleanupTracker();
    inMemoryStore.orders.clear();

    assert.strictEqual(hasNeedsReviewColumnWarningLogged(), false, 'Warning guard starts as unlogged');

    const warnMessages: string[] = [];
    const origConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      warnMessages.push(args.join(' '));
      origConsoleWarn(...args);
    };

    try {
      // Order 1: Online order missing provider_order_id (needs review)
      const order1Id = randomUUID();
      const order1Num = `SS-42703-1-${Date.now()}`;
      const order1: any = {
        id: order1Id,
        order_number: order1Num,
        customer_id: 'cust-42703',
        status: 'PENDING_PAYMENT',
        payment_status: 'PENDING',
        payment_method: 'ONLINE',
        total_amount: 500,
        provider_order_id: '', // missing provider_order_id triggers manual review
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        items: [],
      };
      inMemoryStore.orders.set(order1Id, order1);

      // Order 2: Another online order missing provider_order_id (needs review)
      const order2Id = randomUUID();
      const order2Num = `SS-42703-2-${Date.now()}`;
      const order2: any = {
        id: order2Id,
        order_number: order2Num,
        customer_id: 'cust-42703',
        status: 'PENDING_PAYMENT',
        payment_status: 'PENDING',
        payment_method: 'ONLINE',
        total_amount: 600,
        provider_order_id: '', // missing provider_order_id triggers manual review
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        items: [],
      };
      inMemoryStore.orders.set(order2Id, order2);

      const mockDbClientMissingCol: any = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              lt: () => ({
                order: () => ({
                  limit: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({
              data: null,
              error: { code: '42703', message: 'column orders.needs_review does not exist' },
            }),
          }),
        }),
      };

      await expireUnpaidOrders(mockDbClientMissingCol);

      // Verify Warning Logged ONCE only
      const warningLogs = warnMessages.filter((m) => m.includes('Postgres 42703') && m.includes('orders.needs_review'));
      assert.strictEqual(warningLogs.length, 1, 'Notice about Postgres 42703 was logged exactly ONCE across multiple orders');
      assert.strictEqual(hasNeedsReviewColumnWarningLogged(), true, 'Warning guard marked as logged');

      // Verify Order 1 in-memory state:
      const updatedOrder1 = inMemoryStore.orders.get(order1Id);
      const tracking1 = orderCleanupTracker.get(order1Id);
      assert.strictEqual(updatedOrder1?.needs_review, true, 'Order 1 kept needs_review=true in memory');
      assert.strictEqual(tracking1?.needsReview, true, 'Order 1 tracking kept needsReview=true in memory');
      assert.strictEqual(tracking1?.failedCancelAttempts, 0, 'Order 1 failedCancelAttempts is strictly 0 (never counted as failed cancel)');

      // Verify Order 2 in-memory state:
      const updatedOrder2 = inMemoryStore.orders.get(order2Id);
      const tracking2 = orderCleanupTracker.get(order2Id);
      assert.strictEqual(updatedOrder2?.needs_review, true, 'Order 2 kept needs_review=true in memory');
      assert.strictEqual(tracking2?.needsReview, true, 'Order 2 tracking kept needsReview=true in memory');
      assert.strictEqual(tracking2?.failedCancelAttempts, 0, 'Order 2 failedCancelAttempts is strictly 0 (never counted as failed cancel)');

      console.log('✓ PASS: Postgres 42703 verified: logs warning once, keeps flag in memory, never increments failedCancelAttempts');
    } finally {
      console.warn = origConsoleWarn;
    }

    // -------------------------------------------------------------------------
    // TEST 8C: List query fails with Postgres 42703 (any missing column)
    // -------------------------------------------------------------------------
    console.log('\n--- 8C. List Query Postgres 42703: Log clear error naming missing column and skip cycle ---');
    clearOrderCleanupTracker();
    inMemoryStore.orders.clear();

    const candidateId = randomUUID();
    const candidateOrder: any = {
      id: candidateId,
      order_number: `SS-CANDIDATE-${Date.now()}`,
      status: 'PENDING_PAYMENT',
      payment_status: 'PENDING',
      payment_method: 'ONLINE',
      total_amount: 500,
      provider_order_id: 'cf_cand_1',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      items: [],
    };
    inMemoryStore.orders.set(candidateId, candidateOrder);

    const errorLogs: string[] = [];
    const origConsoleError = console.error;
    console.error = (...args: any[]) => {
      errorLogs.push(args.join(' '));
      origConsoleError(...args);
    };

    try {
      const mockListQuery42703Client: any = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              lt: () => ({
                order: () => ({
                  limit: async () => ({
                    data: null,
                    error: {
                      code: '42703',
                      message: 'column orders.missing_special_col does not exist',
                    },
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      const skippedCycleCount = await expireUnpaidOrders(mockListQuery42703Client);

      // Cycle was skipped (returned 0)
      assert.strictEqual(skippedCycleCount, 0, 'Cleanup cycle was skipped on Postgres 42703 list query error');

      // Candidate was NOT processed or cancelled
      const candAfter = inMemoryStore.orders.get(candidateId);
      assert.strictEqual(candAfter?.status, 'PENDING_PAYMENT', 'Candidate order was not cancelled (not treated as "no orders found")');

      // Error was logged naming the missing column 'missing_special_col'
      const matchedLog = errorLogs.find(
        (log) => log.includes('Postgres error 42703') && log.includes('missing_special_col')
      );
      assert(matchedLog, 'Error was logged naming the missing column "missing_special_col"');
      console.log('✓ PASS: List query 42703 logs clear error naming missing column and skips cycle without treating as "no orders found"');
    } finally {
      console.error = origConsoleError;
    }

    // -------------------------------------------------------------------------
    // TEST 9: POST /api/payments/expire-check is Admin-Only
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Route Security: POST /api/payments/expire-check is Admin-Only ---');
    const { requireRole } = await import('../server/authMiddleware');
    const adminCheckMiddleware = requireRole(['ADMIN']);

    let unauthStatusCode: number | null = null;
    let unauthPayload: any = null;
    const mockUnauthReq: any = { headers: {} };
    const mockUnauthRes: any = {
      status: (code: number) => {
        unauthStatusCode = code;
        return {
          json: (data: any) => {
            unauthPayload = data;
          },
        };
      },
    };
    let unauthNextCalled = false;
    adminCheckMiddleware(mockUnauthReq, mockUnauthRes, () => {
      unauthNextCalled = true;
    });

    assert.strictEqual(unauthStatusCode, 401, 'Unauthenticated request rejected with HTTP 401');
    assert.strictEqual(unauthPayload?.error, 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
    assert.strictEqual(unauthNextCalled, false, 'Next was not called for unauthenticated request');

    // Customer user -> HTTP 403 FORBIDDEN
    let customerStatusCode: number | null = null;
    let customerPayload: any = null;
    const mockCustReq: any = { user: { id: 'cust-1', role: 'CUSTOMER' } };
    const mockCustRes: any = {
      status: (code: number) => {
        customerStatusCode = code;
        return {
          json: (data: any) => {
            customerPayload = data;
          },
        };
      },
    };
    let customerNextCalled = false;
    adminCheckMiddleware(mockCustReq, mockCustRes, () => {
      customerNextCalled = true;
    });

    assert.strictEqual(customerStatusCode, 403, 'Customer role rejected with HTTP 403');
    assert.strictEqual(customerPayload?.error, 'FORBIDDEN', 'Error code is FORBIDDEN');
    assert.strictEqual(customerNextCalled, false, 'Next was not called for customer role');

    // Admin user -> next() called
    const mockAdminReq: any = { user: { id: 'admin-1', role: 'ADMIN' } };
    let adminNextCalled = false;
    adminCheckMiddleware(mockAdminReq, {} as any, () => {
      adminNextCalled = true;
    });
    assert.strictEqual(adminNextCalled, true, 'Admin role authorized to execute expire-check');
    console.log('✓ PASS: POST /api/payments/expire-check verified as admin-only (401 unauthenticated, 403 customer, 200 admin)');

    // -------------------------------------------------------------------------
    // TEST 10: Environment Guard: NODE_ENV=production required by default
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Environment Guard: NODE_ENV=production required by default ---');
    const savedNodeEnv = process.env.NODE_ENV;
    const savedEnable = process.env.ENABLE_ORDER_CLEANUP;

    try {
      delete process.env.ENABLE_ORDER_CLEANUP;

      process.env.NODE_ENV = 'development';
      assert.strictEqual(isOrderCleanupEnabled(), false, 'Disabled by default when NODE_ENV="development"');

      process.env.NODE_ENV = 'test';
      assert.strictEqual(isOrderCleanupEnabled(), false, 'Disabled by default when NODE_ENV="test"');

      process.env.NODE_ENV = 'production';
      assert.strictEqual(isOrderCleanupEnabled(), true, 'Enabled by default when NODE_ENV="production"');

      // Explicit override tests
      process.env.ENABLE_ORDER_CLEANUP = 'true';
      process.env.NODE_ENV = 'development';
      assert.strictEqual(isOrderCleanupEnabled(), true, 'Explicit ENABLE_ORDER_CLEANUP="true" overrides dev');

      process.env.ENABLE_ORDER_CLEANUP = 'false';
      process.env.NODE_ENV = 'production';
      assert.strictEqual(isOrderCleanupEnabled(), false, 'Explicit ENABLE_ORDER_CLEANUP="false" overrides production');

      console.log('✓ PASS: isOrderCleanupEnabled strictly requires NODE_ENV=production by default');
    } finally {
      process.env.NODE_ENV = savedNodeEnv;
      if (savedEnable !== undefined) {
        process.env.ENABLE_ORDER_CLEANUP = savedEnable;
      } else {
        delete process.env.ENABLE_ORDER_CLEANUP;
      }
    }

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
