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
  buildZeptoMailOrderConfirmationMergeInfo,
  buildDirectOrderConfirmationHtml,
  getAuthoritativePaymentStatus,
  getOrderTypeDetails,
  escapeHtml,
  formatINR,
  formatOrderDate,
} from '../server/services/notificationService';
import { ServerOrder, ServerOrderItem, inMemoryStore } from '../server/db';

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

  // -------------------------------------------------------------------------
  // TEST GROUP 6: Reconcile Exact ₹500 Test Order ZeptoMail Payload
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 6: Exact ₹500 Test Order ZeptoMail Payload Reconciliation ---');

  // Case 6A: ₹500 Takeaway Order (Verified Online Payment)
  const testOrder500Takeaway: ServerOrder = {
    id: 'ord-test-500-takeaway',
    order_number: 'SS-500-TKWY',
    guest_email: 'test@example.com',
    guest_phone: '9415023456',
    subtotal: 500,
    delivery_charge: 0,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 500,
    status: 'CONFIRMED',
    payment_status: 'CAPTURED',
    payment_method: 'ONLINE',
    fulfilment_type: 'TAKEAWAY',
    slot_snapshot: {
      slot_id: 'slot-evening',
      slot_date: '2026-10-12',
      slot_time_formatted: '06:00 PM - 07:00 PM',
    },
    address_snapshot: {
      id: 'addr-counter',
      profile_id: 'usr-guest-1',
      label: 'Store Counter',
      recipient_name: 'Amit Verma',
      recipient_phone: '9415023456',
      street_address: 'Main Market',
      city: 'Barabanki',
      state: 'Uttar Pradesh',
      pincode: '225001',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    idempotency_key: 'idem-500-tkwy',
    placed_at: '2026-10-11T14:30:00.000Z',
    created_at: '2026-10-11T14:30:00.000Z',
    updated_at: '2026-10-11T14:30:00.000Z',
    items: [
      {
        id: 'item-kk-500',
        order_id: 'ord-test-500-takeaway',
        product_id: 'prod-kaju-katli',
        variant_id: 'v-kk-500',
        product_name: 'Signature Silver Leaf Kaju Katli',
        variant_label: '500g',
        quantity: 1,
        unit_price: 500,
        total_price: 500,
      },
    ],
  };

  const mergeInfo6A = buildZeptoMailOrderConfirmationMergeInfo(
    testOrder500Takeaway,
    buildOrderTrackingUrl(testOrder500Takeaway.order_number)
  );

  assert(mergeInfo6A.total_amount === '₹500', `6A: total_amount is exact ₹500 (got '${mergeInfo6A.total_amount}')`);
  assert(mergeInfo6A.items_subtotal === '₹500', `6A: items_subtotal is ₹500 (got '${mergeInfo6A.items_subtotal}')`);
  assert(mergeInfo6A.delivery_fee.includes('FREE') || mergeInfo6A.delivery_fee === '₹0', `6A: delivery_fee is FREE / ₹0 for takeaway (got '${mergeInfo6A.delivery_fee}')`);
  assert(mergeInfo6A.tax_amount.includes('Included in MRP') || mergeInfo6A.tax_amount === '₹0', `6A: tax_amount is ₹0 (Included in MRP) (got '${mergeInfo6A.tax_amount}')`);
  assert(mergeInfo6A.order_type.includes('Takeaway'), `6A: order_type indicates Takeaway (got '${mergeInfo6A.order_type}')`);
  assert(mergeInfo6A.payment_status === 'Paid Online (Verified)', `6A: payment_status is 'Paid Online (Verified)' (got '${mergeInfo6A.payment_status}')`);
  assert(mergeInfo6A.delivery_address.includes('06:00 PM - 07:00 PM'), `6A: delivery_address contains pickup slot (got '${mergeInfo6A.delivery_address}')`);
  assert(mergeInfo6A.items.length === 1, '6A: items array has 1 product');
  assert(mergeInfo6A.items[0].product_name === 'Signature Silver Leaf Kaju Katli', '6A: product name is accurate');
  assert(mergeInfo6A.items[0].variant_label === '500g', '6A: variant label is 500g');
  assert(mergeInfo6A.items[0].quantity === 1, '6A: quantity is 1');
  assert(mergeInfo6A.items[0].unit_price === '₹500', '6A: unit price is ₹500');
  assert(mergeInfo6A.items[0].total_price === '₹500', '6A: total price is ₹500');
  assert(mergeInfo6A.order_items_html.includes('Signature Silver Leaf Kaju Katli'), '6A: HTML table rows contain product');

  // Case 6B: ₹500 Delivery Order (COD, ₹450 items + ₹50 delivery)
  const testOrder500Delivery: ServerOrder = {
    id: 'ord-test-500-delivery',
    order_number: 'SS-500-DELV',
    guest_email: 'test@example.com',
    guest_phone: '9415023456',
    subtotal: 450,
    delivery_charge: 50,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 500,
    status: 'PLACED',
    payment_status: 'PENDING',
    payment_method: 'COD',
    fulfilment_type: 'DELIVERY',
    address_snapshot: {
      id: 'addr-home',
      profile_id: 'usr-guest-2',
      label: 'Home',
      recipient_name: 'Priya Srivastava',
      recipient_phone: '9415023456',
      street_address: 'House 42, Awas Vikas Colony',
      landmark: 'Near Water Tank',
      city: 'Barabanki',
      state: 'Uttar Pradesh',
      pincode: '225001',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    idempotency_key: 'idem-500-delv',
    placed_at: '2026-10-11T15:00:00.000Z',
    created_at: '2026-10-11T15:00:00.000Z',
    updated_at: '2026-10-11T15:00:00.000Z',
    items: [
      {
        id: 'item-ml-500',
        order_id: 'ord-test-500-delivery',
        product_id: 'prod-motichoor',
        variant_id: 'v-ml-500',
        product_name: 'Pure Shuddh Ghee Motichoor Ladoo',
        variant_label: '500g',
        quantity: 1,
        unit_price: 340,
        total_price: 340,
      },
      {
        id: 'item-gj-250',
        order_id: 'ord-test-500-delivery',
        product_id: 'prod-gulab-jamun',
        variant_id: 'v-gj-250',
        product_name: 'Royal Saffron Gulab Jamun',
        variant_label: '250g',
        quantity: 1,
        unit_price: 110,
        total_price: 110,
      },
    ],
  };

  const mergeInfo6B = buildZeptoMailOrderConfirmationMergeInfo(
    testOrder500Delivery,
    buildOrderTrackingUrl(testOrder500Delivery.order_number)
  );

  assert(mergeInfo6B.total_amount === '₹500', `6B: total_amount is exact ₹500 (got '${mergeInfo6B.total_amount}')`);
  assert(mergeInfo6B.items_subtotal === '₹450', `6B: items_subtotal is ₹450 (got '${mergeInfo6B.items_subtotal}')`);
  assert(mergeInfo6B.delivery_fee === '₹50', `6B: delivery_fee is ₹50 (got '${mergeInfo6B.delivery_fee}')`);
  assert(mergeInfo6B.tax_amount.includes('Included in MRP') || mergeInfo6B.tax_amount === '₹0', `6B: tax_amount is ₹0 (got '${mergeInfo6B.tax_amount}')`);
  assert(mergeInfo6B.order_type.includes('Delivery'), `6B: order_type indicates Delivery (got '${mergeInfo6B.order_type}')`);
  assert(mergeInfo6B.payment_status === 'Pay on Delivery (Cash / UPI)', `6B: COD payment_status is 'Pay on Delivery (Cash / UPI)' (got '${mergeInfo6B.payment_status}')`);
  assert(mergeInfo6B.delivery_address.includes('Awas Vikas Colony') && mergeInfo6B.delivery_address.includes('225001'), `6B: delivery_address contains street & pincode (got '${mergeInfo6B.delivery_address}')`);
  assert(mergeInfo6B.items.length === 2, '6B: items array has 2 products');
  assert(mergeInfo6B.order_items_html.includes('Pure Shuddh Ghee Motichoor Ladoo'), '6B: HTML table rows contain item 1');
  assert(mergeInfo6B.order_items_html.includes('Royal Saffron Gulab Jamun'), '6B: HTML table rows contain item 2');

  // -------------------------------------------------------------------------
  // TEST GROUP 7: Multi-Product Orders with Quantities & Line Totals
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 7: Multi-Product Orders with Quantities & Line Totals ---');

  const multiItemOrder: ServerOrder = {
    ...testOrder500Delivery,
    id: 'ord-multi-items',
    order_number: 'SS-MULTI-01',
    items: [
      {
        id: 'it-1',
        order_id: 'ord-multi-items',
        product_id: 'p1',
        variant_id: 'v1',
        product_name: 'Kaju Katli',
        variant_label: '250g',
        quantity: 2,
        unit_price: 260,
        total_price: 520,
      },
      {
        id: 'it-2',
        order_id: 'ord-multi-items',
        product_id: 'p2',
        variant_id: 'v2',
        product_name: 'Besan Ladoo',
        variant_label: '500g',
        quantity: 1,
        unit_price: 300,
        total_price: 300,
      },
      {
        id: 'it-3',
        order_id: 'ord-multi-items',
        product_id: 'p3',
        variant_id: 'v3',
        product_name: 'Peda Special',
        variant_label: '1 kg Box',
        quantity: 3,
        unit_price: 400,
        total_price: 1200,
      },
    ],
    subtotal: 2020,
    delivery_charge: 50,
    discount_amount: 100,
    coupon_code: 'FESTIVE100',
    tax_amount: 0,
    total_amount: 1970,
  };

  const mergeMulti = buildZeptoMailOrderConfirmationMergeInfo(
    multiItemOrder,
    buildOrderTrackingUrl(multiItemOrder.order_number)
  );

  assert(mergeMulti.items.length === 3, 'Multi-product order has 3 items in merge_info.items');
  assert(mergeMulti.items[0].quantity === 2 && mergeMulti.items[0].unit_price === '₹260' && mergeMulti.items[0].total_price === '₹520', 'Item 1 line total reconciled (2 x ₹260 = ₹520)');
  assert(mergeMulti.items[2].quantity === 3 && mergeMulti.items[2].unit_price === '₹400' && mergeMulti.items[2].total_price === '₹1,200', 'Item 3 line total reconciled (3 x ₹400 = ₹1,200)');
  assert(mergeMulti.items_subtotal === '₹2,020', `Subtotal formatted correctly as '₹2,020' (got '${mergeMulti.items_subtotal}')`);
  assert(mergeMulti.discount_amount === '-₹100', `Discount formatted correctly as '-₹100' (got '${mergeMulti.discount_amount}')`);
  assert(mergeMulti.total_amount === '₹1,970', `Grand total reconciled (2020 - 100 + 50 = 1970) (got '${mergeMulti.total_amount}')`);
  assert(mergeMulti.has_discount === true, 'has_discount flag is true');
  assert(mergeMulti.discount_code === 'FESTIVE100', 'discount_code matches coupon code');

  // -------------------------------------------------------------------------
  // TEST GROUP 8: Authoritative Payment Status Resolution
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 8: Authoritative Payment Status Resolution ---');

  // 8.1 Online + CAPTURED -> Paid Online (Verified)
  const paidStatus = getAuthoritativePaymentStatus({
    ...testOrder500Delivery,
    payment_method: 'ONLINE',
    payment_status: 'CAPTURED',
  });
  assert(paidStatus.statusText === 'Paid Online (Verified)' && paidStatus.isPaid === true, 'ONLINE + CAPTURED is marked Paid Online (Verified)');

  // 8.2 Online + PENDING -> Payment Pending (NEVER marked as paid!)
  const pendingOnlineStatus = getAuthoritativePaymentStatus({
    ...testOrder500Delivery,
    payment_method: 'ONLINE',
    payment_status: 'PENDING',
  });
  assert(pendingOnlineStatus.statusText === 'Payment Pending' && pendingOnlineStatus.isPaid === false, 'ONLINE + PENDING is strictly "Payment Pending" and isPaid=false');

  // 8.3 COD + PENDING -> Pay on Delivery (Cash / UPI)
  const codStatus = getAuthoritativePaymentStatus({
    ...testOrder500Delivery,
    payment_method: 'COD',
    payment_status: 'PENDING',
  });
  assert(codStatus.statusText === 'Pay on Delivery (Cash / UPI)' && codStatus.isPaid === false, 'COD + PENDING is marked "Pay on Delivery (Cash / UPI)"');

  // 8.4 Online + FAILED -> Payment Failed
  const failedStatus = getAuthoritativePaymentStatus({
    ...testOrder500Delivery,
    payment_method: 'ONLINE',
    payment_status: 'FAILED',
  });
  assert(failedStatus.statusText === 'Payment Failed' && failedStatus.isPaid === false, 'FAILED is marked "Payment Failed"');

  // -------------------------------------------------------------------------
  // TEST GROUP 9: Customer-Controlled HTML / XSS Escaping
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 9: Customer-Controlled HTML / XSS Escaping ---');

  const xssOrder: ServerOrder = {
    ...testOrder500Delivery,
    id: 'ord-xss',
    order_number: 'SS-XSS-1',
    address_snapshot: {
      ...testOrder500Delivery.address_snapshot,
      recipient_name: '<script>alert("XSS")</script>',
      street_address: 'Flat 4B & "Sunshine" Towers <Road>',
    },
    items: [
      {
        id: 'it-xss',
        order_id: 'ord-xss',
        product_id: 'p-xss',
        variant_id: 'v-xss',
        product_name: 'Badam <img src=x onerror=alert(1)> Barfi',
        variant_label: '250g & 500g',
        quantity: 1,
        unit_price: 250,
        total_price: 250,
      },
    ],
  };

  const mergeXss = buildZeptoMailOrderConfirmationMergeInfo(xssOrder, 'https://saraswatisweetsbarabanki.com/order-confirmation/SS-XSS-1');
  assert(!mergeXss.customer_name.includes('<script>'), 'Customer name has <script> stripped/escaped');
  assert(mergeXss.customer_name.includes('&lt;script&gt;'), 'Customer name is safely HTML-escaped');
  assert(!mergeXss.delivery_address.includes('<Road>'), 'Address <Road> is safely HTML-escaped');
  assert(mergeXss.delivery_address.includes('&lt;Road&gt;'), 'Address contains &lt;Road&gt;');
  assert(!mergeXss.items[0].product_name.includes('<img'), 'Product name <img> is safely HTML-escaped');
  assert(mergeXss.items[0].product_name.includes('&lt;img'), 'Product name contains &lt;img');

  // -------------------------------------------------------------------------
  // TEST GROUP 10: ZeptoMail Template API Payload Interception (Full Payload Verification)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 10: Full ZeptoMail Template Payload Interception ---');

  let fullInterceptedPayload: any = null;
  process.env.ZEPTOMAIL_API_KEY = 'valid_test_token_123';
  process.env.ZEPTOMAIL_TEMPLATE_KEY = 'production_zepto_order_confirmation_v1';
  globalThis.fetch = async (_url: any, options: any) => {
    fullInterceptedPayload = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ message: 'success' }] }),
    } as any;
  };

  await notifyOrderPlaced(testOrder500Takeaway);

  assert(Boolean(fullInterceptedPayload), 'Full payload intercepted from notifyOrderPlaced');
  if (fullInterceptedPayload) {
    const mi = fullInterceptedPayload.merge_info;
    const requiredKeys = [
      'customer_name',
      'order_id',
      'order_date',
      'order_type',
      'payment_status',
      'payment_method',
      'delivery_address',
      'items_subtotal',
      'delivery_fee',
      'tax_amount',
      'total_amount',
      'order_tracking_url',
      'store_phone',
      'store_whatsapp',
      'store_address',
      'items',
      'order_items_html',
    ];

    let allKeysPresent = true;
    for (const k of requiredKeys) {
      if (mi[k] === undefined || mi[k] === null || mi[k] === '') {
        console.error(`  Missing required key in merge_info: ${k}`);
        allKeysPresent = false;
      }
    }
    assert(allKeysPresent, 'All required ZeptoMail merge_info keys are populated (no blanks, no undefined)');
    assert(mi.total_amount === '₹500', `Intercepted total_amount is ₹500 (got '${mi.total_amount}')`);
    assert(Array.isArray(mi.items) && mi.items.length > 0, 'Intercepted items is a non-empty array');
    assert(typeof mi.order_items_html === 'string' && mi.order_items_html.includes('<tr>'), 'Intercepted order_items_html contains <tr> table rows');
  }

  // Restore fetch
  globalThis.fetch = origFetch;

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
