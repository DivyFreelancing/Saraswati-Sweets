import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express, { Request, Response } from 'express';
import { inMemoryStore, ServerOrder, ServerProfile } from '../server/db';
import { authenticateToken, requireRole } from '../server/authMiddleware';
import orderRoutes from '../server/routes/orderRoutes';
import adminRoutes from '../server/routes/adminRoutes';

// Set UNIT_TEST mode to enable in-memory isolated test harness
process.env.UNIT_TEST = 'true';

async function runAuditFixesVerification() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS: SECURITY AUDIT FIXES VERIFICATION SUITE');
  console.log('======================================================================\n');

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(authenticateToken);

  app.use('/api', orderRoutes);
  app.use('/api/admin', adminRoutes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  function pass(desc: string) {
    console.log(`✓ PASS: ${desc}`);
    passed++;
  }

  try {
    // =========================================================================
    // SUITE 1: SS-VULN-001 (Profiles RLS Role Escalation & Admin Role Guard)
    // =========================================================================
    console.log('--- SUITE 1: SS-VULN-001 - Profiles Role Escalation & Admin Role Guard ---');

    // Customer profile in in-memory store
    const customerId = 'cust-role-test-1';
    inMemoryStore.profiles.set(customerId, {
      id: customerId,
      phone: '9876543210',
      full_name: 'Regular Customer',
      role: 'CUSTOMER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const customerToken = Buffer.from(
      JSON.stringify({ sub: customerId, id: customerId })
    ).toString('base64');

    // Admin profile in in-memory store
    const adminId = 'admin-role-test-1';
    inMemoryStore.profiles.set(adminId, {
      id: adminId,
      phone: '9000000001',
      full_name: 'Store Admin',
      role: 'ADMIN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const adminToken = Buffer.from(
      JSON.stringify({ sub: adminId, id: adminId })
    ).toString('base64');

    // 1.1 Customer cannot access admin routes
    const custAdminAttempt = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(
      custAdminAttempt.status,
      403,
      `Expected HTTP 403 Forbidden when customer accesses admin endpoint, got ${custAdminAttempt.status}`
    );
    pass('Ordinary customer is rejected with HTTP 403 when accessing admin endpoints');

    // 1.2 Customer cannot spoof admin role in request body
    const custRefundAttempt = await fetch(`${baseUrl}/api/admin/orders/some-order-id/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ role: 'ADMIN', amount: 100 }),
    });
    assert.strictEqual(
      custRefundAttempt.status,
      403,
      `Expected HTTP 403 Forbidden on privileged refund endpoint, got ${custRefundAttempt.status}`
    );
    pass('Customer cannot perform admin operations even if role=ADMIN is included in payload');

    // 1.3 Legitimate Admin has access
    const adminOverviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(
      adminOverviewRes.status,
      200,
      `Expected HTTP 200 OK for legitimate admin, got ${adminOverviewRes.status}`
    );
    pass('Legitimate ADMIN role is granted access to administrative routes');

    // 1.4 Verify SQL Migration & Trigger files exist and contain role protection
    const migrationFile1 = path.resolve('supabase/migrations/20261019_prevent_profile_role_escalation.sql');
    assert.ok(fs.existsSync(migrationFile1), 'Migration file 20261019_prevent_profile_role_escalation.sql must exist');
    const migration1Sql = fs.readFileSync(migrationFile1, 'utf8');
    assert.ok(migration1Sql.includes('tr_prevent_profile_role_escalation'), 'Must define escalation prevention trigger');
    assert.ok(migration1Sql.includes('REVOKE UPDATE ON public.profiles FROM authenticated'), 'Must revoke unrestricted update');
    assert.ok(migration1Sql.includes('WITH CHECK (auth.uid() = id)'), 'Policy must enforce WITH CHECK (auth.uid() = id)');
    assert.ok(migration1Sql.includes("SET search_path = ''"), 'Function must set safe empty search_path');
    assert.ok(migration1Sql.includes('REVOKE ALL ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC'), 'Must revoke execute from PUBLIC');
    assert.ok(migration1Sql.includes('GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO authenticated, service_role'), 'Must grant execute to authenticated and service_role');
    pass('SQL migration 20261019_prevent_profile_role_escalation.sql enforces trigger, safe search_path, permissions, and column-level restrictions');

    // 1.5 Verify rollback script exists and contains prominent warning
    const rollbackFile1 = path.resolve('supabase/migrations/20261019_prevent_profile_role_escalation_rollback.sql');
    assert.ok(fs.existsSync(rollbackFile1), 'Rollback script 1 must exist');
    const rollback1Sql = fs.readFileSync(rollbackFile1, 'utf8');
    assert.ok(rollback1Sql.includes('WARNING'), 'Rollback script 1 must contain a clear warning banner');
    pass('Rollback script 20261019_prevent_profile_role_escalation_rollback.sql contains explicit vulnerability warning');

    // =========================================================================
    // SUITE 2: SS-VULN-002 (Guest Order Status PII Exposure & IDOR)
    // =========================================================================
    console.log('\n--- SUITE 2: SS-VULN-002 - Guest Order Status PII Exposure & IDOR ---');

    const guestOrderNumber = `ORD-GUEST-SEC-${Date.now()}`;
    const guestOrderId = `guest-order-uuid-${Date.now()}`;
    const guestPhone = '9888877777';

    const guestOrder: ServerOrder = {
      id: guestOrderId,
      order_number: guestOrderNumber,
      user_id: undefined, // Guest order has no registered user_id
      guest_phone: guestPhone,
      guest_email: 'guest.victim@example.com',
      address_snapshot: {
        id: 'addr-guest-sec',
        profile_id: 'guest',
        label: 'Home',
        recipient_name: 'Victim Guest Customer',
        recipient_phone: guestPhone,
        street_address: '456 Confidential Colony, Flat 2B',
        city: 'Barabanki',
        state: 'Uttar Pradesh',
        pincode: '225001',
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      items: [],
      subtotal: 650,
      discount_amount: 0,
      delivery_charge: 0,
      tax_amount: 0,
      idempotency_key: 'idem_sec_guest_test',
      placed_at: new Date().toISOString(),
      total_amount: 650,
      payment_method: 'ONLINE',
      payment_status: 'CAPTURED',
      status: 'PLACED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.orders.set(guestOrder.id, guestOrder);

    // 2.1 Unauthenticated request is rejected by requireAuth
    const unauthRes = await fetch(`${baseUrl}/api/checkout/order-status/${guestOrderId}`);
    assert.strictEqual(
      unauthRes.status,
      401,
      `Expected HTTP 401 UNAUTHORIZED on unauthenticated checkout order-status, got ${unauthRes.status}`
    );
    pass('Unauthenticated request to /api/checkout/order-status/:orderId is rejected with HTTP 401');

    // 2.2 Attacker customer with different phone cannot view guest order
    const attackerRes = await fetch(`${baseUrl}/api/checkout/order-status/${guestOrderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` }, // Customer has phone 9876543210
    });
    assert.strictEqual(
      attackerRes.status,
      404,
      `Expected HTTP 404 ORDER_NOT_FOUND when non-matching customer queries guest order, got ${attackerRes.status}`
    );
    pass('Customer querying unrelated guest order receives HTTP 404 ORDER_NOT_FOUND (IDOR blocked)');

    // 2.3 Registered customer querying another registered customer order is blocked
    const registeredOrder: ServerOrder = {
      id: `reg-order-uuid-${Date.now()}`,
      order_number: `ORD-REG-${Date.now()}`,
      user_id: 'other-user-uuid',
      guest_phone: undefined,
      guest_email: undefined,
      address_snapshot: {
        id: 'addr-reg',
        profile_id: 'other-user-uuid',
        label: 'Office',
        recipient_name: 'Other Registered User',
        recipient_phone: '9555544444',
        street_address: '789 Business Park',
        city: 'Barabanki',
        state: 'Uttar Pradesh',
        pincode: '225001',
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      items: [],
      subtotal: 1000,
      discount_amount: 0,
      delivery_charge: 0,
      tax_amount: 0,
      idempotency_key: 'idem_sec_reg_test',
      placed_at: new Date().toISOString(),
      total_amount: 1000,
      payment_method: 'COD',
      payment_status: 'PENDING',
      status: 'PLACED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.orders.set(registeredOrder.id, registeredOrder);

    const crossCustRes = await fetch(`${baseUrl}/api/checkout/order-status/${registeredOrder.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(
      crossCustRes.status,
      404,
      `Expected HTTP 404 on cross-customer registered order query, got ${crossCustRes.status}`
    );
    pass('Customer querying another customer registered order receives HTTP 404');

    // 2.4 Legitimate customer with matching phone can view status, with phone PII masked
    const guestUserMatchedId = 'cust-matched-guest';
    inMemoryStore.profiles.set(guestUserMatchedId, {
      id: guestUserMatchedId,
      phone: guestPhone, // Matches guestOrder recipient_phone
      full_name: 'Victim Guest Customer',
      role: 'CUSTOMER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const matchedGuestToken = Buffer.from(
      JSON.stringify({ sub: guestUserMatchedId, id: guestUserMatchedId })
    ).toString('base64');

    const matchedRes = await fetch(`${baseUrl}/api/checkout/order-status/${guestOrderId}`, {
      headers: { Authorization: `Bearer ${matchedGuestToken}` },
    });
    assert.strictEqual(
      matchedRes.status,
      200,
      `Expected HTTP 200 for user with matching phone, got ${matchedRes.status}`
    );
    const matchedData = await matchedRes.json();
    assert.ok(matchedData.success, 'Expected success=true');
    assert.strictEqual(matchedData.status, 'PLACED');
    // Verify phone masking
    assert.ok(
      matchedData.order.guest_phone.startsWith('******'),
      `Expected masked guest_phone, got ${matchedData.order.guest_phone}`
    );
    assert.ok(
      matchedData.order.address_snapshot.recipient_phone.startsWith('******'),
      `Expected masked recipient_phone, got ${matchedData.order.address_snapshot.recipient_phone}`
    );
    pass('Legitimate customer matching phone accesses guest order with phone PII masked (******7777)');

    // 2.5 Admin can access order status for customer support
    const adminQueryRes = await fetch(`${baseUrl}/api/checkout/order-status/${guestOrderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(
      adminQueryRes.status,
      200,
      `Expected HTTP 200 for admin accessing order status, got ${adminQueryRes.status}`
    );
    pass('Store Administrator can access order status for customer support');

    // =========================================================================
    // SUITE 3: SS-VULN-003 (Orders & Order Items RLS Column References)
    // =========================================================================
    console.log('\n--- SUITE 3: SS-VULN-003 - RLS Column References Invariants ---');

    // Verify schema.sql
    const schemaSql = fs.readFileSync(path.resolve('supabase/schema.sql'), 'utf8');

    // Check that public.orders policy uses user_id
    assert.ok(
      schemaSql.includes('CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id'),
      'schema.sql must use auth.uid() = user_id for public.orders policy'
    );
    // Check that public.order_items policy uses orders.user_id
    assert.ok(
      schemaSql.includes('orders.user_id = auth.uid()'),
      'schema.sql must use orders.user_id = auth.uid() for public.order_items policy'
    );
    // Check that public.addresses policy uses user_id
    assert.ok(
      schemaSql.includes('CREATE POLICY "Users can view their own addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id'),
      'schema.sql must use auth.uid() = user_id for public.addresses policy'
    );
    // Verify no incorrect references remain on orders or addresses
    assert.ok(
      !schemaSql.includes('orders.profile_id = auth.uid()'),
      'schema.sql must not contain orders.profile_id'
    );
    assert.ok(
      !schemaSql.includes('auth.uid() = profile_id OR public.is_admin_or_staff()') ||
      !schemaSql.includes('ON public.orders FOR SELECT USING (auth.uid() = profile_id'),
      'schema.sql must not reference profile_id on orders'
    );
    pass('supabase/schema.sql correctly references user_id on public.orders and public.addresses');

    // Verify migration file exists
    const migrationFile2 = path.resolve('supabase/migrations/20261019_correct_rls_column_references.sql');
    assert.ok(fs.existsSync(migrationFile2), 'Migration file 20261019_correct_rls_column_references.sql must exist');
    const migration2Sql = fs.readFileSync(migrationFile2, 'utf8');
    assert.ok(migration2Sql.includes('user_id'), 'Migration must reference user_id');
    pass('Migration 20261019_correct_rls_column_references.sql contains valid column corrections');

    // Verify rollback file 2 exists and contains warning
    const rollbackFile2 = path.resolve('supabase/migrations/20261019_correct_rls_column_references_rollback.sql');
    assert.ok(fs.existsSync(rollbackFile2), 'Rollback script 2 must exist');
    const rollback2Sql = fs.readFileSync(rollbackFile2, 'utf8');
    assert.ok(rollback2Sql.includes('WARNING'), 'Rollback script 2 must contain a clear warning banner');
    pass('Rollback script 20261019_correct_rls_column_references_rollback.sql contains explicit functionality warning');

    // =========================================================================
    // SUITE 4: SS-VULN-004 (Image Upload Validation & Bounded Buffer Limits)
    // =========================================================================
    console.log('\n--- SUITE 4: SS-VULN-004 - Image Upload Validation & Buffer Limits ---');

    // 4.1 Missing dataUrl
    const missingDataRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(missingDataRes.status, 400);
    const missingBody = await missingDataRes.json();
    assert.strictEqual(missingBody.error, 'MISSING_DATA');
    pass('Missing dataUrl returns HTTP 400 MISSING_DATA');

    // 4.2 Invalid base64 string
    const invalidBase64Res = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dataUrl: 'data:image/jpeg;base64,!!!NotBase64@@@',
      }),
    });
    assert.strictEqual(invalidBase64Res.status, 400);
    const invBase64Body = await invalidBase64Res.json();
    assert.strictEqual(invBase64Body.error, 'INVALID_BASE64');
    pass('Invalid base64 payload returns HTTP 400 INVALID_BASE64');

    // 4.3 Empty decoded buffer
    const emptyBufferRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dataUrl: 'data:image/jpeg;base64,',
      }),
    });
    assert.strictEqual(emptyBufferRes.status, 400);
    const emptyBody = await emptyBufferRes.json();
    assert.strictEqual(emptyBody.error, 'EMPTY_IMAGE');
    pass('Empty image buffer returns HTTP 400 EMPTY_IMAGE');

    // 4.4 Spoofed MIME type: text/html disguised as image/jpeg
    const htmlPayload = Buffer.from('<script>alert("xss")</script>').toString('base64');
    const spoofedRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dataUrl: `data:image/jpeg;base64,${htmlPayload}`,
        fileType: 'image/jpeg',
      }),
    });
    assert.strictEqual(spoofedRes.status, 400);
    const spoofedBody = await spoofedRes.json();
    assert.strictEqual(spoofedBody.error, 'INVALID_FILE_TYPE');
    pass('Non-image payload disguised as image/jpeg is rejected by binary magic bytes validation (HTTP 400 INVALID_FILE_TYPE)');

    // 4.5 Oversized buffer bypass attempt: client claims fileSize=100 but sends 6MB buffer
    const sixMbBuffer = Buffer.alloc(6 * 1024 * 1024);
    // Write JPEG header
    sixMbBuffer[0] = 0xff;
    sixMbBuffer[1] = 0xd8;
    sixMbBuffer[2] = 0xff;
    sixMbBuffer[3] = 0xe0;
    const sixMbBase64 = sixMbBuffer.toString('base64');

    const oversizedRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dataUrl: `data:image/jpeg;base64,${sixMbBase64}`,
        fileSize: 100, // Client tries to spoof small size!
      }),
    });
    assert.strictEqual(oversizedRes.status, 400);
    const oversizedBody = await oversizedRes.json();
    assert.strictEqual(oversizedBody.error, 'FILE_TOO_LARGE');
    assert.ok(oversizedBody.actualBytes > 5 * 1024 * 1024);
    pass('Decoded buffer exceeding 5MB is strictly rejected despite client claiming fileSize=100 (HTTP 400 FILE_TOO_LARGE)');

    // 4.6 Valid JPEG image accepted
    const validJpegHeader = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60
    ]);
    const validJpegRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dataUrl: `data:image/jpeg;base64,${validJpegHeader.toString('base64')}`,
        fileName: 'test-mithai.jpg',
      }),
    });
    assert.strictEqual(validJpegRes.status, 200);
    const validJpegBody = await validJpegRes.json();
    assert.ok(validJpegBody.success);
    pass('Valid JPEG image with correct magic bytes is accepted (HTTP 200 OK)');

    // 4.7 Valid PNG image accepted
    const validPngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
    ]);
    const validPngRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dataUrl: `data:image/png;base64,${validPngHeader.toString('base64')}`,
        fileName: 'test-namkeen.png',
      }),
    });
    assert.strictEqual(validPngRes.status, 200);
    const validPngBody = await validPngRes.json();
    assert.ok(validPngBody.success);
    pass('Valid PNG image with correct magic bytes is accepted (HTTP 200 OK)');

    // 4.8 Valid WebP image accepted
    const validWebpHeader = Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 \x18\x00\x00\x00', 'binary');
    const validWebpRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dataUrl: `data:image/webp;base64,${validWebpHeader.toString('base64')}`,
        fileName: 'test-kaju.webp',
      }),
    });
    assert.strictEqual(validWebpRes.status, 200);
    const validWebpBody = await validWebpRes.json();
    assert.ok(validWebpBody.success);
    pass('Valid WebP image with correct magic bytes is accepted (HTTP 200 OK)');

    console.log('\n======================================================================');
    console.log(`ALL AUDIT FIX REGRESSION TESTS PASSED: ${passed} Passed, 0 Failed`);
    console.log('======================================================================\n');
  } finally {
    server.close();
  }
}

runAuditFixesVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
