import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ServerOrder, ServerNotification, ServerProfile } from '../server/db';

// Set UNIT_TEST mode before any application module is imported
process.env.UNIT_TEST = 'true';

async function runAuditRemediationTests() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS: PRE-DEPLOYMENT AUDIT REMEDIATION TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  function pass(desc: string) {
    console.log(`✓ PASS: ${desc}`);
    passed++;
  }

  // Import application dependencies
  const express = (await import('express')).default;
  const {
    inMemoryStore,
    _setStoreReadyForTesting,
    _setTestHealthClient,
    checkDatabaseHealth,
  } = await import('../server/db');
  const { authenticateToken } = await import('../server/authMiddleware');
  const orderRoutes = (await import('../server/routes/orderRoutes')).default;
  const publicRoutes = (await import('../server/routes/publicRoutes')).default;
  const { isStoreLoaded } = await import('../server/db');

  // Set up in-process Express application matching server.ts mounting
  const app = express();
  app.use(express.json());
  app.use(authenticateToken);

  // Mount API routes
  app.use('/api', orderRoutes);
  app.use('/api', publicRoutes);

  // Mount /api/health exactly as in server.ts
  app.get('/api/health', async (req, res) => {
    if (req.query.probe === 'liveness') {
      res.status(200).json({
        status: 'ok',
        liveness: true,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!isStoreLoaded()) {
      res.status(503).json({
        status: 'initializing',
        ready: false,
        timestamp: new Date().toISOString(),
        error: 'SERVICE_INITIALIZING',
        message: 'Application store state is still hydrating. Please retry shortly.',
      });
      return;
    }

    const dbHealth = await checkDatabaseHealth();
    if (!dbHealth.ok) {
      console.warn('[HealthCheck] Database readiness failure:', dbHealth.error);
      res.status(503).json({
        status: 'unhealthy',
        ready: false,
        timestamp: new Date().toISOString(),
        error: 'DATABASE_UNAVAILABLE',
        message: 'Database dependency is temporarily unavailable or unreachable.',
      });
      return;
    }

    res.status(200).json({
      status: 'ok',
      ready: true,
      timestamp: new Date().toISOString(),
      shop: 'Saraswati Sweets (Barabanki, UP)',
    });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Helper to construct test JWT recognized by unit test authenticateToken
  function makeAuthToken(userId: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: userId, id: userId })).toString('base64url');
    return `Bearer ${header}.${payload}.sig`;
  }

  // Register mock test profiles
  const customerA: ServerProfile = {
    id: 'user-cust-a',
    email: 'cust-a@test.com',
    phone: '+91 98765 00001',
    full_name: 'Customer A',
    role: 'CUSTOMER',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const customerB: ServerProfile = {
    id: 'user-cust-b',
    email: 'cust-b@test.com',
    phone: '+91 98765 00002',
    full_name: 'Customer B',
    role: 'CUSTOMER',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const staffUser: ServerProfile = {
    id: 'user-staff',
    email: 'staff@test.com',
    phone: '+91 98765 00003',
    full_name: 'Store Staff',
    role: 'STAFF',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryStore.profiles.set(customerA.id, customerA);
  inMemoryStore.profiles.set(customerB.id, customerB);
  inMemoryStore.profiles.set(staffUser.id, staffUser);

  const nowIso = new Date().toISOString();

  try {
    // =========================================================================
    // FIX 1: GUEST-ORDER CANCELLATION AUTHORIZATION
    // =========================================================================
    console.log('--- FIX 1: Guest-Order Cancellation Authorization Tests ---');

    // 1a. Unauthenticated request rejected
    const unauthRes = await fetch(`${baseUrl}/api/orders/some-id/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    assert.strictEqual(unauthRes.status, 401);
    const unauthBody = await unauthRes.json();
    assert.strictEqual(unauthBody.error, 'UNAUTHORIZED');
    pass('Unauthenticated status transition request rejected with HTTP 401 UNAUTHORIZED');

    // 1b. Nonexistent order returns 404
    const nonExistRes = await fetch(`${baseUrl}/api/orders/non-existent-order-uuid/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: makeAuthToken(customerA.id),
      },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    assert.strictEqual(nonExistRes.status, 404);
    const nonExistBody = await nonExistRes.json();
    assert.strictEqual(nonExistBody.error, 'ORDER_NOT_FOUND');
    pass('Nonexistent order ID returns HTTP 404 ORDER_NOT_FOUND');

    // Create a guest order (user_id is undefined / null)
    const guestOrderId = randomUUID();
    const guestOrder: ServerOrder = {
      id: guestOrderId,
      order_number: `SS-GUEST-${Date.now()}`,
      status: 'PLACED',
      payment_status: 'CAPTURED',
      payment_method: 'ONLINE',
      subtotal: 500,
      discount_amount: 0,
      delivery_charge: 50,
      tax_amount: 0,
      total_amount: 550,
      idempotency_key: `guest_idem_${randomUUID()}`,
      placed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      guest_phone: '9876543210',
      address_snapshot: {
        recipient_name: 'Guest Customer',
        recipient_phone: '9876543210',
        street_address: 'Indira Market',
        city: 'Barabanki',
        state: 'Uttar Pradesh',
        pincode: '225001',
      } as any,
      items: [],
    };
    inMemoryStore.orders.set(guestOrderId, guestOrder);

    // 1c. Customer A attempts to cancel guest order (user_id is null)
    const custCancelGuestRes = await fetch(`${baseUrl}/api/orders/${guestOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: makeAuthToken(customerA.id),
      },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    assert.strictEqual(custCancelGuestRes.status, 404);
    const custCancelGuestBody = await custCancelGuestRes.json();
    assert.strictEqual(custCancelGuestBody.error, 'ORDER_NOT_FOUND');
    assert.strictEqual(inMemoryStore.orders.get(guestOrderId)!.status, 'PLACED');
    pass('Authenticated customer CANNOT cancel unauthenticated guest order (returns HTTP 404, order remains PLACED)');

    // Create Customer B's registered order
    const custBOrderId = randomUUID();
    const custBOrder: ServerOrder = {
      id: custBOrderId,
      order_number: `SS-CUSTB-${Date.now()}`,
      user_id: customerB.id,
      status: 'PLACED',
      payment_status: 'CAPTURED',
      payment_method: 'ONLINE',
      subtotal: 800,
      discount_amount: 0,
      delivery_charge: 50,
      tax_amount: 0,
      total_amount: 850,
      idempotency_key: `custb_idem_${randomUUID()}`,
      placed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      address_snapshot: {
        recipient_name: 'Customer B',
        recipient_phone: '9876500002',
        street_address: 'Chaya Chauraha',
        city: 'Barabanki',
        state: 'Uttar Pradesh',
        pincode: '225001',
      } as any,
      items: [],
    };
    inMemoryStore.orders.set(custBOrderId, custBOrder);

    // 1d. Customer A attempts to cancel Customer B's order
    const custCancelOtherRes = await fetch(`${baseUrl}/api/orders/${custBOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: makeAuthToken(customerA.id),
      },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    assert.strictEqual(custCancelOtherRes.status, 404);
    const custCancelOtherBody = await custCancelOtherRes.json();
    assert.strictEqual(custCancelOtherBody.error, 'ORDER_NOT_FOUND');
    assert.strictEqual(inMemoryStore.orders.get(custBOrderId)!.status, 'PLACED');
    pass('Customer A CANNOT cancel Customer B order (cross-customer cancellation returns HTTP 404, order remains PLACED)');

    // Create Customer A's own registered order
    const custAOrderId = randomUUID();
    const custAOrder: ServerOrder = {
      id: custAOrderId,
      order_number: `SS-CUSTA-${Date.now()}`,
      user_id: customerA.id,
      status: 'PLACED',
      payment_status: 'CAPTURED',
      payment_method: 'ONLINE',
      subtotal: 600,
      discount_amount: 0,
      delivery_charge: 50,
      tax_amount: 0,
      total_amount: 650,
      idempotency_key: `custa_idem_${randomUUID()}`,
      placed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      address_snapshot: {
        recipient_name: 'Customer A',
        recipient_phone: '9876500001',
        street_address: 'Station Road',
        city: 'Barabanki',
        state: 'Uttar Pradesh',
        pincode: '225001',
      } as any,
      items: [],
    };
    inMemoryStore.orders.set(custAOrderId, custAOrder);

    // 1e. Customer A cancels their OWN registered order
    const custCancelOwnRes = await fetch(`${baseUrl}/api/orders/${custAOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: makeAuthToken(customerA.id),
      },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    assert.strictEqual(custCancelOwnRes.status, 200);
    const custCancelOwnBody = await custCancelOwnRes.json();
    assert.strictEqual(custCancelOwnBody.success, true);
    assert.strictEqual(inMemoryStore.orders.get(custAOrderId)!.status, 'CANCELLED');
    pass('Customer A successfully cancels their OWN registered order in PLACED status (HTTP 200)');

    // 1f. Customer cannot cancel an order that has already entered dispatch (e.g. PREPARING)
    const prepOrderId = randomUUID();
    const prepOrder: ServerOrder = {
      ...custAOrder,
      id: prepOrderId,
      order_number: `SS-PREP-${Date.now()}`,
      status: 'PREPARING',
    };
    inMemoryStore.orders.set(prepOrderId, prepOrder);

    const custCancelPrepRes = await fetch(`${baseUrl}/api/orders/${prepOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: makeAuthToken(customerA.id),
      },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    assert.strictEqual(custCancelPrepRes.status, 409);
    assert.strictEqual(inMemoryStore.orders.get(prepOrderId)!.status, 'PREPARING');
    pass('Customer cannot cancel order once dispatch has started (PREPARING returns HTTP 409)');

    // 1g. Staff / Admin can perform valid status transitions on guest orders
    const staffTransitionRes = await fetch(`${baseUrl}/api/orders/${guestOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: makeAuthToken(staffUser.id),
      },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    assert.strictEqual(staffTransitionRes.status, 200);
    assert.strictEqual(inMemoryStore.orders.get(guestOrderId)!.status, 'CONFIRMED');
    pass('Staff / Admin role successfully transitions order status (PLACED -> CONFIRMED returns HTTP 200)');

    // =========================================================================
    // FIX 2: NOTIFICATION-READ OWNERSHIP AUTHORIZATION
    // =========================================================================
    console.log('\n--- FIX 2: Notification-Read Ownership Authorization Tests ---');

    // 2a. Unauthenticated request to mark notification read
    const unauthNotifRes = await fetch(`${baseUrl}/api/notifications/some-notif/read`, {
      method: 'PATCH',
    });
    assert.strictEqual(unauthNotifRes.status, 401);
    pass('Unauthenticated request to mark notification read returns HTTP 401 UNAUTHORIZED');

    // 2b. Missing notification returns 404
    const missingNotifRes = await fetch(`${baseUrl}/api/notifications/missing-notif-uuid/read`, {
      method: 'PATCH',
      headers: { Authorization: makeAuthToken(customerA.id) },
    });
    assert.strictEqual(missingNotifRes.status, 404);
    const missingNotifBody = await missingNotifRes.json();
    assert.strictEqual(missingNotifBody.error, 'NOTIFICATION_NOT_FOUND');
    pass('Missing notification ID returns HTTP 404 NOTIFICATION_NOT_FOUND');

    // Create notifications for Customer A, Customer B, and Admin
    const notifA: ServerNotification = {
      id: `notif-cust-a-${Date.now()}`,
      user_id: customerA.id,
      title: 'Order Confirmed',
      message: 'Your order has been confirmed by Saraswati Sweets.',
      type: 'ORDER_STATUS',
      is_read: false,
      created_at: nowIso,
    };

    const notifB: ServerNotification = {
      id: `notif-cust-b-${Date.now()}`,
      user_id: customerB.id,
      title: 'Order Dispatched',
      message: 'Your sweets are out for delivery.',
      type: 'ORDER_STATUS',
      is_read: false,
      created_at: nowIso,
    };

    const notifAdmin: ServerNotification = {
      id: `notif-admin-${Date.now()}`,
      user_id: 'ADMIN',
      title: 'New Online Order Placed',
      message: 'Order #SW-TEST has been placed.',
      type: 'ORDER_PLACED',
      is_read: false,
      created_at: nowIso,
    };

    inMemoryStore.notifications.push(notifA, notifB, notifAdmin);

    // 2c. Customer A attempts to mark Customer B's notification read
    const custCrossReadRes = await fetch(`${baseUrl}/api/notifications/${notifB.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: makeAuthToken(customerA.id) },
    });
    assert.strictEqual(custCrossReadRes.status, 404);
    const custCrossReadBody = await custCrossReadRes.json();
    assert.strictEqual(custCrossReadBody.error, 'NOTIFICATION_NOT_FOUND');
    assert.strictEqual(notifB.is_read, false);
    pass('Customer A CANNOT mark Customer B notification as read (returns HTTP 404, is_read remains false)');

    // 2d. Customer A marks their OWN notification as read
    const custOwnReadRes = await fetch(`${baseUrl}/api/notifications/${notifA.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: makeAuthToken(customerA.id) },
    });
    assert.strictEqual(custOwnReadRes.status, 200);
    const custOwnReadBody = await custOwnReadRes.json();
    assert.strictEqual(custOwnReadBody.success, true);
    assert.strictEqual(notifA.is_read, true);
    pass('Customer A successfully marks their OWN notification as read (HTTP 200, is_read=true)');

    // 2e. Customer A attempts to mark Admin notification as read
    const custAdminReadRes = await fetch(`${baseUrl}/api/notifications/${notifAdmin.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: makeAuthToken(customerA.id) },
    });
    assert.strictEqual(custAdminReadRes.status, 404);
    assert.strictEqual(notifAdmin.is_read, false);
    pass('Ordinary customer CANNOT mark store Admin notifications as read (returns HTTP 404)');

    // 2f. Staff / Admin marks Admin notification as read
    const staffAdminReadRes = await fetch(`${baseUrl}/api/notifications/${notifAdmin.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: makeAuthToken(staffUser.id) },
    });
    assert.strictEqual(staffAdminReadRes.status, 200);
    assert.strictEqual(notifAdmin.is_read, true);
    pass('Staff / Admin role successfully marks store Admin notifications as read (HTTP 200)');

    // =========================================================================
    // FIX 3: RAILWAY HEALTH CHECK & READINESS CONFIGURATION
    // =========================================================================
    console.log('\n--- FIX 3: Railway Health Check & Readiness Tests ---');

    // 3a. Process Liveness probe returns 200 immediately
    const livenessRes = await fetch(`${baseUrl}/api/health?probe=liveness`);
    assert.strictEqual(livenessRes.status, 200);
    const livenessBody = await livenessRes.json();
    assert.strictEqual(livenessBody.status, 'ok');
    assert.strictEqual(livenessBody.liveness, true);
    pass('Liveness probe (?probe=liveness) returns HTTP 200 immediately without database checks');

    // 3b. Healthy readiness returns 200
    _setStoreReadyForTesting(true);
    _setTestHealthClient(undefined);
    const healthyRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthyRes.status, 200);
    const healthyBody = await healthyRes.json();
    assert.strictEqual(healthyBody.status, 'ok');
    assert.strictEqual(healthyBody.ready, true);
    assert.strictEqual(typeof healthyBody.timestamp, 'string');
    pass('Readiness probe (/api/health) returns HTTP 200 when store state is hydrated and database is healthy');

    // 3c. Unhydrated store state returns 503
    _setStoreReadyForTesting(false);
    const unhydratedRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(unhydratedRes.status, 503);
    const unhydratedBody = await unhydratedRes.json();
    assert.strictEqual(unhydratedBody.status, 'initializing');
    assert.strictEqual(unhydratedBody.ready, false);
    assert.strictEqual(unhydratedBody.error, 'SERVICE_INITIALIZING');
    pass('Unhydrated startup state returns HTTP 503 SERVICE_INITIALIZING (prevents routing before ready)');

    // Restore store readiness for subsequent database tests
    _setStoreReadyForTesting(true);

    // 3d. Database ping error returns 503 without leaking credentials
    const failingDbClient = {
      from: () => ({
        select: () => ({
          limit: () => ({
            maybeSingle: async () => ({
              data: null,
              error: { message: 'Supabase connection pool exhausted' },
            }),
          }),
        }),
      }),
    };

    _setTestHealthClient(failingDbClient);
    const dbFailRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(dbFailRes.status, 503);
    const dbFailBody = await dbFailRes.json();
    assert.strictEqual(dbFailBody.status, 'unhealthy');
    assert.strictEqual(dbFailBody.ready, false);
    assert.strictEqual(dbFailBody.error, 'DATABASE_UNAVAILABLE');
    assert.strictEqual(
      dbFailBody.message,
      'Database dependency is temporarily unavailable or unreachable.'
    );
    // Verify no secret leak
    assert.strictEqual(JSON.stringify(dbFailBody).includes('pool exhausted'), false);
    pass('Database dependency error returns HTTP 503 DATABASE_UNAVAILABLE with safe, redacted message');

    // 3e. Database timeout returns 503
    const hangingDbClient = {
      from: () => ({
        select: () => ({
          limit: () => ({
            maybeSingle: () => new Promise(() => {}), // never resolves
          }),
        }),
      }),
    };

    _setTestHealthClient(hangingDbClient);
    const startHangs = Date.now();
    const dbTimeoutRes = await fetch(`${baseUrl}/api/health`);
    const durationMs = Date.now() - startHangs;
    assert.strictEqual(dbTimeoutRes.status, 503);
    const dbTimeoutBody = await dbTimeoutRes.json();
    assert.strictEqual(dbTimeoutBody.status, 'unhealthy');
    assert.strictEqual(dbTimeoutBody.error, 'DATABASE_UNAVAILABLE');
    // Ensure timeout bounded to approximately 3s (not hanging indefinitely)
    assert.ok(durationMs >= 2900 && durationMs < 5000, `Timeout elapsed within expected bounded window: ${durationMs}ms`);
    pass(`Hanging database ping safely times out at 3s and returns HTTP 503 (${durationMs}ms)`);

    // Reset test health client
    _setTestHealthClient(undefined);

    // 3f. Verify railway.json configuration
    const railwayJsonPath = path.resolve(process.cwd(), 'railway.json');
    const railwayContent = JSON.parse(fs.readFileSync(railwayJsonPath, 'utf8'));
    assert.strictEqual(railwayContent.deploy?.healthcheckPath, '/api/health');
    assert.strictEqual(railwayContent.deploy?.healthcheckTimeout, 30);
    pass('railway.json contains valid deploy.healthcheckPath ("/api/health") and healthcheckTimeout (30)');

  } finally {
    _setStoreReadyForTesting(true);
    _setTestHealthClient(undefined);
    server.close();
  }

  console.log('\n======================================================================');
  console.log(`ALL AUDIT REMEDIATION TESTS PASSED: ${passed} Passed, 0 Failed`);
  console.log('======================================================================\n');
  process.exit(0);
}

runAuditRemediationTests().catch((err) => {
  console.error('Audit remediation tests failed:', err);
  process.exit(1);
});
