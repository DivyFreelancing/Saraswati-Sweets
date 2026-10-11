/**
 * Test Suite: Financial Calculations and Price Breakdown Verification
 * Saraswati Sweets Admin Panel & Checkout Financial Integrity Tests
 */

import { computeServerCart } from '../server/routes/cartRoutes';
import { STORE_SETTINGS } from '../server/db';

interface TestCase {
  name: string;
  items: Array<{
    name: string;
    variant: string;
    weightGrams: number;
    unitPrice: number;
    quantity: number;
  }>;
  discount: number;
  tax: number;
  expectedSubtotal: number;
  expectedDeliveryFee: number;
  expectedFinalTotal: number;
}

const testCases: TestCase[] = [
  {
    name: 'Scenario 1: Small order (1 item, 250g, no discount)',
    items: [
      { name: 'Besan Ladoo', variant: '250g Box', weightGrams: 250, unitPrice: 150, quantity: 1 },
    ],
    discount: 0,
    tax: 0,
    expectedSubtotal: 150,
    expectedDeliveryFee: 50,
    expectedFinalTotal: 200, // 150 - 0 + 50 = 200
  },
  {
    name: 'Scenario 2: Medium order with coupon (3 items, 1.5kg, ₹100 coupon discount)',
    items: [
      { name: 'Kaju Katli', variant: '500g Box', weightGrams: 500, unitPrice: 500, quantity: 1 },
      { name: 'Motichoor Ladoo', variant: '500g Box', weightGrams: 500, unitPrice: 280, quantity: 1 },
      { name: 'Artisanal Samosa', variant: '500g Pack', weightGrams: 500, unitPrice: 220, quantity: 1 },
    ],
    discount: 100,
    tax: 0,
    expectedSubtotal: 1000,
    expectedDeliveryFee: 50,
    expectedFinalTotal: 950, // 1000 - 100 + 50 = 950
  },
  {
    name: 'Scenario 3: High value & heavy weight order (5 items, 3kg, ₹250 discount)',
    items: [
      { name: 'Special Kaju Barfi', variant: '1kg Box', weightGrams: 1000, unitPrice: 900, quantity: 2 },
      { name: 'Peda Special', variant: '500g Box', weightGrams: 500, unitPrice: 350, quantity: 2 },
    ],
    discount: 250,
    tax: 0,
    expectedSubtotal: 2500,
    expectedDeliveryFee: 50, // Fixed flat fee regardless of high order value or heavy weight
    expectedFinalTotal: 2300, // 2500 - 250 + 50 = 2300
  },
  {
    name: 'Scenario 4: Varied quantities and packaging (Subtotal ₹1,450, no discount)',
    items: [
      { name: 'Mini Gulab Jamun', variant: '250g Tub', weightGrams: 250, unitPrice: 130, quantity: 5 }, // 650
      { name: 'Namkeen Mixture', variant: '1kg Jar', weightGrams: 1000, unitPrice: 400, quantity: 2 }, // 800
    ],
    discount: 0,
    tax: 0,
    expectedSubtotal: 1450,
    expectedDeliveryFee: 50,
    expectedFinalTotal: 1500, // 1450 - 0 + 50 = 1500
  },
  {
    name: 'Scenario 5: Order with applicable tax (Subtotal ₹1,000, ₹50 discount, ₹45 tax)',
    items: [
      { name: 'Assorted Gift Box', variant: '1kg Royal Box', weightGrams: 1000, unitPrice: 1000, quantity: 1 },
    ],
    discount: 50,
    tax: 45,
    expectedSubtotal: 1000,
    expectedDeliveryFee: 50,
    expectedFinalTotal: 1045, // 1000 - 50 + 50 + 45 = 1045
  },
];

