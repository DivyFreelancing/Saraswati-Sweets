import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics for Festive Traffic Tracking
const errorRate = new Rate('festive_errors');
const homeDuration = new Trend('duration_home_api');
const catalogDuration = new Trend('duration_catalog_api');
const productDuration = new Trend('duration_product_api');
const cartDuration = new Trend('duration_cart_api');
const totalFunnelCompleted = new Counter('funnel_completed_users');

// Target URL: Default to local development server, or provide staging URL via BASE_URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp-up to 100 users
    { duration: '2m', target: 500 },  // Ramp-up to 500 concurrent festive users
    { duration: '5m', target: 500 },  // Hold 500 concurrent users (Diwali peak rush)
    { duration: '1m', target: 100 },  // Scale down
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    // 95% of requests must complete under 1.2s; error rate must be < 2%
    http_req_duration: ['p(95)<1200'],
    festive_errors: ['rate<0.02'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'k6-load-tester/festive-diwali-sim',
};

export default function () {
  // Step 1: Browse Home (Landing, Banners, Offers, Categories)
  group('01_Browse_Home', function () {
    const resHome = http.batch([
      ['GET', `${BASE_URL}/api/store/settings`, null, { headers }],
      ['GET', `${BASE_URL}/api/banners`, null, { headers }],
      ['GET', `${BASE_URL}/api/offers`, null, { headers }],
      ['GET', `${BASE_URL}/api/categories`, null, { headers }],
    ]);

    const allOk = resHome.every((r) => r.status === 200);
    homeDuration.add(resHome[0].timings.duration);
    errorRate.add(!allOk);

    check(resHome, {
      'Home endpoints responded with 200': () => allOk,
    });
  });

  // Realistic human think time (1 to 2.5 seconds)
  sleep(Math.random() * 1.5 + 1);

  // Step 2: Browse Category / Catalog Page
  let selectedProductSlug = 'signature-kaju-katli';
  let selectedVariantId = 'var-kaju-katli-500g';

  group('02_Browse_Category_Catalog', function () {
    const resCatalog = http.get(`${BASE_URL}/api/products`, { headers });
    catalogDuration.add(resCatalog.timings.duration);
    const ok = resCatalog.status === 200;
    errorRate.add(!ok);

    check(resCatalog, {
      'Catalog products responded with 200': (r) => r.status === 200,
      'Catalog returned products array': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (Array.isArray(body) && body.length > 0) {
            // Pick a random product from real returned catalog
            const randomProd = body[Math.floor(Math.random() * body.length)];
            if (randomProd && randomProd.slug) {
              selectedProductSlug = randomProd.slug;
              if (randomProd.variants && randomProd.variants.length > 0) {
                selectedVariantId = randomProd.variants[0].id;
              }
            }
            return true;
          }
          return false;
        } catch (_) {
          return false;
        }
      },
    });
  });

  // Think time before clicking product
  sleep(Math.random() * 2 + 1);

  // Step 3: Product Detail View
  group('03_View_Product_Detail', function () {
    const resProduct = http.get(`${BASE_URL}/api/products/${selectedProductSlug}`, { headers });
    productDuration.add(resProduct.timings.duration);
    const ok = resProduct.status === 200;
    errorRate.add(!ok);

    check(resProduct, {
      'Product detail responded with 200': (r) => r.status === 200,
      'Product payload contains valid variants': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (body && body.product && Array.isArray(body.product.variants) && body.product.variants.length > 0) {
            selectedVariantId = body.product.variants[0].id;
            return true;
          }
          return false;
        } catch (_) {
          return false;
        }
      },
    });
  });

  // Think time while selecting weight / reading ingredients
  sleep(Math.random() * 1.5 + 1);

  // Step 4: Add to Cart & Verify (Pre-Checkout)
  group('04_Add_To_Cart_And_Verify', function () {
    // 4a: Calculate cart totals using server-side validation
    const cartPayload = JSON.stringify({
      items: [
        {
          variantId: selectedVariantId,
          quantity: 2,
        },
      ],
    });

    const resCart = http.post(`${BASE_URL}/api/cart/calculate`, cartPayload, { headers });
    cartDuration.add(resCart.timings.duration);
    const okCart = resCart.status === 200;
    errorRate.add(!okCart);

    check(resCart, {
      'Cart calculation succeeded': (r) => r.status === 200,
      'Cart subtotal > 0': (r) => {
        try {
          const b = JSON.parse(r.body);
          return b.subtotal > 0;
        } catch (_) {
          return false;
        }
      },
    });

    if (okCart) {
      totalFunnelCompleted.add(1);
    }
  });

  // Stop here: NO real payment or checkout creation to avoid placing fake orders
  sleep(Math.random() * 2 + 1);
}
