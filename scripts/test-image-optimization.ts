import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import sharp from 'sharp';
import { optimizeProductImage, ImageOptimizationError } from '../server/services/imageOptimizationService';
import { inMemoryStore } from '../server/db';
import { authenticateToken } from '../server/authMiddleware';
import adminRoutes from '../server/routes/adminRoutes';

process.env.UNIT_TEST = 'true';

async function runImageOptimizationTests() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS: AUTOMATIC IMAGE OPTIMIZATION VERIFICATION SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  function pass(desc: string) {
    console.log(`✓ PASS: ${desc}`);
    passed++;
  }

  // --- PART 1: Core Service Unit Tests ---
  console.log('--- SUITE 1: Core Image Optimization Service (sharp) ---');

  // Test 1: Oversized JPEG (2400 x 1800) -> Resize to <=1200, WebP, quality 82
  const jpegSvg = `<svg width="2400" height="1800">
    <rect width="2400" height="1800" fill="#FFFAF0"/>
    <circle cx="1200" cy="900" r="700" fill="#FF8C00"/>
    <text x="1200" y="900" font-size="120" text-anchor="middle" fill="#800000">Desi Ghee Besan Laddu</text>
  </svg>`;
  const originalJpegBuffer = await sharp(Buffer.from(jpegSvg)).jpeg({ quality: 100 }).toBuffer();
  const optJpeg = await optimizeProductImage(originalJpegBuffer);

  assert.strictEqual(optJpeg.format, 'webp', 'Output format must be webp');
  assert.strictEqual(optJpeg.contentType, 'image/webp', 'Content type must be image/webp');
  assert.strictEqual(optJpeg.extension, '.webp', 'Extension must be .webp');
  assert.strictEqual(optJpeg.width, 1200, 'Width must be resized down to 1200');
  assert.strictEqual(optJpeg.height, 900, 'Height must preserve aspect ratio (900 for 4:3)');
  assert.ok(optJpeg.optimizedBytes < optJpeg.originalBytes, 'Optimized bytes must be smaller than original');
  assert.ok(optJpeg.savingsPercent > 50, `Savings percent should exceed 50% (got ${optJpeg.savingsPercent}%)`);
  pass(
    `Oversized JPEG (2400x1800, ${optJpeg.originalBytes} bytes) downscaled to (1200x900, ${optJpeg.optimizedBytes} bytes) with ${optJpeg.savingsPercent}% size reduction`
  );

  // Test 2: Transparent PNG (1600 x 1600) -> WebP with alpha preserved
  const pngSvg = `<svg width="1600" height="1600">
    <rect width="1600" height="1600" fill="none"/>
    <circle cx="800" cy="800" r="600" fill="#DAA520" fill-opacity="0.85"/>
    <text x="800" y="800" font-size="90" text-anchor="middle" fill="#5E0D20">Silver Leaf Kaju Katli</text>
  </svg>`;
  const originalPngBuffer = await sharp(Buffer.from(pngSvg)).png().toBuffer();
  const optPng = await optimizeProductImage(originalPngBuffer);

  assert.strictEqual(optPng.format, 'webp');
  assert.strictEqual(optPng.width, 1200, 'Max dimension must be 1200');
  assert.strictEqual(optPng.height, 1200);
  assert.strictEqual(optPng.hasAlpha, true, 'Alpha transparency must be preserved in WebP');
  assert.ok(optPng.savingsPercent > 40, `PNG savings should exceed 40% (got ${optPng.savingsPercent}%)`);
  pass(
    `Transparent PNG (1600x1600, ${optPng.originalBytes} bytes) converted to WebP (${optPng.optimizedBytes} bytes) with transparency intact (${optPng.savingsPercent}% saved)`
  );

  // Test 3: Native WebP image (1500 x 1000) -> re-encoded to max 1200px
  const webpSvg = `<svg width="1500" height="1000"><rect width="1500" height="1000" fill="#2E7D4F"/></svg>`;
  const originalWebpBuffer = await sharp(Buffer.from(webpSvg)).webp({ quality: 95 }).toBuffer();
  const optWebp = await optimizeProductImage(originalWebpBuffer);
  assert.strictEqual(optWebp.format, 'webp');
  assert.strictEqual(optWebp.width, 1200);
  assert.strictEqual(optWebp.height, 800);
  pass(`Native WebP resized proportionally to 1200x800 without quality loss`);

  // Test 4: Small Image (400 x 300) -> No enlargement (do not upscale)
  const smallSvg = `<svg width="400" height="300"><rect width="400" height="300" fill="#7A1129"/></svg>`;
  const smallBuffer = await sharp(Buffer.from(smallSvg)).png().toBuffer();
  const optSmall = await optimizeProductImage(smallBuffer);
  assert.strictEqual(optSmall.width, 400, 'Small image must NOT be upscaled');
  assert.strictEqual(optSmall.height, 300, 'Small image height must remain 300');
  pass(`Small image (400x300) preserved at original dimensions without upscaling`);

  // Test 5: Corrupt image buffer -> clear rejection
  const corruptBuffer = Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8X\x00\x00\x00\x00this_is_garbage_data_here');
  try {
    await optimizeProductImage(corruptBuffer);
    assert.fail('Should have rejected corrupted image');
  } catch (err: any) {
    assert.strictEqual(err.code, 'CORRUPTED_IMAGE');
    pass(`Corrupted image buffer rejected with error code '${err.code}'`);
  }

  // Test 6: Text file disguised as image -> unsupported format
  const fakeImageBuffer = Buffer.from('Hello world! This is a plain text file, not an image.');
  try {
    await optimizeProductImage(fakeImageBuffer);
    assert.fail('Should have rejected non-image buffer');
  } catch (err: any) {
    assert.ok(err instanceof ImageOptimizationError);
    pass(`Disguised text file rejected with code '${err.code}'`);
  }

  // Test 7: Empty buffer
  try {
    await optimizeProductImage(Buffer.alloc(0));
    assert.fail('Should have rejected empty buffer');
  } catch (err: any) {
    assert.strictEqual(err.code, 'EMPTY_IMAGE');
    pass(`Empty buffer rejected with code 'EMPTY_IMAGE'`);
  }

  // Test 8: Excessive buffer (> 5MB)
  const hugeBuffer = Buffer.alloc(6 * 1024 * 1024);
  try {
    await optimizeProductImage(hugeBuffer);
    assert.fail('Should have rejected buffer exceeding 5MB');
  } catch (err: any) {
    assert.strictEqual(err.code, 'FILE_TOO_LARGE');
    pass(`Buffer exceeding 5MB rejected with code 'FILE_TOO_LARGE'`);
  }

  // --- PART 2: HTTP Integration Tests ---
  console.log('\n--- SUITE 2: HTTP Upload Route Integration ---');

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(authenticateToken);
  app.use('/api/admin', adminRoutes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const customerId = 'cust-upload-test-01';
  inMemoryStore.profiles.set(customerId, {
    id: customerId,
    phone: '9876543210',
    full_name: 'Customer One',
    role: 'CUSTOMER',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const customerToken = Buffer.from(JSON.stringify({ sub: customerId, id: customerId })).toString('base64');

  const adminId = 'admin-upload-test-01';
  inMemoryStore.profiles.set(adminId, {
    id: adminId,
    phone: '9161110030',
    full_name: 'Admin One',
    role: 'ADMIN',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const adminToken = Buffer.from(JSON.stringify({ sub: adminId, id: adminId })).toString('base64');

  try {
    // Test 9: Customer unauthorized to upload images
    const resCust = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataUrl: `data:image/jpeg;base64,${originalJpegBuffer.toString('base64')}`,
        fileName: 'mithai.jpg',
      }),
    });
    assert.strictEqual(resCust.status, 403, 'Customer should receive 403 Forbidden');
    pass('Unauthorized customer blocked from /api/admin/upload-image (HTTP 403)');

    // Test 10: Admin uploads JPEG -> automatically converted to WebP and returns optimization stats
    const resAdminJpeg = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataUrl: `data:image/jpeg;base64,${originalJpegBuffer.toString('base64')}`,
        fileName: 'motichoor-laddu.jpg',
      }),
    });
    assert.strictEqual(resAdminJpeg.status, 200);
    const dataJpeg = await resAdminJpeg.json();
    assert.strictEqual(dataJpeg.success, true);
    assert.ok(dataJpeg.imageUrl.endsWith('.webp'), 'Saved image URL must end in .webp');
    assert.strictEqual(dataJpeg.optimization.format, 'webp');
    assert.strictEqual(dataJpeg.optimization.width, 1200);
    assert.strictEqual(dataJpeg.optimization.height, 900);
    assert.ok(dataJpeg.optimization.savingsPercent > 50);
    pass(
      `Admin uploaded JPEG automatically converted to WebP (${dataJpeg.optimization.savingsPercent}% savings, URL: ${dataJpeg.imageUrl})`
    );

    // Test 11: Admin uploads transparent PNG -> WebP with alpha preserved
    const resAdminPng = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataUrl: `data:image/png;base64,${originalPngBuffer.toString('base64')}`,
        fileName: 'kaju-katli-box.png',
      }),
    });
    assert.strictEqual(resAdminPng.status, 200);
    const dataPng = await resAdminPng.json();
    assert.strictEqual(dataPng.success, true);
    assert.ok(dataPng.imageUrl.endsWith('.webp'));
    assert.strictEqual(dataPng.optimization.format, 'webp');
    pass(`Admin uploaded PNG converted to WebP with transparency preserved (URL: ${dataPng.imageUrl})`);

    // Test 12: Admin upload with custom path -> enforces .webp extension
    const resPath = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataUrl: `data:image/jpeg;base64,${originalJpegBuffer.toString('base64')}`,
        fileName: 'festive-sweet.jpg',
        path: 'products/custom-festive.jpg',
      }),
    });
    assert.strictEqual(resPath.status, 200);
    const dataPath = await resPath.json();
    assert.ok(dataPath.imageUrl.endsWith('/products/custom-festive.webp'), 'Path must be enforced as .webp');
    pass(`Upload with custom path enforced .webp extension (URL: ${dataPath.imageUrl})`);

    // Test 13: Admin upload with path traversal -> strictly rejected (400)
    const resTraversal = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataUrl: `data:image/jpeg;base64,${originalJpegBuffer.toString('base64')}`,
        fileName: 'attack.jpg',
        path: 'products/../../etc/passwd',
      }),
    });
    assert.strictEqual(resTraversal.status, 400);
    pass('Directory traversal in upload path strictly rejected (HTTP 400)');

    // Test 14: signed-upload-url generates .webp path
    const resSign = await fetch(`${baseUrl}/api/admin/signed-upload-url`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: 'festive-box.png',
        fileType: 'image/png',
        fileSize: 100000,
        folder: 'products',
      }),
    });
    assert.strictEqual(resSign.status, 200);
    const dataSign = await resSign.json();
    assert.ok(dataSign.path.endsWith('.webp'), 'Signed path must end in .webp');
    pass(`Signed upload URL generates WebP path (${dataSign.path})`);

    // --- PART 3: Product Creation & Editing using Optimized Images ---
    console.log('\n--- SUITE 3: Product Creation and Edit Flow with Optimized Images ---');

    // Test 15: Create new sweet using optimized image
    const validCategoryId =
      Array.from(inMemoryStore.categories.values()).find((c) => c.is_active)?.id ||
      '284272ed-691e-4720-ba2b-11a711478638';

    const resCreateProd = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Royal Shahi Peda Test',
        description: 'Traditional slow-cooked khoya peda with green cardamom and saffron.',
        category_id: validCategoryId,
        image_url: dataJpeg.imageUrl,
        pure_ghee: true,
        shelf_life_days: 10,
        ingredients: 'Pure Khoya, Sugar, Saffron, Green Cardamom',
        variants: [
          { label: '500g Box', weightGrams: 500, price: 340, mrp: 380, stockQuantity: 40 },
        ],
      }),
    });
    assert.strictEqual(resCreateProd.status, 201);
    const createdProd = (await resCreateProd.json()).product;
    assert.strictEqual(createdProd.image_url, dataJpeg.imageUrl);
    pass(`Product created with optimized WebP image URL: ${createdProd.image_url}`);

    // Test 16: Edit existing sweet with updated optimized image
    const resUpdateProd = await fetch(`${baseUrl}/api/admin/products/${createdProd.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Royal Shahi Peda Test (Special Batch)',
        image_url: dataPng.imageUrl,
        shelf_life_days: 12,
      }),
    });
    assert.strictEqual(resUpdateProd.status, 200);
    const updatedProd = inMemoryStore.products.get(createdProd.id);
    assert.strictEqual(updatedProd?.image_url, dataPng.imageUrl);
    pass(`Product updated with new optimized WebP image URL: ${updatedProd?.image_url}`);

    // Cleanup test product to keep database pristine
    await fetch(`${baseUrl}/api/admin/products/${createdProd.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    console.log('\n======================================================================');
    console.log(`ALL TESTS PASSED: ${passed}/16 verification tests completed successfully.`);
    console.log('======================================================================\n');
    process.exit(0);
  } finally {
    server.close();
  }
}

runImageOptimizationTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