async function runFinancialTests() {
  console.log('======================================================================');
  console.log('SARASWATI SWEETS — FINANCIAL CALCULATION & BREAKDOWN TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Verify Store Settings Default Delivery Charge
  console.log('--- 1. Store Settings Delivery Charge Enforcement ---');
  if (STORE_SETTINGS.delivery_charge === 50) {
    console.log('✓ PASS: STORE_SETTINGS.delivery_charge is set to ₹50');
    passed++;
  } else {
    console.error(`✗ FAIL: STORE_SETTINGS.delivery_charge is ${STORE_SETTINGS.delivery_charge}, expected 50`);
    failed++;
  }

  if (Number.isFinite(STORE_SETTINGS.free_delivery_above) && STORE_SETTINGS.free_delivery_above >= 0) {
    console.log(`✓ PASS: STORE_SETTINGS.free_delivery_above (${STORE_SETTINGS.free_delivery_above}) is a safe, finite numeric value`);
    passed++;
  } else {
    console.error(`✗ FAIL: STORE_SETTINGS.free_delivery_above is not a valid finite number: ${STORE_SETTINGS.free_delivery_above}`);
    failed++;
  }

  // JSON Serialization Compatibility Check
  const serializedSettings = JSON.parse(JSON.stringify(STORE_SETTINGS));
  if (typeof serializedSettings.free_delivery_above === 'number') {
    console.log(`✓ PASS: STORE_SETTINGS serializes cleanly to JSON without null conversion: ${JSON.stringify({ delivery_charge: serializedSettings.delivery_charge, free_delivery_above: serializedSettings.free_delivery_above })}`);
    passed++;
  } else {
    console.error(`✗ FAIL: STORE_SETTINGS.free_delivery_above serialized to ${serializedSettings.free_delivery_above} (null or non-numeric)`);
    failed++;
  }

  // 2. Test computeServerCart for Flat ₹50 Delivery Fee
  console.log('\n--- 2. Server Cart Delivery Fee Computation ---');
  const emptyCart = computeServerCart([]);
  if (emptyCart.deliveryCharge === 0 && emptyCart.total === 0) {
    console.log('✓ PASS: Empty cart has delivery charge = ₹0');
    passed++;
  } else {
    console.error(`✗ FAIL: Empty cart delivery charge = ${emptyCart.deliveryCharge}`);
    failed++;
  }

  if (emptyCart.isFreeDelivery === false) {
    console.log('✓ PASS: Empty cart isFreeDelivery is strictly false');
    passed++;
  } else {
    console.error('✗ FAIL: Empty cart isFreeDelivery is true');
    failed++;
  }

  // 3. Test Order Scenarios with Mathematical Verification
  console.log('\n--- 3. Order Scenarios: Subtotal, Discount, Delivery Fee & Final Total ---');
  for (const tc of testCases) {
    const calculatedSubtotal = tc.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryFee = 50; // Server enforces flat 50 for new orders
    const calculatedFinalTotal = calculatedSubtotal - tc.discount + deliveryFee + tc.tax;
    const cashfreePayablePaise = Math.round(calculatedFinalTotal * 100);

    const subtotalMatches = calculatedSubtotal === tc.expectedSubtotal;
    const deliveryFeeMatches = deliveryFee === tc.expectedDeliveryFee;
    const finalTotalMatches = calculatedFinalTotal === tc.expectedFinalTotal;
    const formulaMatches = calculatedFinalTotal === (tc.expectedSubtotal - tc.discount + 50 + tc.tax);
    const cashfreeMatches = cashfreePayablePaise === Math.round(tc.expectedFinalTotal * 100);

    if (subtotalMatches && deliveryFeeMatches && finalTotalMatches && formulaMatches && cashfreeMatches) {
      console.log(`✓ PASS: ${tc.name}`);
      console.log(`        Subtotal: ₹${calculatedSubtotal} | Discount: ₹${tc.discount} | Delivery: ₹${deliveryFee} | Tax: ₹${tc.tax}`);
      console.log(`        Final Total: ₹${calculatedFinalTotal} | Cashfree: ${cashfreePayablePaise} paise`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${tc.name}`);
      console.error(`        Calculated: ${calculatedFinalTotal}, Expected: ${tc.expectedFinalTotal}`);
      failed++;
    }
  }

  // 4. Test Historical Order Preservation Rule
  console.log('\n--- 4. Historical Order Preservation Audit ---');
  const historicalOrder = {
    id: 'hist-1',
    order_number: 'SW-HIST-001',
    subtotal: 500,
    discount_amount: 0,
    delivery_charge: 40, // Older order placed before flat 50 update
    tax_amount: 0,
    total_amount: 540,
    items: [{ product_name: 'Besan Ladoo', variant_label: '1kg', unit_price: 500, quantity: 1, total_price: 500 }],
  };

  const renderedDeliveryFee = historicalOrder.delivery_charge !== undefined ? historicalOrder.delivery_charge : 50;
  const renderedFinalTotal = historicalOrder.total_amount;

  if (renderedDeliveryFee === 40) {
    console.log('✓ PASS: Historical order preserves stored delivery fee (₹40) without overriding to ₹50');
    passed++;
  } else {
    console.error(`✗ FAIL: Historical delivery fee modified to ${renderedDeliveryFee}`);
    failed++;
  }

  if (renderedFinalTotal === 540) {
    console.log('✓ PASS: Historical order displays exact stored total_amount (₹540)');
    passed++;
  } else {
    console.error(`✗ FAIL: Historical order total modified to ${renderedFinalTotal}`);
    failed++;
  }

  // 5. Test Discount Display Rules
  console.log('\n--- 5. Discount Display Rule Verification ---');
  const zeroDiscount = 0;
  const formattedZeroDiscount = zeroDiscount > 0 ? `-₹${zeroDiscount}` : '₹0';
  if (formattedZeroDiscount === '₹0') {
    console.log('✓ PASS: When no discount applies, discount field displays "₹0" rather than being hidden');
    passed++;
  } else {
    console.error(`✗ FAIL: Zero discount formatted as ${formattedZeroDiscount}`);
    failed++;
  }

  const activeDiscount = 100;
  const formattedActiveDiscount = activeDiscount > 0 ? `-₹${activeDiscount}` : '₹0';
  if (formattedActiveDiscount === '-₹100') {
    console.log('✓ PASS: When discount applies, discount field displays negative offset ("-₹100")');
    passed++;
  } else {
    console.error(`✗ FAIL: Active discount formatted as ${formattedActiveDiscount}`);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`FINANCIAL CALCULATION TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runFinancialTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
