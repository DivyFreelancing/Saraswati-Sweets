/**
 * Saraswati Sweets - Authoritative Reports & Analytics Service
 * Provides centralized financial, best-seller, payment, and refund calculations.
 * All date arithmetic is strictly evaluated in Indian Standard Time (IST, UTC+05:30).
 */

import { inMemoryStore, ServerOrder, ServerPayment, ServerRefund } from '../db';

export type ReportDateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

export type ReportGroupBy = 'day' | 'week' | 'month';

export interface DateRangeBoundary {
  preset: ReportDateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startIso: string; // ISO 8601 with +05:30 offset
  endIso: string; // ISO 8601 with +05:30 offset
  label: string;
}

export interface SalesSummaryMetrics {
  totalOrdersPlaced: number;
  eligibleOrdersCount: number;
  grossSales: number;
  totalDiscounts: number;
  totalDeliveryCharges: number;
  totalTax: number;
  totalRefunds: number;
  netSales: number;
  avgOrderValue: number;
  cancelledOrdersCount: number;
  cancelledOrdersAmount: number;
  codOrdersCount: number;
  codCollectedAmount: number;
  onlineOrdersCount: number;
  onlineCollectedAmount: number;
}

export interface SalesTimelineBucket {
  key: string; // YYYY-MM-DD or week/month label
  label: string;
  orderCount: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
}

export interface BestSellingProductItem {
  rank: number;
  productId: string;
  productName: string;
  categoryName: string;
  unitsSold: number;
  totalRevenue: number;
  orderCount: number;
  topVariant: string;
  variantsBreakdown: Array<{
    variantLabel: string;
    units: number;
    revenue: number;
  }>;
}

export interface PaymentAnalyticsSummary {
  totalAttempts: number;
  uniqueOrdersAttempted: number;
  uniqueOrdersPaid: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  refundedCount: number;
  successRatePercent: number;
  failureRatePercent: number;
  breakdownByMethod: {
    online: {
      attempts: number;
      successful: number;
      failed: number;
      totalAmount: number;
    };
    cod: {
      attempts: number;
      successful: number;
      failed: number;
      totalAmount: number;
    };
  };
  recentTransactions: Array<{
    id: string;
    orderId: string;
    orderNumber: string;
    providerPaymentId?: string;
    amount: number;
    status: string;
    method: string;
    createdAt: string;
    failureReason?: string;
  }>;
}

export interface CancellationAndRefundSummary {
  cancellations: {
    totalCancelledCount: number;
    totalCancelledAmount: number;
    reasonsBreakdown: Array<{
      reason: string;
      count: number;
      totalAmount: number;
    }>;
  };
  refunds: {
    successfulCount: number;
    successfulAmount: number;
    pendingCount: number;
    pendingAmount: number;
    failedCount: number;
    failedAmount: number;
    totalRefundAmount: number;
  };
  records: Array<{
    orderId: string;
    orderNumber: string;
    orderDate: string;
    orderTotal: number;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    cancelReason?: string;
    cancelledAt?: string;
    refundId?: string;
    cfRefundId?: string;
    refundStatus?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'NONE';
    refundAmount: number;
    refundArn?: string;
    refundProcessedAt?: string;
  }>;
}

export interface ReportsAnalyticsPayload {
  range: DateRangeBoundary;
  groupBy: ReportGroupBy;
  salesSummary: SalesSummaryMetrics;
  timeline: SalesTimelineBucket[];
  bestSellingProducts: BestSellingProductItem[];
  paymentAnalytics: PaymentAnalyticsSummary;
  cancellationsAndRefunds: CancellationAndRefundSummary;
  generatedAt: string;
  generatedAtIST: string;
}

/**
 * Format any Date into YYYY-MM-DD string in Asia/Kolkata (IST).
 */
export function formatToIstDateString(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  }
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
}

/**
 * Resolve standard date-range boundaries in IST.
 */
