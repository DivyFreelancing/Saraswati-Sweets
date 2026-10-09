const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateAllFavicons() {
  const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.png');
  const pubDir = path.join(__dirname, '..', 'public');

  const trimmed = sharp(logoPath).trim();
  const trimmedBuf = await trimmed.toBuffer();

  // 1. Transparent high-res 512x512 for PWA & SVG
  const pwa512 = await sharp(trimmedBuf)
    .resize(480, 480, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 16, bottom: 16, left: 16, right: 16,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), pwa512);

  // 2. Transparent 192x192 for PWA
  const pwa192 = await sharp(trimmedBuf)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 6, bottom: 6, left: 6, right: 6,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), pwa192);

  // 3. PWA Maskable 512x512 (with theme maroon background #8A1538 and safe padding for Android circles/squircles)
  const maskableInner = await sharp(trimmedBuf)
    .resize(380, 380, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const maskable512 = await sharp({
    create: { width: 512, height: 512, channels: 4, background: '#8A1538' }
  })
    .composite([{ input: maskableInner, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), maskable512);

  // 4. Apple Touch Icon 180x180 (royal theme maroon background #8A1538, centered logo)
  const appleInner = await sharp(trimmedBuf)
    .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const apple180 = await sharp({
    create: { width: 180, height: 180, channels: 4, background: '#8A1538' }
  })
    .composite([{ input: appleInner, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), apple180);

  // 5. Favicon PNGs: 16x16, 32x32, 48x48 (transparent, lanczos3 + subtle sharpen)
  const fav48 = await sharp(trimmedBuf)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8, m1: 1.2, m2: 1.8 })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'favicon-48x48.png'), fav48);

  const fav32 = await sharp(trimmedBuf)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8, m1: 1.2, m2: 1.8 })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'favicon-32x32.png'), fav32);

  const fav16 = await sharp(trimmedBuf)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8, m1: 1.2, m2: 1.8 })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(pubDir, 'favicon-16x16.png'), fav16);

  // 6. Generate multi-size favicon.ico (16, 32, 48)
  const icoEntries = [
    { width: 16, height: 16, buffer: fav16 },
    { width: 32, height: 32, buffer: fav32 },
    { width: 48, height: 48, buffer: fav48 }
  ];
  const count = icoEntries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirEntries = [];
  for (const img of icoEntries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width, 0);
    entry.writeUInt8(img.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += img.buffer.length;
  }
  const icoBuf = Buffer.concat([header, ...dirEntries, ...icoEntries.map(e => e.buffer)]);
  fs.writeFileSync(path.join(pubDir, 'favicon.ico'), icoBuf);

  // 7. Generate public/icon.svg embedding high-res logo
  const b64 = pwa512.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${b64}" width="512" height="512" preserveAspectRatio="xMidYMid meet" />
</svg>
`;
  fs.writeFileSync(path.join(pubDir, 'icon.svg'), svgContent, 'utf8');

  console.log('All favicon assets generated successfully:');
  console.log('- public/pwa-512x512.png (' + pwa512.length + ' bytes)');
  console.log('- public/pwa-192x192.png (' + pwa192.length + ' bytes)');
  console.log('- public/pwa-maskable-512x512.png (' + maskable512.length + ' bytes)');
  console.log('- public/apple-touch-icon.png (' + apple180.length + ' bytes)');
  console.log('- public/favicon-48x48.png (' + fav48.length + ' bytes)');
  console.log('- public/favicon-32x32.png (' + fav32.length + ' bytes)');
  console.log('- public/favicon-16x16.png (' + fav16.length + ' bytes)');
  console.log('- public/favicon.ico (' + icoBuf.length + ' bytes)');
  console.log('- public/icon.svg (' + svgContent.length + ' bytes)');
}

generateAllFavicons().catch(err => {
  console.error(err);
  process.exit(1);
});
