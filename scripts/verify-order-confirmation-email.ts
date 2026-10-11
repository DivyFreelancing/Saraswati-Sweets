/**
 * Verification Script: Saraswati Sweets Order Confirmation Email
 * 
 * Reconciles the ₹500 test order with all template merge variables and renders
 * the final email content to verify that no blank fields or missing product rows exist.
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  buildZeptoMailOrderConfirmationMergeInfo,
  buildDirectOrderConfirmationHtml,
  buildOrderTrackingUrl,
} from '../server/services/notificationService';
import { ServerOrder } from '../server/db';

async function verifyOrderConfirmationEmail() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS: ORDER CONFIRMATION EMAIL VERIFICATION');
  console.log('======================================================================\n');

  // Authoritative ₹500 test order matching the user's scenario
  const testOrder500: ServerOrder = {
    id: 'ord-test-500-verified',
    order_number: 'SS-1171-9631',
    user_id: 'usr-test-01',
    guest_email: 'authorized-test@saraswatisweetsbarabanki.com',
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
      slot_id: 'slot-evening-01',
      slot_date: '2026-10-12',
      slot_time_formatted: '06:00 PM - 07:00 PM',
    },
    address_snapshot: {
      id: 'addr-01',
      profile_id: 'usr-test-01',
      label: 'Store Counter',
      recipient_name: 'Aditya Srivastava',
      recipient_phone: '9415023456',
      street_address: 'Saraswati Sweets Counter, Main Road',
      city: 'Barabanki',
      state: 'Uttar Pradesh',
      pincode: '225001',
      is_default: true,
      created_at: '2026-10-11T14:30:00.000Z',
      updated_at: '2026-10-11T14:30:00.000Z',
    },
    idempotency_key: 'idem-test-500-verified',
    placed_at: '2026-10-11T14:30:00.000Z',
    created_at: '2026-10-11T14:30:00.000Z',
    updated_at: '2026-10-11T14:30:00.000Z',
    items: [
      {
        id: 'item-kk-500',
        order_id: 'ord-test-500-verified',
        product_id: 'prod-kaju-katli',
        variant_id: 'v-kk-500',
        product_name: 'Signature Silver Leaf Kaju Katli',
        variant_label: '500g Box',
        quantity: 1,
        unit_price: 500,
        total_price: 500,
        item_type: 'PRODUCT',
      },
    ],
  };

  const trackingUrl = buildOrderTrackingUrl(testOrder500.order_number);
  const mergeInfo = buildZeptoMailOrderConfirmationMergeInfo(testOrder500, trackingUrl);
  const renderedHtml = buildDirectOrderConfirmationHtml(testOrder500, trackingUrl, mergeInfo);

  console.log('1. RECONCILIATION SUMMARY FOR ₹500 TEST ORDER:');
  console.log('--------------------------------------------------');
  console.table([
    { Field: 'customer_name', Source: 'order.address_snapshot.recipient_name', Value: mergeInfo.customer_name },
    { Field: 'order_id', Source: 'order.order_number', Value: mergeInfo.order_id },
    { Field: 'order_date', Source: 'order.placed_at (IST)', Value: mergeInfo.order_date },
    { Field: 'order_type', Source: 'order.fulfilment_type', Value: mergeInfo.order_type },
    { Field: 'payment_status', Source: 'Authoritative check (CAPTURED)', Value: mergeInfo.payment_status },
    { Field: 'payment_method', Source: 'order.payment_method', Value: mergeInfo.payment_method },
    { Field: 'delivery_address', Source: 'Takeaway slot & counter', Value: mergeInfo.delivery_address },
    { Field: 'items_subtotal', Source: 'order.subtotal', Value: mergeInfo.items_subtotal },
    { Field: 'delivery_fee', Source: 'order.delivery_charge', Value: mergeInfo.delivery_fee },
    { Field: 'tax_amount', Source: 'order.tax_amount (GST incl.)', Value: mergeInfo.tax_amount },
    { Field: 'total_amount', Source: 'order.total_amount', Value: mergeInfo.total_amount },
    { Field: 'order_tracking_url', Source: 'buildOrderTrackingUrl()', Value: mergeInfo.order_tracking_url },
    { Field: 'product_count', Source: 'order.items.length', Value: `${mergeInfo.items.length} item (${mergeInfo.items[0].product_name})` },
  ]);

  console.log('\n2. PRODUCT ROW RECONCILIATION:');
  console.log('--------------------------------------------------');
  console.table(mergeInfo.items);

  console.log('\n3. VERIFYING HTML RENDER INTEGRITY:');
  console.log('--------------------------------------------------');
  const checks = [
    { desc: 'Contains customer name', ok: renderedHtml.includes(mergeInfo.customer_name) },
    { desc: 'Contains Order Number', ok: renderedHtml.includes(mergeInfo.order_id) },
    { desc: 'Contains Product Name in table', ok: renderedHtml.includes(mergeInfo.items[0].product_name) },
    { desc: 'Contains Product Variant / Pack in table', ok: renderedHtml.includes(mergeInfo.items[0].variant_label) },
    { desc: 'Contains Quantity in table', ok: renderedHtml.includes(String(mergeInfo.items[0].quantity)) },
    { desc: 'Contains Line Total in table', ok: renderedHtml.includes(mergeInfo.items[0].total_price) },
    { desc: 'Contains Items Subtotal', ok: renderedHtml.includes(mergeInfo.items_subtotal) },
    { desc: 'Contains Delivery Fee', ok: renderedHtml.includes(mergeInfo.delivery_fee) },
    { desc: 'Contains Tax Amount', ok: renderedHtml.includes(mergeInfo.tax_amount) },
    { desc: 'Contains Total Amount (₹500)', ok: renderedHtml.includes(mergeInfo.total_amount) },
    { desc: 'Contains Order Type', ok: renderedHtml.includes(mergeInfo.order_type) },
    { desc: 'Contains Authoritative Payment Status', ok: renderedHtml.includes(mergeInfo.payment_status) },
    { desc: 'Contains Fulfilment Details', ok: renderedHtml.includes(mergeInfo.delivery_address) },
    { desc: 'Contains Order Tracking URL button & link', ok: renderedHtml.includes(mergeInfo.order_tracking_url) },
    { desc: 'No unrendered {{placeholders}} remain', ok: !/\{\{[a-zA-Z_]+\}\}/.test(renderedHtml) },
  ];

  let allChecksPassed = true;
  for (const c of checks) {
    if (c.ok) {
      console.log(`  ✓ ${c.desc}`);
    } else {
      console.error(`  ✗ FAILED: ${c.desc}`);
      allChecksPassed = false;
    }
  }

  if (!allChecksPassed) {
    console.error('\nVerification failed!');
    process.exit(1);
  }

  console.log('\n======================================================================');
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (15/15)');
  console.log('======================================================================\n');
}

verifyOrderConfirmationEmail().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