export function resolveDateRangeBoundaries(
  preset: ReportDateRangePreset = 'last7days',
  customStart?: string,
  customEnd?: string
): DateRangeBoundary {
  const now = new Date();
  const todayStr = formatToIstDateString(now);

  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
  // Reference date at noon IST to avoid DST/shift issues
  const refDate = new Date(Date.UTC(tYear, tMonth - 1, tDay, 6, 30, 0));

  let startStr = todayStr;
  let endStr = todayStr;
  let label = 'Today';

  switch (preset) {
    case 'today':
      startStr = todayStr;
      endStr = todayStr;
      label = `Today (${todayStr})`;
      break;

    case 'yesterday': {
      const yDate = new Date(refDate);
      yDate.setUTCDate(yDate.getUTCDate() - 1);
      const yStr = formatToIstDateString(yDate);
      startStr = yStr;
      endStr = yStr;
      label = `Yesterday (${yStr})`;
      break;
    }

    case 'last7days': {
      const past7 = new Date(refDate);
      past7.setUTCDate(past7.getUTCDate() - 6);
      startStr = formatToIstDateString(past7);
      endStr = todayStr;
      label = `Last 7 Days (${startStr} to ${endStr})`;
      break;
    }

    case 'last30days': {
      const past30 = new Date(refDate);
      past30.setUTCDate(past30.getUTCDate() - 29);
      startStr = formatToIstDateString(past30);
      endStr = todayStr;
      label = `Last 30 Days (${startStr} to ${endStr})`;
      break;
    }

    case 'thisMonth': {
      startStr = `${tYear}-${String(tMonth).padStart(2, '0')}-01`;
      endStr = todayStr;
      label = `This Month (${startStr} to ${endStr})`;
      break;
    }

    case 'lastMonth': {
      const prevMonth = tMonth === 1 ? 12 : tMonth - 1;
      const prevYear = tMonth === 1 ? tYear - 1 : tYear;
      const daysInPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
      startStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      endStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(daysInPrevMonth).padStart(2, '0')}`;
      label = `Last Month (${startStr} to ${endStr})`;
      break;
    }

    case 'custom': {
      const validDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      let s = customStart && validDateRegex.test(customStart) ? customStart : todayStr;
      let e = customEnd && validDateRegex.test(customEnd) ? customEnd : todayStr;
      if (s > e) {
        // Swap if user provided inverted range
        const temp = s;
        s = e;
        e = temp;
      }
      startStr = s;
      endStr = e;
      label = `Custom Range (${startStr} to ${endStr})`;
      break;
    }

    default:
      startStr = todayStr;
      endStr = todayStr;
      label = `Today (${todayStr})`;
      break;
  }

  // Create exact IST timestamps
  const startIso = `${startStr}T00:00:00.000+05:30`;
  const endIso = `${endStr}T23:59:59.999+05:30`;

  return {
    preset,
    startDate: startStr,
    endDate: endStr,
    startIso,
    endIso,
    label,
  };
}

/**
 * Filter an order's created_at or placed_at within the IST date boundary.
 */
function isOrderWithinRange(order: ServerOrder, startTimeMs: number, endTimeMs: number): boolean {
  const ts = new Date(order.placed_at || order.created_at).getTime();
  if (isNaN(ts)) return false;
  return ts >= startTimeMs && ts <= endTimeMs;
}

/**
 * Check if order is eligible for sales revenue calculation.
 * Excludes cancelled, payment-failed, and unpaid orders.
 */
export function isOrderEligibleSale(order: ServerOrder): boolean {
  if (order.status === 'CANCELLED' || order.status === 'PAYMENT_FAILED' || order.status === 'PENDING_PAYMENT') {
    return false;
  }
  // Online orders must have CAPTURED payment
  if (order.payment_method === 'ONLINE') {
    return order.payment_status === 'CAPTURED' || order.payment_status === 'REFUNDED';
  }
  // COD orders in valid order progression
  return true;
}

/**
 * Calculate full Reports & Analytics Payload for a given range & groupBy.
 */
export function generateReportsAnalytics(
  preset: ReportDateRangePreset = 'last7days',
  customStart?: string,
  customEnd?: string,
  groupBy: ReportGroupBy = 'day'
): ReportsAnalyticsPayload {
  const now = new Date();
  const todayStr = formatToIstDateString(now);
  const range = resolveDateRangeBoundaries(preset, customStart, customEnd);
  const startTimeMs = new Date(range.startIso).getTime();
  const endTimeMs = new Date(range.endIso).getTime();

  const allOrders = Array.from(inMemoryStore.orders.values());
  const allPayments = Array.from(inMemoryStore.payments.values());
  const allRefunds = Array.from(inMemoryStore.refunds.values());
  const allCategories = inMemoryStore.categories;

  // Filter orders within range
  const rangeOrders = allOrders.filter((o) => isOrderWithinRange(o, startTimeMs, endTimeMs));

  // 1. SALES SUMMARY
  let totalOrdersPlaced = 0;
  let eligibleOrdersCount = 0;
  let grossSales = 0;
  let totalDiscounts = 0;
  let totalDeliveryCharges = 0;
  let totalTax = 0;
  let codOrdersCount = 0;
  let codCollectedAmount = 0;
  let onlineOrdersCount = 0;
  let onlineCollectedAmount = 0;
  let cancelledOrdersCount = 0;
  let cancelledOrdersAmount = 0;

  // Track map of order refunds to avoid double-counting
  const orderRefundMap = new Map<string, number>();
  allRefunds.forEach((r) => {
    if (r.refund_status === 'SUCCESS') {
      orderRefundMap.set(r.order_id, (orderRefundMap.get(r.order_id) || 0) + Number(r.refund_amount || 0));
    }
  });

  const eligibleOrders: ServerOrder[] = [];

  rangeOrders.forEach((o) => {
    totalOrdersPlaced++;

    if (o.status === 'CANCELLED') {
      cancelledOrdersCount++;
      cancelledOrdersAmount += Number(o.total_amount || 0);
      return;
    }

    if (isOrderEligibleSale(o)) {
      eligibleOrders.push(o);
      eligibleOrdersCount++;

      const subtotal = Number(o.subtotal || 0);
      const delivery = Number(o.delivery_charge || 0);
      const tax = Number(o.tax_amount || 0);
      const discount = Number(o.discount_amount || 0);

      grossSales += subtotal + delivery + tax;
      totalDiscounts += discount;
      totalDeliveryCharges += delivery;
      totalTax += tax;

      if (o.payment_method === 'COD') {
        codOrdersCount++;
        codCollectedAmount += Number(o.total_amount || 0);
      } else {
        onlineOrdersCount++;
        onlineCollectedAmount += Number(o.total_amount || 0);
      }
    }
  });

  // Calculate total refunds for eligible orders in range, plus any refunds processed in this date range
  let totalRefunds = 0;
  const verifiedRefundsInRange = allRefunds.filter((r) => {
    const rTime = new Date(r.processed_at || r.created_at).getTime();
    return r.refund_status === 'SUCCESS' && rTime >= startTimeMs && rTime <= endTimeMs;
  });

  if (verifiedRefundsInRange.length > 0) {
    totalRefunds = verifiedRefundsInRange.reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);
  } else {
    // Fallback: sum refunds on eligible orders that were marked refunded
    eligibleOrders.forEach((o) => {
      if (o.payment_status === 'REFUNDED' || o.status === 'REFUNDED') {
        const orderRefundAmt = orderRefundMap.get(o.id) || Number(o.total_amount || 0);
        totalRefunds += orderRefundAmt;
      }
    });
  }

  const netSales = Math.max(0, grossSales - totalDiscounts - totalRefunds);
  const avgOrderValue = eligibleOrdersCount > 0 ? Math.round(netSales / eligibleOrdersCount) : 0;

  const salesSummary: SalesSummaryMetrics = {
    totalOrdersPlaced,
    eligibleOrdersCount,
    grossSales,
    totalDiscounts,
    totalDeliveryCharges,
    totalTax,
    totalRefunds,
    netSales,
    avgOrderValue,
    cancelledOrdersCount,
    cancelledOrdersAmount,
    codOrdersCount,
    codCollectedAmount,
    onlineOrdersCount,
    onlineCollectedAmount,
  };

  // 2. TIMELINE BUCKETING
  const timelineMap = new Map<
    string,
    {
      key: string;
      label: string;
      orderCount: number;
      grossSales: number;
      discounts: number;
      refunds: number;
      netSales: number;
    }
  >();

  // Initialize timeline slots
  if (groupBy === 'day') {
    // Populate all days from startDate to endDate
    const cur = new Date(range.startIso);
    const end = new Date(range.endIso);
    while (cur <= end) {
      const dStr = formatToIstDateString(cur);
      const dObj = new Date(`${dStr}T12:00:00.000+05:30`);
      const dLabel = dObj.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      timelineMap.set(dStr, {
        key: dStr,
        label: dLabel,
        orderCount: 0,
        grossSales: 0,
        discounts: 0,
        refunds: 0,
        netSales: 0,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  eligibleOrders.forEach((o) => {
    const oDateStr = formatToIstDateString(o.placed_at || o.created_at);
    let bucketKey = oDateStr;
    let bucketLabel = oDateStr;

    if (groupBy === 'day') {
      bucketKey = oDateStr;
    } else if (groupBy === 'week') {
      const d = new Date(`${oDateStr}T12:00:00.000+05:30`);
      const day = d.getUTCDay();
      const diffToMonday = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setUTCDate(diffToMonday);
      bucketKey = `Week of ${formatToIstDateString(monday)}`;
      bucketLabel = bucketKey;
    } else if (groupBy === 'month') {
      bucketKey = oDateStr.slice(0, 7); // YYYY-MM
      const [y, m] = bucketKey.split('-');
      const mDate = new Date(Number(y), Number(m) - 1, 1);
      bucketLabel = mDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    }

    if (!timelineMap.has(bucketKey)) {
      timelineMap.set(bucketKey, {
        key: bucketKey,
        label: bucketLabel,
        orderCount: 0,
        grossSales: 0,
        discounts: 0,
        refunds: 0,
        netSales: 0,
      });
    }

    const bucket = timelineMap.get(bucketKey)!;
    bucket.orderCount++;
    const oGross = Number(o.subtotal || 0) + Number(o.delivery_charge || 0) + Number(o.tax_amount || 0);
    const oDiscount = Number(o.discount_amount || 0);
    bucket.grossSales += oGross;
    bucket.discounts += oDiscount;
    bucket.netSales += Math.max(0, oGross - oDiscount);
  });

  // Subtract verified refunds into buckets
  verifiedRefundsInRange.forEach((r) => {
    const rDateStr = formatToIstDateString(r.processed_at || r.created_at);
    const bucket = timelineMap.get(rDateStr);
    if (bucket) {
      bucket.refunds += Number(r.refund_amount || 0);
      bucket.netSales = Math.max(0, bucket.netSales - Number(r.refund_amount || 0));
    }
  });

  const timeline = Array.from(timelineMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  // 3. BEST-SELLING PRODUCTS
  const productAggMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      categoryId: string;
      unitsSold: number;
      totalRevenue: number;
      orderCount: number;
      variantsMap: Map<string, { units: number; revenue: number }>;
    }
  >();

  eligibleOrders.forEach((o) => {
    // If order was fully refunded, we exclude its items from bestselling product rankings
    if (o.status === 'REFUNDED' || o.payment_status === 'REFUNDED') {
      return;
    }

    const items = o.items || [];
    items.forEach((it) => {
      // Safe fallback for deleted products or variants
      const prodKey = it.product_id || it.product_name || 'unknown-product';
      const prodName = it.product_name || 'Artisanal Sweet';
      const variantLabel = it.variant_label || 'Standard';
      const qty = Number(it.quantity || 1);
      const lineTotal = Number(it.total_price || it.unit_price * qty || 0);

      if (!productAggMap.has(prodKey)) {
        // Look up product in catalog to find category
        const catalogProd = inMemoryStore.products.get(prodKey);
        productAggMap.set(prodKey, {
          productId: prodKey,
          productName: prodName,
          categoryId: catalogProd?.category_id || '',
          unitsSold: 0,
          totalRevenue: 0,
          orderCount: 0,
          variantsMap: new Map(),
        });
      }

      const agg = productAggMap.get(prodKey)!;
      agg.unitsSold += qty;
      agg.totalRevenue += lineTotal;
      agg.orderCount++;

      if (!agg.variantsMap.has(variantLabel)) {
        agg.variantsMap.set(variantLabel, { units: 0, revenue: 0 });
      }
      const vAgg = agg.variantsMap.get(variantLabel)!;
      vAgg.units += qty;
      vAgg.revenue += lineTotal;
    });
  });

  // Sort by revenue descending, rank
  const bestSellingProducts: BestSellingProductItem[] = Array.from(productAggMap.values())
    .map((p) => {
      const cat = allCategories.get(p.categoryId);
      const categoryName = cat?.name || 'Mithai';

      let topVariant = 'Standard';
      let maxVariantUnits = -1;
      const variantsBreakdown: Array<{ variantLabel: string; units: number; revenue: number }> = [];

      p.variantsMap.forEach((vData, vLabel) => {
        variantsBreakdown.push({
          variantLabel: vLabel,
          units: vData.units,
          revenue: vData.revenue,
        });
        if (vData.units > maxVariantUnits) {
          maxVariantUnits = vData.units;
          topVariant = vLabel;
        }
      });

      return {
        rank: 0, // Assigned after sorting
        productId: p.productId,
        productName: p.productName,
        categoryName,
        unitsSold: p.unitsSold,
        totalRevenue: p.totalRevenue,
        orderCount: p.orderCount,
        topVariant,
        variantsBreakdown: variantsBreakdown.sort((a, b) => b.units - a.units),
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // 4. PAYMENT SUCCESS & FAILURE REPORTS
  // Deduplicate payment attempts by provider_payment_id or id to prevent webhook duplicate counting
  const deduplicatedPaymentsMap = new Map<string, ServerPayment>();
  allPayments.forEach((p) => {
    const key = p.provider_payment_id || p.id;
    const pTime = new Date(p.created_at).getTime();
    if (pTime >= startTimeMs && pTime <= endTimeMs) {
      // If we see duplicate, prefer CAPTURED/REFUNDED over INITIATED/FAILED
      if (!deduplicatedPaymentsMap.has(key)) {
        deduplicatedPaymentsMap.set(key, p);
      } else {
        const existing = deduplicatedPaymentsMap.get(key)!;
        if (p.status === 'CAPTURED' || p.status === 'REFUNDED') {
          deduplicatedPaymentsMap.set(key, p);
        } else if (existing.status !== 'CAPTURED' && existing.status !== 'REFUNDED') {
          deduplicatedPaymentsMap.set(key, p);
        }
      }
    }
  });

  // Also include COD payment attempts derived from COD orders in range
  rangeOrders.forEach((o) => {
    if (o.payment_method === 'COD') {
      const codKey = `cod-pay-${o.id}`;
      if (!deduplicatedPaymentsMap.has(codKey)) {
        deduplicatedPaymentsMap.set(codKey, {
          id: codKey,
          order_id: o.id,
          order_number: o.order_number,
          provider_order_id: o.order_number,
          provider_payment_id: `COD-${o.order_number}`,
          amount: Number(o.total_amount || 0),
          currency: 'INR',
          status: o.status === 'CANCELLED' ? 'FAILED' : 'CAPTURED',
          method: 'COD',
          created_at: o.created_at || o.placed_at,
          updated_at: o.updated_at || o.created_at,
        });
      }
    }
  });

  const rangePayments = Array.from(deduplicatedPaymentsMap.values());
  const totalAttempts = rangePayments.length;

  const uniqueOrdersAttemptedSet = new Set<string>();
  const uniqueOrdersPaidSet = new Set<string>();

  let successfulCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let refundedCount = 0;

  const onlineBreakdown = { attempts: 0, successful: 0, failed: 0, totalAmount: 0 };
  const codBreakdown = { attempts: 0, successful: 0, failed: 0, totalAmount: 0 };

  rangePayments.forEach((p) => {
    if (p.order_id) {
      uniqueOrdersAttemptedSet.add(p.order_id);
    }

    const isCod = (p.method || '').toUpperCase() === 'COD';
    const targetBreakdown = isCod ? codBreakdown : onlineBreakdown;
    targetBreakdown.attempts++;
    targetBreakdown.totalAmount += Number(p.amount || 0);

    if (p.status === 'CAPTURED') {
      successfulCount++;
      targetBreakdown.successful++;
      if (p.order_id) uniqueOrdersPaidSet.add(p.order_id);
    } else if (p.status === 'FAILED') {
      failedCount++;
      targetBreakdown.failed++;
    } else if (p.status === 'REFUNDED') {
      refundedCount++;
      // A refunded payment was initially successful
      targetBreakdown.successful++;
    } else {
      pendingCount++;
    }
  });

  const successRatePercent = totalAttempts > 0 ? Number(((successfulCount + refundedCount) / totalAttempts * 100).toFixed(1)) : 0;
  const failureRatePercent = totalAttempts > 0 ? Number((failedCount / totalAttempts * 100).toFixed(1)) : 0;

  const recentTransactions = rangePayments
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50)
    .map((p) => ({
      id: p.id,
      orderId: p.order_id,
      orderNumber: p.order_number || '',
      providerPaymentId: p.provider_payment_id,
      amount: Number(p.amount || 0),
      status: p.status,
      method: p.method || 'ONLINE',
      createdAt: p.created_at,
      failureReason: p.error_description || p.error_code,
    }));

  const paymentAnalytics: PaymentAnalyticsSummary = {
    totalAttempts,
    uniqueOrdersAttempted: uniqueOrdersAttemptedSet.size,
    uniqueOrdersPaid: uniqueOrdersPaidSet.size,
    successfulCount,
    failedCount,
    pendingCount,
    refundedCount,
    successRatePercent,
    failureRatePercent,
    breakdownByMethod: {
      online: onlineBreakdown,
      cod: codBreakdown,
    },
    recentTransactions,
  };

  // 5. CANCELLATION AND REFUND REPORTS
  const reasonsMap = new Map<string, { count: number; totalAmount: number }>();
  let totalCancelledCount = 0;
  let totalCancelledAmount = 0;

  const cancelledOrders = rangeOrders.filter((o) => o.status === 'CANCELLED');
  cancelledOrders.forEach((o) => {
    totalCancelledCount++;
    const amt = Number(o.total_amount || 0);
    totalCancelledAmount += amt;

    const reason = (o.cancel_reason || 'Customer cancellation / return').trim();
    if (!reasonsMap.has(reason)) {
      reasonsMap.set(reason, { count: 0, totalAmount: 0 });
    }
    const rAgg = reasonsMap.get(reason)!;
    rAgg.count++;
    rAgg.totalAmount += amt;
  });

  const reasonsBreakdown = Array.from(reasonsMap.entries())
    .map(([reason, data]) => ({
      reason,
      count: data.count,
      totalAmount: data.totalAmount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Refunds summary
  let successfulRefundsCount = 0;
  let successfulRefundsAmount = 0;
  let pendingRefundsCount = 0;
  let pendingRefundsAmount = 0;
  let failedRefundsCount = 0;
  let failedRefundsAmount = 0;

  allRefunds.forEach((r) => {
    const rTime = new Date(r.processed_at || r.created_at).getTime();
    if (rTime >= startTimeMs && rTime <= endTimeMs) {
      const amt = Number(r.refund_amount || 0);
      if (r.refund_status === 'SUCCESS') {
        successfulRefundsCount++;
        successfulRefundsAmount += amt;
      } else if (r.refund_status === 'PENDING') {
        pendingRefundsCount++;
        pendingRefundsAmount += amt;
      } else if (r.refund_status === 'FAILED') {
        failedRefundsCount++;
        failedRefundsAmount += amt;
      }
    }
  });

  // Build unified cancellation and refund audit records
  const refundRecords: CancellationAndRefundSummary['records'] = [];

  // Add cancelled orders
  cancelledOrders.forEach((o) => {
    const matchingRefund = allRefunds.find((r) => r.order_id === o.id);
    refundRecords.push({
      orderId: o.id,
      orderNumber: o.order_number,
      orderDate: o.created_at || o.placed_at,
      orderTotal: Number(o.total_amount || 0),
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      orderStatus: o.status,
      cancelReason: o.cancel_reason || 'Customer cancellation',
      cancelledAt: o.cancelled_at,
      refundId: matchingRefund?.refund_id || o.provider_refund_id,
      cfRefundId: matchingRefund?.cf_refund_id,
      refundStatus: (matchingRefund?.refund_status as any) || (o.payment_status === 'REFUNDED' ? 'SUCCESS' : o.payment_method === 'COD' ? 'NONE' : 'PENDING'),
      refundAmount: matchingRefund ? Number(matchingRefund.refund_amount) : (o.payment_status === 'REFUNDED' ? Number(o.total_amount) : 0),
      refundArn: matchingRefund?.refund_arn,
      refundProcessedAt: matchingRefund?.processed_at,
    });
  });

  // Add refunded orders that might not be CANCELLED (e.g. status REFUNDED directly)
  rangeOrders.forEach((o) => {
    if (o.status !== 'CANCELLED' && (o.status === 'REFUNDED' || o.payment_status === 'REFUNDED')) {
      const matchingRefund = allRefunds.find((r) => r.order_id === o.id);
      refundRecords.push({
        orderId: o.id,
        orderNumber: o.order_number,
        orderDate: o.created_at || o.placed_at,
        orderTotal: Number(o.total_amount || 0),
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        orderStatus: o.status,
        cancelReason: o.cancel_reason || o.refund_reason || 'Return / Refund',
        cancelledAt: o.cancelled_at,
        refundId: matchingRefund?.refund_id || o.provider_refund_id,
        cfRefundId: matchingRefund?.cf_refund_id,
        refundStatus: (matchingRefund?.refund_status as any) || 'SUCCESS',
        refundAmount: matchingRefund ? Number(matchingRefund.refund_amount) : Number(o.total_amount || 0),
        refundArn: matchingRefund?.refund_arn,
        refundProcessedAt: matchingRefund?.processed_at,
      });
    }
  });

  const cancellationsAndRefunds: CancellationAndRefundSummary = {
    cancellations: {
      totalCancelledCount,
      totalCancelledAmount,
      reasonsBreakdown,
    },
    refunds: {
      successfulCount: successfulRefundsCount,
      successfulAmount: successfulRefundsAmount,
      pendingCount: pendingRefundsCount,
      pendingAmount: pendingRefundsAmount,
      failedCount: failedRefundsCount,
      failedAmount: failedRefundsAmount,
      totalRefundAmount: successfulRefundsAmount,
    },
    records: refundRecords.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()),
  };

  return {
    range,
    groupBy,
    salesSummary,
    timeline,
    bestSellingProducts,
    paymentAnalytics,
    cancellationsAndRefunds,
    generatedAt: now.toISOString(),
    generatedAtIST: `${todayStr} ${now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
  };
}
