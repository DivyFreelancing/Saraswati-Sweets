/**
 * Comprehensive Verification Test Suite: Saraswati Sweets Reports & Analytics
 * Tests:
 * 1. Sales calculations and date boundaries (IST timezone handling).
 * 2. Best-selling product rankings and AOV formula consistency.
 * 3. Duplicate payment attempts, webhook deliveries, and unique orders vs attempts.
 * 4. Failed payments, cancellations, partial/pending/completed refunds.
 * 5. CSV escaping, accuracy, and spreadsheet formula-injection protection.
 * 6. Role-based Express route security (rejection of unauthorized & customer tokens).
 */

import {
  generateReportsAnalytics,
  resolveDateRangeBoundaries,
  formatToIstDateString,
  isOrderEligibleSale,
} from '../server/services/reportService';
import { sanitizeCsvField } from '../src/services/reportExportService';
import { inMemoryStore, ServerOrder, ServerPayment, ServerRefund } from '../server/db';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS — REPORTS & ANALYTICS TEST SUITE');
  console.log('======================================================================\n');

  // Backup existing inMemoryStore state
  const originalOrders = new Map(inMemoryStore.orders);
  const originalPayments = new Map(inMemoryStore.payments);
  const originalRefunds = new Map(inMemoryStore.refunds);

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: Date Boundaries & IST Timezone Handling
    // ------------------------------------------------------------------------
    console.log('--- 1. Date Boundaries & IST Timezone Handling ---');
    const nowIst = formatToIstDateString(new Date());
    assert(/^\d{4}-\d{2}-\d{2}$/.test(nowIst), `formatToIstDateString produces YYYY-MM-DD: ${nowIst}`);

    // Test UTC vs IST date rollover (e.g. 2026-10-15 19:00 UTC = 2026-10-16 00:30 IST)
    const lateUtcDate = new Date('2026-10-15T19:00:00.000Z');
    const istRoll = formatToIstDateString(lateUtcDate);
    assert(istRoll === '2026-10-16', `Late UTC timestamp correctly rolls over to next day in IST: ${istRoll}`);

    // Preset boundaries
    const last7 = resolveDateRangeBoundaries('last7days');
    assert(last7.preset === 'last7days', 'resolveDateRangeBoundaries handles last7days preset');
    assert(last7.startIso.endsWith('+05:30') && last7.endIso.endsWith('+05:30'), 'Boundary ISO timestamps contain +05:30 IST offset');

    // Inverted custom dates normalization
    const customInverted = resolveDateRangeBoundaries('custom', '2026-10-20', '2026-10-10');
    assert(customInverted.startDate === '2026-10-10' && customInverted.endDate === '2026-10-20', 'Inverted custom date ranges are safely normalized');

    console.log('\n--- 2. Controlled Database Fixtures Setup ---');
    inMemoryStore.orders.clear();
    inMemoryStore.payments.clear();
    inMemoryStore.refunds.clear();

    const targetDate = nowIst; // today IST
    const order1Iso = `${targetDate}T10:00:00.000+05:30`;
    const order2Iso = `${targetDate}T12:00:00.000+05:30`;
    const order3Iso = `${targetDate}T14:00:00.000+05:30`; // Cancelled order
    const order4Iso = `${targetDate}T16:00:00.000+05:30`; // Refunded order
    const order5Iso = `${targetDate}T18:00:00.000+05:30`; // COD order

    // Order 1: Paid Online Order (Gross: 600 + 50 = 650, Discount: 50, Net: 600)
    const mockOrder1: ServerOrder = {
      id: 'ord-001',
      order_number: 'SS-TEST-001',
      address_snapshot: {} as any,
      subtotal: 600,
      discount_amount: 50,
      delivery_charge: 50,
      tax_amount: 0,
      total_amount: 600,
      status: 'DELIVERED',
      payment_method: 'ONLINE',
      payment_status: 'CAPTURED',
      idempotency_key: 'idem-001',
      placed_at: order1Iso,
      created_at: order1Iso,
      updated_at: order1Iso,
      items: [
        {
          id: 'item-1',
          order_id: 'ord-001',
          product_id: 'prod-kaju-katli',
          variant_id: 'var-1',
          product_name: 'Kaju Katli Special',
          variant_label: '500g',
          unit_price: 600,
          quantity: 1,
          total_price: 600,
        },
      ],
    };

    // Order 2: Paid Online Order (Gross: 800 + 50 = 850, Discount: 100, Net: 750)
    const mockOrder2: ServerOrder = {
      id: 'ord-002',
      order_number: 'SS-TEST-002',
      address_snapshot: {} as any,
      subtotal: 800,
      discount_amount: 100,
      delivery_charge: 50,
      tax_amount: 0,
      total_amount: 750,
      status: 'CONFIRMED',
      payment_method: 'ONLINE',
      payment_status: 'CAPTURED',
      idempotency_key: 'idem-002',
      placed_at: order2Iso,
      created_at: order2Iso,
      updated_at: order2Iso,
      items: [
        {
          id: 'item-2a',
          order_id: 'ord-002',
          product_id: 'prod-kaju-katli',
          variant_id: 'var-1',
          product_name: 'Kaju Katli Special',
          variant_label: '500g',
          unit_price: 500,
          quantity: 1,
          total_price: 500,
        },
        {
          id: 'item-2b',
          order_id: 'ord-002',
          product_id: 'prod-motichoor',
          variant_id: 'var-2',
          product_name: 'Motichoor Ladoo',
          variant_label: '500g',
          unit_price: 300,
          quantity: 1,
          total_price: 300,
        },
      ],
    };

    // Order 3: Cancelled Order (Should be excluded from sales & bestsellers)
    const mockOrder3: ServerOrder = {
      id: 'ord-003',
      order_number: 'SS-TEST-003',
      address_snapshot: {} as any,
      subtotal: 500,
      discount_amount: 0,
      delivery_charge: 50,
      tax_amount: 0,
      total_amount: 550,
      status: 'CANCELLED',
      cancel_reason: 'Customer changed mind',
      cancelled_at: order3Iso,
      payment_method: 'ONLINE',
      payment_status: 'FAILED',
      idempotency_key: 'idem-003',
      placed_at: order3Iso,
      created_at: order3Iso,
      updated_at: order3Iso,
      items: [
        {
          id: 'item-3',
          order_id: 'ord-003',
          product_id: 'prod-motichoor',
          variant_id: 'var-2',
          product_name: 'Motichoor Ladoo',
          variant_label: '500g',
          unit_price: 500,
          quantity: 1,
          total_price: 500,
        },
      ],
    };

    // Order 4: Refunded Order (Gross: 400 + 50 = 450, Discount: 0, Refunded: 450)
    const mockOrder4: ServerOrder = {
      id: 'ord-004',
      order_number: 'SS-TEST-004',
      address_snapshot: {} as any,
      subtotal: 400,
      discount_amount: 0,
      delivery_charge: 50,
      tax_amount: 0,
      total_amount: 450,
      status: 'CANCELLED',
      cancel_reason: 'Delayed delivery request',
      cancelled_at: order4Iso,
      payment_method: 'ONLINE',
      payment_status: 'REFUNDED',
      provider_refund_id: 'cf_ref_004',
      idempotency_key: 'idem-004',
      placed_at: order4Iso,
      created_at: order4Iso,
      updated_at: order4Iso,
      items: [
        {
          id: 'item-4',
          order_id: 'ord-004',
          product_id: 'prod-gulab-jamun',
          variant_id: 'var-3',
          product_name: 'Gulab Jamun Tin',
          variant_label: '1kg',
          unit_price: 400,
          quantity: 1,
          total_price: 400,
        },
      ],
    };

    // Order 5: COD Placed Order (Gross: 350 + 50 = 400, Discount: 0, Net: 400)
    const mockOrder5: ServerOrder = {
      id: 'ord-005',
      order_number: 'SS-TEST-005',
      address_snapshot: {} as any,
      subtotal: 350,
      discount_amount: 0,
      delivery_charge: 50,
      tax_amount: 0,
      total_amount: 400,
      status: 'PLACED',
      payment_method: 'COD',
      payment_status: 'PENDING',
      idempotency_key: 'idem-005',
      placed_at: order5Iso,
      created_at: order5Iso,
      updated_at: order5Iso,
      items: [
        {
          id: 'item-5',
          order_id: 'ord-005',
          product_id: 'prod-kaju-katli',
          variant_id: 'var-1',
          product_name: 'Kaju Katli Special',
          variant_label: '500g',
          unit_price: 350,
          quantity: 1,
          total_price: 350,
        },
      ],
    };

    inMemoryStore.orders.set(mockOrder1.id, mockOrder1);
    inMemoryStore.orders.set(mockOrder2.id, mockOrder2);
    inMemoryStore.orders.set(mockOrder3.id, mockOrder3);
    inMemoryStore.orders.set(mockOrder4.id, mockOrder4);
    inMemoryStore.orders.set(mockOrder5.id, mockOrder5);

    // Payments setup (including duplicate webhook simulation)
    inMemoryStore.payments.set('pay-001', {
      id: 'pay-001',
      order_id: 'ord-001',
      order_number: 'SS-TEST-001',
      provider_order_id: 'cf_ord_001',
      provider_payment_id: 'cf_pay_111',
      amount: 600,
      currency: 'INR',
      status: 'CAPTURED',
      method: 'upi',
      created_at: order1Iso,
      updated_at: order1Iso,
    });

    // Duplicate webhook delivery for Order 1 with same provider_payment_id
    inMemoryStore.payments.set('pay-001-dup', {
      id: 'pay-001-dup',
      order_id: 'ord-001',
      order_number: 'SS-TEST-001',
      provider_order_id: 'cf_ord_001',
      provider_payment_id: 'cf_pay_111', // IDENTICAL PAYMENT ID
      amount: 600,
      currency: 'INR',
      status: 'CAPTURED',
      method: 'upi',
      created_at: order1Iso,
      updated_at: order1Iso,
    });

    // Payment for Order 2: Initial Failure then Retry Success
    inMemoryStore.payments.set('pay-002-fail', {
      id: 'pay-002-fail',
      order_id: 'ord-002',
      order_number: 'SS-TEST-002',
      provider_order_id: 'cf_ord_002',
      provider_payment_id: 'cf_pay_222_fail',
      amount: 750,
      currency: 'INR',
      status: 'FAILED',
      method: 'card',
      error_code: 'INSUFFICIENT_FUNDS',
      error_description: 'Bank declined transaction',
      created_at: order2Iso,
      updated_at: order2Iso,
    });
    inMemoryStore.payments.set('pay-002-succ', {
      id: 'pay-002-succ',
      order_id: 'ord-002',
      order_number: 'SS-TEST-002',
      provider_order_id: 'cf_ord_002',
      provider_payment_id: 'cf_pay_222_succ',
      amount: 750,
      currency: 'INR',
      status: 'CAPTURED',
      method: 'upi',
      created_at: order2Iso,
      updated_at: order2Iso,
    });

    // Payment for Order 4 (Refunded payment)
    inMemoryStore.payments.set('pay-004', {
      id: 'pay-004',
      order_id: 'ord-004',
      order_number: 'SS-TEST-004',
      provider_order_id: 'cf_ord_004',
      provider_payment_id: 'cf_pay_444',
      amount: 450,
      currency: 'INR',
      status: 'REFUNDED',
      method: 'netbanking',
      created_at: order4Iso,
      updated_at: order4Iso,
    });

    // Refund Record for Order 4
    inMemoryStore.refunds.set('ref-004', {
      id: 'ref-004',
      order_id: 'ord-004',
      payment_id: 'pay-004',
      refund_id: 'SS-REF-004',
      cf_refund_id: 'cf_ref_004',
      refund_amount: 450,
      refund_status: 'SUCCESS',
      refund_note: 'Delayed delivery compensation',
      refund_arn: 'ARN-1234567890',
      processed_at: order4Iso,
      created_at: order4Iso,
      updated_at: order4Iso,
    });

    console.log('✓ Controlled fixtures initialized in memory store.\n');

    // ------------------------------------------------------------------------
    // SECTION 2: Sales Calculations & AOV Verification
    // ------------------------------------------------------------------------
    console.log('--- 3. Sales Calculations & AOV Verification ---');
    const report = generateReportsAnalytics('today');

    // Expected eligible orders: Order 1 (600), Order 2 (750), Order 5 (400) = 3 orders
    assert(report.salesSummary.eligibleOrdersCount === 3, `Eligible orders count is exactly 3 (got ${report.salesSummary.eligibleOrdersCount})`);

    // Gross Sales: Order 1 (650) + Order 2 (850) + Order 5 (400) = 1900
    assert(report.salesSummary.grossSales === 1900, `Gross sales is ₹1,900 (got ${report.salesSummary.grossSales})`);

    // Discounts: Order 1 (50) + Order 2 (100) = 150
    assert(report.salesSummary.totalDiscounts === 150, `Total discounts is ₹150 (got ${report.salesSummary.totalDiscounts})`);

    // Total Refunds: Order 4 refund was ₹450
    assert(report.salesSummary.totalRefunds === 450, `Total verified refunds is ₹450 (got ${report.salesSummary.totalRefunds})`);

    // Net Sales: Gross (1900) - Discounts (150) - Refunds (450) = 1300
    assert(report.salesSummary.netSales === 1300, `Net sales calculation matches (1900 - 150 - 450 = ₹1,300, got ${report.salesSummary.netSales})`);

    // Average Order Value (AOV): Net Sales (1300) / Eligible Orders (3) = 433
    const expectedAov = Math.round(1300 / 3);
    assert(report.salesSummary.avgOrderValue === expectedAov, `AOV matches formula: ₹${expectedAov} (got ${report.salesSummary.avgOrderValue})`);

    // ------------------------------------------------------------------------
    // SECTION 3: Best-Selling Products Ranking Verification
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Best-Selling Products Ranking Verification ---');
    // Order 1: Kaju Katli (1 unit, ₹600)
    // Order 2: Kaju Katli (1 unit, ₹500), Motichoor (1 unit, ₹300)
    // Order 5: Kaju Katli (1 unit, ₹350)
    // Total Kaju Katli: 3 units, ₹1,450
    // Total Motichoor: 1 unit, ₹300
    // Order 3 (Cancelled) & Order 4 (Refunded) MUST be excluded
    const kaju = report.bestSellingProducts.find((p) => p.productName === 'Kaju Katli Special');
    assert(Boolean(kaju), 'Kaju Katli is present in bestsellers');
    assert(kaju?.rank === 1, `Kaju Katli is #1 ranked bestseller (rank: ${kaju?.rank})`);
    assert(kaju?.unitsSold === 3, `Kaju Katli units sold is 3 (got ${kaju?.unitsSold})`);
    assert(kaju?.totalRevenue === 1450, `Kaju Katli total revenue is ₹1,450 (got ${kaju?.totalRevenue})`);

    // Excluded check: Gulab Jamun was in refunded Order 4; Motichoor in cancelled Order 3
    const motichoor = report.bestSellingProducts.find((p) => p.productName === 'Motichoor Ladoo');
    assert(motichoor?.unitsSold === 1, `Cancelled Order 3 Motichoor excluded: units sold = 1 (got ${motichoor?.unitsSold})`);

    const gulabJamun = report.bestSellingProducts.find((p) => p.productName === 'Gulab Jamun Tin');
    assert(!gulabJamun, 'Refunded Order 4 Gulab Jamun is cleanly excluded from bestseller ranking');

    // ------------------------------------------------------------------------
    // SECTION 4: Payment Deduplication & Unique Orders vs Attempts
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Payment Deduplication & Rate Verification ---');
    // We added:
    // pay-001 (captured), pay-001-dup (same provider_payment_id 'cf_pay_111' -> deduplicated to 1 attempt)
    // pay-002-fail (failed), pay-002-succ (captured) -> 2 attempts for Order 2
    // pay-004 (refunded) -> 1 attempt
    // order 5 (COD) -> 1 attempt
    // Total deduplicated attempts = 1 + 2 + 1 + 1 = 5 attempts
    assert(report.paymentAnalytics.totalAttempts === 5, `Duplicate webhook deduplicated: total attempts = 5 (got ${report.paymentAnalytics.totalAttempts})`);

    // Unique Orders Attempted: Order 1, Order 2, Order 4, Order 5 = 4 unique orders
    assert(report.paymentAnalytics.uniqueOrdersAttempted === 4, `Unique orders attempted = 4 (got ${report.paymentAnalytics.uniqueOrdersAttempted})`);

    // Failed payments count: exactly 1 (pay-002-fail)
    assert(report.paymentAnalytics.failedCount === 1, `Failed payments count = 1 (got ${report.paymentAnalytics.failedCount})`);

    // Successful payments count: pay-001 (captured), pay-002-succ (captured), order-005 (COD) = 3
    assert(report.paymentAnalytics.successfulCount === 3, `Successful payments count = 3 (got ${report.paymentAnalytics.successfulCount})`);

    // ------------------------------------------------------------------------
    // SECTION 5: Cancellation & Refund Breakdown
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Cancellation & Refund Reports Verification ---');
    // Order 3 (cancelled, 550) + Order 4 (cancelled, 450) = 2 cancelled orders, total 1000
    assert(report.cancellationsAndRefunds.cancellations.totalCancelledCount === 2, `Total cancelled count = 2 (got ${report.cancellationsAndRefunds.cancellations.totalCancelledCount})`);
    assert(report.cancellationsAndRefunds.cancellations.totalCancelledAmount === 1000, `Total cancelled amount = ₹1,000 (got ${report.cancellationsAndRefunds.cancellations.totalCancelledAmount})`);

    // Reasons breakdown
    const mindReason = report.cancellationsAndRefunds.cancellations.reasonsBreakdown.find((r) => r.reason.includes('changed mind'));
    assert(Boolean(mindReason && mindReason.count === 1), 'Cancellation reason "Customer changed mind" recorded with count = 1');

    // Refund status
    assert(report.cancellationsAndRefunds.refunds.successfulCount === 1, `Successful refunds count = 1 (got ${report.cancellationsAndRefunds.refunds.successfulCount})`);
    assert(report.cancellationsAndRefunds.refunds.successfulAmount === 450, `Successful refunds amount = ₹450 (got ${report.cancellationsAndRefunds.refunds.successfulAmount})`);

    // Verify cancellation does NOT imply refund completed: Order 3 is cancelled, but has refundStatus NONE / PENDING
    const recOrder3 = report.cancellationsAndRefunds.records.find((r) => r.orderNumber === 'SS-TEST-003');
    assert(recOrder3?.refundStatus !== 'SUCCESS', `Unpaid cancelled Order 3 does not falsely claim refund SUCCESS (got ${recOrder3?.refundStatus})`);

    // ------------------------------------------------------------------------
    // SECTION 6: CSV Escaping & Spreadsheet Formula Injection Protection
    // ------------------------------------------------------------------------
    console.log('\n--- 7. CSV Escaping & Formula Injection Protection ---');
    // Test formula triggers: '=', '+', '-', '@', '\t', '\r'
    const formulaPayload1 = '=SUM(A1:A10)';
    const sanitized1 = sanitizeCsvField(formulaPayload1);
    assert(sanitized1 === "'=SUM(A1:A10)", `Formula starting with '=' is prefixed with single quote: ${sanitized1}`);

    const formulaPayload2 = '+cmd| /C calc';
    const sanitized2 = sanitizeCsvField(formulaPayload2);
    assert(sanitized2 === "'+cmd| /C calc", `Formula starting with '+' is neutralized: ${sanitized2}`);

    const formulaPayload3 = '@cmd';
    const sanitized3 = sanitizeCsvField(formulaPayload3);
    assert(sanitized3 === "'@cmd", `Formula starting with '@' is neutralized: ${sanitized3}`);

    const formulaPayload4 = '@SUM(1,2)';
    const sanitized4 = sanitizeCsvField(formulaPayload4);
    assert(sanitized4 === "\"'@SUM(1,2)\"", `Formula with comma is neutralized and properly quoted: ${sanitized4}`);

    const normalText = 'Artisanal Besan Ladoo';
    assert(sanitizeCsvField(normalText) === normalText, 'Normal text without formulas passes untouched');

    const commaText = 'Kaju Katli, 500g Box';
    assert(sanitizeCsvField(commaText) === '"Kaju Katli, 500g Box"', 'Text containing comma is properly quoted');

    const quotesText = 'Special "Desi Ghee" Peda';
    assert(sanitizeCsvField(quotesText) === '"Special ""Desi Ghee"" Peda"', 'Embedded quotes are doubled according to RFC 4180');

    // ------------------------------------------------------------------------
    // SECTION 7: Empty Results & Edge Cases
    // ------------------------------------------------------------------------
    console.log('\n--- 8. Empty Range & Zero Orders Handling ---');
    inMemoryStore.orders.clear();
    inMemoryStore.payments.clear();
    inMemoryStore.refunds.clear();

    const emptyReport = generateReportsAnalytics('last30days');
    assert(emptyReport.salesSummary.eligibleOrdersCount === 0, 'Zero eligible orders handled gracefully');
    assert(emptyReport.salesSummary.netSales === 0, 'Zero net sales handled gracefully');
    assert(emptyReport.salesSummary.avgOrderValue === 0, 'AOV with zero orders does not throw or produce NaN/Infinity');
    assert(emptyReport.bestSellingProducts.length === 0, 'Empty product list returned with length 0');
    assert(emptyReport.paymentAnalytics.successRatePercent === 0, 'Payment success rate with zero attempts is 0%');

    // ------------------------------------------------------------------------
    // SECTION 8: Express Route Security & Role Authorization Verification
    // ------------------------------------------------------------------------
    console.log('\n--- 9. Express Route Security & Role Authorization ---');
    process.env.UNIT_TEST = 'true';
    const express = (await import('express')).default;
    const http = (await import('http')).default;
    const adminRoutes = (await import('../server/routes/adminRoutes')).default;

    const app = express();
    app.use(express.json());

    let currentMockUser: any = null;
    app.use((req: any, _res: any, next: any) => {
      req.user = currentMockUser;
      next();
    });
    app.use('/api/admin', adminRoutes);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 1. Unauthenticated request (no user)
      currentMockUser = null;
      const unauthRes = await fetch(`${baseUrl}/api/admin/reports/analytics`);
      assert(unauthRes.status === 401, `Unauthenticated request correctly rejected with 401 Unauthorized (got ${unauthRes.status})`);

      // 2. Customer role request (must be blocked)
      currentMockUser = { id: 'cust-1', role: 'CUSTOMER', email: 'customer@example.com' };
      const custRes = await fetch(`${baseUrl}/api/admin/reports/analytics`);
      assert(custRes.status === 403, `Customer role request correctly rejected with 403 Forbidden (got ${custRes.status})`);

      // 3. Staff role request (authorized)
      currentMockUser = { id: 'staff-1', role: 'STAFF', email: 'staff@saraswatisweetsbarabanki.com' };
      const staffRes = await fetch(`${baseUrl}/api/admin/reports/analytics?range=today`);
      assert(staffRes.status === 200, `Staff role request authorized with 200 OK (got ${staffRes.status})`);
      const staffData = await staffRes.json();
      assert(Boolean(staffData.salesSummary && staffData.bestSellingProducts), 'Staff response contains authoritative sales and bestseller sections');

      // 4. Admin role request (authorized)
      currentMockUser = { id: 'admin-1', role: 'ADMIN', email: 'admin@saraswatisweetsbarabanki.com' };
      const adminRes = await fetch(`${baseUrl}/api/admin/reports/analytics?range=last7days`);
      assert(adminRes.status === 200, `Admin role request authorized with 200 OK (got ${adminRes.status})`);
      const adminData = await adminRes.json();
      assert(adminData.range.preset === 'last7days', 'Admin response correctly parses query params for date preset');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

  } finally {
    // Restore original state
    inMemoryStore.orders.clear();
    originalOrders.forEach((v, k) => inMemoryStore.orders.set(k, v));
    inMemoryStore.payments.clear();
    originalPayments.forEach((v, k) => inMemoryStore.payments.set(k, v));
    inMemoryStore.refunds.clear();
    originalRefunds.forEach((v, k) => inMemoryStore.refunds.set(k, v));
  }

  console.log('\n======================================================================');
  console.log(`REPORT TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test Suite encountered unhandled error:', err);
  process.exit(1);
});
