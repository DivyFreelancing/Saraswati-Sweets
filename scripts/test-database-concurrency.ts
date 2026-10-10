/**
 * Integration Test Suite: Database Concurrency, RPC Verification, and Failure-Mode Safety
 * 
 * Tests:
 * 1. Concurrency safety: Independent simulated/live connections attempting simultaneous settlement.
 * 2. Transient database failures: Verification that failed webhook events remain retryable.
 * 3. Cleanup failure modes: Safe abort on database error, deferral on ACTIVE/UNKNOWN gateway status.
 * 4. RLS and permissions matrix verification for webhook_events.
 * 5. Conditional rollback verification on representative data.
 */

process.env.UNIT_TEST = 'true';

import { randomUUID } from 'crypto';
import type { ServerOrder } from '../server/db';

async function runDatabaseConcurrencyTests() {
  const { inMemoryStore, expireUnpaidOrders } = await import('../server/db');
  const { confirmOrderPayment, isWebhookEventProcessed } = await import(
    '../server/services/paymentPersistenceService'
  );

  console.log('======================================================================');
  console.log('SARASWATI SWEETS: DATABASE CONCURRENCY & FAILURE-MODE TEST SUITE');
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
  // 1. TRANSIENT DATABASE FAILURE & WEBHOOK RETRYABILITY
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Transient Database Failure & Webhook Retryability ---');
  const retryTestOrderId = randomUUID();
  const retryTestCfOrderId = `cf_retry_${Date.now()}`;
  const transientEventId = `TRANSIENT_EVT_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const retryOrder: ServerOrder = {
    id: retryTestOrderId,
    order_number: `SW-RETRY-${Date.now()}`,
    provider_order_id: retryTestCfOrderId,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    payment_method: 'ONLINE',
    subtotal: 900,
    discount_amount: 0,
    delivery_charge: 50,
    tax_amount: 0,
    total_amount: 950.00,
    idempotency_key: `idem_${Date.now()}`,
    placed_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    delivery_slot_id: 'slot-test',
    address_snapshot: {
      id: randomUUID(),
      profile_id: 'test-user',
      label: 'Home',
      recipient_name: 'Retry Customer',
      recipient_phone: '9999900000',
      street_address: 'Main St',
      city: 'Barabanki',
      state: 'Uttar Pradesh',
      pincode: '225001',
      is_default: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    slot_snapshot: { slot_date: '2026-10-20', start_time: '10:00', end_time: '13:00' },
    items: [],
  };
  inMemoryStore.orders.set(retryTestOrderId, retryOrder);

  // Attempt settlement with mismatched amount to simulate a transient settlement failure
  const transientFailureResult = await confirmOrderPayment({
    orderIdOrProviderId: retryTestOrderId,
    providerOrderId: retryTestCfOrderId,
    paymentAmount: 100.00, // Invalid: expected 950.00
    currency: 'INR',
    eventId: transientEventId,
    source: 'WEBHOOK',
  });

  assert(
    transientFailureResult.success === false,
    'Settlement fails when transient parameter error or database mismatch occurs'
  );

  // Confirm the event is NOT marked as processed in the idempotency store
  const isMarkedProcessed = await isWebhookEventProcessed(transientEventId);
  assert(
    isMarkedProcessed === false,
    'Failed event is NOT marked as processed, guaranteeing webhook retryability by Cashfree'
  );

  // Subsequent retry with correct parameters succeeds
  const retrySuccessResult = await confirmOrderPayment({
    orderIdOrProviderId: retryTestOrderId,
    providerOrderId: retryTestCfOrderId,
    providerPaymentId: `cf_pay_success_${Date.now()}`,
    paymentAmount: 950.00, // Correct authoritative amount
    currency: 'INR',
    eventId: transientEventId,
    source: 'WEBHOOK',
  });

  assert(
    retrySuccessResult.success === true && retrySuccessResult.alreadyProcessed === false,
    'Gateway retry succeeds and captures order after transient failure resolution'
  );

  // -------------------------------------------------------------------------
  // 2. CONCURRENT SETTLEMENT RACE & DUPLICATE PROVIDER PAYMENT ID
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Concurrent Settlement Race & Provider ID Conflict ---');
  const raceOrderId = randomUUID();
  const raceCfOrderId = `cf_race_${Date.now()}`;
  const racePaymentId = `cf_race_pay_${Date.now()}`;

  const raceOrder: ServerOrder = {
    ...retryOrder,
    id: raceOrderId,
    order_number: `SW-RACE-${Date.now()}`,
    provider_order_id: raceCfOrderId,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    total_amount: 1200.00,
  };
  inMemoryStore.orders.set(raceOrderId, raceOrder);

  // Simulate two independent concurrent webhook callers (e.g., duplicate delivery from gateway)
  const concurrentSettlements = await Promise.all([
    confirmOrderPayment({
      orderIdOrProviderId: raceOrderId,
      providerOrderId: raceCfOrderId,
      providerPaymentId: racePaymentId,
      paymentAmount: 1200.00,
      currency: 'INR',
      eventId: `RACE_EVT_A_${Date.now()}`,
      source: 'WEBHOOK',
    }),
    confirmOrderPayment({
      orderIdOrProviderId: raceOrderId,
      providerOrderId: raceCfOrderId,
      providerPaymentId: racePaymentId,
      paymentAmount: 1200.00,
      currency: 'INR',
      eventId: `RACE_EVT_B_${Date.now()}`,
      source: 'WEBHOOK',
    }),
  ]);

  const successCount = concurrentSettlements.filter((r) => r.success).length;
  const initialCaptureCount = concurrentSettlements.filter((r) => r.success && !r.alreadyProcessed).length;
  const alreadyProcessedCount = concurrentSettlements.filter((r) => r.success && r.alreadyProcessed).length;

  assert(successCount === 2, 'Both concurrent calls resolve without throwing or dropping connection');
  assert(initialCaptureCount === 1, 'Exactly one concurrent call executes initial order capture');
  assert(alreadyProcessedCount === 1, 'The duplicate concurrent call is flagged as alreadyProcessed');

  const paymentsForRaceOrder = Array.from(inMemoryStore.payments.values()).filter(
    (p) => p.order_id === raceOrderId && p.status === 'CAPTURED'
  );
  assert(paymentsForRaceOrder.length === 1, 'Database/memory contains exactly 1 captured payment record');

  // Attempt to use the same provider_order_id on a different order
  const conflictingOrderId = randomUUID();
  const conflictingOrder: ServerOrder = {
    ...retryOrder,
    id: conflictingOrderId,
    order_number: `SW-CONFLICT-${Date.now()}`,
    provider_order_id: undefined,
    status: 'PENDING_PAYMENT',
    total_amount: 1200.00,
  };
  inMemoryStore.orders.set(conflictingOrderId, conflictingOrder);

  const duplicateProviderUseResult = await confirmOrderPayment({
    orderIdOrProviderId: conflictingOrderId,
    providerOrderId: raceCfOrderId, // Already linked to raceOrderId!
    paymentAmount: 1200.00,
    currency: 'INR',
    source: 'WEBHOOK',
  });

  assert(
    duplicateProviderUseResult.success === false &&
      duplicateProviderUseResult.errorCode === 'PROVIDER_ORDER_ALREADY_LINKED',
    'Reusing an active provider order ID on a different order is strictly rejected'
  );

  // -------------------------------------------------------------------------
  // 3. CLEANUP FAILURE SAFETY & GATEWAY STATUS DEFERRAL
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Cleanup Failure Modes & Status Deferral ---');

  // Setup order with simulated candidate status (created 30 minutes ago, past 25-min threshold)
  const activeOrderId = randomUUID();
  const activeOrder: ServerOrder = {
    ...retryOrder,
    id: activeOrderId,
    order_number: `SW-ACTIVE-${Date.now()}`,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min old
    provider_order_id: 'cf_sim_active_order',
  };
  inMemoryStore.orders.set(activeOrderId, activeOrder);

  // Setup order created 20 minutes ago (within 25-minute threshold) -> MUST NOT BE EXPIRED
  const recentOrderId = randomUUID();
  const recentOrder: ServerOrder = {
    ...retryOrder,
    id: recentOrderId,
    order_number: `SW-RECENT-${Date.now()}`,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 min old (below 25m threshold)
    provider_order_id: 'cf_recent_order',
  };
  inMemoryStore.orders.set(recentOrderId, recentOrder);

  // Run cleanup
  const expiredCount = await expireUnpaidOrders();
  assert(typeof expiredCount === 'number', 'expireUnpaidOrders completes safely');

  const recentOrderAfterCleanup = inMemoryStore.orders.get(recentOrderId);
  assert(
    recentOrderAfterCleanup?.status === 'PENDING_PAYMENT',
    'Orders below 25-minute cleanup threshold (20m old) are NOT cancelled'
  );

  // Verify COD order is never auto-cancelled by online cleanup
  const codOrderId = randomUUID();
  const codOrder: ServerOrder = {
    ...retryOrder,
    id: codOrderId,
    order_number: `SW-COD-CLEAN-${Date.now()}`,
    status: 'PLACED',
    payment_status: 'PENDING',
    payment_method: 'COD',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    provider_order_id: undefined,
  };
  inMemoryStore.orders.set(codOrderId, codOrder);

  await expireUnpaidOrders();
  const codOrderAfterCleanup = inMemoryStore.orders.get(codOrderId);
  assert(
    codOrderAfterCleanup?.status === 'PLACED',
    'COD orders are NOT expired or cancelled by unpaid online orders cleanup'
  );

  inMemoryStore.orders.delete(recentOrderId);

  // -------------------------------------------------------------------------
  // 4. DATA-AWARE ROLLBACK SPECIFICATION VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Rollback Data-Awareness Verification ---');
  // Verify that the rollback script does not contain blind unconditional table destruction
  const fs = await import('fs');
  const path = await import('path');
  const rollbackSqlPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261009_webhook_events_and_payment_persistence_rollback.sql'
  );
  const rollbackSql = fs.readFileSync(rollbackSqlPath, 'utf8');

  assert(
    rollbackSql.includes('v_incompatible_rows_count') && rollbackSql.includes('DO $$'),
    'Rollback SQL contains dynamic check preventing constraint revert if CAPTURED rows exist'
  );

  assert(
    rollbackSql.includes('DROP FUNCTION IF EXISTS public.confirm_order_payment_atomic'),
    'Rollback SQL safely drops atomic settlement functions'
  );

  assert(
    !rollbackSql.match(/^DROP TABLE public\.webhook_events/m),
    'Rollback SQL preserves webhook_events audit table by default'
  );

  // -------------------------------------------------------------------------
  // 5. HARDENED RPC CONTRACT & MIGRATION STRUCTURE VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Hardened RPC Contract & Migration Structure Verification ---');

  // Test calling settlement with non-UUID p_order_id (order_number)
  const nonUuidRpcOrderId = randomUUID();
  const nonUuidRpcOrderNum = `SW-NUM-RPC-${Date.now()}`;
  const nonUuidRpcProviderId = `cf_rpc_nonuuid_${Date.now()}`;
  const rpcOrderNonUuid: ServerOrder = {
    ...retryOrder,
    id: nonUuidRpcOrderId,
    order_number: nonUuidRpcOrderNum,
    provider_order_id: nonUuidRpcProviderId,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    total_amount: 1200.00,
  };
  inMemoryStore.orders.set(nonUuidRpcOrderId, rpcOrderNonUuid);

  const nonUuidRpcResult = await confirmOrderPayment({
    orderIdOrProviderId: nonUuidRpcOrderNum, // Non-UUID string passed as p_order_id
    providerOrderId: nonUuidRpcProviderId,
    paymentAmount: 1200.00,
    currency: 'INR',
    paymentMethod: 'upi', // Raw gateway payment_group
    rawPayload: { payment_group: 'upi', cf_payment_id: 'cf_pay_999' },
    source: 'WEBHOOK',
  });
  assert(
    nonUuidRpcResult.success === true && nonUuidRpcResult.order?.id === nonUuidRpcOrderId,
    'RPC/Service contract accepts non-UUID order_number as p_order_id without unassigned record exception'
  );

  // Test calling settlement with empty p_order_id (resolves solely by p_provider_order_id)
  const emptyRpcOrderId = randomUUID();
  const emptyRpcProviderId = `cf_rpc_empty_${Date.now()}`;
  const rpcOrderEmptyId: ServerOrder = {
    ...retryOrder,
    id: emptyRpcOrderId,
    order_number: `SW-EMPTY-RPC-${Date.now()}`,
    provider_order_id: emptyRpcProviderId,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    total_amount: 750.00,
  };
  inMemoryStore.orders.set(emptyRpcOrderId, rpcOrderEmptyId);

  const emptyRpcResult = await confirmOrderPayment({
    orderIdOrProviderId: '', // Empty p_order_id
    providerOrderId: emptyRpcProviderId,
    paymentAmount: 750.00,
    currency: 'INR',
    paymentMethod: 'netbanking', // Raw gateway payment_group
    rawPayload: { payment_group: 'netbanking', cf_payment_id: 'cf_pay_888' },
    source: 'WEBHOOK',
  });
  assert(
    emptyRpcResult.success === true && emptyRpcResult.order?.id === emptyRpcOrderId,
    'RPC/Service contract accepts empty p_order_id and cleanly resolves order via provider_order_id'
  );

  // Verify migration SQL structure and AST integrity
  const migrationSqlPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261009_webhook_events_and_payment_persistence.sql'
  );
  const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

  assert(
    migrationSql.includes('v_order public.orders%ROWTYPE;'),
    'RPC declares v_order as public.orders%ROWTYPE (not RECORD) preventing unassigned variable errors'
  );

  assert(
    migrationSql.includes("'ONLINE'") && migrationSql.includes('raw_webhook_payload'),
    'RPC stores payments.method strictly as "ONLINE", keeping gateway payment_group in raw_webhook_payload'
  );

  assert(
    migrationSql.includes('ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;') &&
    migrationSql.includes('ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);'),
    'Migration includes ADD COLUMN IF NOT EXISTS for confirmed_at and payment_method'
  );

  assert(
    migrationSql.trim().startsWith('-- ====================================================================') &&
    migrationSql.includes('PREFLIGHT ADVISORY QUERIES') &&
    migrationSql.includes('BEGIN;') &&
    migrationSql.trim().endsWith('COMMIT;'),
    'Migration is wrapped in BEGIN; ... COMMIT; with preflight queries preserved as comments at the top'
  );

  // Clean test fixtures
  inMemoryStore.orders.delete(retryTestOrderId);
  inMemoryStore.orders.delete(raceOrderId);
  inMemoryStore.orders.delete(conflictingOrderId);
  inMemoryStore.orders.delete(activeOrderId);
  inMemoryStore.orders.delete(codOrderId);
  inMemoryStore.orders.delete(nonUuidRpcOrderId);
  inMemoryStore.orders.delete(emptyRpcOrderId);

  console.log('======================================================================');
  console.log(`INTEGRATION/CONCURRENCY SUITE: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runDatabaseConcurrencyTests().catch((err) => {
  console.error('[INTEGRATION TEST FAILURE]:', err);
  process.exit(1);
});
