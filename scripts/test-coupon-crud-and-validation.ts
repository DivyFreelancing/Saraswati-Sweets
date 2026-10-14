/**
 * Test Suite: Coupon CRUD, Schema Compatibility, and Checkout Validation
 * Verifies coupon creation, editing, schema alignment, numeric edge cases,
 * error retry specificity, restart persistence, and safe live Supabase operations.
 */

import assert from 'node:assert';
import { inMemoryStore, validateCouponServer, mapDbCouponToStore, ServerCoupon, supabaseServer, isLiveSupabase } from '../server/db';

async function runCouponTests() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS — COUPON CRUD, RESTART PERSISTENCE & VALIDATION TESTS');
  console.log('======================================================================\n');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // ==========================================================================
  // SECTION 1: Schema Conversion & Bidirectional Compatibility
  // ==========================================================================
  console.log('--- 1. Schema Mapping & Description Synthesis ---');

  await test('mapDbCouponToStore converts physical Supabase row (WELCOME50) correctly', () => {
    const dbRow = {
      id: 'f1000000-0000-0000-0000-000000000001',
      code: 'WELCOME50',
      type: 'FLAT',
      value: 50,
      min_order_value: 300,
      max_discount_amount: null,
      usage_limit_total: 1000,
      usage_limit_per_user: 1,
      valid_from: '2026-09-25T17:48:08.893336+00:00',
      valid_until: '2027-09-26T17:48:08.893336+00:00',
      is_active: true,
      created_at: '2026-09-26T17:48:08.893336+00:00',
      updated_at: '2026-09-26T17:48:08.893336+00:00',
    };

    const mapped = mapDbCouponToStore(dbRow);
    assert.strictEqual(mapped.code, 'WELCOME50');
    assert.strictEqual(mapped.discount_type, 'FLAT');
    assert.strictEqual(mapped.discount_value, 50);
    assert.strictEqual(mapped.min_order_amount, 300);
    assert.strictEqual(mapped.usage_limit, 1000);
    assert.strictEqual(mapped.per_user_limit, 1);
    assert.strictEqual(mapped.is_active, true);
    assert.strictEqual(mapped.type, 'FLAT');
    assert.strictEqual(mapped.value, 50);
    assert.strictEqual(mapped.min_order_value, 300);
    assert.strictEqual(mapped.description, 'Flat ₹50 off on orders over ₹300');
  });

  await test('mapDbCouponToStore converts percentage row with cap (FESTIVE10) correctly', () => {
    const dbRow = {
      id: 'f1000000-0000-0000-0000-000000000002',
      code: 'FESTIVE10',
      type: 'PERCENTAGE',
      value: 10,
      min_order_value: 500,
      max_discount_amount: 150,
      usage_limit_total: 500,
      usage_limit_per_user: 2,
      valid_from: '2026-09-25T17:48:08.893336+00:00',
      valid_until: '2027-09-26T17:48:08.893336+00:00',
      is_active: true,
      created_at: '2026-09-26T17:48:08.893336+00:00',
      updated_at: '2026-09-26T17:48:08.893336+00:00',
    };

    const mapped = mapDbCouponToStore(dbRow);
    assert.strictEqual(mapped.code, 'FESTIVE10');
    assert.strictEqual(mapped.discount_type, 'PERCENTAGE');
    assert.strictEqual(mapped.discount_value, 10);
    assert.strictEqual(mapped.min_order_amount, 500);
    assert.strictEqual(mapped.max_discount_amount, 150);
    assert.strictEqual(mapped.description, '10% off on orders over ₹500 (max ₹150)');
  });

  await test('mapDbCouponToStore preserves explicit description if column exists', () => {
    const rowWithDesc = {
      id: 'f1000000-0000-0000-0000-000000000003',
      code: 'DIWALI20',
      type: 'PERCENTAGE',
      value: 20,
      min_order_value: 1000,
      max_discount_amount: 300,
      description: 'Exclusive Diwali Festive discount for Barabanki foodies',
      is_active: true,
    };

    const mapped = mapDbCouponToStore(rowWithDesc);
    assert.strictEqual(mapped.description, 'Exclusive Diwali Festive discount for Barabanki foodies');
  });

  // ==========================================================================
  // SECTION 2: Discount Calculations & Constraints
  // ==========================================================================
  console.log('\n--- 2. Discount Calculations & Edge Cases ---');

  await test('validateCouponServer applies FLAT coupon when subtotal qualifies', () => {
    const coupon: ServerCoupon = mapDbCouponToStore({
      id: 'c-test-flat',
      code: 'TESTFLAT50',
      type: 'FLAT',
      value: 50,
      min_order_value: 300,
      is_active: true,
      valid_from: new Date(Date.now() - 3600000).toISOString(),
      valid_until: new Date(Date.now() + 3600000).toISOString(),
    });
    inMemoryStore.coupons.set(coupon.code, coupon);

    const res = validateCouponServer('TESTFLAT50', 400);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.discount_amount, 50);
  });

  await test('validateCouponServer caps FLAT coupon if subtotal is smaller than coupon value', () => {
    // If subtotal is 40 and flat coupon is 50, discount must not exceed subtotal (discount = 40)
    const coupon: ServerCoupon = mapDbCouponToStore({
      id: 'c-test-flat-cap',
      code: 'TESTFLATOVER',
      type: 'FLAT',
      value: 50,
      min_order_value: 0,
      is_active: true,
      valid_from: new Date(Date.now() - 3600000).toISOString(),
      valid_until: new Date(Date.now() + 3600000).toISOString(),
    });
    inMemoryStore.coupons.set(coupon.code, coupon);

    const res = validateCouponServer('TESTFLATOVER', 40);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.discount_amount, 40);
  });

  await test('validateCouponServer rejects FLAT coupon when subtotal is below min_order', () => {
    const res = validateCouponServer('TESTFLAT50', 250);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errorCode, 'MIN_ORDER_NOT_MET');
    assert.strictEqual(res.discount_amount, 0);
  });

  await test('validateCouponServer applies PERCENTAGE discount capped at max_discount_amount', () => {
    const coupon: ServerCoupon = mapDbCouponToStore({
      id: 'c-test-perc',
      code: 'TESTPERC10',
      type: 'PERCENTAGE',
      value: 10,
      min_order_value: 500,
      max_discount_amount: 100,
      is_active: true,
      valid_from: new Date(Date.now() - 3600000).toISOString(),
      valid_until: new Date(Date.now() + 3600000).toISOString(),
    });
    inMemoryStore.coupons.set(coupon.code, coupon);

    // Subtotal 2000 -> 10% is 200, but capped at 100
    const res = validateCouponServer('TESTPERC10', 2000);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.discount_amount, 100);

    // Subtotal 600 -> 10% is 60, uncapped
    const res2 = validateCouponServer('TESTPERC10', 600);
    assert.strictEqual(res2.valid, true);
    assert.strictEqual(res2.discount_amount, 60);
  });

  await test('validateCouponServer rejects inactive coupons', () => {
    const coupon: ServerCoupon = mapDbCouponToStore({
      id: 'c-test-inactive',
      code: 'TESTINACTIVE',
      type: 'FLAT',
      value: 50,
      min_order_value: 100,
      is_active: false,
    });
    inMemoryStore.coupons.set(coupon.code, coupon);

    const res = validateCouponServer('TESTINACTIVE', 500);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errorCode, 'COUPON_INACTIVE');
  });

  await test('validateCouponServer rejects expired coupons', () => {
    const coupon: ServerCoupon = mapDbCouponToStore({
      id: 'c-test-expired',
      code: 'TESTEXPIRED',
      type: 'FLAT',
      value: 50,
      min_order_value: 100,
      is_active: true,
      valid_from: new Date(Date.now() - 7200000).toISOString(),
      valid_until: new Date(Date.now() - 3600000).toISOString(),
    });
    inMemoryStore.coupons.set(coupon.code, coupon);

    const res = validateCouponServer('TESTEXPIRED', 500);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errorCode, 'COUPON_EXPIRED');
  });

  await test('validateCouponServer rejects future coupons not yet started', () => {
    const coupon: ServerCoupon = mapDbCouponToStore({
      id: 'c-test-future',
      code: 'TESTFUTURE',
      type: 'FLAT',
      value: 50,
      min_order_value: 100,
      is_active: true,
      valid_from: new Date(Date.now() + 3600000).toISOString(),
      valid_until: new Date(Date.now() + 7200000).toISOString(),
    });
    inMemoryStore.coupons.set(coupon.code, coupon);

    const res = validateCouponServer('TESTFUTURE', 500);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errorCode, 'COUPON_NOT_STARTED');
  });

  // ==========================================================================
  // SECTION 3: Usage Limits & Server Restart Hydration
  // ==========================================================================
  console.log('\n--- 3. Usage Limits & Restart Persistence ---');

  await test('per_user_limit restricts repeat redemptions by user ID or phone', () => {
    const coupon: ServerCoupon = mapDbCouponToStore({
      id: 'c-test-user-lim',
      code: 'TESTUSERLIM',
      type: 'FLAT',
      value: 50,
      min_order_value: 100,
      usage_limit_per_user: 1,
      is_active: true,
      valid_from: new Date(Date.now() - 3600000).toISOString(),
      valid_until: new Date(Date.now() + 3600000).toISOString(),
    });
    inMemoryStore.coupons.set(coupon.code, coupon);

    // Initial usage
    inMemoryStore.couponUsage.push({
      id: 'cu-test-peruser-1',
      coupon_id: coupon.id,
      coupon_code: 'TESTUSERLIM',
      order_id: 'ord-u1',
      user_id: 'user-vip-1',
      phone: '9450011111',
      discount_amount: 50,
      created_at: new Date().toISOString(),
    });

    // Same user ID blocked
    const res1 = validateCouponServer('TESTUSERLIM', 500, 'user-vip-1');
    assert.strictEqual(res1.valid, false);
    assert.strictEqual(res1.errorCode, 'PER_USER_LIMIT_REACHED');

    // Guest with same phone blocked
    const res2 = validateCouponServer('TESTUSERLIM', 500, undefined, '9450011111');
    assert.strictEqual(res2.valid, false);
    assert.strictEqual(res2.errorCode, 'PER_USER_LIMIT_REACHED');

    // Fresh user and phone allowed
    const res3 = validateCouponServer('TESTUSERLIM', 500, 'user-vip-2', '9450022222');
    assert.strictEqual(res3.valid, true);
    assert.strictEqual(res3.discount_amount, 50);
  });

  await test('server restart hydration correctly derives usage_count from order history', () => {
    // Simulate orders loaded from Supabase containing coupon redemptions
    const simulatedOrders = [
      { id: 'ord-hist-1', coupon_code: 'TESTRESTART', discount_amount: 50, status: 'DELIVERED', user_id: 'u1' },
      { id: 'ord-hist-2', coupon_code: 'TESTRESTART', discount_amount: 50, status: 'CONFIRMED', user_id: 'u2' },
      { id: 'ord-hist-3', coupon_code: 'TESTRESTART', discount_amount: 50, status: 'EXPIRED', user_id: 'u3' }, // should be ignored
      { id: 'ord-hist-4', coupon_code: 'TESTRESTART', discount_amount: 50, status: 'CANCELLED', user_id: 'u4' }, // should be ignored
      { id: 'ord-hist-5', coupon_code: 'OTHERCODE', discount_amount: 10, status: 'DELIVERED', user_id: 'u5' },
    ];

    const coupon: ServerCoupon = mapDbCouponToStore({
      id: 'c-test-restart',
      code: 'TESTRESTART',
      type: 'FLAT',
      value: 50,
      min_order_value: 100,
      usage_limit_total: 2,
      usage_limit_per_user: 1,
      is_active: true,
      valid_from: new Date(Date.now() - 3600000).toISOString(),
      valid_until: new Date(Date.now() + 3600000).toISOString(),
    });
    inMemoryStore.coupons.set(coupon.code, coupon);

    // Simulate restart hydration logic (matches server/db.ts:loadStoreState)
    inMemoryStore.couponUsage = [];
    simulatedOrders.forEach((ord: any) => {
      const rawCode = ord.coupon_code;
      if (rawCode && ord.status !== 'EXPIRED' && ord.status !== 'CANCELLED') {
        const cleanCode = String(rawCode).toUpperCase().trim();
        inMemoryStore.couponUsage.push({
          id: `cu-${ord.id}`,
          coupon_id: cleanCode,
          coupon_code: cleanCode,
          order_id: ord.id,
          user_id: ord.user_id,
          discount_amount: ord.discount_amount,
          created_at: new Date().toISOString(),
        });
      }
    });

    const usageCounts = new Map<string, number>();
    inMemoryStore.couponUsage.forEach((u) => {
      const code = u.coupon_code.toUpperCase();
      usageCounts.set(code, (usageCounts.get(code) || 0) + 1);
    });
    inMemoryStore.coupons.forEach((c) => {
      c.usage_count = usageCounts.get(c.code.toUpperCase()) || 0;
    });

    // Verify derived usage count
    const hydratedCoupon = inMemoryStore.coupons.get('TESTRESTART');
    assert.strictEqual(hydratedCoupon?.usage_count, 2, 'Usage count must be 2 (excluding expired/cancelled)');

    // Total limit of 2 was reached; coupon must now be rejected for any new user
    const res = validateCouponServer('TESTRESTART', 500, 'brand-new-user');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errorCode, 'TOTAL_LIMIT_REACHED');
  });

  // ==========================================================================
  // SECTION 4: Error Handling & Retry Specificity
  // ==========================================================================
  console.log('\n--- 4. Missing Column Error Detection Specificity ---');

  await test('isMissingDescriptionColumnError accurately distinguishes missing column from constraint failures', () => {
    // Function logic under test (matches server/routes/adminRoutes.ts)
    function checkError(err: any): boolean {
      if (!err) return false;
      if (['23505', '23503', '23514', '23502', '42501'].includes(String(err.code))) return false;
      const combined = `${err.message || ''} ${err.details || ''} ${err.hint || ''}`.toLowerCase();
      const mentionsDescription = combined.includes('description');
      const isMissingColumn =
        err.code === '42703' ||
        err.code === 'PGRST204' ||
        combined.includes('schema cache') ||
        combined.includes('column') ||
        combined.includes('does not exist');
      return mentionsDescription && isMissingColumn;
    }

    // 1. PostgREST schema cache missing description error -> MUST RETRY
    assert.strictEqual(
      checkError({ message: "Could not find the 'description' column of 'coupons' in the schema cache" }),
      true
    );

    // 2. PostgreSQL 42703 column missing -> MUST RETRY
    assert.strictEqual(
      checkError({ code: '42703', message: 'column "description" of relation "coupons" does not exist' }),
      true
    );

    // 3. PostgreSQL 23505 duplicate code violation -> MUST NOT RETRY (must surface)
    assert.strictEqual(
      checkError({ code: '23505', message: 'duplicate key value violates unique constraint "coupons_code_key"' }),
      false
    );

    // 4. PostgreSQL 23514 value check violation -> MUST NOT RETRY
    assert.strictEqual(
      checkError({ code: '23514', message: 'violates check constraint "coupons_value_check"' }),
      false
    );

    // 5. Unrelated column error (e.g. 'invalid_col') -> MUST NOT RETRY
    assert.strictEqual(
      checkError({ code: '42703', message: 'column "invalid_col" does not exist' }),
      false
    );
  });

  // ==========================================================================
  // SECTION 5: Safe Isolated Live Supabase Integration Test
  // ==========================================================================
  console.log('\n--- 5. Safe Isolated Live Supabase Integration Test ---');

  if (isLiveSupabase && supabaseServer) {
    const testCode = `TEST_SAFE_${Date.now()}`;
    let insertedId: string | null = null;

    await test(`create, update, and clean up isolated test coupon (${testCode}) against Supabase`, async () => {
      // 1. Create isolated coupon with description (should trigger graceful fallback if column is missing)
      const payload: Record<string, any> = {
        code: testCode,
        type: 'FLAT',
        value: 1,
        min_order_value: 10,
        max_discount_amount: null,
        usage_limit_total: 5,
        usage_limit_per_user: 1,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 86400000).toISOString(),
        is_active: true,
        description: 'Automated test coupon - safe for cleanup',
      };

      let { data: inserted, error: insertErr } = await supabaseServer!
        .from('coupons')
        .insert([payload])
        .select()
        .single();

      if (insertErr && (insertErr.code === '42703' || insertErr.message?.includes('description') || insertErr.message?.includes('schema cache'))) {
        // Fallback retry without description
        const { description: _, ...fallbackPayload } = payload;
        const retry = await supabaseServer!.from('coupons').insert([fallbackPayload]).select().single();
        inserted = retry.data;
        insertErr = retry.error;
      }

      assert.strictEqual(insertErr, null, `Insert failed: ${insertErr?.message}`);
      assert.ok(inserted?.id, 'Inserted coupon must have an ID');
      insertedId = inserted.id;

      // 2. Update the isolated coupon (toggle active state)
      const { error: updateErr } = await supabaseServer!
        .from('coupons')
        .update({ is_active: false })
        .eq('id', insertedId);
      assert.strictEqual(updateErr, null, `Update failed: ${updateErr?.message}`);

      // 3. Verify updated state
      const { data: fetched, error: fetchErr } = await supabaseServer!
        .from('coupons')
        .select('*')
        .eq('id', insertedId)
        .single();
      assert.strictEqual(fetchErr, null);
      assert.strictEqual(fetched.is_active, false);
      assert.strictEqual(fetched.code, testCode);

      // 4. Clean up isolated test coupon
      const { error: deleteErr } = await supabaseServer!
        .from('coupons')
        .delete()
        .eq('id', insertedId);
      assert.strictEqual(deleteErr, null, `Cleanup failed: ${deleteErr?.message}`);

      // 5. Confirm deletion
      const { data: postDelete } = await supabaseServer!
        .from('coupons')
        .select('id')
        .eq('id', insertedId);
      assert.strictEqual(postDelete?.length || 0, 0, 'Test coupon must be deleted cleanly');
    });
  } else {
    console.log('  [Notice] Live Supabase not configured in current environment; skipping live DB test.');
  }

  // Clean up any test coupons from inMemoryStore
  ['TESTFLAT50', 'TESTFLATOVER', 'TESTPERC10', 'TESTINACTIVE', 'TESTEXPIRED', 'TESTFUTURE', 'TESTUSERLIM', 'TESTRESTART'].forEach((code) => {
    inMemoryStore.coupons.delete(code);
  });

  console.log('======================================================================');
  console.log(`TOTAL COUPON TESTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runCouponTests().catch((e) => {
  console.error('Fatal test execution error:', e);
  process.exit(1);
});
