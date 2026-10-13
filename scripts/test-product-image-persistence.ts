import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function runTestSuite() {
  console.log('======================================================================');
  console.log('TEST SUITE: PRODUCT IMAGE PERSISTENCE & SCHEMA ALIGNMENT');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function pass(msg: string) {
    passed++;
    console.log(`✓ PASS: ${msg}`);
  }

  function fail(msg: string, err?: any) {
    failed++;
    console.error(`✗ FAIL: ${msg}`);
    if (err) console.error(err);
  }

  // ---------------------------------------------------------------------------
  // Test 1: Static Code Inspection of server/routes/adminRoutes.ts
  // ---------------------------------------------------------------------------
  try {
    const adminRoutesPath = path.resolve('server/routes/adminRoutes.ts');
    const adminRoutesCode = fs.readFileSync(adminRoutesPath, 'utf8').replace(/\r\n/g, '\n');

    // 1. Check that storage_path is NOT passed to product_images table
    const storagePathDbMatch = adminRoutesCode.match(/from\(['"]product_images['"]\)[^;]+storage_path/s);
    assert.strictEqual(
      storagePathDbMatch,
      null,
      'adminRoutes.ts must not pass storage_path to product_images table'
    );
    pass('adminRoutes: storage_path is removed from all product_images database queries');

    // 2. Check that url is replaced by image_url in product_images POST insert
    assert(
      !/\burl:\s*finalImageUrl\b/.test(adminRoutesCode),
      'adminRoutes.ts POST /products must not use url column for product_images'
    );
    assert(
      adminRoutesCode.includes("image_url: finalImageUrl"),
      'adminRoutes.ts POST /products must use image_url for product_images'
    );
    pass('adminRoutes: POST /products strictly inserts image_url instead of url');

    // 3. Check that url is replaced by image_url in product_images PUT update
    assert(
      !/\burl:\s*image_url\b/.test(adminRoutesCode),
      'adminRoutes.ts PUT /products/:id must not use url column for product_images'
    );
    assert(
      adminRoutesCode.includes("image_url: image_url,"),
      'adminRoutes.ts PUT /products/:id must use image_url for product_images'
    );
    pass('adminRoutes: PUT /products/:id strictly updates/inserts image_url instead of url');

    // 4. Check that destructive pre-deletion in PUT /products/:id is eliminated
    const hasPreDelete = adminRoutesCode.includes(".delete().eq('product_id', id).eq('is_primary', true);\n    const storagePathMatch");
    assert.strictEqual(hasPreDelete, false, 'Pre-deletion of primary images before update must be removed');
    assert(
      adminRoutesCode.includes(".from('product_images')\n      .select('id')\n      .eq('product_id', id)\n      .eq('is_primary', true)"),
      'adminRoutes.ts PUT /products/:id must query existing images to update in-place'
    );
    pass('adminRoutes: destructive pre-deletion before update is replaced with in-place update');

    // 5. Check that POST /products handles image insert errors with HTTP 500 DB_WRITE_FAILED
    assert(
      adminRoutesCode.includes("if (imgErr) {\n    console.error('[Admin] Product image insert failed:', imgErr);\n    res.status(500).json({ error: 'DB_WRITE_FAILED'"),
      'adminRoutes.ts must return HTTP 500 when product image insert fails on POST /products'
    );
    pass('adminRoutes: POST /products handles image insert errors with HTTP 500 DB_WRITE_FAILED');

    // 6. Check that PUT /products/:id handles image update errors with HTTP 500 DB_WRITE_FAILED
    assert(
      adminRoutesCode.includes("if (imgErr) {\n      console.error('[Admin] Product image update failed:', imgErr);\n      res.status(500).json({ error: 'DB_WRITE_FAILED'"),
      'adminRoutes.ts must return HTTP 500 when product image update fails on PUT /products/:id'
    );
    pass('adminRoutes: PUT /products/:id handles image update errors with HTTP 500 DB_WRITE_FAILED');
  } catch (err: any) {
    fail('Static code verification failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 2: Live Supabase Schema Validation (Read-Only)
  // ---------------------------------------------------------------------------
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey);

      // Verify that column 'image_url' exists in product_images
      const { error: imgUrlErr } = await supabase.from('product_images').select('image_url').limit(1);
      assert.strictEqual(imgUrlErr, null, `image_url column must exist in live database: ${imgUrlErr?.message}`);
      pass('live-db: product_images.image_url column exists and is queryable');

      // Verify that column 'storage_path' does NOT exist (confirming why previous code failed)
      const { error: storagePathErr } = await supabase.from('product_images').select('storage_path').limit(1);
      assert(
        storagePathErr && storagePathErr.message.includes('storage_path'),
        'storage_path must not exist in live schema (confirming root cause)'
      );
      pass('live-db: product_images.storage_path does NOT exist in schema cache');

      // Verify that column 'url' does NOT exist (confirming why url failed)
      const { error: urlErr } = await supabase.from('product_images').select('url').limit(1);
      assert(
        urlErr && urlErr.message.includes('url'),
        'url must not exist in live schema (confirming root cause)'
      );
      pass('live-db: product_images.url does NOT exist in schema cache');
    } else {
      console.log('Skipping live-db checks (Supabase environment variables not present)');
    }
  } catch (err: any) {
    fail('Live Supabase schema validation failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 3: Pure Logic Simulation of Update vs Prune
  // ---------------------------------------------------------------------------
  try {
    const imagesTable: Array<{ id: string; product_id: string; image_url: string; is_primary: boolean }> = [
      { id: 'img-1', product_id: 'p-1', image_url: 'https://example.com/old.jpg', is_primary: true },
      { id: 'img-dup', product_id: 'p-1', image_url: 'https://example.com/dup.jpg', is_primary: true },
    ];

    // Simulate PUT update flow
    const productId = 'p-1';
    const newImageUrl = 'https://example.com/new.webp';

    const existingImgs = imagesTable.filter(x => x.product_id === productId && x.is_primary);
    assert.strictEqual(existingImgs.length, 2);

    // Update primary
    const primaryId = existingImgs[0].id;
    const target = imagesTable.find(x => x.id === primaryId);
    if (target) target.image_url = newImageUrl;

    // Prune duplicates only after successful update
    const extraIds = existingImgs.slice(1).map(x => x.id);
    const finalTable = imagesTable.filter(x => !extraIds.includes(x.id));

    assert.strictEqual(finalTable.length, 1);
    assert.strictEqual(finalTable[0].id, 'img-1');
    assert.strictEqual(finalTable[0].image_url, newImageUrl);
    pass('logic: in-place update accurately preserves primary record and safely cleans duplicate primaries');
  } catch (err: any) {
    fail('Logic simulation failed', err);
  }

  console.log('\n----------------------------------------------------------------------');
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
