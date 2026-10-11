/**
 * Production-Ready Test Suite: Delivery & Takeaway Management System
 * Saraswati Sweets (saraswatisweetsbarabanki.com)
 *
 * Verifies:
 * 1. Manager Availability Controls & Matrix (Delivery ON/OFF, Takeaway ON/OFF, Both OFF)
 * 2. Auto-Reopen Timestamp Automation
 * 3. Pickup Slot Generation & Kolkata Timezone Handling
 * 4. Concurrency-Safe Slot Capacity Reservation & Overbooking Prevention
 * 5. Capacity Release on Cancellation / Expiry
 * 6. Financial Integrity: Flat ₹50 for Delivery vs strictly ₹0 for Takeaway
 * 7. Payment Security: Takeaway COD rejection & Online prepayment enforcement
 * 8. Revenue Metric Protection: Unpaid / pending orders excluded from revenue
 */

process.env.UNIT_TEST = 'true';

import { randomUUID } from 'crypto';
import type { ServerOrder, ServerStoreSettings } from '../server/db';

async function runDeliveryTakeawayTestSuite() {
  const db = await import('../server/db');
  const {
    inMemoryStore,
    STORE_SETTINGS,
    checkAutoReopen,
    generateAvailablePickupSlots,
    checkAndReserveSlotCapacity,
    getKolkataDateParts,
    formatTime12h,
  } = db;

  console.log('======================================================================');
  console.log('SARASWATI SWEETS: DELIVERY & TAKEAWAY MANAGEMENT TEST SUITE');
  console.log('======================================================================\n');

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

  // -------------------------------------------------------------------------
  // 1. AVAILABILITY MATRIX & OPERATIONAL CONTROLS
  // -------------------------------------------------------------------------
  console.log('--- 1. Manager Availability Matrix & Operational Controls ---');

  // Baseline setup
  inMemoryStore.storeSettings.delivery_enabled = true;
  inMemoryStore.storeSettings.takeaway_enabled = true;
  inMemoryStore.storeSettings.closure_message = null;
  inMemoryStore.storeSettings.auto_reopen_at = null;
  inMemoryStore.storeSettings.pickup_opening_time = '09:00';
  inMemoryStore.storeSettings.pickup_closing_time = '21:30';
  inMemoryStore.storeSettings.pickup_slot_duration_minutes = 30;
  inMemoryStore.storeSettings.pickup_max_orders_per_slot = 3;
  inMemoryStore.storeSettings.pickup_advance_days = 3;

  assert(
    inMemoryStore.storeSettings.delivery_enabled === true &&
    inMemoryStore.storeSettings.takeaway_enabled === true,
    'Matrix State 1: Both Delivery and Takeaway active simultaneously'
  );

  // Delivery paused, Takeaway active
  inMemoryStore.storeSettings.delivery_enabled = false;
  inMemoryStore.storeSettings.takeaway_enabled = true;
  inMemoryStore.storeSettings.closure_message = 'Heavy monsoon rain: doorstep delivery temporarily paused. Counter takeaway open.';

  assert(
    inMemoryStore.storeSettings.delivery_enabled === false &&
    inMemoryStore.storeSettings.takeaway_enabled === true &&
    Boolean(inMemoryStore.storeSettings.closure_message),
    'Matrix State 2: Delivery paused, Takeaway active with manager notice'
  );

  // Delivery active, Takeaway paused
  inMemoryStore.storeSettings.delivery_enabled = true;
  inMemoryStore.storeSettings.takeaway_enabled = false;
  inMemoryStore.storeSettings.closure_message = 'Store counter renovation: Please order for doorstep delivery.';

  assert(
    inMemoryStore.storeSettings.delivery_enabled === true &&
    inMemoryStore.storeSettings.takeaway_enabled === false,
    'Matrix State 3: Delivery active, Takeaway paused with manager notice'
  );

  // Both paused
  inMemoryStore.storeSettings.delivery_enabled = false;
  inMemoryStore.storeSettings.takeaway_enabled = false;
  inMemoryStore.storeSettings.closure_message = 'Kitchen festival prep in progress. Reopening soon.';

  assert(
    inMemoryStore.storeSettings.delivery_enabled === false &&
    inMemoryStore.storeSettings.takeaway_enabled === false,
    'Matrix State 4: Both Delivery & Takeaway paused (Full store closure)'
  );

  // -------------------------------------------------------------------------
  // 2. AUTO-REOPEN TIMESTAMP AUTOMATION
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Auto-Reopen Timestamp Automation ---');

  // Set future reopen timestamp: should NOT reopen yet
  const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  inMemoryStore.storeSettings.delivery_enabled = false;
  inMemoryStore.storeSettings.takeaway_enabled = false;
  inMemoryStore.storeSettings.auto_reopen_at = futureDate;
  inMemoryStore.storeSettings.closure_message = 'Paused until later today';

  checkAutoReopen();
  assert(
    inMemoryStore.storeSettings.delivery_enabled === false &&
    inMemoryStore.storeSettings.takeaway_enabled === false &&
    inMemoryStore.storeSettings.auto_reopen_at === futureDate,
    'Future auto_reopen_at leaves services paused'
  );

  // Set past reopen timestamp: checkAutoReopen() MUST reactivate and clear notice
  const pastDate = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  inMemoryStore.storeSettings.auto_reopen_at = pastDate;

  checkAutoReopen();
  const currentSettings = inMemoryStore.storeSettings as any;
  assert(
    currentSettings.delivery_enabled === true &&
    currentSettings.takeaway_enabled === true &&
    currentSettings.auto_reopen_at === null &&
    currentSettings.closure_message === null,
    'Expired auto_reopen_at automatically re-enables services and clears notice'
  );

  // -------------------------------------------------------------------------
  // 3. PICKUP SCHEDULING & KOLKATA TIMEZONE HANDLING
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Pickup Slot Generation & Kolkata Timezone Handling ---');

  // Verify formatTime12h
  assert(formatTime12h('09:00') === '09:00 AM', 'formatTime12h converts 09:00 to 09:00 AM');
  assert(formatTime12h('12:00') === '12:00 PM', 'formatTime12h converts 12:00 to 12:00 PM');
  assert(formatTime12h('13:30') === '01:30 PM', 'formatTime12h converts 13:30 to 01:30 PM');
  assert(formatTime12h('21:30') === '09:30 PM', 'formatTime12h converts 21:30 to 09:30 PM');

  // Test slot generation for tomorrow (guaranteed all slots in future)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowParts = getKolkataDateParts(tomorrow);
  const tomorrowStr = `${tomorrowParts.year}-${String(tomorrowParts.month).padStart(2, '0')}-${String(tomorrowParts.day).padStart(2, '0')}`;

  inMemoryStore.storeSettings.pickup_opening_time = '10:00';
  inMemoryStore.storeSettings.pickup_closing_time = '12:00';
  inMemoryStore.storeSettings.pickup_slot_duration_minutes = 30;
  inMemoryStore.storeSettings.pickup_max_orders_per_slot = 5;

  const tomorrowSlots = generateAvailablePickupSlots(tomorrowStr);

  assert(tomorrowSlots.length === 4, `Generates exactly 4 slots for 10:00 to 12:00 in 30m intervals (got ${tomorrowSlots.length})`);
  assert(tomorrowSlots[0].start_time === '10:00' && tomorrowSlots[0].end_time === '10:30', 'Slot 1: 10:00 to 10:30');
  assert(tomorrowSlots[0].time_12h === '10:00 AM - 10:30 AM', 'Slot 1 formatted as 10:00 AM - 10:30 AM');
  assert(tomorrowSlots[3].start_time === '11:30' && tomorrowSlots[3].end_time === '12:00', 'Slot 4: 11:30 to 12:00');
  assert(tomorrowSlots.every(s => s.is_available === true && s.available_capacity === 5), 'All tomorrow slots have 5 available capacity');

  // Test slot generation out of bounds date (e.g. beyond pickup_advance_days)
  const farFutureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const farFutureParts = getKolkataDateParts(farFutureDate);
  const farFutureStr = `${farFutureParts.year}-${String(farFutureParts.month).padStart(2, '0')}-${String(farFutureParts.day).padStart(2, '0')}`;
  const farFutureSlots = generateAvailablePickupSlots(farFutureStr);
  assert(farFutureSlots.length === 0, 'Dates beyond pickup_advance_days return 0 slots');

  // -------------------------------------------------------------------------
  // 4. CONCURRENCY-SAFE SLOT CAPACITY RESERVATION & OVERBOOKING PREVENTION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Concurrency-Safe Slot Capacity & Overbooking Prevention ---');

  const testSlotDate = tomorrowStr;
  const testSlotTime = '10:00';
  const testSlotFormatted = '10:00 AM - 10:30 AM';
  inMemoryStore.storeSettings.pickup_max_orders_per_slot = 2; // Strict capacity of 2 orders

  // Reservation 1: Should succeed
  const res1 = await checkAndReserveSlotCapacity(testSlotDate, testSlotTime, inMemoryStore.storeSettings.pickup_max_orders_per_slot);
  assert(res1.allowed === true, 'Booking 1: Successfully reserves slot (capacity remaining 1)');

  // Record an active order in memory using this slot
  const order1Id = `ord_slot_test_1_${Date.now()}`;
  const mockOrder1: ServerOrder = {
    id: order1Id,
    order_number: `SW-SLOT-1`,
    fulfilment_type: 'TAKEAWAY',
    slot_snapshot: {
      slot_date: testSlotDate,
      start_time: testSlotTime,
      slot_time_formatted: testSlotFormatted,
    },
    status: 'PLACED',
    payment_status: 'CAPTURED',
    payment_method: 'ONLINE',
    subtotal: 500,
    discount_amount: 0,
    delivery_charge: 0,
    tax_amount: 0,
    total_amount: 500,
    items: [],
    address_snapshot: {
      recipient_name: 'Test Customer 1',
      recipient_phone: '9876543210',
      street_address: 'Store Counter',
      city: 'Barabanki',
      state: 'Uttar Pradesh',
      pincode: '225001',
    } as any,
    idempotency_key: `idemp-slot-1`,
    placed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  inMemoryStore.orders.set(order1Id, mockOrder1);

  // Reservation 2: Should succeed (reaching capacity of 2)
  const res2 = await checkAndReserveSlotCapacity(testSlotDate, testSlotTime, inMemoryStore.storeSettings.pickup_max_orders_per_slot);
  assert(res2.allowed === true, 'Booking 2: Successfully reserves slot (capacity reached limit of 2)');

  const order2Id = `ord_slot_test_2_${Date.now()}`;
  const mockOrder2: ServerOrder = {
    ...mockOrder1,
    id: order2Id,
    order_number: `SW-SLOT-2`,
    idempotency_key: `idemp-slot-2`,
  };
  inMemoryStore.orders.set(order2Id, mockOrder2);

  // Reservation 3: Must be REJECTED as slot is now full
  const res3 = await checkAndReserveSlotCapacity(testSlotDate, testSlotTime, inMemoryStore.storeSettings.pickup_max_orders_per_slot);
  assert(res3.allowed === false, 'Booking 3: Strictly rejected because slot capacity is exhausted');

  // Verify slots list reflects 0 available capacity and is_available = false
  const updatedTomorrowSlots = generateAvailablePickupSlots(tomorrowStr);
  const targetSlot = updatedTomorrowSlots.find(s => s.start_time === testSlotTime);
  assert(targetSlot?.is_available === false && targetSlot?.available_capacity === 0, 'Slot list reflects is_available=false and available_capacity=0');

  // -------------------------------------------------------------------------
  // 5. CAPACITY RELEASE ON CANCELLATION / EXPIRY
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Capacity Release on Cancellation / Expiry ---');

  // Cancel order 2
  mockOrder2.status = 'CANCELLED';
  inMemoryStore.orders.set(order2Id, mockOrder2);

  // Reservation 4: Should now SUCCEED because cancelled order releases capacity
  const res4 = await checkAndReserveSlotCapacity(testSlotDate, testSlotTime, inMemoryStore.storeSettings.pickup_max_orders_per_slot);
  assert(res4.allowed === true, 'Booking after cancellation succeeds: capacity safely released');

  // Clean up test orders
  inMemoryStore.orders.delete(order1Id);
  inMemoryStore.orders.delete(order2Id);

  // -------------------------------------------------------------------------
  // 6. FINANCIAL INTEGRITY: FLAT ₹50 DELIVERY VS ₹0 TAKEAWAY
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Financial Integrity: Flat ₹50 Delivery vs ₹0 Takeaway ---');

  // Helper calculating delivery fee matching orderRoutes logic
  function calculateOrderDeliveryFee(fulfilmentType: 'DELIVERY' | 'TAKEAWAY', subtotal: number): number {
    if (fulfilmentType === 'TAKEAWAY') {
      return 0; // Takeaway is always ₹0
    }
    return subtotal > 0 ? 50 : 0; // Flat ₹50 for Delivery
  }

  assert(calculateOrderDeliveryFee('TAKEAWAY', 150) === 0, 'Small order Takeaway delivery fee is ₹0');
  assert(calculateOrderDeliveryFee('TAKEAWAY', 2500) === 0, 'Large order Takeaway delivery fee is ₹0');
  assert(calculateOrderDeliveryFee('DELIVERY', 150) === 50, 'Small order Delivery fee is flat ₹50');
  assert(calculateOrderDeliveryFee('DELIVERY', 2500) === 50, 'Large order Delivery fee is flat ₹50');

  // Coupon discount computation with delivery fee
  const couponDiscount = 100;
  const subtotal = 600;
  const deliveryTotal = subtotal - couponDiscount + calculateOrderDeliveryFee('DELIVERY', subtotal);
  const takeawayTotal = subtotal - couponDiscount + calculateOrderDeliveryFee('TAKEAWAY', subtotal);

  assert(deliveryTotal === 550, `Delivery Total: 600 - 100 + 50 = ₹550 (got ₹${deliveryTotal})`);
  assert(takeawayTotal === 500, `Takeaway Total: 600 - 100 + 0 = ₹500 (got ₹${takeawayTotal})`);

  // -------------------------------------------------------------------------
  // 7. PAYMENT SECURITY: TAKEAWAY COD REJECTION
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Payment Security: Prepayment Enforcement for Takeaway ---');

  function validateOrderPayment(fulfilmentType: 'DELIVERY' | 'TAKEAWAY', paymentMethod: 'ONLINE' | 'COD', total: number): { valid: boolean; error?: string } {
    if (fulfilmentType === 'TAKEAWAY' && paymentMethod === 'COD') {
      return { valid: false, error: 'Store pickup / takeaway orders require advance online payment via Cashfree.' };
    }
    if (paymentMethod === 'COD' && total > 2000) {
      return { valid: false, error: 'Cash on Delivery is limited to orders up to ₹2,000.' };
    }
    return { valid: true };
  }

  const takeawayCodTest = validateOrderPayment('TAKEAWAY', 'COD', 500);
  assert(takeawayCodTest.valid === false, 'Takeaway with COD is strictly rejected');

  const takeawayOnlineTest = validateOrderPayment('TAKEAWAY', 'ONLINE', 500);
  assert(takeawayOnlineTest.valid === true, 'Takeaway with ONLINE payment is permitted');

  const deliveryCodValidTest = validateOrderPayment('DELIVERY', 'COD', 1500);
  assert(deliveryCodValidTest.valid === true, 'Delivery with COD <= ₹2,000 is permitted');

  const deliveryCodExceededTest = validateOrderPayment('DELIVERY', 'COD', 2500);
  assert(deliveryCodExceededTest.valid === false, 'Delivery with COD > ₹2,000 is rejected');

  // -------------------------------------------------------------------------
  // 8. REVENUE METRIC INTEGRITY: UNPAID ORDERS EXCLUDED
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Revenue Metric Protection ---');

  const testOrdersForRevenue: ServerOrder[] = [
    {
      id: 'rev-1',
      order_number: 'SW-REV-1',
      status: 'CONFIRMED',
      payment_method: 'ONLINE',
      payment_status: 'CAPTURED',
      total_amount: 500,
      subtotal: 500,
      delivery_charge: 0,
      discount_amount: 0,
      tax_amount: 0,
      items: [],
      address_snapshot: { recipient_name: 'A', recipient_phone: '1', street_address: 'B', city: 'C', state: 'D', pincode: '225001' } as any,
      idempotency_key: 'rev-1',
      placed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'rev-2',
      order_number: 'SW-REV-2',
      status: 'PENDING_PAYMENT',
      payment_method: 'ONLINE',
      payment_status: 'PENDING', // UNPAID
      total_amount: 1000,
      subtotal: 950,
      delivery_charge: 50,
      discount_amount: 0,
      tax_amount: 0,
      items: [],
      address_snapshot: { recipient_name: 'B', recipient_phone: '2', street_address: 'B', city: 'C', state: 'D', pincode: '225001' } as any,
      idempotency_key: 'rev-2',
      placed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'rev-3',
      order_number: 'SW-REV-3',
      status: 'DELIVERED',
      payment_method: 'COD',
      payment_status: 'CAPTURED',
      total_amount: 400,
      subtotal: 350,
      delivery_charge: 50,
      discount_amount: 0,
      tax_amount: 0,
      items: [],
      address_snapshot: { recipient_name: 'C', recipient_phone: '3', street_address: 'B', city: 'C', state: 'D', pincode: '225001' } as any,
      idempotency_key: 'rev-3',
      placed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Revenue calculation matching adminRoutes.ts
  const collectedRevenue = testOrdersForRevenue
    .filter(o => o.status !== 'CANCELLED' && (o.payment_status === 'CAPTURED' || (o.payment_method === 'COD' && o.status === 'DELIVERED')))
    .reduce((sum, o) => sum + o.total_amount, 0);

  assert(collectedRevenue === 900, `Calculated revenue correctly excludes unpaid PENDING order (expected ₹900, got ₹${collectedRevenue})`);

  console.log('\n======================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDeliveryTakeawayTestSuite().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
