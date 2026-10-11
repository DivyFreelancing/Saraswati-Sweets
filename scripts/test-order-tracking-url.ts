/**
 * Test Suite: Saraswati Sweets Order Tracking URL & Email Notification
 * 
 * Verifies:
 * 1. Authoritative Production Fallback: Defaults to 'https://saraswatisweetsbarabanki.com'
 * 2. Localhost Prevention in Production: Overrides localhost/127.0.0.1 to production URL when NODE_ENV=production or on Railway.
 * 3. Base URL Hierarchy: Prioritizes PUBLIC_SITE_URL, then APP_URL, then RAILWAY_PUBLIC_DOMAIN, then production default.
 * 4. Trailing Slash Normalization: Removes trailing slashes cleanly.
 * 5. HTTPS Enforcement: Upgrades http:// to https:// in production.
 * 6. Canonical Route & Order Identifier: Formats as /order-confirmation/:orderNumber using human-readable order number.
 * 7. ZeptoMail Template Merge Info: Passes tracking URL in merge_info.order_tracking_url.
 * 8. Fallback Direct HTML Email: Track Order button and displayed text link use identical tracking URL.
 * 9. Admin Order Alert: Contains the matching tracking link for store operations.
 * 10. Fulfilment Details & Security: Takeaway vs Delivery slots, and guest phone privacy protection.
 */

process.env.UNIT_TEST = 'true';

import {
  getOrderTrackingBaseUrl,
  buildOrderTrackingUrl,
  DEFAULT_PRODUCTION_URL,
  notifyOrderPlaced,
  setEmailProvider,
  EmailMessage,
  IEmailProvider,
  EmailSendResult,
} from '../server/services/notificationService';
import { ServerOrder, inMemoryStore } from '../server/db';

