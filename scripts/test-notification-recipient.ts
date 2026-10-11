/**
 * Unit & Integration Test Suite: Saraswati Sweets Admin Notification Recipient Priority
 * 
 * Verifies:
 * 1. Tier 1 Priority: process.env.ADMIN_ORDER_EMAIL takes precedence when defined and non-empty.
 * 2. Tier 2 Fallback: STORE_SETTINGS.store_email / inMemoryStore.storeSettings.store_email used when ADMIN_ORDER_EMAIL is absent.
 * 3. Tier 3 Fallback: 'order@saraswatisweetsbarabanki.com' used when both ADMIN_ORDER_EMAIL and store email are absent/empty.
 * 4. In-Memory Isolation: Mutating inMemoryStore.storeSettings does NOT override process.env.ADMIN_ORDER_EMAIL.
 * 5. Whitespace Handling: process.env.ADMIN_ORDER_EMAIL is trimmed; whitespace-only strings fall through to fallback.
 * 6. Admin Order Alert: notifyOrderPlaced delivers ADMIN_NEW_ORDER_ALERT to getAdminNotificationRecipient().
 * 7. Customer Order Confirmation: notifyOrderPlaced delivers customer confirmation strictly to customer's email.
 * 8. Bulk Enquiry Admin Alert: notifyNewBulkEnquiry delivers BULK_ENQUIRY_ADMIN_ALERT to getAdminNotificationRecipient().
 * 9. Bulk Enquiry Customer Ack: notifyNewBulkEnquiry delivers BULK_ENQUIRY_CUSTOMER_ACK strictly to customer's email.
 * 10. Sender Independence: ZEPTOMAIL_FROM_ADDRESS governs sender, completely separate from recipient.
 */

process.env.UNIT_TEST = 'true';

import {
  getAdminNotificationRecipient,
  notifyOrderPlaced,
  notifyNewBulkEnquiry,
  setEmailProvider,
  EmailMessage,
  IEmailProvider,
  EmailSendResult,
} from '../server/services/notificationService';
import {
  STORE_SETTINGS,
  inMemoryStore,
  ServerOrder,
  ServerBulkEnquiry,
} from '../server/db';

