import React from 'react';
import { ShoppingCart, ArrowRight, Store, Truck, Eye } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

interface AdminPendingOrdersCardProps {
  orders: any[];
  onOpenOrder: (order: any) => void;
  onViewAllOrders: () => void;
}

export const AdminPendingOrdersCard: React.FC<AdminPendingOrdersCardProps> = ({
  orders,
  onOpenOrder,
  onViewAllOrders,
}) => {
  // Staff action filter: PLACED and CONFIRMED (EXCLUDING PENDING_PAYMENT)
  const staffActionOrders = orders.filter(
    (o) => o.status === 'PLACED' || o.status === 'CONFIRMED'
  );

  const pendingPaymentCount = orders.filter(
    (o) => o.status === 'PENDING_PAYMENT'
  ).length;

  return (
    <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-4">
      {/* Header with Title, Count Pill & "View all orders" Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E2D8] pb-3.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#7A1129]" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="text-[16px] font-extrabold text-[#241C17] tracking-tight">
              Orders awaiting dispatch
            </h2>
          </div>
          <span
            className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full tabular-nums ${
              staffActionOrders.length > 0
                ? 'bg-[#FDEFD0] text-[#8A4B00]'
                : 'bg-[#E3F4EA] text-[#17663E]'
            }`}
          >
            {staffActionOrders.length} {staffActionOrders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>

        <button
          type="button"
          onClick={onViewAllOrders}
          className="text-xs font-bold text-[#7A1129] hover:text-[#5E0D20] flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>View all orders</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      {/* Table Container (scrolls horizontally on small viewports) */}
      <div className="overflow-x-auto -mx-5 px-5">
        {staffActionOrders.length === 0 ? (
          <div className="py-10 text-center space-y-1">
            <p className="text-sm font-bold text-[#241C17]">No orders waiting</p>
            <p className="text-xs text-[#6B5F55]">
              All placed and confirmed orders have been dispatched or completed.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-[#E9E2D8] text-[12px] font-bold text-[#6B5F55] uppercase tracking-wider">
                <th scope="col" className="pb-3 pr-4 font-bold">Order</th>
                <th scope="col" className="pb-3 px-4 font-bold">Customer</th>
                <th scope="col" className="pb-3 px-4 font-bold">Items</th>
                <th scope="col" className="pb-3 px-4 font-bold text-right">Total</th>
                <th scope="col" className="pb-3 px-4 font-bold text-center">Status</th>
                <th scope="col" className="pb-3 pl-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E2D8] text-xs">
              {staffActionOrders.map((order) => {
                const isTakeaway = order.fulfilment_type === 'TAKEAWAY';
                const customerName =
                  order.address_snapshot?.recipient_name || order.guest_name || 'Guest Patron';
                const customerPhone =
                  order.address_snapshot?.recipient_phone || order.guest_phone || '';
                const itemCount = order.items?.length || 1;

                return (
                  <tr key={order.id} className="hover:bg-[#F7F4EF]/60 transition-colors">
                    {/* 1. Order Number & Fulfilment */}
                    <td className="py-3.5 pr-4 align-middle">
                      <div className="font-bold text-[#7A1129] tabular-nums font-mono">
                        #{order.order_number}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#6B5F55] mt-0.5">
                        {isTakeaway ? (
                          <>
                            <Store className="w-3 h-3 text-[#1E7A4B] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                            <span>Store Pickup</span>
                          </>
                        ) : (
                          <>
                            <Truck className="w-3 h-3 text-[#C79A3D] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                            <span>Delivery</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* 2. Customer */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="font-bold text-[#241C17] truncate max-w-[160px]" title={customerName}>
                        {customerName}
                      </div>
                      {customerPhone && (
                        <div className="text-[11px] text-[#6B5F55] tabular-nums font-mono mt-0.5">
                          {customerPhone}
                        </div>
                      )}
                    </td>

                    {/* 3. Items */}
                    <td className="py-3.5 px-4 align-middle">
                      <span className="font-semibold text-[#241C17]">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                      {order.items_summary && (
                        <p className="text-[11px] text-[#6B5F55] truncate max-w-[180px] mt-0.5" title={order.items_summary}>
                          {order.items_summary}
                        </p>
                      )}
                    </td>

                    {/* 4. Total (Right-aligned) */}
                    <td className="py-3.5 px-4 align-middle text-right">
                      <span className="font-bold text-[#241C17] tabular-nums text-sm">
                        {formatINR(order.total_amount || 0)}
                      </span>
                    </td>

                    {/* 5. Status Pill */}
                    <td className="py-3.5 px-4 align-middle text-center">
                      <span
                        className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          order.status === 'PLACED'
                            ? 'bg-[#FDEFD0] text-[#8A4B00]'
                            : 'bg-[#E3F4EA] text-[#17663E]'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* 6. Open Button */}
                    <td className="py-3.5 pl-4 align-middle text-right">
                      <button
                        type="button"
                        onClick={() => onOpenOrder(order)}
                        aria-label={`Open details for order ${order.order_number}`}
                        className="min-h-[36px] px-3.5 py-1.5 rounded-[8px] bg-white hover:bg-[#F3E9DC] text-[#241C17] border border-[#E9E2D8] text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#7A1129]" strokeWidth={1.8} aria-hidden="true" />
                        <span>Open</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer: Read-only count of orders awaiting payment */}
      {pendingPaymentCount > 0 && (
        <div className="pt-2 border-t border-[#E9E2D8]">
          <button
            type="button"
            onClick={onViewAllOrders}
            className="text-xs text-[#6B5F55] hover:text-[#7A1129] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[#8A4B00]" aria-hidden="true" />
            <span>
              <strong className="font-bold text-[#8A4B00] tabular-nums">{pendingPaymentCount}</strong> {pendingPaymentCount === 1 ? 'order' : 'orders'} awaiting payment
            </span>
            <span className="text-[#7A1129] font-bold underline ml-1">
              View in Orders
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
