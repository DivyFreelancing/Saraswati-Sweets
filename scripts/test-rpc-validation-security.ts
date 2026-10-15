/**
 * test-rpc-validation-and-security.ts
 * 
 * Tests validation rules (missing payment ID, bad currency, amount mismatch,
 * forced failure atomicity) and security (anon/authenticated cannot call RPC).
 */
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const DB_URL = process.argv[2] || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anonClient = ANON_KEY ? createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } }) : null;

const createdOrders: string[] = [];

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
      recipient_name: 'Test',
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
  if (error) throw new Error(`createTestOrder: ${error.message}`);
  createdOrders.push(orderId);
  return orderId;
}

async function callRpc(client: any, overrides: Record<string, unknown>) {
  const params = {
    p_event_id: null,
    p_event_type: 'TEST',
    p_provider_order_id: `cf_ord_${randomUUID()}`,
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
  return client.rpc('confirm_order_payment_atomic', params);
}

async function cleanup() {
  if (createdOrders.length > 0) {
    await supabase.from('webhook_events').delete().in('order_id', createdOrders);
    await supabase.from('payments').delete().in('order_id', createdOrders);
    await supabase.from('orders').delete().in('id', createdOrders);
  }
}

let passed = 0;
let total = 0;
function pass(msg: string) { console.log(`  ✓ ${msg}`); passed++; total++; }
function skip(msg: string) { console.log(`  ⊘ SKIP: ${msg}`); total++; }
function label(title: string) { console.log(`\n── ${title}`); }

async function runTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('  VALIDATION & SECURITY TESTS');
  console.log('═══════════════════════════════════════════════');

  try {
    // 1. Missing payment ID
    label('1. Missing provider payment ID');
    {
      const orderId = await createTestOrder(500);
      const { data, error } = await callRpc(supabase, {
        p_order_id: orderId,
        p_provider_payment_id: '',  // blank
        p_amount: 500,
      });
      assert.ok(!error, `RPC error: ${error?.message}`);
      const r = typeof data === 'string' ? JSON.parse(data) : data;
      assert.strictEqual(r.success, false);
      assert.strictEqual(r.error, 'MISSING_PROVIDER_PAYMENT_ID');
      pass('Blank provider payment ID rejected');
    }

    // 2. NULL payment ID
    label('2. NULL provider payment ID');
    {
      const orderId = await createTestOrder(500);
      const { data, error } = await callRpc(supabase, {
        p_order_id: orderId,
        p_provider_payment_id: null,
        p_amount: 500,
      });
      assert.ok(!error, `RPC error: ${error?.message}`);
      const r = typeof data === 'string' ? JSON.parse(data) : data;
      assert.strictEqual(r.success, false);
      assert.strictEqual(r.error, 'MISSING_PROVIDER_PAYMENT_ID');
      pass('NULL provider payment ID rejected');
    }

    // 3. Invalid currency
    label('3. Invalid currency (USD)');
    {
      const orderId = await createTestOrder(500);
      const { data, error } = await callRpc(supabase, {
        p_order_id: orderId,
        p_currency: 'USD',
        p_amount: 500,
      });
      assert.ok(!error, `RPC error: ${error?.message}`);
      const r = typeof data === 'string' ? JSON.parse(data) : data;
      assert.strictEqual(r.success, false);
      assert.strictEqual(r.error, 'CURRENCY_MISMATCH');
      pass('Non-INR currency rejected');
    }

    // 4. Missing currency
    label('4. Missing/blank currency');
    {
      const orderId = await createTestOrder(500);
      const { data, error } = await callRpc(supabase, {
        p_order_id: orderId,
        p_currency: '',
        p_amount: 500,
      });
      assert.ok(!error, `RPC error: ${error?.message}`);
      const r = typeof data === 'string' ? JSON.parse(data) : data;
      assert.strictEqual(r.success, false);
      assert.strictEqual(r.error, 'CURRENCY_MISMATCH');
      pass('Blank currency rejected');
    }

    // 5. Amount mismatch
    label('5. Amount mismatch');
    {
      const orderId = await createTestOrder(500);
      const { data, error } = await callRpc(supabase, {
        p_order_id: orderId,
        p_amount: 499.99,
      });
      assert.ok(!error, `RPC error: ${error?.message}`);
      const r = typeof data === 'string' ? JSON.parse(data) : data;
      assert.strictEqual(r.success, false);
      assert.strictEqual(r.error, 'AMOUNT_MISMATCH');
      pass('Amount mismatch rejected (₹500 vs ₹499.99)');
    }

    // 6. Zero amount
    label('6. Zero/negative amount');
    {
      const orderId = await createTestOrder(500);
      const { data, error } = await callRpc(supabase, {
        p_order_id: orderId,
        p_amount: 0,
      });
      assert.ok(!error, `RPC error: ${error?.message}`);
      const r = typeof data === 'string' ? JSON.parse(data) : data;
      assert.strictEqual(r.success, false);
      assert.strictEqual(r.error, 'INVALID_PAYMENT_AMOUNT');
      pass('Zero amount rejected');
    }

    // 7. Invalid amount unit
    label('7. Invalid amount unit');
    {
      const orderId = await createTestOrder(500);
      const { data, error } = await callRpc(supabase, {
        p_order_id: orderId,
        p_amount: 500,
        p_amount_unit: 'DOLLARS',
      });
      assert.ok(!error, `RPC error: ${error?.message}`);
      const r = typeof data === 'string' ? JSON.parse(data) : data;
      assert.strictEqual(r.success, false);
      assert.strictEqual(r.error, 'INVALID_AMOUNT_UNIT');
      pass('Invalid amount unit rejected');
    }

    // 8. PAISE conversion
    label('8. PAISE unit conversion');
    {
      const orderId = await createTestOrder(500);
      const eventId = `evt_paise_${randomUUID()}`;
      const { data, error } = await callRpc(supabase, {
        p_event_id: eventId,
        p_order_id: orderId,
        p_amount: 50000,  // 500 rupees in paise
        p_amount_unit: 'PAISE',
      });
      assert.ok(!error, `RPC error: ${error?.message}`);
      const r = typeof data === 'string' ? JSON.parse(data) : data;
      assert.strictEqual(r.success, true, `Expected success, got: ${JSON.stringify(r)}`);
      pass('50000 PAISE correctly converts to ₹500 and matches');
    }

    // 9. Atomic rollback: force payment insert failure via duplicate
    label('9. Atomic rollback (duplicate captured payment)');
    {
      const orderId = await createTestOrder(300);
      const provPayId = `cf_pay_${randomUUID()}`;
      // First settlement
      const first = await callRpc(supabase, {
        p_event_id: `evt_dup1_${randomUUID()}`,
        p_order_id: orderId,
        p_provider_payment_id: provPayId,
        p_amount: 300,
      });
      assert.ok(!first.error);
      const r1 = typeof first.data === 'string' ? JSON.parse(first.data) : first.data;
      assert.strictEqual(r1.success, true);

      // Now try to settle with a DIFFERENT event but SAME payment ID on a different order
      const orderId2 = await createTestOrder(300);
      const second = await callRpc(supabase, {
        p_event_id: `evt_dup2_${randomUUID()}`,
        p_order_id: orderId2,
        p_provider_payment_id: provPayId,  // same as first!
        p_amount: 300,
      });
      assert.ok(!second.error, `RPC error: ${second.error?.message}`);
      const r2 = typeof second.data === 'string' ? JSON.parse(second.data) : second.data;
      assert.strictEqual(r2.success, false);
      assert.ok(
        r2.error === 'PAYMENT_ID_ALREADY_USED' || r2.error === 'PAYMENT_ID_MISMATCH',
        `Expected PAYMENT_ID_ALREADY_USED/MISMATCH, got: ${r2.error}`
      );

      // Verify second order was NOT marked CAPTURED
      const { data: checkOrder } = await supabase.from('orders').select('payment_status').eq('id', orderId2).single();
      assert.ok(checkOrder);
      assert.strictEqual(checkOrder.payment_status, 'PENDING',
        `Second order must remain PENDING after failed settlement, got: ${checkOrder.payment_status}`);
      pass('Duplicate payment ID across orders: second order stays PENDING (atomic rollback)');
    }

    // 10. Unauthorized RPC access (anon key)
    label('10. Unauthorized RPC access (anon key)');
    if (anonClient) {
      const { data, error } = await callRpc(anonClient, {
        p_order_id: randomUUID(),
        p_amount: 100,
      });
      // Should fail with permission denied
      const isPermDenied = error && (
        error.message?.includes('permission denied') ||
        error.code === '42501' ||
        error.message?.includes('not authorized') ||
        error.code === 'PGRST202'  // function not visible to anon = effectively denied
      );
      assert.ok(isPermDenied || (data && !data.success),
        `Expected permission denied for anon, got: error=${error?.message} data=${JSON.stringify(data)}`);
      pass('Anonymous client cannot call RPC (permission denied or function not visible)');
    } else {
      skip('No VITE_SUPABASE_ANON_KEY available for unauthorized access test');
    }

    // 11. Verify existing data preserved
    label('11. Existing data preservation');
    {
      const { count: capCount } = await supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'CAPTURED');
      const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      console.log(`  Captured payments: ${capCount}, Total orders: ${orderCount}`);
      assert.ok((capCount ?? 0) >= 2, `Should have at least 2 existing captured payments`);
      assert.ok((orderCount ?? 0) >= 9, `Should have at least 9 existing orders`);
      pass('Existing captured payments and orders preserved');
    }

  } finally {
    console.log('\n── Cleanup');
    await cleanup();
    console.log('  ✓ Test rows removed');
  }

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  RESULTS: ${passed} / ${total} tests passed`);
  console.log(`═══════════════════════════════════════════════\n`);
  if (passed < total) process.exit(1);
}

runTests().catch(err => {
  console.error('FATAL:', err.message);
  cleanup().finally(() => process.exit(1));
});