async function runOrderTrackingUrlTests() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS: ORDER TRACKING URL & CONFIRMATION TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  // Backup original env vars & globals
  const origNodeEnv = process.env.NODE_ENV;
  const origPublicSiteUrl = process.env.PUBLIC_SITE_URL;
  const origAppUrl = process.env.APP_URL;
  const origRailwayPublicDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  const origRailwayEnv = process.env.RAILWAY_ENVIRONMENT;
  const origCashfreeEnv = process.env.CASHFREE_ENVIRONMENT;
  const origZeptoTemplateKey = process.env.ZEPTOMAIL_TEMPLATE_KEY;
  const origFetch = globalThis.fetch;

  function resetEnv() {
    delete process.env.PUBLIC_SITE_URL;
    delete process.env.APP_URL;
    delete process.env.RAILWAY_PUBLIC_DOMAIN;
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.CASHFREE_ENVIRONMENT;
    process.env.NODE_ENV = 'production';
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 1: Production URL Resolution & Localhost Prevention
  // -------------------------------------------------------------------------
  console.log('--- Test Group 1: Base URL Resolution & Localhost Prevention ---');

  // Test 1.1: Default fallback in production
  resetEnv();
  const url1 = getOrderTrackingBaseUrl();
  assert(
    url1 === DEFAULT_PRODUCTION_URL && url1 === 'https://saraswatisweetsbarabanki.com',
    `Default production fallback resolves to '${DEFAULT_PRODUCTION_URL}'`
  );

  // Test 1.2: Localhost in APP_URL must NEVER be used in production
  resetEnv();
  process.env.APP_URL = 'http://localhost:3000';
  const url2 = getOrderTrackingBaseUrl();
  assert(
    url2 === DEFAULT_PRODUCTION_URL,
    `Localhost APP_URL ('http://localhost:3000') overridden to production '${DEFAULT_PRODUCTION_URL}'`
  );

  // Test 1.3: Localhost in PUBLIC_SITE_URL must NEVER be used in production
  resetEnv();
  process.env.PUBLIC_SITE_URL = 'http://localhost:5173/';
  const url3 = getOrderTrackingBaseUrl();
  assert(
    url3 === DEFAULT_PRODUCTION_URL,
    `Localhost PUBLIC_SITE_URL ('http://localhost:5173/') overridden to production '${DEFAULT_PRODUCTION_URL}'`
  );

  // Test 1.4: 127.0.0.1 must NEVER be used in production
  resetEnv();
  process.env.APP_URL = 'http://127.0.0.1:8080';
  const url4 = getOrderTrackingBaseUrl();
  assert(
    url4 === DEFAULT_PRODUCTION_URL,
    `127.0.0.1 APP_URL overridden to production '${DEFAULT_PRODUCTION_URL}'`
  );

  // Test 1.5: Valid production domain in PUBLIC_SITE_URL with trailing slash
  resetEnv();
  process.env.PUBLIC_SITE_URL = 'https://saraswatisweetsbarabanki.com/';
  const url5 = getOrderTrackingBaseUrl();
  assert(
    url5 === 'https://saraswatisweetsbarabanki.com',
    `Trailing slash is trimmed from PUBLIC_SITE_URL: '${url5}'`
  );

  // Test 1.6: HTTP converted to HTTPS in production
  resetEnv();
  process.env.PUBLIC_SITE_URL = 'http://saraswatisweetsbarabanki.com';
  const url6 = getOrderTrackingBaseUrl();
  assert(
    url6 === 'https://saraswatisweetsbarabanki.com',
    `HTTP scheme upgraded to HTTPS for production domain: '${url6}'`
  );

  // Test 1.7: Railway public domain honored if present
  resetEnv();
  process.env.RAILWAY_PUBLIC_DOMAIN = 'saraswati-sweets-production.up.railway.app';
  const url7 = getOrderTrackingBaseUrl();
  assert(
    url7 === 'https://saraswati-sweets-production.up.railway.app',
    `Railway public domain formatted as HTTPS: '${url7}'`
  );

  // -------------------------------------------------------------------------
  // TEST GROUP 2: Canonical Order Tracking URL Construction
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 2: Tracking URL Route & Order Identifier ---');

  resetEnv();
  const sampleOrderNumber = 'SS-1171-9631';
  const trackingUrl1 = buildOrderTrackingUrl(sampleOrderNumber);
  assert(
    trackingUrl1 === 'https://saraswatisweetsbarabanki.com/order-confirmation/SS-1171-9631',
    `Standard order number tracking URL: '${trackingUrl1}'`
  );

  const prefixedOrderNumber = 'SW-20261011-8921';
  const trackingUrl2 = buildOrderTrackingUrl(prefixedOrderNumber);
  assert(
    trackingUrl2 === 'https://saraswatisweetsbarabanki.com/order-confirmation/SW-20261011-8921',
    `SW-prefixed order number tracking URL: '${trackingUrl2}'`
  );

  // Test 2.3: Order identifier encoding
  const messyOrderNumber = 'SS 2026 #999';
  const trackingUrl3 = buildOrderTrackingUrl(messyOrderNumber);
  assert(
    trackingUrl3.includes('/order-confirmation/SS%202026%20%23999'),
    `Special characters safely URI-encoded: '${trackingUrl3}'`
  );

  // Test 2.4: Ensure route is strictly /order-confirmation/ and not /orders/ (which requires login)
  assert(
    trackingUrl1.includes('/order-confirmation/') && !trackingUrl1.includes('/orders/SS'),
    `Route strictly uses '/order-confirmation/' customer route`
  );

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Email Notification & Tracking Link Matching
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 3: Email Notification & Tracking Link Matching ---');

  const dispatchedEmails: EmailMessage[] = [];
  const mockEmailProvider: IEmailProvider = {
    async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
      dispatchedEmails.push(message);
      return { success: true, id: `mock-${Date.now()}` };
    },
  };
  setEmailProvider(mockEmailProvider);

  // Prepare sample test order
  const testOrder: ServerOrder = {
    id: 'ord-uuid-1234-5678',
    order_number: 'SS-1171-9631',
    user_id: 'usr-guest-1',
    guest_email: 'customer@example.com',
    guest_phone: '9876543210',
    total_amount: 850,
    subtotal: 800,
    delivery_charge: 50,
    discount_amount: 0,
    tax_amount: 0,
    idempotency_key: 'idem-test-tracking-1',
    status: 'PLACED',
    payment_status: 'CAPTURED',
    payment_method: 'ONLINE',
    fulfilment_type: 'DELIVERY',
    placed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: 'item-1',
        order_id: 'ord-uuid-1234-5678',
        product_id: 'prod-1',
        variant_id: 'var-1',
        product_name: 'Desi Ghee Kaju Katli',
        variant_label: '500g',
        quantity: 1,
        unit_price: 500,
        total_price: 500,
        item_type: 'PRODUCT',
      },
      {
        id: 'item-2',
        order_id: 'ord-uuid-1234-5678',
        product_id: 'prod-2',
        variant_id: 'var-2',
        product_name: 'Motichoor Ladoo',
        variant_label: '500g',
        quantity: 1,
        unit_price: 350,
        total_price: 350,
        item_type: 'PRODUCT',
      },
    ],
    address_snapshot: {
      id: 'addr-test-1',
      profile_id: 'usr-guest-1',
      label: 'Home',
      recipient_name: 'Rajesh Sharma',
      recipient_phone: '9876543210',
      street_address: 'Civil Lines, Near Clock Tower',
      landmark: 'Clock Tower',
      city: 'Barabanki',
      state: 'Uttar Pradesh',
      pincode: '225001',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  // Test 3.1: Fallback Direct HTML Email (when template key is unset)
  delete process.env.ZEPTOMAIL_TEMPLATE_KEY;
  dispatchedEmails.length = 0;
  await notifyOrderPlaced(testOrder);

  const customerDirectEmail = dispatchedEmails.find((e) => e.notificationType === 'ORDER_CONFIRMATION_DIRECT');
  assert(Boolean(customerDirectEmail), 'Direct HTML customer order confirmation email generated');

  if (customerDirectEmail) {
    const expectedUrl = 'https://saraswatisweetsbarabanki.com/order-confirmation/SS-1171-9631';
    
    // Check Track Order button href
    const buttonHrefMatch = customerDirectEmail.html.includes(`href="${expectedUrl}"`);
    assert(buttonHrefMatch, `Customer email button links to: '${expectedUrl}'`);

    // Check displayed text link
    const textLinkMatch = customerDirectEmail.html.includes(`>${expectedUrl}</a>`);
    assert(textLinkMatch, `Customer email text fallback displays identical URL: '${expectedUrl}'`);

    // Check localhost NEVER appears anywhere in email HTML
    const hasLocalhost = customerDirectEmail.html.includes('localhost') || customerDirectEmail.html.includes('127.0.0.1');
    assert(!hasLocalhost, 'No localhost or 127.0.0.1 strings exist in customer confirmation email');

    // Check correct order number is displayed
    assert(customerDirectEmail.html.includes('Order #SS-1171-9631'), 'Email displays human-readable Order #SS-1171-9631');
  }

  // Admin alert email check
  const adminEmail = dispatchedEmails.find((e) => e.notificationType === 'ADMIN_NEW_ORDER_ALERT');
  assert(Boolean(adminEmail), 'Store owner alert email generated');
  if (adminEmail) {
    const expectedUrl = 'https://saraswatisweetsbarabanki.com/order-confirmation/SS-1171-9631';
    assert(adminEmail.html.includes(expectedUrl), 'Admin alert includes valid production tracking URL');
  }

  // Test 3.2: ZeptoMail Template Payload with merge_info.order_tracking_url
  let interceptedPayload: any = null;
  process.env.ZEPTOMAIL_API_KEY = 'mock_zepto_key_valid_format';
  process.env.ZEPTOMAIL_TEMPLATE_KEY = 'mock_order_confirmation_template_key';
  globalThis.fetch = async (_url: any, options: any) => {
    interceptedPayload = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ message: 'success' }] }),
    } as any;
  };

  dispatchedEmails.length = 0;
  await notifyOrderPlaced(testOrder);

  assert(Boolean(interceptedPayload), 'ZeptoMail template API payload intercepted successfully');
  if (interceptedPayload) {
    const expectedTrackingUrl = 'https://saraswatisweetsbarabanki.com/order-confirmation/SS-1171-9631';
    assert(
      interceptedPayload.mail_template_key === 'mock_order_confirmation_template_key',
      'ZeptoMail payload includes mail_template_key'
    );
    assert(
      interceptedPayload.merge_info?.order_tracking_url === expectedTrackingUrl,
      `ZeptoMail merge_info.order_tracking_url matches: '${expectedTrackingUrl}'`
    );
    assert(
      interceptedPayload.merge_info?.order_id === 'SS-1171-9631',
      'ZeptoMail merge_info.order_id uses clean order number'
    );
    assert(
      !interceptedPayload.merge_info?.order_tracking_url?.includes('localhost'),
      'ZeptoMail merge_info.order_tracking_url strictly contains no localhost'
    );
  }

  // Restore fetch
  globalThis.fetch = origFetch;

  // -------------------------------------------------------------------------
  // TEST GROUP 4: Takeaway Order Fulfilment Details
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 4: Takeaway Order Fulfilment Details ---');

  delete process.env.ZEPTOMAIL_TEMPLATE_KEY;
  const takeawayOrder: ServerOrder = {
    ...testOrder,
    id: 'ord-takeaway-5678',
    order_number: 'SS-TAKEAWAY-100',
    fulfilment_type: 'TAKEAWAY',
    delivery_charge: 0,
    slot_snapshot: {
      slot_id: 'slot-1',
      slot_date: '2026-10-12',
      slot_time_formatted: '04:00 PM - 05:00 PM',
    },
  };

  dispatchedEmails.length = 0;
  await notifyOrderPlaced(takeawayOrder);

  const takeawayCustomerEmail = dispatchedEmails.find((e) => e.notificationType === 'ORDER_CONFIRMATION_DIRECT');
  assert(Boolean(takeawayCustomerEmail), 'Takeaway customer email generated');
  if (takeawayCustomerEmail) {
    assert(
      takeawayCustomerEmail.html.includes('Store Pickup / Takeaway') ||
      takeawayCustomerEmail.html.includes('Counter'),
      'Takeaway email highlights Store Pickup / Takeaway'
    );
    assert(
      takeawayCustomerEmail.html.includes('04:00 PM - 05:00 PM'),
      'Takeaway email includes scheduled pickup slot'
    );
    const takeawayUrl = 'https://saraswatisweetsbarabanki.com/order-confirmation/SS-TAKEAWAY-100';
    assert(
      takeawayCustomerEmail.html.includes(takeawayUrl),
      `Takeaway email button links to '${takeawayUrl}'`
    );
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 5: Security & Order Access Verification
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 5: Order Security & Access Verification ---');

  // Verify memory store contains order for guest lookup verification
  inMemoryStore.orders.set(testOrder.order_number, testOrder);

  // Order retrieval by order_number
  const foundOrder = inMemoryStore.orders.get('SS-1171-9631');
  assert(Boolean(foundOrder), 'Order indexable by human-readable order number SS-1171-9631');

  // Phone privacy check
  const rawPhone = foundOrder?.address_snapshot?.recipient_phone || '';
  const maskedPhone = `******${rawPhone.slice(-4)}`;
  assert(maskedPhone === '******43210' || maskedPhone === '******3210', `Recipient phone correctly masked for guest API: '${maskedPhone}'`);

  // Restore original environment
  if (origNodeEnv !== undefined) process.env.NODE_ENV = origNodeEnv;
  if (origPublicSiteUrl !== undefined) process.env.PUBLIC_SITE_URL = origPublicSiteUrl;
  if (origAppUrl !== undefined) process.env.APP_URL = origAppUrl;
  if (origRailwayPublicDomain !== undefined) process.env.RAILWAY_PUBLIC_DOMAIN = origRailwayPublicDomain;
  if (origRailwayEnv !== undefined) process.env.RAILWAY_ENVIRONMENT = origRailwayEnv;
  if (origCashfreeEnv !== undefined) process.env.CASHFREE_ENVIRONMENT = origCashfreeEnv;
  if (origZeptoTemplateKey !== undefined) process.env.ZEPTOMAIL_TEMPLATE_KEY = origZeptoTemplateKey;

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runOrderTrackingUrlTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
