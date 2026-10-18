process.env.UNIT_TEST = 'true';

import { randomUUID } from 'crypto';
import type { AddressInfo } from 'net';

async function runHamperSuite() {
  const express = (await import('express')).default;
  const http = (await import('http')).default;
  const adminRoutes = (await import('../server/routes/adminRoutes')).default;
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

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log('======================================================================');
  console.log('TEST SUITE: ADMIN GIFT HAMPER CREATION & IMAGE UPLOAD VERIFICATION');
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
    const adminUser: ServerProfile = {
      id: 'a0000000-0000-4000-8000-000000000001',
      email: 'admin@saraswatisweets.com',
      full_name: 'Super Admin',
      role: 'ADMIN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const staffUser: ServerProfile = {
      id: 'b0000000-0000-4000-8000-000000000002',
      email: 'staff@saraswatisweets.com',
      full_name: 'Store Staff',
      role: 'STAFF',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const customerUser: ServerProfile = {
      id: 'c0000000-0000-4000-8000-000000000003',
      email: 'customer@gmail.com',
      full_name: 'Customer',
      role: 'CUSTOMER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // -----------------------------------------------------------------------
    // SECTION 1: ROLE & PERMISSION ENFORCEMENT
    // -----------------------------------------------------------------------
    console.log('[1] Testing Admin & Staff Role Authorization...');

    currentMockUser = null; // Unauthenticated
    const unauthRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated access to POST /api/admin/hampers is rejected (401)');

    currentMockUser = customerUser; // Customer role
    const custRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    assert(custRes.status === 403, 'Customer role cannot create hampers (403)');

    currentMockUser = staffUser; // Staff role (STAFF can read/manage orders, but only ADMIN creates/modifies hampers)
    const staffHamperRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    assert(staffHamperRes.status === 403, 'Staff role cannot create hampers (requires ADMIN)');

    // Switch to ADMIN for remaining tests
    currentMockUser = adminUser;

    // -----------------------------------------------------------------------
    // SECTION 2: FIELD-SPECIFIC VALIDATIONS ON CREATION
    // -----------------------------------------------------------------------
    console.log('\n[2] Testing Field-Specific Validations on Hamper Creation...');

    // 2a: Missing Name
    const missingNameRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: 1500,
        image_url: 'https://example.com/hamper.jpg',
      }),
    });
    const missingNameData = await missingNameRes.json();
    assert(missingNameRes.status === 400 && missingNameData.error === 'MISSING_NAME', 'Missing name returns 400 MISSING_NAME');

    // 2b: Missing Price (neither price nor hamper_price provided)
    const missingPriceRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Festive Luxury Hamper',
        image_url: 'https://example.com/hamper.jpg',
      }),
    });
    const missingPriceData = await missingPriceRes.json();
    assert(missingPriceRes.status === 400 && missingPriceData.error === 'INVALID_PRICE', 'Missing price returns 400 INVALID_PRICE');

    // 2c: Non-positive Price
    const zeroPriceRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Festive Luxury Hamper',
        price: 0,
        image_url: 'https://example.com/hamper.jpg',
      }),
    });
    const zeroPriceData = await zeroPriceRes.json();
    assert(zeroPriceRes.status === 400 && zeroPriceData.error === 'INVALID_PRICE', 'Zero price returns 400 INVALID_PRICE');

    // 2d: MRP less than selling price
    const mrpLessThanPriceRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Festive Luxury Hamper',
        price: 1500,
        mrp: 1200,
        image_url: 'https://example.com/hamper.jpg',
      }),
    });
    const mrpLessThanPriceData = await mrpLessThanPriceRes.json();
    assert(mrpLessThanPriceRes.status === 400 && mrpLessThanPriceData.error === 'INVALID_MRP', 'MRP less than selling price returns 400 INVALID_MRP');

    // 2e: Missing Image URL
    const missingImageRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Festive Luxury Hamper',
        price: 1500,
      }),
    });
    const missingImageData = await missingImageRes.json();
    assert(missingImageRes.status === 400 && missingImageData.error === 'MISSING_IMAGE', 'Missing image URL returns 400 MISSING_IMAGE');

    // -----------------------------------------------------------------------
    // SECTION 3: SUCCESSFUL CREATION & BACKWARD COMPATIBILITY
    // -----------------------------------------------------------------------
    console.log('\n[3] Testing Successful Hamper Creation & Compatibility...');

    // 3a: Create using new 'price' field
    const createWithPriceRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Royal Awadhi Velvet Hamper',
        box_type: 'Royal Velvet Box',
        price: 1850,
        mrp: 2100,
        image_url: 'https://supabase.co/storage/v1/object/public/product-images/hampers/royal-box.webp',
        description: 'Exquisite silver leaf mithai hamper for royal celebrations',
        items_included: [
          { product_id: 'p1', product_name: 'Kaju Katli', variant_label: '250g', quantity: 2 },
          { product_id: 'p2', product_name: 'Moti Choor Ladoo', variant_label: '500g', quantity: 1 },
        ],
      }),
    });
    const createWithPriceData = await createWithPriceRes.json();
    assert(createWithPriceRes.status === 201 && createWithPriceData.success === true, 'Hamper created successfully with "price" field');
    assert(createWithPriceData.hamper?.price === 1850, 'Created hamper has correct price (1850)');
    assert(createWithPriceData.hamper?.mrp === 2100, 'Created hamper has correct mrp (2100)');
    assert(createWithPriceData.hamper?.items_included?.length === 2, 'Created hamper preserved sweet composition items');
    const hamper1Id = createWithPriceData.hamper?.id;

    // 3b: Backward compatibility: Create using legacy 'hamper_price' field
    const createWithLegacyPriceRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Heritage Mithai Box',
        box_type: 'Gold Foil Box',
        hamper_price: 1200,
        image_url: 'https://supabase.co/storage/v1/object/public/product-images/hampers/heritage.webp',
      }),
    });
    const createWithLegacyData = await createWithLegacyPriceRes.json();
    assert(createWithLegacyPriceRes.status === 201 && createWithLegacyData.hamper?.price === 1200, 'Hamper created successfully with legacy "hamper_price"');
    assert(createWithLegacyData.hamper?.mrp === 1200, 'MRP correctly defaulted to selling price when omitted');

    // 3c: Slug generation and collision prevention
    const duplicateNameRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Royal Awadhi Velvet Hamper', // same name as 3a
        price: 1950,
        image_url: 'https://example.com/h2.webp',
      }),
    });
    const duplicateNameData = await duplicateNameRes.json();
    assert(duplicateNameRes.status === 201, 'Duplicate hamper name handled without 500 error');
    assert(duplicateNameData.hamper?.slug !== createWithPriceData.hamper?.slug, 'Slug collision avoided by assigning distinct unique slug');

    // -----------------------------------------------------------------------
    // SECTION 4: HAMPER UPDATES (PUT /hampers/:id)
    // -----------------------------------------------------------------------
    console.log('\n[4] Testing Hamper Updates (PUT /hampers/:id)...');

    // 4a: Update price and composition
    const updateRes = await fetch(`${baseUrl}/api/admin/hampers/${hamper1Id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Royal Awadhi Velvet Hamper Deluxe',
        price: 2200,
        mrp: 2500,
        items_included: [
          { product_id: 'p1', product_name: 'Kaju Katli', variant_label: '500g', quantity: 2 },
        ],
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.success === true, 'Hamper updated successfully');
    assert(updateData.hamper?.name === 'Royal Awadhi Velvet Hamper Deluxe', 'Updated hamper name matches');
    assert(updateData.hamper?.price === 2200, 'Updated hamper price matches (2200)');
    assert(updateData.hamper?.items_included?.length === 1, 'Updated hamper composition synced');

    // 4b: Invalid price on update
    const invalidUpdateRes = await fetch(`${baseUrl}/api/admin/hampers/${hamper1Id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: -500,
      }),
    });
    const invalidUpdateData = await invalidUpdateRes.json();
    assert(invalidUpdateRes.status === 400 && invalidUpdateData.error === 'INVALID_PRICE', 'Invalid price on update returns 400 INVALID_PRICE');

    // -----------------------------------------------------------------------
    // SECTION 5: IMAGE STORAGE & SIGNED URLS
    // -----------------------------------------------------------------------
    console.log('\n[5] Testing Image Storage & Signed Upload Authorization...');

    // 5a: Signed upload url for 'hampers' folder
    const signedUrlRes = await fetch(`${baseUrl}/api/admin/signed-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'diwali-hamper.webp',
        fileType: 'image/webp',
        fileSize: 1024 * 500,
        folder: 'hampers',
      }),
    });
    const signedUrlData = await signedUrlRes.json();
    assert(signedUrlRes.status === 200 && signedUrlData.success === true, 'Signed upload URL generated for hampers folder');
    assert(signedUrlData.path?.startsWith('hampers/'), `Generated path starts with hampers/ (got ${signedUrlData.path})`);

    // 5b: Invalid file type rejected
    const badTypeRes = await fetch(`${baseUrl}/api/admin/signed-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'script.exe',
        fileType: 'application/x-msdownload',
        fileSize: 1000,
      }),
    });
    assert(badTypeRes.status === 400, 'Invalid MIME type rejected with 400');

    // 5c: Oversized file rejected (> 5MB)
    const largeFileRes = await fetch(`${baseUrl}/api/admin/signed-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'huge.jpg',
        fileType: 'image/jpeg',
        fileSize: 6 * 1024 * 1024,
      }),
    });
    assert(largeFileRes.status === 400, 'File > 5MB rejected with 400');

    // 5d: Directory traversal in upload-image rejected
    const traversalRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4H',
        fileName: 'test.webp',
        fileType: 'image/webp',
        fileSize: 30,
        path: 'hampers/../../evil.jpg',
      }),
    });
    assert(traversalRes.status === 400, 'Directory traversal path rejected with 400');

    // 5e: Unauthorized root directory in upload-image rejected
    const unauthorizedDirRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4H',
        fileName: 'test.webp',
        fileType: 'image/webp',
        fileSize: 30,
        path: 'secrets/passwords.txt',
      }),
    });
    assert(unauthorizedDirRes.status === 400, 'Unauthorized root folder rejected with 400');

  } finally {
    server.close();
  }

  console.log('\n======================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runHamperSuite().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
