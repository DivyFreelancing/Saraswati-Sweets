process.env.ENABLE_ORDER_CLEANUP = 'true';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import {
  inMemoryStore,
  expireUnpaidOrders,
  deferredOrderCheckTracker,
  clearDeferredOrderCheckTracker,
  ServerOrder,
} from '../server/db';

async function runCleanupBackoffTests() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS: ORDER CLEANUP BACKOFF & RETRY VERIFICATION TEST');
  console.log('======================================================================');

  clearDeferredOrderCheckTracker();

  let cashfreeApiCallCount = 0;
  let simulatedStatus: 'ACTIVE' | 'PAID' | 'EXPIRED' = 'ACTIVE';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: any, init?: any) => {
    const urlStr = String(url);
    if (urlStr.includes('/orders/')) {
      cashfreeApiCallCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          order_status: simulatedStatus,
          order_amount: 500,
          order_currency: 'INR',
        }),
      } as any;
    }
    return originalFetch(url, init);
  };

  try {
    const testOrderId = randomUUID();
    const testOrderNum = `SS-TEST-BACKOFF-${Date.now()}`;
    const testOrder: any = {
      id: testOrderId,
      order_number: testOrderNum,
      provider_order_id: testOrderNum,
      status: 'PENDING_PAYMENT',
      payment_status: 'PENDING',
      payment_method: 'ONLINE',
      total_amount: 500,
      currency: 'INR',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago (> 25 mins threshold)
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      items: [],
      delivery_address: {
        recipient_name: 'Test Customer',
        phone: '9876543210',
        address_line1: 'Barabanki',
        city: 'Barabanki',
        pincode: '225001',
      },
    };

    inMemoryStore.orders.set(testOrderId, testOrder);

    const mockDbClient: any = {
      from: () => ({
        select: () => ({
          eq: () => ({
            lt: () => {
              const chain: any = {
                order: () => chain,
                limit: () => chain,
                then: (resolve: any) => resolve({ data: [testOrder], error: null }),
              };
              return chain;
            },
            maybeSingle: async () => ({ data: testOrder, error: null }),
          }),
        }),
        update: () => {
          const chain: any = {
            eq: () => chain,
            select: async () => ({ data: [{ id: testOrderId }], error: null }),
            then: (resolve: any) => resolve({ data: [{ id: testOrderId }], error: null }),
          };
          return chain;
        },
      }),
    };

    // Run 1: First check should query Cashfree (simulatedStatus = ACTIVE)
    console.log('\n--- 1. First Cleanup Cycle: Cashfree reports ACTIVE ---');
    simulatedStatus = 'ACTIVE';
    cashfreeApiCallCount = 0;
    const expiredCount1 = await expireUnpaidOrders(mockDbClient);

    assert.strictEqual(expiredCount1, 0, 'ACTIVE order must NOT be expired or cancelled');
    assert.strictEqual(cashfreeApiCallCount, 1, 'First cycle queries Cashfree API exactly once');
    assert(deferredOrderCheckTracker.has(testOrderId), 'Order is registered in deferred tracker');
    const state1 = deferredOrderCheckTracker.get(testOrderId)!;
    assert.strictEqual(state1.checkCount, 1, 'checkCount is 1 on first check');
    assert(state1.nextCheckAt > Date.now(), 'nextCheckAt is in the future');
    console.log(`✓ PASS: Order deferred with next check in ${Math.round((state1.nextCheckAt - Date.now()) / 1000)}s`);

    // Run 2: Immediate second cleanup cycle (e.g. 30 seconds later, still in cool-down)
    console.log('\n--- 2. Second Cleanup Cycle (Within Cool-down Window) ---');
    cashfreeApiCallCount = 0;
    const expiredCount2 = await expireUnpaidOrders(mockDbClient);

    assert.strictEqual(expiredCount2, 0, 'Order remains uncancelled');
    assert.strictEqual(cashfreeApiCallCount, 0, 'No redundant Cashfree API call was made during backoff window');
    console.log('✓ PASS: Redundant Cashfree API call skipped successfully by backoff cool-down');

    // Run 3: Simulate cool-down window expiry to test exponential backoff increment
    console.log('\n--- 3. Cool-down Window Expired: Second check increments backoff ---');
    state1.nextCheckAt = Date.now() - 1000; // Fast-forward time past backoff
    cashfreeApiCallCount = 0;
    const expiredCount3 = await expireUnpaidOrders(mockDbClient);

    assert.strictEqual(expiredCount3, 0, 'Order remains uncancelled');
    assert.strictEqual(cashfreeApiCallCount, 1, 'Cashfree queried once after backoff window expired');
    const state2 = deferredOrderCheckTracker.get(testOrderId)!;
    assert.strictEqual(state2.checkCount, 2, 'checkCount incremented to 2');
    assert(state2.nextCheckAt - state2.lastCheckedAt >= 5 * 60 * 1000, 'Backoff interval increased to >= 5 mins');
    console.log(`✓ PASS: Backoff interval escalated to ${Math.round((state2.nextCheckAt - state2.lastCheckedAt) / 60000)}m`);

    // Run 4: Terminal status (Cashfree reports EXPIRED) -> Should cancel and evict from tracker
    console.log('\n--- 4. Terminal Gateway State: Cashfree reports EXPIRED ---');
    state2.nextCheckAt = Date.now() - 1000; // Fast-forward time
    simulatedStatus = 'EXPIRED';
    cashfreeApiCallCount = 0;
    const expiredCount4 = await expireUnpaidOrders(mockDbClient);

    assert.strictEqual(expiredCount4, 1, 'Definitively EXPIRED order is cancelled');
    assert(!deferredOrderCheckTracker.has(testOrderId), 'Cancelled order is evicted from deferred tracker');
    const finalOrder = inMemoryStore.orders.get(testOrderId);
    assert.strictEqual(finalOrder?.status, 'CANCELLED', 'Order status updated to CANCELLED');
    console.log('✓ PASS: Terminal order cancelled and cleanly evicted from backoff tracker');

    // Clean up
    inMemoryStore.orders.delete(testOrderId);

    console.log('\n======================================================================');
    console.log('CLEANUP BACKOFF SUITE: All tests passed cleanly!');
    console.log('======================================================================');
    process.exit(0);
  } finally {
    globalThis.fetch = originalFetch;
    clearDeferredOrderCheckTracker();
  }
}

runCleanupBackoffTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
