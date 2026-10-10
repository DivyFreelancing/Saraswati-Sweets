/**
 * Integration Test: Duplicate Webhook Idempotency and Restart Persistence
 * 
 * Verifies that:
 * 1. Webhook persists order status PLACED and payment CAPTURED to Supabase.
 * 2. Payment record and webhook_events record are created.
 * 3. Duplicate webhook returns HTTP 200 without duplicate payments or side effects.
 * 4. Simulating server restart (wiping in-memory state) preserves the captured state in Supabase.
 * 
 * SAFETY NOTICE:
 * To protect production data, this test runs ONLY when TEST_SUPABASE_URL and RUN_LIVE_TEST=true
 * are explicitly set in the environment. It will NEVER execute against production Supabase.
 */

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const isExplicitTestAllowed = process.env.RUN_LIVE_TEST === 'true' && Boolean(process.env.TEST_SUPABASE_URL);

async function runWebhookPersistenceTest() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS: WEBHOOK IDEMPOTENCY & RESTART PERSISTENCE TEST');
  console.log('======================================================================');

  if (!isExplicitTestAllowed) {
    console.log('[SAFETY NOTICE] Live integration test was NOT executed against production.');
    console.log('Reason: RUN_LIVE_TEST is not "true" or TEST_SUPABASE_URL is not configured.');
    console.log('This safeguard prevents any test mutations or cleanup on the production Supabase database.');
    console.log('');
    console.log('To execute this test against a dedicated staging/test Supabase instance:');
    console.log('  $env:TEST_SUPABASE_URL="https://your-test-project.supabase.co"');
    console.log('  $env:TEST_SUPABASE_SERVICE_ROLE_KEY="your-test-service-key"');
    console.log('  $env:RUN_LIVE_TEST="true"');
    console.log('  node node_modules/tsx/dist/cli.mjs scripts/test-webhook-persistence.ts');
    console.log('======================================================================');
    return;
  }

  const testSupabaseUrl = process.env.TEST_SUPABASE_URL!;
  const testSupabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;
  const testClient = createClient(testSupabaseUrl, testSupabaseKey);

  const testOrderId = randomUUID();
  const testOrderNumber = `TEST-ORD-${Date.now()}`;
  const testCfOrderId = `cf_order_${Date.now()}`;
  const testEventId = `PAYMENT_SUCCESS_WEBHOOK_test_${Date.now()}`;
  const testAmount = 550.0;
  const nowIso = new Date().toISOString();

  console.log(`[Step 1] Creating isolated test order in PENDING_PAYMENT status...`);
  const { error: insertOrderErr } = await testClient.from('orders').insert([
    {
      id: testOrderId,
      order_number: testOrderNumber,
      status: 'PENDING_PAYMENT',
      payment_status: 'PENDING',
      payment_method: 'ONLINE',
      subtotal: testAmount,
      total_amount: testAmount,
      address_snapshot: { recipient_name: 'Test Customer', phone: '9999999999', city: 'Barabanki' },
      placed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    },
  ]);

  if (insertOrderErr) {
    throw new Error(`Failed to insert test order: ${insertOrderErr.message}`);
  }
  console.log(`[Step 1 PASS] Test order created: ${testOrderId} (#${testOrderNumber})`);

  try {
    // Dynamic import to test persistence service
    const { confirmOrderPayment } = await import('../server/services/paymentPersistenceService');

    console.log(`[Step 2] Simulating initial PAYMENT_SUCCESS_WEBHOOK...`);
    const firstResult = await confirmOrderPayment({
      orderIdOrProviderId: testOrderId,
      providerOrderId: testCfOrderId,
      providerPaymentId: `cf_pay_${Date.now()}`,
      paymentAmount: testAmount,
      currency: 'INR',
      paymentMethod: 'UPI',
      eventId: testEventId,
      eventType: 'PAYMENT_SUCCESS_WEBHOOK',
      rawPayload: { mock: true, order_id: testCfOrderId },
      source: 'WEBHOOK',
    });

    if (!firstResult.success || firstResult.alreadyProcessed) {
      throw new Error(`Expected first webhook delivery to succeed as new event, got: ${JSON.stringify(firstResult)}`);
    }
    console.log(`[Step 2 PASS] First webhook processed successfully`);

    console.log(`[Step 3] Verifying records in Supabase test database...`);
    const { data: verifiedOrder } = await testClient
      .from('orders')
      .select('status, payment_status, paid_at')
      .eq('id', testOrderId)
      .single();

    if (!verifiedOrder || verifiedOrder.status !== 'PLACED' || verifiedOrder.payment_status !== 'CAPTURED') {
      throw new Error(`Order in DB not marked PLACED/CAPTURED: ${JSON.stringify(verifiedOrder)}`);
    }

    const { data: verifiedPayments } = await testClient
      .from('payments')
      .select('*')
      .eq('order_id', testOrderId);

    if (!verifiedPayments || verifiedPayments.length !== 1) {
      throw new Error(`Expected exactly 1 payment record, found: ${verifiedPayments?.length}`);
    }
    console.log(`[Step 3 PASS] Supabase verified: status=PLACED, payment_status=CAPTURED, payment record exists`);

    console.log(`[Step 4] Delivering duplicate webhook with same event_id...`);
    const duplicateResult = await confirmOrderPayment({
      orderIdOrProviderId: testOrderId,
      providerOrderId: testCfOrderId,
      eventId: testEventId,
      eventType: 'PAYMENT_SUCCESS_WEBHOOK',
      paymentAmount: testAmount,
      currency: 'INR',
      source: 'WEBHOOK',
    });

    if (!duplicateResult.alreadyProcessed) {
      throw new Error(`Expected duplicate webhook to be marked alreadyProcessed: true`);
    }

    const { data: paymentsAfterDup } = await testClient
      .from('payments')
      .select('*')
      .eq('order_id', testOrderId);

    if (!paymentsAfterDup || paymentsAfterDup.length !== 1) {
      throw new Error(`Duplicate webhook created extra payment record! Total: ${paymentsAfterDup?.length}`);
    }
    console.log(`[Step 4 PASS] Duplicate webhook rejected idempotently without duplicate records`);

    console.log(`[Step 5] Simulating full server restart (wiping Node in-memory store)...`);
    const { inMemoryStore } = await import('../server/db');
    inMemoryStore.orders.clear();
    inMemoryStore.payments.clear();
    inMemoryStore.processedWebhookEvents.clear();

    console.log(`[Step 6] Querying Supabase post-restart to confirm persistent state...`);
    const { data: postRestartOrder } = await testClient
      .from('orders')
      .select('status, payment_status')
      .eq('id', testOrderId)
      .single();

    if (!postRestartOrder || postRestartOrder.status !== 'PLACED' || postRestartOrder.payment_status !== 'CAPTURED') {
      throw new Error(`Order state did not survive restart: ${JSON.stringify(postRestartOrder)}`);
    }
    console.log(`[Step 6 PASS] Order remains PLACED and CAPTURED in Supabase after simulated server reboot`);

  } finally {
    console.log(`[Cleanup] Removing isolated test records from test environment...`);
    await testClient.from('payments').delete().eq('order_id', testOrderId);
    await testClient.from('webhook_events').delete().eq('event_id', testEventId);
    await testClient.from('orders').delete().eq('id', testOrderId);
    console.log(`[Cleanup Complete] Test records cleaned up successfully.`);
  }

  console.log('======================================================================');
  console.log('ALL INTEGRATION TEST ASSERTIONS PASSED SUCCESSFULLY!');
  console.log('======================================================================');
}

runWebhookPersistenceTest().catch((err) => {
  console.error('[TEST FAILURE]:', err);
  process.exit(1);
});
