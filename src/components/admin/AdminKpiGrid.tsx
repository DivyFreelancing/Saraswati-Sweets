import React from 'react';
import { IndianRupee, Clock, Bike, AlertCircle } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

export interface AdminKpiMetrics {
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  outForDeliveryOrders?: number;
  lowStockItems: number;
}

interface AdminKpiGridProps {
  metrics: AdminKpiMetrics;
  outForDeliveryCount: number;
}

export const AdminKpiGrid: React.FC<AdminKpiGridProps> = ({
  metrics,
  outForDeliveryCount,
}) => {
  const isStockAllGood = (metrics.lowStockItems || 0) === 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Today's Sales */}
      <div className="bg-white p-5 rounded-[14px] border border-[#E9E2D8] shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-[#6B5F55] tracking-tight">
              Today's sales
            </span>
            <span className="w-7 h-7 rounded-lg bg-[#F7F4EF] flex items-center justify-center text-[#7A1129] shrink-0" aria-hidden="true">
              <IndianRupee className="w-4 h-4" strokeWidth={1.8} />
            </span>
          </div>
          <div className="text-[32px] font-extrabold text-[#241C17] tabular-nums tracking-tight leading-tight mt-1 mb-2">
            {formatINR(metrics.todayRevenue || 0)}
          </div>
        </div>
        <div>
          <span className="inline-flex items-center text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3E9DC] text-[#4A0A1B] tabular-nums">
            {metrics.todayOrders || 0} orders placed today
          </span>
        </div>
      </div>

      {/* 2. Orders Pending */}
      <div className="bg-white p-5 rounded-[14px] border border-[#E9E2D8] shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-[#6B5F55] tracking-tight">
              Orders pending
            </span>
            <span className="w-7 h-7 rounded-lg bg-[#FDEFD0] flex items-center justify-center text-[#8A4B00] shrink-0" aria-hidden="true">
              <Clock className="w-4 h-4" strokeWidth={1.8} />
            </span>
          </div>
          <div className="text-[32px] font-extrabold text-[#7A1129] tabular-nums tracking-tight leading-tight mt-1 mb-2">
            {metrics.pendingOrders || 0}
          </div>
        </div>
        <div>
          <span className="inline-flex items-center text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-[#FDEFD0] text-[#8A4B00] tabular-nums">
            Awaiting dispatch
          </span>
        </div>
      </div>

      {/* 3. Out for Delivery */}
      <div className="bg-white p-5 rounded-[14px] border border-[#E9E2D8] shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-[#6B5F55] tracking-tight">
              Out for delivery
            </span>
            <span className="w-7 h-7 rounded-lg bg-[#F7F4EF] flex items-center justify-center text-[#C79A3D] shrink-0" aria-hidden="true">
              <Bike className="w-4 h-4" strokeWidth={1.8} />
            </span>
          </div>
          <div className="text-[32px] font-extrabold text-[#241C17] tabular-nums tracking-tight leading-tight mt-1 mb-2">
            {outForDeliveryCount}
          </div>
        </div>
        <div>
          <span className="inline-flex items-center text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3E9DC] text-[#4A0A1B] tabular-nums">
            En route to customer
          </span>
        </div>
      </div>

      {/* 4. Low Stock Alerts */}
      <div className="bg-white p-5 rounded-[14px] border border-[#E9E2D8] shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-[#6B5F55] tracking-tight">
              Low stock alerts
            </span>
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isStockAllGood ? 'bg-[#E3F4EA] text-[#17663E]' : 'bg-[#FDEFD0] text-[#8A4B00]'
              }`}
              aria-hidden="true"
            >
              <AlertCircle className="w-4 h-4" strokeWidth={1.8} />
            </span>
          </div>
          <div
            className={`text-[32px] font-extrabold tabular-nums tracking-tight leading-tight mt-1 mb-2 ${
              isStockAllGood ? 'text-[#1E7A4B]' : 'text-[#A8261E]'
            }`}
          >
            {metrics.lowStockItems || 0}
          </div>
        </div>
        <div>
          <span
            className={`inline-flex items-center text-[12px] font-bold px-2.5 py-0.5 rounded-full tabular-nums ${
              isStockAllGood
                ? 'bg-[#E3F4EA] text-[#17663E]'
                : 'bg-[#FDEFD0] text-[#8A4B00]'
            }`}
          >
            {isStockAllGood ? 'All items in stock' : 'Sweets below 10 units'}
          </span>
        </div>
      </div>
    </div>
  );
};
