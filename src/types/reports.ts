/**
 * Shared Type Definitions for Saraswati Sweets Reports & Analytics
 */

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
  key: string;
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
