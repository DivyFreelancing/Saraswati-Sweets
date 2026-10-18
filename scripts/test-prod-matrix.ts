import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runProductionMatrixTest() {
  // Set production environment variables
  process.env.NODE_ENV = 'production';
  process.env.PORT = '3002';
  process.env.PUBLIC_SITE_URL = 'https://saraswatisweetsbarabanki.com';

  console.log('Starting production server on port 3002 for status-code and header validation...');
  
  // Dynamically import server.ts to trigger startServer()
  await import('../server.ts');

  // Give server time to initialize (Supabase fetch takes ~2-3s)
  await new Promise((resolve) => setTimeout(resolve, 4500));

  const testUrls = [
    // Follow-up A: Cache Headers
    { path: '/sw.js', label: 'Service Worker' },
    { path: '/workbox-5ccb27be.js', label: 'Workbox Runtime' },
    { path: '/manifest.webmanifest', label: 'Web App Manifest' },
    { path: '/assets/index-BAPETDS-.css', label: 'Hashed CSS' },
    { path: '/assets/index-BR-bsfVZ.js', label: 'Hashed JS' },
    { path: '/images/gift-hamper-banner.jpg', label: 'Image File' },
    { path: '/favicon.ico', label: 'Favicon' },

    // SEO Routes
    { path: '/robots.txt', label: 'robots.txt' },
    { path: '/sitemap.xml', label: 'sitemap.xml' },

    // Key Pages Status Codes
    { path: '/', label: 'Home Page' },
    { path: '/catalog', label: 'Catalog Page' },
    { path: '/categories', label: 'Categories Page' },
    { path: '/hampers', label: 'Hampers Page' },
    { path: '/bulk-enquiry', label: 'Bulk Enquiry Page' },
    { path: '/certifications', label: 'Certifications Page' },
    { path: '/refund-policy', label: 'Refund Policy Page' },
    { path: '/terms', label: 'Terms Page' },
    { path: '/terms-of-service', label: 'Terms Alias (301)' },
    { path: '/privacy-policy', label: 'Privacy Policy Page' },
    { path: '/shipping-policy', label: 'Shipping Policy Page' },
    { path: '/contact', label: 'Contact Page' },
    { path: '/cart', label: 'Cart Page' },
    { path: '/checkout', label: 'Checkout Page' },
    { path: '/admin', label: 'Admin Page' },
    { path: '/admin/login', label: 'Admin Login' },
    { path: '/order-confirmation/ORD-TEST-123', label: 'Order Confirmation' },

    // Product URLs (real vs unknown)
    { path: '/products/karachi-halwa', label: 'Real Product 1' },
    { path: '/products/chandrakala', label: 'Real Product 2' },
    { path: '/products/pudina-dalmoth', label: 'Real Product 3' },
    { path: '/products/non-existent-sweet-xyz-123', label: 'Unknown Product (404)' },

    // Unknown static route
    { path: '/unknown-page-random-xyz-404', label: 'Unknown Page (404)' },
  ];

  console.log('\n========================================================================================');
  console.log('PRODUCTION SERVER STATUS CODES & CACHE-CONTROL HEADERS');
  console.log('========================================================================================');

  for (const item of testUrls) {
    try {
      const res = await fetch(`http://localhost:3002${item.path}`, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
      });

      const status = res.status;
      const cacheControl = res.headers.get('cache-control') || '(none)';
      const contentType = res.headers.get('content-type') || '(none)';
      const location = res.headers.get('location') ? ` -> Location: ${res.headers.get('location')}` : '';

      console.log(
        `${item.path.padEnd(42)} | Status: ${String(status).padEnd(3)} | Content-Type: ${contentType.split(';')[0].padEnd(20)} | Cache-Control: ${cacheControl}${location}`
      );
    } catch (err: any) {
      console.error(`Failed to fetch ${item.path}:`, err.message);
    }
  }

  console.log('========================================================================================\n');
  process.exit(0);
}

runProductionMatrixTest().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
