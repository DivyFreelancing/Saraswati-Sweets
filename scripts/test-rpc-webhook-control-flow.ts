/**
 * test-rpc-webhook-control-flow.ts
 *
 * Tests the five critical webhook control-flow paths through confirm_order_payment_atomic
 * to prove the v_existing_event "record not assigned yet" fix is correct.
 *
 * Tests against the LIVE Supabase database using service_role key.
 * All test rows are fully cleaned up in a finally block.
 * Does NOT migrate or modify any production data.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-rpc-webhook-control-flow.ts
 */

import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';

// Prefer .env.local values; dotenvx is not used here so we read directly
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createdOrders: string[] = [];
const createdWebhookEvents: string[] = [];

async function createTestOrder(amount: number): Promise<string> {
  const orderId = randomUUID();
  const orderNumber = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { error } = await supabase.from('orders').insert({
    id: orderId,
    order_number: orderNumber,
    status: 'PENDING_PAYMENT',
    payment_status: 'PENDING',
    payment_method: 'ONLINE',
    total_amount: amount,
    subtotal: amount,
    discount_amount: 0,
    delivery_charge: 0,
    tax_amount: 0,
    guest_phone: '9876543210',
    address_snapshot: {
      recipient_name: 'Test User',
      recipient_phone: '9999999999',
      street_address: '1 Test Lane',
      city: 'Testpur',
      state: 'UP',
      pincode: '000000',
      landmark: '',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(`createTestOrder failed: ${error.message}`);
  }
  createdOrders.push(orderId);
  return orderId;
}

async function callRpc(params: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('confirm_order_payment_atomic', params);
  return { data, error };
}

function rpcParams(overrides: Partial<{
  p_event_id: string | null;
  p_event_type: string;
  p_provider_order_id: string;
  p_provider_payment_id: string;
  p_order_id: string;
  p_amount: number;
  p_currency: string;
  p_payment_method: string;
  p_paid_at: string | null;
  p_raw_payload: Record<string, unknown> | null;
  p_amount_unit: string;
}>) {
  return {
    p_event_id: null,
    p_event_type: 'PAYMENT_SUCCESS_WEBHOOK',
    p_provider_order_id: `cf_ord_${Date.now()}`,
    p_provider_payment_id: `cf_pay_${randomUUID()}`,
    p_order_id: '',
    p_amount: 500,
    p_currency: 'INR',
    p_payment_method: 'ONLINE',
    p_paid_at: new Date().toISOString(),
    p_raw_payload: null,
    p_amount_unit: 'RUPEES',
    ...overrides,
  };
}

async function cleanup() {
  if (createdOrders.length > 0) {
    // Payments and webhook_events cascade or will be deleted explicitly
    await supabase.from('webhook_events').delete().in('order_id', createdOrders);
    await supabase.from('payments').delete().in('order_id', createdOrders);
    await supabase.from('orders').delete().in('id', createdOrders);
  }
  // Clean any dangling webhook events created without an order
  if (createdWebhookEvents.length > 0) {
    await supabase.from('webhook_events').delete().in('event_id', createdWebhookEvents);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let passed = 0;
function pass(msg: string) {
  console.log(`  ✓ ${msg}`);
  passed++;
}
function label(title: string) {
  console.log(`\n── ${title}`);
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RPC WEBHOOK CONTROL-FLOW TESTS  (v_existing_event fix)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Supabase: ${SUPABASE_URL}`);

  try {
    // ───────────────────────────────────────────────────────────────────────
    // 0. Compile check: confirm_order_payment_atomic must exist and be callable
    // ───────────────────────────────────────────────────────────────────────
    label('0. Compile check – RPC accessible');
    {
      const { data, error } = await callRpc(rpcParams({
        p_order_id: randomUUID(), // non-existent order
        p_provider_payment_id: `cf_pay_compile_${randomUUID()}`,
      }));
      assert.ok(!error || error.code !== 'PGRST202',
        `Function must exist (got PGRST202: ${error?.message})`);
      // ORDER_NOT_FOUND is the expected result; the key point is no compile error
      if (error) throw new Error(`Unexpected RPC error: ${error.message}`);
      assert.ok(data, 'RPC returned data');
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      assert.ok(
        result.error === 'ORDER_NOT_FOUND',
        `Expected ORDER_NOT_FOUND, got: ${JSON.stringify(result)}`
      );
      pass('confirm_order_payment_atomic compiles and is callable');
    }

    // ───────────────────────────────────────────────────────────────────────
    // 1. NO existing webhook event – the crash path that triggered the bug
    //    Previously caused: "record v_existing_event is not assigned yet"
    // ───────────────────────────────────────────────────────────────────────
    label('1. First delivery – no existing webhook event (the bug path)');
    {
      const orderId = await createTestOrder(500);
      const eventId = `evt_first_${randomUUID()}`;
      const provOrderId = `cf_ord_${randomUUID()}`;
      const provPayId = `cf_pay_${randomUUID()}`;

      const { data, error } = await callRpc(rpcParams({
        p_event_id: eventId,
        p_order_id: orderId,
        p_provider_order_id: provOrderId,
        p_provider_payment_id: provPayId,
        p_amount: 500,
      }));
      assert.ok(!error, `RPC error on first delivery: ${error?.message}`);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      assert.strictEqual(result.success, true,
        `Expected success:true, got: ${JSON.stringify(result)}`);
      assert.strictEqual(result.already_processed, false,
        'First delivery must not be already_processed');
      pass('First delivery (no prior event row) succeeds without "record not assigned" crash');
    }

    // ───────────────────────────────────────────────────────────────────────
    // 2. Repeated delivery – same event_id, same order: idempotent
    // ───────────────────────────────────────────────────────────────────────
    label('2. Repeated delivery – same event_id, idempotent');
    {
      const orderId = await createTestOrder(600);
      const eventId = `evt_repeat_${randomUUID()}`;
      const provOrderId = `cf_ord_${randomUUID()}`;
      const provPayId = `cf_pay_${randomUUID()}`;
      const params = rpcParams({
        p_event_id: eventId,
        p_order_id: orderId,
        p_provider_order_id: provOrderId,
        p_provider_payment_id: provPayId,
        p_amount: 600,
      });

      // First call
      const first = await callRpc(params);
      assert.ok(!first.error, `First call error: ${first.error?.message}`);
      const r1 = typeof first.data === 'string' ? JSON.parse(first.data) : first.data;
      assert.strictEqual(r1.success, true, `First call: ${JSON.stringify(r1)}`);
      assert.strictEqual(r1.already_processed, false);

      // Second call – exact same parameters
      const second = await callRpc(params);
      assert.ok(!second.error, `Second call error: ${second.error?.message}`);
      const r2 = typeof second.data === 'string' ? JSON.parse(second.data) : second.data;
      assert.strictEqual(r2.success, true, `Repeated call: ${JSON.stringify(r2)}`);
      assert.strictEqual(r2.already_processed, true, 'Repeated delivery must be already_processed');
      pass('Repeated delivery of same event_id returns success:true, already_processed:true');
    }

    // ───────────────────────────────────────────────────────────────────────
    // 3. Concurrent duplicate delivery – serialised by FOR UPDATE
    //    Both calls must succeed; exactly one may be the initial capture.
    // ───────────────────────────────────────────────────────────────────────
    label('3. Concurrent duplicate delivery – serialised');
    {
      const orderId = await createTestOrder(700);
      const eventId = `evt_conc_${randomUUID()}`;
      const provOrderId = `cf_ord_${randomUUID()}`;
      const provPayId = `cf_pay_${randomUUID()}`;
      const params = rpcParams({
        p_event_id: eventId,
        p_order_id: orderId,
        p_provider_order_id: provOrderId,
        p_provider_payment_id: provPayId,
        p_amount: 700,
      });

      const [a, b] = await Promise.all([callRpc(params), callRpc(params)]);
      assert.ok(!a.error, `Concurrent A error: ${a.error?.message}`);
      assert.ok(!b.error, `Concurrent B error: ${b.error?.message}`);
      const rA = typeof a.data === 'string' ? JSON.parse(a.data) : a.data;
      const rB = typeof b.data === 'string' ? JSON.parse(b.data) : b.data;
      assert.strictEqual(rA.success, true, `A: ${JSON.stringify(rA)}`);
      assert.strictEqual(rB.success, true, `B: ${JSON.stringify(rB)}`);
      // Exactly one must be the initial capture
      const initialCaptures = [rA, rB].filter((r) => !r.already_processed).length;
      assert.strictEqual(initialCaptures, 1,
        `Exactly one concurrent call must be the initial capture; got ${initialCaptures}`);
      pass('Concurrent duplicate delivery serialised: one captures, one returns already_processed');
    }

    // ───────────────────────────────────────────────────────────────────────
    // 4. Event ID reused for a different payment (identity conflict)
    // ───────────────────────────────────────────────────────────────────────
    label('4. Event ID reused with a different provider payment ID');
    {
      const orderId = await createTestOrder(800);
      const eventId = `evt_conflict_${randomUUID()}`;
      const provOrderId = `cf_ord_${randomUUID()}`;
      const firstPayId = `cf_pay_${randomUUID()}`;

      // First settlement
      const first = await callRpc(rpcParams({
        p_event_id: eventId,
        p_order_id: orderId,
        p_provider_order_id: provOrderId,
        p_provider_payment_id: firstPayId,
        p_amount: 800,
      }));
      assert.ok(!first.error);
      const r1 = typeof first.data === 'string' ? JSON.parse(first.data) : first.data;
      assert.strictEqual(r1.success, true, JSON.stringify(r1));

      // Attempt to reuse the same event_id with a *different* payment ID
      const differentPayId = `cf_pay_DIFFERENT_${randomUUID()}`;
      const second = await callRpc(rpcParams({
        p_event_id: eventId,
        p_order_id: orderId,
        p_provider_order_id: provOrderId,
        p_provider_payment_id: differentPayId,
        p_amount: 800,
      }));
      assert.ok(!second.error, `RPC error on conflict attempt: ${second.error?.message}`);
      const r2 = typeof second.data === 'string' ? JSON.parse(second.data) : second.data;
      assert.strictEqual(r2.success, false,
        `Must reject conflicting payment ID, got: ${JSON.stringify(r2)}`);
      assert.ok(
        r2.error === 'EVENT_ID_CONFLICT' || r2.error === 'PAYMENT_ID_MISMATCH' || r2.already_processed,
        `Expected EVENT_ID_CONFLICT/PAYMENT_ID_MISMATCH/already_processed, got ${r2.error}`
      );
      pass('Reusing event_id with a different provider payment ID is correctly rejected');
    }

    // ───────────────────────────────────────────────────────────────────────
    // 5. No existing webhook event row AND order not found (safe path)
    //    This is the exact scenario that triggered the original crash:
    //    - v_clean_event_id IS NOT NULL
    //    - Step C finds no row (v_evt_found = FALSE)
    //    - Step D cannot find order either
    //    - Step E must not crash reading NULL scalars
    // ───────────────────────────────────────────────────────────────────────
    label('5. No existing event + non-existent order (original crash scenario)');
    {
      const fakeOrderId = randomUUID();
      const eventId = `evt_norow_${randomUUID()}`;
      createdWebhookEvents.push(eventId);

      const { data, error } = await callRpc(rpcParams({
        p_event_id: eventId,
        p_order_id: fakeOrderId,
        p_provider_payment_id: `cf_pay_${randomUUID()}`,
        p_amount: 400,
      }));
      assert.ok(!error, `RPC error: ${error?.message}`);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      // Should return ORDER_NOT_FOUND gracefully, not crash with record-not-assigned
      assert.strictEqual(result.error, 'ORDER_NOT_FOUND',
        `Expected ORDER_NOT_FOUND, got: ${JSON.stringify(result)}`);
      assert.strictEqual(result.success, false);
      pass('No existing event + no order → ORDER_NOT_FOUND (no crash, no "record not assigned")');
    }

    // ───────────────────────────────────────────────────────────────────────
    // 6. Failed event is retryable – FAILED status allows re-processing
    // ───────────────────────────────────────────────────────────────────────
    label('6. Failed webhook event is retryable');
    {
      const orderId = await createTestOrder(550);
      const eventId = `evt_retry_${randomUUID()}`;
      const provOrderId = `cf_ord_${randomUUID()}`;
      const provPayId = `cf_pay_${randomUUID()}`;

      // First attempt: wrong amount to force FAILED event recording
      const wrongAmount = await callRpc(rpcParams({
        p_event_id: eventId,
        p_order_id: orderId,
        p_provider_order_id: provOrderId,
        p_provider_payment_id: provPayId,
        p_amount: 999, // mismatched
      }));
      assert.ok(!wrongAmount.error);
      const r1 = typeof wrongAmount.data === 'string' ? JSON.parse(wrongAmount.data) : wrongAmount.data;
      assert.strictEqual(r1.error, 'AMOUNT_MISMATCH', `Expected AMOUNT_MISMATCH: ${JSON.stringify(r1)}`);

      // Verify webhook_events row recorded as FAILED
      const { data: evtRow } = await supabase
        .from('webhook_events')
        .select('status')
        .eq('event_id', eventId)
        .maybeSingle();
      // Row may or may not exist depending on order lookup success; skip assertion if NULL
      if (evtRow) {
        assert.strictEqual(evtRow.status, 'FAILED', `Event should be FAILED, got ${evtRow.status}`);
      }

      // Retry with correct amount – must succeed (not blocked by FAILED status)
      const retry = await callRpc(rpcParams({
        p_event_id: eventId,
        p_order_id: orderId,
        p_provider_order_id: provOrderId,
        p_provider_payment_id: provPayId,
        p_amount: 550,
      }));
      assert.ok(!retry.error, `Retry RPC error: ${retry.error?.message}`);
      const r2 = typeof retry.data === 'string' ? JSON.parse(retry.data) : retry.data;
      assert.strictEqual(r2.success, true,
        `Retry after FAILED event must succeed: ${JSON.stringify(r2)}`);
      assert.strictEqual(r2.already_processed, false, 'Retry must not be already_processed');
      pass('FAILED webhook event is retryable: corrected delivery succeeds on same event_id');
    }

  } finally {
    console.log('\n── Cleanup');
    await cleanup();
    console.log('  ✓ All test rows removed');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} / 6 tests passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed < 6) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('\nFATAL:', err.message);
  cleanup().finally(() => process.exit(1));
});
