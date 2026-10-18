import { isLiveSupabase, supabaseServer, inMemoryStore, loadStoreState } from '../server/db';
import express from 'express';
import http from 'http';
import adminRoutes from '../server/routes/adminRoutes';
import publicRoutes from '../server/routes/publicRoutes';
import type { AddressInfo } from 'net';

async function runLiveVerification() {
  console.log('======================================================================');
  console.log('VERIFICATION: LIVE GIFT HAMPER PRICING & DATABASE SCHEMA VERIFICATION');
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

  // 1. Verify actual deployed Supabase schema
  console.log('[1] Verifying Deployed Supabase Database Schema...');
  assert(isLiveSupabase === true && supabaseServer !== null, 'Live Supabase connection is established');

  const { data: sampleRows, error: schemaErr } = await supabaseServer!
    .from('gift_hampers')
    .select('*')
    .limit(1);

  if (schemaErr) {
    console.error('Failed to query gift_hampers table:', schemaErr);
    process.exit(1);
  }

  const tableColumns = sampleRows && sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [];
  console.log('Deployed columns on public.gift_hampers:', tableColumns);

  assert(tableColumns.includes('price'), "Authoritative column 'price' exists in public.gift_hampers");
  assert(tableColumns.includes('mrp'), "Column 'mrp' exists in public.gift_hampers");
  assert(!tableColumns.includes('hamper_price'), "No phantom 'hamper_price' column in Supabase schema (confirmed schema contract)");

  // 2. Setup server for end-to-end API testing
  const app = express();
  app.use(express.json());

  // Mock admin user for test requests
  const adminUser = {
    id: 'a0000000-0000-4000-8000-000000000001',
    email: 'admin@saraswatisweets.com',
    full_name: 'Shop Admin',
    role: 'ADMIN' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  app.use((req: any, _res: any, next: any) => {
    req.user = adminUser;
    next();
  });

  app.use('/api/admin', adminRoutes);
  app.use('/api', publicRoutes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let createdHamperId: string | null = null;

  try {
    // 3. Create a test hamper with selling price ₹1,251 and MRP ₹1,401
    console.log('\n[2] Creating Test Hamper with Selling Price ₹1,251 and MRP ₹1,401...');
    const createPayload = {
      name: 'Verification Royal Awadhi Hamper',
      box_type: 'Royal Velvet Trunk',
      price: 1251,
      mrp: 1401,
      image_url: 'https://qntxqxkuiovxrjsjlaay.supabase.co/storage/v1/object/public/product-images/hampers/test-hamper.webp',
      description: 'Exclusive artisanal gift hamper for Royal Awadhi celebrations',
      is_featured: true,
      is_active: true,
      items_included: [
        { product_id: 'p1', product_name: 'Signature Kaju Katli', variant_label: '250g', quantity: 2 },
      ],
    };

    const createRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    });

    const createData = await createRes.json();
    assert(createRes.status === 201 && createData.success === true, 'Hamper creation API succeeded (status 201)');
    assert(createData.hamper?.price === 1251, 'API returned correct selling price (1251)');
    assert(createData.hamper?.hamper_price === 1251, 'API returned hamper_price alias (1251) for backward compatibility');
    assert(createData.hamper?.mrp === 1401, 'API returned correct MRP (1401)');
    createdHamperId = createData.hamper?.id;

    // 4. Verify in Supabase database directly
    console.log('\n[3] Verifying Persisted Record Directly in Supabase Database...');
    const { data: dbRow, error: dbErr } = await supabaseServer!
      .from('gift_hampers')
      .select('*')
      .eq('id', createdHamperId!)
      .single();

    assert(!dbErr && dbRow !== null, 'Hamper record exists in Supabase gift_hampers table');
    assert(Number(dbRow.price) === 1251, `Supabase price column contains 1251 (got ${dbRow?.price})`);
    assert(Number(dbRow.mrp) === 1401, `Supabase mrp column contains 1401 (got ${dbRow?.mrp})`);
    assert(dbRow.name === 'Verification Royal Awadhi Hamper', 'Hamper name matches');

    // 5. Verify Storefront Public APIs
    console.log('\n[4] Verifying Storefront Public API & Price Rendering...');
    const publicHampersRes = await fetch(`${baseUrl}/api/hampers`);
    const publicHampersData = await publicHampersRes.json();
    const storefrontHamper = publicHampersData.hampers?.find((h: any) => h.id === createdHamperId);

    assert(storefrontHamper !== undefined, 'Created hamper appears in public storefront listing');
    assert(storefrontHamper?.price === 1251, `Storefront reads actual saved selling price ₹1,251, NOT ₹0 (got ${storefrontHamper?.price})`);
    assert(storefrontHamper?.mrp === 1401, `Storefront reads actual saved MRP ₹1,401 (got ${storefrontHamper?.mrp})`);

    // Verify detail endpoint by slug
    const slugRes = await fetch(`${baseUrl}/api/hampers/${storefrontHamper.slug}`);
    const slugData = await slugRes.json();
    assert(slugRes.status === 200, 'Public detail endpoint /api/hampers/:slug returns 200');
    assert(slugData.hamper?.price === 1251, 'Detail endpoint returns price ₹1,251');

    // 6. Edit the price and verify new price appears after refresh
    console.log('\n[5] Editing Hamper Price and Verifying Live Update...');
    const editRes = await fetch(`${baseUrl}/api/admin/hampers/${createdHamperId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: 1351,
        mrp: 1551,
      }),
    });

    const editData = await editRes.json();
    assert(editRes.status === 200 && editData.success === true, 'Hamper update API succeeded (status 200)');
    assert(editData.hamper?.price === 1351, 'Updated hamper has price 1351');

    // Verify in database
    const { data: updatedDbRow } = await supabaseServer!
      .from('gift_hampers')
      .select('*')
      .eq('id', createdHamperId!)
      .single();
    assert(Number(updatedDbRow.price) === 1351, `Database price updated to 1351 (got ${updatedDbRow?.price})`);
    assert(Number(updatedDbRow.mrp) === 1551, `Database mrp updated to 1551 (got ${updatedDbRow?.mrp})`);

    // Verify storefront refresh
    const refreshedPublicRes = await fetch(`${baseUrl}/api/hampers`);
    const refreshedData = await refreshedPublicRes.json();
    const updatedStorefrontHamper = refreshedData.hampers?.find((h: any) => h.id === createdHamperId);
    assert(updatedStorefrontHamper?.price === 1351, `Storefront reflects updated price ₹1,351 (got ${updatedStorefrontHamper?.price})`);

    // 7. Test invalid/missing prices and failed API requests
    console.log('\n[6] Testing Validation Rejections (Invalid/Missing Prices)...');
    const invalidPriceRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Price Hamper',
        price: 0,
        image_url: 'https://example.com/h.jpg',
      }),
    });
    const invalidPriceData = await invalidPriceRes.json();
    assert(invalidPriceRes.status === 400 && invalidPriceData.error === 'INVALID_PRICE', 'Zero price rejected with 400 INVALID_PRICE');

    const mrpTooLowRes = await fetch(`${baseUrl}/api/admin/hampers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'MRP Low Hamper',
        price: 1500,
        mrp: 1200,
        image_url: 'https://example.com/h.jpg',
      }),
    });
    const mrpTooLowData = await mrpTooLowRes.json();
    assert(mrpTooLowRes.status === 400 && mrpTooLowData.error === 'INVALID_MRP', 'MRP < Price rejected with 400 INVALID_MRP');

    // 8. Clean up test record
    console.log('\n[7] Cleaning Up Test Hamper from Supabase...');
    if (createdHamperId) {
      await supabaseServer!.from('gift_hamper_items').delete().eq('hamper_id', createdHamperId);
      const { error: delErr } = await supabaseServer!.from('gift_hampers').delete().eq('id', createdHamperId);
      assert(!delErr, 'Test hamper cleanly deleted from database');
      inMemoryStore.giftHampers.delete(createdHamperId);
    }

  } finally {
    server.close();
  }

  console.log('\n======================================================================');
  console.log(`LIVE VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Verification failed with unexpected error:', err);
  process.exit(1);
});
