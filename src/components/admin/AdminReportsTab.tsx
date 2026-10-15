import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  CreditCard,
  AlertOctagon,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  ReportsAnalyticsPayload,
  ReportDateRangePreset,
  ReportGroupBy,
} from '../../types/reports';
import {
  exportReportToCsv,
  exportReportToExcel,
  exportReportToPdf,
} from '../../services/reportExportService';
import { formatINR } from '../../utils/formatters';

interface AdminReportsTabProps {
  getAuthHeaders: () => Record<string, string>;
  onNavigateToOrders?: () => void;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({
  getAuthHeaders,
  onNavigateToOrders,
}) => {
  const [data, setData] = useState<ReportsAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState<ReportDateRangePreset>('last7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('day');
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'products' | 'payments' | 'cancellations'>('sales');

  // Product sorting state
  const [productSortBy, setProductSortBy] = useState<'revenue' | 'units'>('revenue');

  // Export states
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const fetchReports = async (
    targetPreset = preset,
    targetStart = customStart,
    targetEnd = customEnd,
    targetGroup = groupBy
  ) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('range', targetPreset);
      if (targetPreset === 'custom' && targetStart && targetEnd) {
        params.set('startDate', targetStart);
        params.set('endDate', targetEnd);
      }
      params.set('groupBy', targetGroup);

      const res = await fetch(`/api/admin/reports/analytics?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const payload: ReportsAnalyticsPayload = await res.json();
      setData(payload);
      if (payload.range.startDate && !customStart) setCustomStart(payload.range.startDate);
      if (payload.range.endDate && !customEnd) setCustomEnd(payload.range.endDate);
    } catch (err: any) {
      console.error('[AdminReports] Fetch failed:', err);
      setError(err?.message || 'Failed to load report analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(preset, customStart, customEnd, groupBy);
  }, [preset, groupBy]);

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    setPreset('custom');
    fetchReports('custom', customStart, customEnd, groupBy);
  };

  const handleExportCsv = () => {
    if (!data) return;
    setIsExportingCsv(true);
    try {
      exportReportToCsv(data, activeSubTab);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportExcel = async () => {
    if (!data) return;
    setIsExportingExcel(true);
    try {
      await exportReportToExcel(data);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = () => {
    if (!data) return;
    setIsExportingPdf(true);
    try {
      exportReportToPdf(data);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Presets definition
  const PRESET_OPTIONS: Array<{ key: ReportDateRangePreset; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7days', label: 'Last 7 Days' },
    { key: 'last30days', label: 'Last 30 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
    { key: 'custom', label: 'Custom Range' },
  ];

  // Sorted products
  const sortedProducts = data?.bestSellingProducts
    ? [...data.bestSellingProducts].sort((a, b) =>
        productSortBy === 'revenue' ? b.totalRevenue - a.totalRevenue : b.unitsSold - a.unitsSold
      )
    : [];

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar with Filter & Export Buttons */}
      <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E9E2D8] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[8px] bg-[#F7F4EF] border border-[#E9E2D8] flex items-center justify-center text-[#7A1129]">
                <TrendingUp className="w-4 h-4" strokeWidth={2} />
              </div>
              <h2 className="text-[18px] font-extrabold text-[#241C17] tracking-tight">
                Reports & Financial Analytics
              </h2>
            </div>
           
          </div>

          {/* Three Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || !data || isExportingExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-bold bg-[#17663E] text-white hover:bg-[#114d2e] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Download Excel spreadsheet with separate worksheets"
            >
              {isExportingExcel ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>Export Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || !data || isExportingCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-bold bg-[#F7F4EF] text-[#241C17] border border-[#E9E2D8] hover:bg-[#E9E2D8] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Download sanitized CSV matching active filters"
            >
              {isExportingCsv ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#7A1129]" />
              )}
              <span>Export CSV (.csv)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={loading || !data || isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-bold bg-[#7A1129] text-white hover:bg-[#5E0D20] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Generate printable PDF report with Saraswati Sweets branding"
            >
              {isExportingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>Export PDF (.pdf)</span>
            </button>
          </div>
        </div>

        {/* Date Filter Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F7F4EF] p-1.5 rounded-[12px] border border-[#E9E2D8]">
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPreset(opt.key)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                  preset === opt.key
                    ? 'bg-[#7A1129] text-white shadow-2xs'
                    : 'text-[#6B5F55] hover:text-[#241C17]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Active Period Label */}
          {data && (
            <div className="text-xs text-[#6B5F55] flex items-center gap-1.5 self-start sm:self-auto">
              <Calendar className="w-3.5 h-3.5 text-[#7A1129]" />
              <span>
                Active Range: <strong className="text-[#241C17]">{data.range.label}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Custom Date Range Picker Form (Shown when Custom Range is active) */}
        {preset === 'custom' && (
          <form
            onSubmit={handleApplyCustomRange}
            className="p-3.5 rounded-[10px] bg-[#F7F4EF] border border-[#E9E2D8] flex flex-wrap items-center gap-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[#241C17]">
              <span>From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-[6px] border border-[#E9E2D8] bg-white text-xs font-medium text-[#241C17] focus:outline-none focus:ring-1 focus:ring-[#7A1129]"
                required
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#241C17]">
              <span>To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-[6px] border border-[#E9E2D8] bg-white text-xs font-medium text-[#241C17] focus:outline-none focus:ring-1 focus:ring-[#7A1129]"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-[6px] text-xs font-bold bg-[#7A1129] text-white hover:bg-[#5E0D20] transition-colors shadow-2xs cursor-pointer"
            >
              Apply Filter
            </button>
          </form>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-[12px] bg-[#FDE8E8] border border-[#A8261E]/30 text-[#A8261E] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchReports()}
            className="font-bold underline cursor-pointer ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && !data && (
        <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-12 text-center text-[#6B5F55] text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-[#7A1129] animate-spin" />
          <span>Crunching financial and store analytics...</span>
        </div>
      )}

      {/* 2. Top Summary Metrics Grid */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Gross & Net Sales */}
          <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B5F55]">
              Net Sales Revenue
            </div>
            <div className="text-[28px] font-extrabold text-[#7A1129] tracking-tight tabular-nums">
              {formatINR(data.salesSummary.netSales)}
            </div>
            <div className="text-xs text-[#6B5F55] pt-1 border-t border-[#E9E2D8] flex items-center justify-between">
              <span>Gross: {formatINR(data.salesSummary.grossSales)}</span>
              {data.salesSummary.totalDiscounts > 0 && (
                <span className="text-[#8A4B00] font-bold">
                  -{formatINR(data.salesSummary.totalDiscounts)} disc
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Average Order Value (AOV) */}
          <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B5F55]">
              Average Order Value (AOV)
            </div>
            <div className="text-[28px] font-extrabold text-[#241C17] tracking-tight tabular-nums">
              {formatINR(data.salesSummary.avgOrderValue)}
            </div>
            <div className="text-xs text-[#6B5F55] pt-1 border-t border-[#E9E2D8] flex items-center justify-between">
              <span>Eligible Orders: <strong className="text-[#241C17]">{data.salesSummary.eligibleOrdersCount}</strong></span>
              <span className="text-[11px] text-[#17663E] font-bold">Excludes cancelled</span>
            </div>
          </div>

          {/* Card 3: Payment Success Rate */}
          <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B5F55]">
              Payment Success Rate
            </div>
            <div className="text-[28px] font-extrabold text-[#17663E] tracking-tight tabular-nums">
              {data.paymentAnalytics.successRatePercent}%
            </div>
            <div className="text-xs text-[#6B5F55] pt-1 border-t border-[#E9E2D8] flex items-center justify-between">
              <span>{data.paymentAnalytics.successfulCount} paid / {data.paymentAnalytics.totalAttempts} attempts</span>
              <span className="text-[11px] text-[#A8261E] font-bold">{data.paymentAnalytics.failedCount} failed</span>
            </div>
          </div>

          {/* Card 4: Cancellations & Refunds */}
          <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B5F55]">
              Cancellations & Refunds
            </div>
            <div className="text-[28px] font-extrabold text-[#A8261E] tracking-tight tabular-nums">
              {formatINR(data.salesSummary.totalRefunds)}
            </div>
            <div className="text-xs text-[#6B5F55] pt-1 border-t border-[#E9E2D8] flex items-center justify-between">
              <span>{data.cancellationsAndRefunds.cancellations.totalCancelledCount} cancelled orders</span>
              {data.cancellationsAndRefunds.refunds.pendingCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#FDEFD0] text-[#8A4B00]">
                  {data.cancellationsAndRefunds.refunds.pendingCount} pending
                </span>
              ) : (
                <span className="text-[11px] text-[#17663E] font-bold">All settled</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E9E2D8] pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('sales')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'sales'
              ? 'border-[#7A1129] text-[#7A1129]'
              : 'border-transparent text-[#6B5F55] hover:text-[#241C17]'
          }`}
        >
          1. Sales Summaries & Trajectory
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'products'
              ? 'border-[#7A1129] text-[#7A1129]'
              : 'border-transparent text-[#6B5F55] hover:text-[#241C17]'
          }`}
        >
          2. Best-Selling Mithai ({data?.bestSellingProducts.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payments')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'payments'
              ? 'border-[#7A1129] text-[#7A1129]'
              : 'border-transparent text-[#6B5F55] hover:text-[#241C17]'
          }`}
        >
          3. Payment Success / Failure
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('cancellations')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'cancellations'
              ? 'border-[#7A1129] text-[#7A1129]'
              : 'border-transparent text-[#6B5F55] hover:text-[#241C17]'
          }`}
        >
          4. Cancellations & Refunds ({data?.cancellationsAndRefunds.records.length || 0})
        </button>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: SALES REPORTS & TRAJECTORY                                */}
      {/* ==================================================================== */}
      {activeSubTab === 'sales' && data && (
        <div className="space-y-6">
          {/* Sales Chart Card */}
          <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E2D8] pb-3">
              <div>
                <h3 className="text-[16px] font-extrabold text-[#241C17] tracking-tight">
                  Revenue Trajectory by Date
                </h3>
                
              </div>

              {/* Group By Segmented Control */}
              <div className="flex items-center gap-1 bg-[#F7F4EF] p-1 rounded-[10px] border border-[#E9E2D8]">
                <button
                  type="button"
                  onClick={() => setGroupBy('day')}
                  className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                    groupBy === 'day' ? 'bg-[#7A1129] text-white shadow-2xs' : 'text-[#6B5F55]'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('week')}
                  className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                    groupBy === 'week' ? 'bg-[#7A1129] text-white shadow-2xs' : 'text-[#6B5F55]'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('month')}
                  className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                    groupBy === 'month' ? 'bg-[#7A1129] text-white shadow-2xs' : 'text-[#6B5F55]'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Visual Bar Chart */}
            {data.timeline.length > 0 ? (
              <div className="pt-2">
                <div
                  className="grid gap-2 sm:gap-3 items-end min-h-[180px] pt-6 pb-2"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(data.timeline.length, 14)}, minmax(0, 1fr))`,
                  }}
                >
                  {data.timeline.slice(-14).map((d: any) => {
                    const maxRev = Math.max(...data.timeline.map((x: any) => x.netSales), 1000);
                    const heightPercent = d.netSales > 0 ? Math.max(12, Math.round((d.netSales / maxRev) * 100)) : 0;

                    return (
                      <div key={d.key} className="flex flex-col items-center gap-2 text-center h-full justify-end">
                        <span className="text-[10px] font-bold tabular-nums text-[#241C17] truncate max-w-full">
                          {formatINR(d.netSales)}
                        </span>
                        <div className="w-full bg-[#F7F4EF] rounded-t-[6px] h-32 flex items-end justify-center px-1">
                          {d.netSales > 0 ? (
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className="w-full rounded-t-[5px] bg-[#D9B866] hover:bg-[#7A1129] transition-colors"
                              title={`${d.label}: ${formatINR(d.netSales)} (${d.orderCount} orders)`}
                            />
                          ) : (
                            <div className="w-full h-[2px] bg-[#E9E2D8] mb-0 rounded-full" />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-[#6B5F55] truncate max-w-full">
                          {d.label.split(',')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#6B5F55]">
                No sales data recorded in this period.
              </div>
            )}
          </div>

          {/* Detailed Tabular Breakdown */}
          <div className="bg-white rounded-[14px] border border-[#E9E2D8] overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#E9E2D8] flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#241C17]">
                Detailed Date-Wise Sales Audit
              </h4>
              <span className="text-xs text-[#6B5F55]">
                {data.timeline.length} periods evaluated
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F4EF] text-[#6B5F55] font-bold border-b border-[#E9E2D8]">
                  <tr>
                    <th className="px-4 py-3">Date / Period</th>
                    <th className="px-4 py-3 text-center">Eligible Orders</th>
                    <th className="px-4 py-3 text-right">Gross Sales</th>
                    <th className="px-4 py-3 text-right">Discounts</th>
                    <th className="px-4 py-3 text-right">Refunds</th>
                    <th className="px-4 py-3 text-right">Net Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E2D8] text-[#241C17]">
                  {data.timeline.map((t: any) => (
                    <tr key={t.key} className="hover:bg-[#F7F4EF]/50 transition-colors">
                      <td className="px-4 py-3 font-semibold">
                        <div>{t.label}</div>
                        <div className="text-[11px] text-[#6B5F55] font-normal">{t.key}</div>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-bold">
                        {t.orderCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatINR(t.grossSales)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#8A4B00]">
                        {t.discounts > 0 ? `-${formatINR(t.discounts)}` : '₹0'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#A8261E]">
                        {t.refunds > 0 ? `-${formatINR(t.refunds)}` : '₹0'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-extrabold text-[#7A1129]">
                        {formatINR(t.netSales)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-[#FDF8EE] font-extrabold border-t-2 border-[#E9E2D8]">
                    <td className="px-4 py-3 text-[#241C17]">TOTALS</td>
                    <td className="px-4 py-3 text-center tabular-nums text-[#241C17]">
                      {data.salesSummary.eligibleOrdersCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#241C17]">
                      {formatINR(data.salesSummary.grossSales)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#8A4B00]">
                      -{formatINR(data.salesSummary.totalDiscounts)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#A8261E]">
                      -{formatINR(data.salesSummary.totalRefunds)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#7A1129] text-sm">
                      {formatINR(data.salesSummary.netSales)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 2: BEST-SELLING PRODUCTS                                     */}
      {/* ==================================================================== */}
      {activeSubTab === 'products' && data && (
        <div className="bg-white rounded-[14px] border border-[#E9E2D8] overflow-hidden shadow-2xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E2D8] pb-3">
            <div>
              <h3 className="text-[16px] font-extrabold text-[#241C17] tracking-tight">
                Best-Selling Sweets & Namkeen
              </h3>
              <p className="text-xs text-[#6B5F55] mt-0.5">
                Ranked by customer demand and collected revenue. Excludes cancelled and refunded items.
              </p>
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-xs text-[#6B5F55] font-semibold">Rank by:</span>
              <div className="flex items-center gap-1 bg-[#F7F4EF] p-1 rounded-[8px] border border-[#E9E2D8]">
                <button
                  type="button"
                  onClick={() => setProductSortBy('revenue')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    productSortBy === 'revenue'
                      ? 'bg-[#7A1129] text-white shadow-2xs'
                      : 'text-[#6B5F55]'
                  }`}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setProductSortBy('units')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    productSortBy === 'units'
                      ? 'bg-[#7A1129] text-white shadow-2xs'
                      : 'text-[#6B5F55]'
                  }`}
                >
                  Units Sold
                </button>
              </div>
            </div>
          </div>

          {sortedProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F4EF] text-[#6B5F55] font-bold border-b border-[#E9E2D8]">
                  <tr>
                    <th className="px-4 py-3 text-center">Rank</th>
                    <th className="px-4 py-3">Sweet / Mithai</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-center">Units Sold</th>
                    <th className="px-4 py-3 text-right">Revenue (INR)</th>
                    <th className="px-4 py-3 text-center">Orders Count</th>
                    <th className="px-4 py-3">Top Variant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E2D8] text-[#241C17]">
                  {sortedProducts.map((p, idx) => (
                    <tr key={p.productId} className="hover:bg-[#F7F4EF]/50 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-extrabold ${
                            idx === 0
                              ? 'bg-[#D9B866] text-white'
                              : idx === 1
                              ? 'bg-[#C0C0C0] text-white'
                              : idx === 2
                              ? 'bg-[#CD7F32] text-white'
                              : 'bg-[#F7F4EF] text-[#6B5F55] border border-[#E9E2D8]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#241C17]">
                        {p.productName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F7F4EF] text-[#6B5F55] border border-[#E9E2D8]">
                          {p.categoryName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold tabular-nums">
                        {p.unitsSold}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold tabular-nums text-[#7A1129]">
                        {formatINR(p.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-[#6B5F55]">
                        {p.orderCount}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E3F4EA] text-[#17663E]">
                            {p.topVariant}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#6B5F55]">
              No product sales data found for the selected period.
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 3: PAYMENT SUCCESS / FAILURE                                 */}
      {/* ==================================================================== */}
      {activeSubTab === 'payments' && data && (
        <div className="space-y-6">
          {/* Performance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B5F55]">Overall Success Rate</span>
                <span className="text-xs font-bold text-[#17663E]">
                  {data.paymentAnalytics.successRatePercent}%
                </span>
              </div>
              <div className="w-full bg-[#F7F4EF] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#17663E] h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${data.paymentAnalytics.successRatePercent}%` }}
                />
              </div>
              <div className="text-[11px] text-[#6B5F55] flex justify-between">
                <span>{data.paymentAnalytics.successfulCount} captured</span>
                <span>{data.paymentAnalytics.failedCount} failed</span>
              </div>
            </div>

            <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-[#6B5F55]">Online Gateway (Cashfree)</span>
              <div className="text-xl font-extrabold text-[#241C17] tabular-nums">
                {formatINR(data.paymentAnalytics.breakdownByMethod.online.totalAmount)}
              </div>
              <div className="text-xs text-[#6B5F55]">
                {data.paymentAnalytics.breakdownByMethod.online.successful} successful of {data.paymentAnalytics.breakdownByMethod.online.attempts} attempts
              </div>
            </div>

            <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-[#6B5F55]">Cash on Delivery (COD)</span>
              <div className="text-xl font-extrabold text-[#241C17] tabular-nums">
                {formatINR(data.paymentAnalytics.breakdownByMethod.cod.totalAmount)}
              </div>
              <div className="text-xs text-[#6B5F55]">
                {data.paymentAnalytics.breakdownByMethod.cod.successful} fulfilled orders
              </div>
            </div>
          </div>

          {/* Transactions Audit Table */}
          <div className="bg-white rounded-[14px] border border-[#E9E2D8] overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#E9E2D8] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#241C17]">
                  Authoritative Payment Transactions Audit
                </h4>
                <p className="text-xs text-[#6B5F55]">
                  Deduplicated payment attempts from gateway and store logs.
                </p>
              </div>
              <span className="text-xs text-[#6B5F55]">
                {data.paymentAnalytics.recentTransactions.length} recorded
              </span>
            </div>

            {data.paymentAnalytics.recentTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F4EF] text-[#6B5F55] font-bold border-b border-[#E9E2D8]">
                    <tr>
                      <th className="px-4 py-3">Order Number</th>
                      <th className="px-4 py-3">Payment ID / Reference</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Date (IST)</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E2D8] text-[#241C17]">
                    {data.paymentAnalytics.recentTransactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-[#F7F4EF]/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-[#7A1129]">
                          #{tx.orderNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#6B5F55]">
                          {tx.providerPaymentId || tx.id}
                        </td>
                        <td className="px-4 py-3 uppercase font-semibold">
                          {tx.method}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          {formatINR(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.status === 'CAPTURED'
                                ? 'bg-[#E3F4EA] text-[#17663E]'
                                : tx.status === 'FAILED'
                                ? 'bg-[#FDE8E8] text-[#A8261E]'
                                : tx.status === 'REFUNDED'
                                ? 'bg-[#FDEFD0] text-[#8A4B00]'
                                : 'bg-[#F7F4EF] text-[#6B5F55]'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6B5F55]">
                          {new Date(tx.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="px-4 py-3 text-[#A8261E] text-[11px]">
                          {tx.failureReason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#6B5F55]">
                No payment transactions found in this period.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 4: CANCELLATIONS & REFUNDS                                   */}
      {/* ==================================================================== */}
      {activeSubTab === 'cancellations' && data && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cancellations by Reason */}
            <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-[#241C17]">
                Cancellations by Customer Reason
              </h4>
              {data.cancellationsAndRefunds.cancellations.reasonsBreakdown.length > 0 ? (
                <div className="space-y-2">
                  {data.cancellationsAndRefunds.cancellations.reasonsBreakdown.map((r: any) => (
                    <div
                      key={r.reason}
                      className="p-2.5 rounded-[8px] bg-[#F7F4EF] border border-[#E9E2D8] flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-[#241C17]">{r.reason}</span>
                      <div className="text-right">
                        <span className="font-bold text-[#A8261E]">{r.count} orders</span>
                        <span className="text-[11px] text-[#6B5F55] ml-2">({formatINR(r.totalAmount)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#6B5F55]">
                  Zero cancelled orders in this period.
                </div>
              )}
            </div>

            {/* Refund Settlement Status */}
            <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-[#241C17]">
                Gateway Refund Status
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-[8px] bg-[#E3F4EA] text-center">
                  <div className="text-[11px] font-bold text-[#17663E]">Successful</div>
                  <div className="text-lg font-extrabold text-[#17663E] mt-1">
                    {data.cancellationsAndRefunds.refunds.successfulCount}
                  </div>
                  <div className="text-[10px] text-[#17663E] font-medium">
                    {formatINR(data.cancellationsAndRefunds.refunds.successfulAmount)}
                  </div>
                </div>

                <div className="p-3 rounded-[8px] bg-[#FDEFD0] text-center">
                  <div className="text-[11px] font-bold text-[#8A4B00]">Pending Review</div>
                  <div className="text-lg font-extrabold text-[#8A4B00] mt-1">
                    {data.cancellationsAndRefunds.refunds.pendingCount}
                  </div>
                  <div className="text-[10px] text-[#8A4B00] font-medium">
                    {formatINR(data.cancellationsAndRefunds.refunds.pendingAmount)}
                  </div>
                </div>

                <div className="p-3 rounded-[8px] bg-[#FDE8E8] text-center">
                  <div className="text-[11px] font-bold text-[#A8261E]">Failed</div>
                  <div className="text-lg font-extrabold text-[#A8261E] mt-1">
                    {data.cancellationsAndRefunds.refunds.failedCount}
                  </div>
                  <div className="text-[10px] text-[#A8261E] font-medium">
                    {formatINR(data.cancellationsAndRefunds.refunds.failedAmount)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Audit Table */}
          <div className="bg-white rounded-[14px] border border-[#E9E2D8] overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#E9E2D8] flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#241C17]">
                Cancellation & Refund Audit Records
              </h4>
              <span className="text-xs text-[#6B5F55]">
                {data.cancellationsAndRefunds.records.length} orders
              </span>
            </div>

            {data.cancellationsAndRefunds.records.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F4EF] text-[#6B5F55] font-bold border-b border-[#E9E2D8]">
                    <tr>
                      <th className="px-4 py-3">Order Number</th>
                      <th className="px-4 py-3">Date (IST)</th>
                      <th className="px-4 py-3 text-right">Order Total</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Cancellation Reason</th>
                      <th className="px-4 py-3 text-center">Refund Status</th>
                      <th className="px-4 py-3 text-right">Refund Amount</th>
                      <th className="px-4 py-3">Refund ARN / Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E2D8] text-[#241C17]">
                    {data.cancellationsAndRefunds.records.map((rec: any) => (
                      <tr key={rec.orderId} className="hover:bg-[#F7F4EF]/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-[#7A1129]">
                          #{rec.orderNumber}
                        </td>
                        <td className="px-4 py-3 text-[#6B5F55]">
                          {new Date(rec.orderDate).toLocaleDateString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          {formatINR(rec.orderTotal)}
                        </td>
                        <td className="px-4 py-3 font-semibold uppercase text-[11px]">
                          {rec.paymentMethod}
                        </td>
                        <td className="px-4 py-3 text-[#6B5F55]">
                          {rec.cancelReason}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.refundStatus === 'SUCCESS'
                                ? 'bg-[#E3F4EA] text-[#17663E]'
                                : rec.refundStatus === 'PENDING'
                                ? 'bg-[#FDEFD0] text-[#8A4B00]'
                                : rec.refundStatus === 'FAILED'
                                ? 'bg-[#FDE8E8] text-[#A8261E]'
                                : 'bg-[#F7F4EF] text-[#6B5F55]'
                            }`}
                          >
                            {rec.refundStatus || 'NONE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold tabular-nums text-[#A8261E]">
                          {rec.refundAmount > 0 ? formatINR(rec.refundAmount) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#6B5F55]">
                          {rec.refundArn || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#6B5F55]">
                No cancellations or refunds found for this period.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
