import assert from 'node:assert';
import http from 'node:http';
import express, { Request, Response } from 'express';
import { inMemoryStore, ServerOrder, ServerProfile } from '../server/db';
import { authenticateToken, requireRole } from '../server/authMiddleware';
import orderRoutes from '../server/routes/orderRoutes';
import adminRoutes from '../server/routes/adminRoutes';
import { escapeHtml } from '../server/services/notificationService';

async function runSecurityValidation() {
  console.log('--- Starting Security Patch Regression Verification ---');

  const app = express();
  app.use(express.json());
  app.use(authenticateToken);

  // Administrative test endpoint protected by requireRole(['ADMIN'])
  app.get('/api/admin/test-privileged', requireRole(['ADMIN']), (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Administrative access granted' });
  });

  app.use('/api/admin', adminRoutes);
  app.use('/api', orderRoutes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // =========================================================================
    // Test 1: Forged Unsigned JWT cannot escalate to ADMIN role
    // =========================================================================
    const forgedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: 'malicious-hacker', role: 'service_role', exp: 9999999999 })
    ).toString('base64url');
    const forgedToken = `${forgedHeader}.${forgedPayload}.`;

    const adminBypassRes = await fetch(`${baseUrl}/api/admin/test-privileged`, {
      headers: {
        Authorization: `Bearer ${forgedToken}`,
      },
    });

    assert.strictEqual(
      adminBypassRes.status,
      401,
      `Expected HTTP 401 UNAUTHORIZED on unverified forged token, received ${adminBypassRes.status}`
    );
    console.log('✓ PASS: Forged unsigned token with role=service_role is strictly rejected (HTTP 401)');

    // =========================================================================
    // Test 2: Token passed in URL Query Parameter is rejected
    // =========================================================================
    // Set up a valid in-memory customer for testing
    const testCustomerId = 'cust-legit-1';
    inMemoryStore.profiles.set(testCustomerId, {
      id: testCustomerId,
      phone: '9876543210',
      full_name: 'Legit User',
      role: 'CUSTOMER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const legitPayload = Buffer.from(JSON.stringify({ sub: testCustomerId, id: testCustomerId })).toString('base64');

    const queryTokenRes = await fetch(`${baseUrl}/api/orders?token=${legitPayload}`);
    assert.strictEqual(
      queryTokenRes.status,
      401,
      `Expected HTTP 401 UNAUTHORIZED when token passed via query parameter, received ${queryTokenRes.status}`
    );
    console.log('✓ PASS: Token passed via URL query parameter is rejected (HTTP 401)');

    // =========================================================================
    // Test 3: Guest Order IDOR is blocked for other customers
    // =========================================================================
    // Create a guest order (user_id is undefined/null)
    const guestOrderNumber = `ORD-GUEST-${Date.now()}`;
    const guestOrder: ServerOrder = {
      id: `guest-id-${Date.now()}`,
      order_number: guestOrderNumber,
      user_id: undefined,
      guest_phone: '9111122222',
      guest_email: 'guest@example.com',
      address_snapshot: {
        id: 'addr-guest-1',
        profile_id: 'guest',
        label: 'Home',
        recipient_name: 'Private Guest Person',
        recipient_phone: '9111122222',
        street_address: '123 Secret Lane',
        city: 'Barabanki',
        state: 'Uttar Pradesh',
        pincode: '225001',
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      items: [],
      subtotal: 500,
      discount_amount: 0,
      delivery_charge: 0,
      tax_amount: 0,
      idempotency_key: 'idem_sec_test',
      placed_at: new Date().toISOString(),
      total_amount: 500,
      payment_method: 'COD',
      payment_status: 'PENDING',
      status: 'PLACED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.orders.set(guestOrder.id, guestOrder);

    // Attacker customer has a different phone number and ID
    const attackerCustomerId = 'cust-attacker-2';
    inMemoryStore.profiles.set(attackerCustomerId, {
      id: attackerCustomerId,
      phone: '9999988888',
      full_name: 'Attacker Customer',
      role: 'CUSTOMER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // In unit test mode, authMiddleware resolves legit in-memory mock token with matching id
    const attackerToken = Buffer.from(
      JSON.stringify({ sub: attackerCustomerId, id: attackerCustomerId })
    ).toString('base64');

    // Run in UNIT_TEST=true mode to allow the test harness to authenticate the attacker as a valid CUSTOMER
    process.env.UNIT_TEST = 'true';

    const idorRes = await fetch(`${baseUrl}/api/orders/${guestOrderNumber}`, {
      headers: {
        Authorization: `Bearer ${attackerToken}`,
      },
    });

    assert.strictEqual(
      idorRes.status,
      404,
      `Expected HTTP 404 ORDER_NOT_FOUND when customer queries unrelated guest order, received ${idorRes.status}`
    );
    console.log('✓ PASS: Authenticated customer querying third-party guest order is rejected with HTTP 404 (IDOR blocked)');

    // =========================================================================
    // Test 4: Admin Media Upload Path Traversal rejection
    // =========================================================================
    const adminId = 'admin-user-sec';
    inMemoryStore.profiles.set(adminId, {
      id: adminId,
      phone: '9000000000',
      full_name: 'Security Admin',
      role: 'ADMIN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const adminToken = Buffer.from(
      JSON.stringify({ sub: adminId, id: adminId })
    ).toString('base64');

    const uploadTraversalRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        fileName: 'sample.png',
        fileType: 'image/png',
        fileSize: 100,
        path: '../traversal-attack.png',
      }),
    });

    assert.strictEqual(
      uploadTraversalRes.status,
      400,
      `Expected HTTP 400 INVALID_PATH on traversal path, received ${uploadTraversalRes.status}`
    );
    const traversalBody = await uploadTraversalRes.json();
    assert.strictEqual(traversalBody.error, 'INVALID_PATH');
    console.log('✓ PASS: Admin media upload rejects path traversal sequences (HTTP 400 INVALID_PATH)');

    // =========================================================================
    // Test 5: escapeHtml prevents HTML injection in transactional email strings
    // =========================================================================
    const injectionInput = 'Customer <script>alert("pwned")</script> & <a href="http://malicious.com">Click</a>';
    const escapedOutput = escapeHtml(injectionInput);
    assert.strictEqual(escapedOutput.includes('<script>'), false, 'Must not contain unescaped <script>');
    assert.strictEqual(escapedOutput.includes('&lt;script&gt;'), true, 'Must escape < to &lt;');
    assert.strictEqual(escapedOutput.includes('&amp;'), true, 'Must escape & to &amp;');
    assert.strictEqual(escapedOutput.includes('&quot;'), true, 'Must escape quotes');
    console.log('✓ PASS: escapeHtml correctly neutralizes script tags, links, and special characters');

    console.log('\n======================================================');
    console.log('ALL SECURITY PATCH REGRESSION TESTS PASSED (5/5)');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

runSecurityValidation()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Security test failed:', err);
    process.exit(1);
  });
