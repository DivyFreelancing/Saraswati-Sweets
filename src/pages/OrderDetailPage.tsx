import React, { useEffect, useState } from 'react';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  Ban,
  PackageCheck,
  ChevronLeft,
  UtensilsCrossed,
  ChefHat,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/formatters';

interface OrderDetailPageProps {
  orderNumber: string;
  onBack: () => void;
  onGoToCart: () => void;
}

const ORDER_STEPS = [
  { key: 'PLACED', label: 'Order Received', desc: 'Received at Barabanki store' },
  { key: 'CONFIRMED', label: 'Confirmed', desc: 'Order confirmed and scheduled' },
  { key: 'PREPARING', label: 'Kitchen Prep', desc: 'Freshly boxed in desi ghee' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Dispatch', desc: 'Sealed with tamper tape' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Delivery partner on the way' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Handed over fresh' },
];

export const OrderDetailPage: React.FC<OrderDetailPageProps> = ({
  orderNumber,
  onBack,
  onGoToCart,
}) => {
  const { getAuthHeaders } = useAuth();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderNumber}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderNumber]);

  // Customer Cancel Handler (only PLACED/CONFIRMED)
  const handleCancelOrder = async () => {
    if (!order) return;
    setIsCancelling(true);

    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      const data = await res.json();

      if (res.ok) {
        setOrder(data.order);
        setShowCancelDialog(false);
        showToast('Your order has been cancelled successfully.', 'info');
      } else {
        showToast(data.message || 'Failed to cancel order.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error cancelling order.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  // Reorder Handler: adds items back into cart
  const handleReorder = async () => {
    if (!order || !order.items) return;

    for (const item of order.items) {
      await addItem(
        {
          variantId: item.variant_id,
          productName: item.product_name,
          variantLabel: item.variant_label,
        },
        item.quantity
      );
    }

    showToast(`Items from Order #${order.order_number} added to your mithai box!`, 'success');
    onGoToCart();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-[#E8DFD2] rounded-lg" />
        <div className="h-64 bg-[#F3EBE0] rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-display font-bold text-2xl text-[#1F1B16]">
          Order Not Found
        </h2>
        <p className="text-sm text-[#6B6258]">
          Could not find details for order #{orderNumber}.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-[#8A1538] hover:underline"
        >
          ← Return to Orders
        </button>
      </div>
    );
  }

  const isCancelled = order.status === 'CANCELLED';
  const isDelivered = order.status === 'DELIVERED';
  const canCustomerCancel = order.status === 'PLACED' || order.status === 'CONFIRMED';

  // Find step index
  const currentStepIndex = isCancelled
    ? -1
    : ORDER_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8DFD2] pb-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A1538] hover:underline mb-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#1F1B16]">
              Order #{order.order_number}
            </h1>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                isDelivered
                  ? 'bg-emerald-100 text-[#2E7D4F]'
                  : isCancelled
                  ? 'bg-red-100 text-[#B3261E]'
                  : 'bg-[#F7E9EE] text-[#8A1538]'
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canCustomerCancel && (
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[#B3261E]/40 text-xs font-semibold text-[#B3261E] hover:bg-red-50 transition-colors"
            >
              Cancel Order
            </button>
          )}

          <button
            type="button"
            onClick={handleReorder}
            className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reorder Items</span>
          </button>
        </div>
      </div>

      {/* Cancelled Banner if applicable */}
      {isCancelled && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-[#B3261E] flex items-start gap-2.5">
          <Ban className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Order Cancelled</div>
            <p className="mt-0.5 text-stone-600">
              This order was cancelled on {new Date(order.cancelled_at || order.updated_at).toLocaleString('en-IN')}.
            </p>
          </div>
        </div>
      )}

      {/* Visual Status Timeline */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="font-display font-bold text-lg text-[#1F1B16]">
            Delivery Progress Timeline
          </h2>

          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {ORDER_STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step.key} className="flex flex-col items-start relative text-left">
                    {/* Circle */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                        isCurrent
                          ? 'bg-[#8A1538] text-white ring-4 ring-[#8A1538]/20 shadow-xs'
                          : isPassed
                          ? 'bg-[#2E7D4F] text-white'
                          : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {isPassed && !isCurrent ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <div className="font-bold text-xs text-[#1F1B16]">
                      {step.label}
                    </div>

                    <div className="text-[11px] text-[#6B6258] mt-0.5 leading-snug">
                      {step.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!canCustomerCancel && !isDelivered && (
            <div className="pt-2 text-[11px] text-[#6B6258] italic border-t border-[#E8DFD2]">
              * Note: Since preparation has begun in our Barabanki kitchen, online cancellation is no longer available.
            </div>
          )}
        </div>
      )}

      {/* Details Grid: Address + Items Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Items list */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-4">
          <h3 className="font-display font-bold text-base text-[#1F1B16] border-b border-[#E8DFD2] pb-3">
            Itemized Sweets Box
          </h3>

          <div className="divide-y divide-[#E8DFD2]">
            {order.items?.map((it: any) => (
              <div key={it.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-sm text-[#1F1B16]">{it.product_name}</div>
                  <div className="text-[#6B6258] mt-0.5">
                    Variant: <strong>{it.variant_label}</strong> • Qty: <strong>{it.quantity}</strong>
                  </div>
                </div>
                <div className="font-bold text-sm text-[#1F1B16] tabular-nums">
                  {formatINR(it.total_price)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E8DFD2] space-y-1.5 text-xs text-[#6B6258]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-[#1F1B16] font-medium tabular-nums">{formatINR(order.subtotal)}</span>
            </div>

            {order.discount_amount > 0 && (
              <div className="flex justify-between text-[#2E7D4F]">
                <span>Discount ({order.coupon_code})</span>
                <span className="font-medium tabular-nums">- {formatINR(order.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="text-[#1F1B16] font-medium tabular-nums">
                {order.delivery_charge === 0 ? 'FREE' : formatINR(order.delivery_charge)}
              </span>
            </div>

            <div className="pt-2 border-t border-[#E8DFD2] flex justify-between items-baseline text-base font-bold text-[#1F1B16]">
              <span>{order.payment_method === 'ONLINE' ? 'Total Paid (Online)' : 'Payment Due (COD)'}</span>
              <span className="text-xl font-display text-[#8A1538] tabular-nums">
                {formatINR(order.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Delivery Address */}
        <div className="md:col-span-5 space-y-4">

          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-5 shadow-xs space-y-3">
            <h4 className="font-display font-bold text-sm text-[#1F1B16] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#8A1538]" />
              <span>Delivery Address</span>
            </h4>
            <div className="text-xs text-[#1F1B16] leading-relaxed">
              <div className="font-bold">{order.address_snapshot?.recipient_name}</div>
              <div className="text-[#6B6258]">{order.address_snapshot?.recipient_phone}</div>
              <div className="mt-1">
                {order.address_snapshot?.street_address}
                {order.address_snapshot?.landmark ? `, Near ${order.address_snapshot?.landmark}` : ''}
              </div>
              <div className="text-[#8A1538] font-semibold">
                {order.address_snapshot?.city} - {order.address_snapshot?.pincode}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Customer Cancellation */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-[#E8DFD2] space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#B3261E] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-lg text-[#1F1B16]">
                Cancel Order #{order.order_number}?
              </h3>
              <p className="text-xs text-[#6B6258] leading-relaxed">
                Are you sure you want to cancel this order? This cannot be undone once processed.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-[#E8DFD2] text-xs font-semibold text-[#1F1B16] hover:bg-[#F3EBE0]"
              >
                Keep Order
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelOrder}
                className="flex-1 min-h-[44px] rounded-xl bg-[#B3261E] text-xs font-semibold text-white hover:bg-red-700"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