async function runNotificationRecipientTests() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS: ADMIN NOTIFICATION RECIPIENT TEST SUITE');
  console.log('======================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${desc}`);
      failed++;
    }
  }

  // Backup original env & store settings
  const originalAdminOrderEmail = process.env.ADMIN_ORDER_EMAIL;
  const originalStoreEmail = inMemoryStore.storeSettings?.store_email;

  // Mock Email Provider to inspect outgoing messages
  const sentEmails: EmailMessage[] = [];
  const mockEmailProvider: IEmailProvider = {
    sendEmail: async (message: EmailMessage): Promise<EmailSendResult> => {
      sentEmails.push(message);
      return { success: true, id: `mock-${Date.now()}` };
    },
  };
  setEmailProvider(mockEmailProvider);

  try {
    // -------------------------------------------------------------------------
    // 1. RECIPIENT PRIORITY TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Recipient Priority Tests ---');

    // Test 1.1: ADMIN_ORDER_EMAIL is preferred when set
    process.env.ADMIN_ORDER_EMAIL = 'custom-admin@saraswatisweetsbarabanki.com';
    assert(
      getAdminNotificationRecipient() === 'custom-admin@saraswatisweetsbarabanki.com',
      'Priority 1: process.env.ADMIN_ORDER_EMAIL is preferred over store settings'
    );

    // Test 1.2: In-memory store settings do NOT override ADMIN_ORDER_EMAIL
    if (inMemoryStore.storeSettings) {
      inMemoryStore.storeSettings.store_email = 'hacked-or-changed@differentdomain.com';
    }
    assert(
      getAdminNotificationRecipient() === 'custom-admin@saraswatisweetsbarabanki.com',
      'In-memory store settings do not override process.env.ADMIN_ORDER_EMAIL'
    );

    // Test 1.3: Trimming of ADMIN_ORDER_EMAIL
    process.env.ADMIN_ORDER_EMAIL = '   trimmed-admin@saraswatisweetsbarabanki.com   ';
    assert(
      getAdminNotificationRecipient() === 'trimmed-admin@saraswatisweetsbarabanki.com',
      'process.env.ADMIN_ORDER_EMAIL is properly trimmed of whitespace'
    );

    // Test 1.4: Empty or whitespace-only ADMIN_ORDER_EMAIL falls through to new verified fallback
    process.env.ADMIN_ORDER_EMAIL = '   ';
    if (inMemoryStore.storeSettings) {
      inMemoryStore.storeSettings.store_email = 'order@saraswatisweets.in';
    }
    assert(
      getAdminNotificationRecipient() === 'order@saraswatisweetsbarabanki.com',
      'Whitespace-only process.env.ADMIN_ORDER_EMAIL falls back to order@saraswatisweetsbarabanki.com'
    );

    // Test 1.5: Unset ADMIN_ORDER_EMAIL falls back to order@saraswatisweetsbarabanki.com (NOT order@saraswatisweets.in)
    delete process.env.ADMIN_ORDER_EMAIL;
    if (inMemoryStore.storeSettings) {
      inMemoryStore.storeSettings.store_email = 'order@saraswatisweets.in';
    }
    assert(
      getAdminNotificationRecipient() === 'order@saraswatisweetsbarabanki.com',
      'Unset ADMIN_ORDER_EMAIL falls back to order@saraswatisweetsbarabanki.com'
    );
    assert(
      getAdminNotificationRecipient() !== 'order@saraswatisweets.in',
      'Under no circumstances does recipient fall back to old invalid order@saraswatisweets.in'
    );

    // Test 1.6: If ADMIN_ORDER_EMAIL is explicitly set to old invalid order@saraswatisweets.in, reject and use fallback
    process.env.ADMIN_ORDER_EMAIL = 'order@saraswatisweets.in';
    assert(
      getAdminNotificationRecipient() === 'order@saraswatisweetsbarabanki.com',
      'Accidentally configuring old invalid order@saraswatisweets.in safely rejects and uses verified fallback'
    );
    delete process.env.ADMIN_ORDER_EMAIL;

    // Test 1.7: Custom fallback parameter
    assert(
      getAdminNotificationRecipient('branch-manager@saraswatisweetsbarabanki.com') === 'branch-manager@saraswatisweetsbarabanki.com',
      'Custom valid fallback parameter is honored when ADMIN_ORDER_EMAIL is unset'
    );

    // Test 1.8: Custom fallback parameter of order@saraswatisweets.in is rejected
    assert(
      getAdminNotificationRecipient('order@saraswatisweets.in') === 'order@saraswatisweetsbarabanki.com',
      'Passing old invalid order@saraswatisweets.in as custom fallback is safely rejected in favor of verified fallback'
    );

    // Test 1.9: Empty or null fallback uses verified fallback
    assert(
      getAdminNotificationRecipient('') === 'order@saraswatisweetsbarabanki.com' &&
      getAdminNotificationRecipient(null) === 'order@saraswatisweetsbarabanki.com',
      'Empty or null fallback cleanly resolves to order@saraswatisweetsbarabanki.com'
    );

    // -------------------------------------------------------------------------
    // 2. ORDER PLACED NOTIFICATION DISPATCH TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Order Placed Notification Dispatch Tests ---');
    sentEmails.length = 0;

    process.env.ADMIN_ORDER_EMAIL = 'order@saraswatisweetsbarabanki.com';

    const testOrderWithCustomerEmail: ServerOrder = {
      id: 'ord-test-notif-001',
      order_number: 'SW-NOTIF-001',
      user_id: 'usr-123',
      guest_email: 'customer.real@gmail.com',
      guest_phone: '9876543210',
      status: 'PLACED',
      payment_status: 'CAPTURED',
      payment_method: 'ONLINE',
      subtotal: 500,
      discount_amount: 0,
      delivery_charge: 40,
      tax_amount: 25,
      total_amount: 565,
      address_snapshot: {
        id: 'addr-test-1',
        profile_id: 'usr-123',
        label: 'Home',
        recipient_name: 'Priya Sharma',
        recipient_phone: '9876543210',
        street_address: 'Civil Lines',
        city: 'Barabanki',
        state: 'Uttar Pradesh',
        pincode: '225001',
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      items: [
        {
          id: 'item-test-1',
          order_id: 'ord-test-notif-001',
          product_id: 'p1',
          variant_id: 'v1',
          product_name: 'Kaju Katli',
          variant_label: '500g',
          quantity: 1,
          unit_price: 500,
          total_price: 500,
        },
      ],
      idempotency_key: 'idem-test-notif-001',
      placed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Backup template key and fetch
    const originalTemplateKey = process.env.ZEPTOMAIL_TEMPLATE_KEY;
    const originalFetch = globalThis.fetch;

    // Test 2.1: Direct ZeptoMail customer confirmation (when template key is not set)
    delete process.env.ZEPTOMAIL_TEMPLATE_KEY;

    await notifyOrderPlaced(testOrderWithCustomerEmail);

    const adminOrderAlert = sentEmails.find(
      (m) => m.notificationType === 'ADMIN_NEW_ORDER_ALERT'
    );
    const customerOrderAck = sentEmails.find(
      (m) => m.notificationType === 'ORDER_CONFIRMATION_DIRECT'
    );

    assert(
      adminOrderAlert !== undefined,
      'notifyOrderPlaced dispatches ADMIN_NEW_ORDER_ALERT'
    );
    assert(
      adminOrderAlert?.to === 'order@saraswatisweetsbarabanki.com',
      'ADMIN_NEW_ORDER_ALERT recipient matches process.env.ADMIN_ORDER_EMAIL'
    );
    assert(
      customerOrderAck !== undefined,
      'notifyOrderPlaced dispatches customer order confirmation via direct email'
    );
    assert(
      customerOrderAck?.to === 'customer.real@gmail.com',
      'Customer direct order confirmation recipient remains strictly customer email (unchanged)'
    );

    // Test 2.2: Template-based customer confirmation (when template key is set)
    let interceptedTemplatePayload: any = null;
    process.env.ZEPTOMAIL_TEMPLATE_KEY = 'mock_template_key_123';
    globalThis.fetch = async (_url: any, options: any) => {
      interceptedTemplatePayload = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { message: 'success' } }),
      } as any;
    };

    sentEmails.length = 0;
    await notifyOrderPlaced(testOrderWithCustomerEmail);

    assert(
      interceptedTemplatePayload?.to?.[0]?.email_address?.address === 'customer.real@gmail.com',
      'Template-based customer order confirmation recipient remains strictly customer email (unchanged)'
    );

    // Restore fetch and template key
    globalThis.fetch = originalFetch;
    if (originalTemplateKey !== undefined) {
      process.env.ZEPTOMAIL_TEMPLATE_KEY = originalTemplateKey;
    } else {
      delete process.env.ZEPTOMAIL_TEMPLATE_KEY;
    }

    // Test phone-only guest order (no customer email)
    sentEmails.length = 0;
    const testOrderPhoneOnly: ServerOrder = {
      ...testOrderWithCustomerEmail,
      id: 'ord-test-notif-002',
      order_number: 'SW-NOTIF-002',
      guest_email: undefined,
    };

    await notifyOrderPlaced(testOrderPhoneOnly);

    const adminAlertPhoneOnly = sentEmails.find(
      (m) => m.notificationType === 'ADMIN_NEW_ORDER_ALERT'
    );
    const customerAlertPhoneOnly = sentEmails.find(
      (m) => m.notificationType === 'ORDER_CONFIRMATION_DIRECT' || m.notificationType === 'ORDER_CONFIRMATION_TEMPLATE'
    );

    assert(
      adminAlertPhoneOnly?.to === 'order@saraswatisweetsbarabanki.com',
      'Admin receives order alert even when customer has no email address'
    );
    assert(
      customerAlertPhoneOnly === undefined,
      'No customer email dispatched when customer email is undefined (phone-only user)'
    );

    // -------------------------------------------------------------------------
    // 3. BULK ENQUIRY NOTIFICATION DISPATCH TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Bulk Enquiry Notification Dispatch Tests ---');
    sentEmails.length = 0;

    process.env.ADMIN_ORDER_EMAIL = 'orders-hq@saraswatisweetsbarabanki.com';

    const testEnquiry: ServerBulkEnquiry = {
      id: 'enq-test-001',
      enquiry_number: 'BE-2026-9999',
      contact_name: 'Rajesh Verma',
      phone: '9988776655',
      email: 'rajesh.verma@corporate.in',
      event_type: 'WEDDING',
      event_date: '2026-11-20',
      estimated_quantity_kg: 100,
      estimated_guests: 500,
      delivery_address: 'Barabanki Palace',
      status: 'NEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await notifyNewBulkEnquiry(testEnquiry);

    const adminBulkAlert = sentEmails.find(
      (m) => m.notificationType === 'BULK_ENQUIRY_ADMIN_ALERT'
    );
    const customerBulkAck = sentEmails.find(
      (m) => m.notificationType === 'BULK_ENQUIRY_CUSTOMER_ACK'
    );

    assert(
      adminBulkAlert !== undefined,
      'notifyNewBulkEnquiry dispatches BULK_ENQUIRY_ADMIN_ALERT'
    );
    assert(
      adminBulkAlert?.to === 'orders-hq@saraswatisweetsbarabanki.com',
      'BULK_ENQUIRY_ADMIN_ALERT recipient matches process.env.ADMIN_ORDER_EMAIL'
    );
    assert(
      customerBulkAck !== undefined,
      'notifyNewBulkEnquiry dispatches customer acknowledgment'
    );
    assert(
      customerBulkAck?.to === 'rajesh.verma@corporate.in',
      'Customer bulk acknowledgment recipient remains strictly customer email (unchanged)'
    );

    // -------------------------------------------------------------------------
    // 4. ZEPTOMAIL SENDER ADDRESS INTEGRITY
    // -------------------------------------------------------------------------
    console.log('\n--- 4. ZeptoMail Sender Address Integrity ---');
    const { ZeptoMailProvider } = await import('../server/services/notificationService');
    const providerInstance: any = new ZeptoMailProvider();

    assert(
      providerInstance.fromAddress === (process.env.ZEPTOMAIL_FROM_ADDRESS || 'order@saraswatisweets.in'),
      'ZeptoMail fromAddress is governed by ZEPTOMAIL_FROM_ADDRESS independently of admin recipient'
    );

  } finally {
    // Restore original state
    if (originalAdminOrderEmail !== undefined) {
      process.env.ADMIN_ORDER_EMAIL = originalAdminOrderEmail;
    } else {
      delete process.env.ADMIN_ORDER_EMAIL;
    }
    if (inMemoryStore.storeSettings && originalStoreEmail !== undefined) {
      inMemoryStore.storeSettings.store_email = originalStoreEmail;
    }
  }

  console.log('======================================================================');
  console.log(`ADMIN NOTIFICATION SUITE: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runNotificationRecipientTests().catch((err) => {
  console.error('[TEST FAILURE]:', err);
  process.exit(1);
});
