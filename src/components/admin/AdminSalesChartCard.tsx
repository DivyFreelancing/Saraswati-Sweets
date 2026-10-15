import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

export interface TrendDay {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface Trend30Days {
  totalRevenue: number;
  totalOrders: number;
}

interface AdminSalesChartCardProps {
  trendView: '7days' | '30days';
  onSetTrendView: (view: '7days' | '30days') => void;
  trend7Days?: TrendDay[];
  trend30Days?: Trend30Days;
}

export const AdminSalesChartCard: React.FC<AdminSalesChartCardProps> = ({
  trendView,
  onSetTrendView,
  trend7Days = [],
  trend30Days,
}) => {
  const weekTotal = trend7Days.reduce((acc, d) => acc + (d.revenue || 0), 0);
  const maxRevenue = Math.max(...trend7Days.map((x) => x.revenue), 1000);

  const avgOrderValue =
    trend30Days && trend30Days.totalOrders > 0
      ? Math.round(trend30Days.totalRevenue / trend30Days.totalOrders)
      : 0;

  return (
    <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-4">
      {/* Header with Title, Week Total & Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E2D8] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#7A1129]" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="text-[16px] font-extrabold text-[#241C17] tracking-tight">
              {trendView === '7days' ? 'Sales, last 7 days' : 'Sales trajectory (30 days)'}
            </h2>
          </div>
          <p className="text-xs text-[#6B5F55] mt-1">
            {trendView === '7days' ? (
              <span>
                Total revenue this week: <strong className="text-[#241C17] font-bold tabular-nums">{formatINR(weekTotal)}</strong>
              </span>
            ) : (
              <span>Monthly aggregate order volume and revenue across Barabanki.</span>
            )}
          </p>
        </div>

        {/* 7-Day / 30-Day Segmented Control */}
        <div
          role="group"
          aria-label="Sales trend time range"
          className="flex items-center gap-1 bg-[#F3E9DC] p-1 rounded-[10px] self-start sm:self-auto shrink-0"
        >
          <button
            type="button"
            onClick={() => onSetTrendView('7days')}
            aria-pressed={trendView === '7days'}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
              trendView === '7days'
                ? 'bg-[#7A1129] text-white shadow-2xs'
                : 'text-[#6B5F55] hover:text-[#241C17]'
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => onSetTrendView('30days')}
            aria-pressed={trendView === '30days'}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
              trendView === '30days'
                ? 'bg-[#7A1129] text-white shadow-2xs'
                : 'text-[#6B5F55] hover:text-[#241C17]'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* View Content */}
      {trendView === '7days' ? (
        /* 7-Day Bar Chart representation */
        <div className="pt-2">
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end min-h-[170px] pt-6 pb-2">
            {trend7Days.map((d, index) => {
              const isToday = index === trend7Days.length - 1;
              const hasRevenue = d.revenue > 0;
              const heightPercent = hasRevenue
                ? Math.max(12, Math.round((d.revenue / maxRevenue) * 100))
                : 0;

              return (
                <div key={d.date} className="flex flex-col items-center gap-2 text-center h-full justify-end">
                  {/* Value label above bar */}
                  <span
                    className={`text-[11px] font-bold tabular-nums truncate max-w-full ${
                      isToday ? 'text-[#7A1129]' : 'text-[#241C17]'
                    }`}
                    title={`${d.label}: ${formatINR(d.revenue)}`}
                  >
                    {formatINR(d.revenue)}
                  </span>

                  {/* Bar Container */}
                  <div className="w-full bg-[#F7F4EF] rounded-t-[6px] h-32 flex items-end justify-center px-1 pb-0 relative">
                    {hasRevenue ? (
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-[5px] transition-all duration-300 ${
                          isToday
                            ? 'bg-[#7A1129] hover:bg-[#5E0D20]'
                            : 'bg-[#D9B866] hover:bg-[#C79A3D]'
                        }`}
                        title={`${d.label}: ${formatINR(d.revenue)} (${d.orders} orders)`}
                      />
                    ) : (
                      /* Zero day thin grey line (#E9E2D8) */
                      <div
                        className="w-full h-[2px] bg-[#E9E2D8] mb-0 rounded-full"
                        title={`${d.label}: ₹0 (0 orders)`}
                        aria-label={`${d.label}: Zero orders`}
                      />
                    )}
                  </div>

                  {/* Day label below */}
                  <div className="pt-0.5">
                    <span
                      className={`text-[12px] block font-semibold truncate ${
                        isToday ? 'text-[#7A1129] font-extrabold' : 'text-[#6B5F55]'
                      }`}
                    >
                      {d.label.split(',')[0]}
                    </span>
                    <span className="text-[10px] text-[#1E7A4B] font-bold block tabular-nums">
                      {d.orders} ord
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 30-Day Aggregated Trend Grid (3 Restyled Tiles) */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="p-4 rounded-[12px] bg-[#F7F4EF] border border-[#E9E2D8] space-y-1">
            <span className="text-xs text-[#6B5F55] font-bold tracking-tight block">
              30-Day Revenue
            </span>
            <div className="text-[24px] font-extrabold text-[#7A1129] tabular-nums tracking-tight">
              {formatINR(trend30Days?.totalRevenue || 0)}
            </div>
            <span className="text-[11px] text-[#1E7A4B] font-semibold block">
              Storewide gross intake
            </span>
          </div>

          <div className="p-4 rounded-[12px] bg-[#F7F4EF] border border-[#E9E2D8] space-y-1">
            <span className="text-xs text-[#6B5F55] font-bold tracking-tight block">
              Completed Orders
            </span>
            <div className="text-[24px] font-extrabold text-[#241C17] tabular-nums tracking-tight">
              {trend30Days?.totalOrders || 0}
            </div>
            <span className="text-[11px] text-[#6B5F55] font-medium block">
              Delivered in Barabanki
            </span>
          </div>

          <div className="p-4 rounded-[12px] bg-[#F7F4EF] border border-[#E9E2D8] space-y-1">
            <span className="text-xs text-[#6B5F55] font-bold tracking-tight block">
              Average Order Value
            </span>
            <div className="text-[24px] font-extrabold text-[#C79A3D] tabular-nums tracking-tight">
              {formatINR(avgOrderValue)}
            </div>
            <span className="text-[11px] text-[#6B5F55] font-medium block">
              Per customer basket size
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
