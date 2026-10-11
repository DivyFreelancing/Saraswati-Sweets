process.env.UNIT_TEST = 'true';

import { randomUUID } from 'crypto';
import type { AddressInfo } from 'net';

async function runOperationsToggleSuite() {
  const express = (await import('express')).default;
  const http = (await import('http')).default;
  const adminRoutes = (await import('../server/routes/adminRoutes')).default;
  const orderRoutes = (await import('../server/routes/orderRoutes')).default;
  const { inMemoryStore } = await import('../server/db');
  type ServerProfile = import('../server/db').ServerProfile;

  const app = express();
  app.use(express.json());

  let currentMockUser: ServerProfile | null = null;
  app.use((req: any, _res: any, next: any) => {
    req.user = currentMockUser;
    next();
  });

  app.use('/api/admin', adminRoutes);
  app.use('/api', orderRoutes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log('======================================================================');
  console.log('TEST SUITE: ADMIN STORE OPERATIONS & DELIVERY TOGGLE VERIFICATION');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // Setup test users
    const adminUser: ServerProfile = {
      id: 'a0000000-0000-4000-8000-000000000001',
      email: 'admin@saraswatisweets.com',
      full_name: 'Shop Owner Admin',
      role: 'ADMIN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const staffUser: ServerProfile = {
      id: 'b0000000-0000-4000-8000-000000000002',
      email: 'manager@saraswatisweets.com',
      full_name: 'Duty Store Manager',
      role: 'STAFF',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const customerUser: ServerProfile = {
      id: 'c0000000-0000-4000-8000-000000000003',
      email: 'customer@gmail.com',
      full_name: 'Ankit Kumar',
      role: 'CUSTOMER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Baseline storeSettings
    inMemoryStore.storeSettings.is_store_open = true;
    inMemoryStore.storeSettings.delivery_enabled = true;
    inMemoryStore.storeSettings.takeaway_enabled = true;
    inMemoryStore.storeSettings.closure_message = null;
    inMemoryStore.storeSettings.pickup_opening_time = '08:00';
    inMemoryStore.storeSettings.pickup_closing_time = '21:30';

    inMemoryStore.variants.set('var_test_1', {
      id: 'var_test_1',
      productId: 'prod_test_1',
      productName: 'Kaju Katli',
      weightGrams: 500,
      price: 350,
      mrp: 400,
      imageUrl: '',
      stockQuantity: 50,
      stockStatus: 'IN_STOCK',
      label: '500g Pack',
    });

    const validCartItem = {
      variant_id: 'var_test_1',
      product_name: 'Kaju Katli',
      variant_label: '500g Pack',
      unit_price: 350,
      quantity: 1,
    };

    const deliveryAddress = {
      recipient_name: 'Ankit Kumar',
      recipient_phone: '9876543210',
      street_address: 'Civil Lines, Station Road',
      pincode: '225001',
      city: 'Barabanki',
      state: 'Uttar Pradesh',
    };

    console.log('--- 1. Security & Role Authorization on PUT /api/admin/store/operations ---');

    // Customer attempt must fail (403 FORBIDDEN)
    currentMockUser = customerUser;
    const custRes = await fetch(`${baseUrl}/api/admin/store/operations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_enabled: false }),
    });
    assert(custRes.status === 403, 'Customer role is strictly rejected with HTTP 403');

    // Unauthenticated attempt must fail (401 UNAUTHORIZED)
    currentMockUser = null;
    const anonRes = await fetch(`${baseUrl}/api/admin/store/operations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_enabled: false }),
    });
    assert(anonRes.status === 401, 'Unauthenticated request is strictly rejected with HTTP 401');

    // Admin attempt must succeed (200 OK)
    currentMockUser = adminUser;
    const adminRes = await fetch(`${baseUrl}/api/admin/store/operations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delivery_enabled: false,
        takeaway_enabled: true,
        closure_message: 'High festival rush: Doorstep delivery paused today. Store pickup is available!',
      }),
    });
    const adminData: any = await adminRes.json();
    assert(adminRes.status === 200, 'Admin can toggle delivery OFF via /store/operations');
    assert(adminData.settings.delivery_enabled === false, 'Settings in response reflects delivery_enabled: false');
    assert((inMemoryStore.storeSettings.delivery_enabled as boolean) === false, 'Server memory reflects delivery_enabled: false');
    assert(
      inMemoryStore.storeSettings.closure_message ===
        'High festival rush: Doorstep delivery paused today. Store pickup is available!',
      'Manager closure message saved in server state'
    );

    console.log('\n--- 2. Public Checkout Availability Endpoint ---');
    currentMockUser = null;
    const availRes = await fetch(`${baseUrl}/api/checkout/availability`);
    const availData: any = await availRes.json();
    assert(availRes.status === 200, 'GET /api/checkout/availability returns 200');
    assert(availData.delivery_enabled === false, 'Availability reflects delivery_enabled: false');
    assert(availData.takeaway_enabled === true, 'Availability reflects takeaway_enabled: true');
    assert(
      availData.closure_message ===
        'High festival rush: Doorstep delivery paused today. Store pickup is available!',
      'Availability returns configured manager notice'
    );

    console.log('\n--- 3. Backend Order Enforcement when Delivery is OFF ---');
    // Attempt delivery order via API while delivery is OFF
    currentMockUser = customerUser;
    const blockedDeliveryRes = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        fulfilment_type: 'DELIVERY',
        payment_method: 'COD',
        address: deliveryAddress,
        items: [validCartItem],
      }),
    });
    const blockedDeliveryData: any = await blockedDeliveryRes.json();
    assert(blockedDeliveryRes.status === 400, 'Direct delivery order rejected with HTTP 400');
    assert(blockedDeliveryData.error === 'DELIVERY_UNAVAILABLE', 'Error code is DELIVERY_UNAVAILABLE');
    assert(
      blockedDeliveryData.message ===
        'High festival rush: Doorstep delivery paused today. Store pickup is available!',
      'Rejection message displays the configured manager notice'
    );

    // Takeaway order should SUCCEED while delivery is OFF
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const allowedTakeawayRes = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        customer_name: 'Ankit Kumar',
        customer_phone: '9876543210',
        fulfilment_type: 'TAKEAWAY',
        payment_method: 'ONLINE',
        pickup_slot: {
          slot_date: tomorrowStr,
          start_time: '11:00',
          end_time: '11:30',
        },
        items: [validCartItem],
      }),
    });
    const allowedTakeawayData: any = await allowedTakeawayRes.json();
    assert(
      allowedTakeawayRes.status === 201,
      'Takeaway order succeeds with HTTP 201 while delivery is OFF'
    );
    assert(
      allowedTakeawayData.order.fulfilment_type === 'TAKEAWAY',
      'Order created with fulfilment_type: TAKEAWAY'
    );
    assert(
      allowedTakeawayData.order.delivery_charge === 0,
      'Takeaway order delivery charge is strictly ₹0'
    );

    console.log('\n--- 4. Store Manager (STAFF Role) Authorization ---');
    // Store Manager logged in as STAFF toggles delivery back ON
    currentMockUser = staffUser;
    const staffRes = await fetch(`${baseUrl}/api/admin/store/operations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delivery_enabled: true,
        takeaway_enabled: true,
        closure_message: null,
      }),
    });
    assert(staffRes.status === 200, 'Store manager with STAFF role can re-enable delivery');
    assert(inMemoryStore.storeSettings.delivery_enabled === true, 'delivery_enabled is now true');

    // Customer can place delivery order again without code change or redeploy
    currentMockUser = customerUser;
    const reenabledDeliveryRes = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        fulfilment_type: 'DELIVERY',
        payment_method: 'COD',
        address: deliveryAddress,
        items: [validCartItem],
      }),
    });
    const reenabledDeliveryData: any = await reenabledDeliveryRes.json();
    assert(
      reenabledDeliveryRes.status === 201,
      'Delivery order succeeds with HTTP 201 once delivery is re-enabled'
    );
    assert(
      reenabledDeliveryData.order.delivery_charge === 50,
      'Preserves flat ₹50 delivery fee for home delivery'
    );

    console.log('\n--- 5. Independent Takeaway Toggle Verification ---');
    // Manager pauses Takeaway while keeping Delivery ON
    currentMockUser = staffUser;
    await fetch(`${baseUrl}/api/admin/store/operations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delivery_enabled: true,
        takeaway_enabled: false,
        closure_message: 'Counter pickup is currently at full capacity. Doorstep delivery is open!',
      }),
    });
    assert((inMemoryStore.storeSettings.takeaway_enabled as boolean) === false, 'takeaway_enabled is now false');
    assert((inMemoryStore.storeSettings.delivery_enabled as boolean) === true, 'delivery_enabled remains true');

    // Takeaway order should be rejected
    currentMockUser = customerUser;
    const blockedTakeawayRes = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        customer_name: 'Ankit Kumar',
        customer_phone: '9876543210',
        fulfilment_type: 'TAKEAWAY',
        payment_method: 'ONLINE',
        pickup_slot: {
          slot_date: tomorrowStr,
          start_time: '11:00',
          end_time: '11:30',
        },
        items: [validCartItem],
      }),
    });
    const blockedTakeawayData: any = await blockedTakeawayRes.json();
    assert(blockedTakeawayRes.status === 400, 'Takeaway order rejected with HTTP 400');
    assert(blockedTakeawayData.error === 'TAKEAWAY_UNAVAILABLE', 'Error code is TAKEAWAY_UNAVAILABLE');

    // Delivery order remains allowed
    const allowedDeliveryRes = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        fulfilment_type: 'DELIVERY',
        payment_method: 'COD',
        address: deliveryAddress,
        items: [validCartItem],
      }),
    });
    assert(allowedDeliveryRes.status === 201, 'Delivery order succeeds while Takeaway is paused');

    console.log('\n--- 6. Both Services OFF (Store Temporarily Closed) ---');
    currentMockUser = adminUser;
    await fetch(`${baseUrl}/api/admin/store/operations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delivery_enabled: false,
        takeaway_enabled: false,
        closure_message: 'Store is temporarily closed for Diwali prep. Will reopen at 5:00 PM.',
      }),
    });

    currentMockUser = customerUser;
    const storeClosedRes = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        fulfilment_type: 'DELIVERY',
        payment_method: 'COD',
        address: deliveryAddress,
        items: [validCartItem],
      }),
    });
    const storeClosedData: any = await storeClosedRes.json();
    assert(storeClosedRes.status === 400, 'Orders strictly rejected when both services are OFF');
    assert(storeClosedData.error === 'STORE_CLOSED', 'Error code is STORE_CLOSED');

    // Reset state to healthy defaults
    inMemoryStore.storeSettings.delivery_enabled = true;
    inMemoryStore.storeSettings.takeaway_enabled = true;
    inMemoryStore.storeSettings.closure_message = null;

    console.log('\n======================================================================');
    console.log(`OPERATIONS TOGGLE RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================================');
  } finally {
    server.close();
  }

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runOperationsToggleSuite().catch((err) => {
  console.error('Fatal error in operations toggle test suite:', err);
  process.exit(1);
});
