import React, { useEffect, useState } from 'react';
import { CheckCircle2, Package, MapPin, Clock, ArrowRight, Truck, FileText, Sparkles, Lock } from 'lucide-react';
import { formatINR } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface OrderConfirmationPageProps {
  orderNumber: string;
  onTrackOrder: (orderNumber: string) => void;
  onContinueShopping: () => void;
  onViewOrders: () => void;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({
  orderNumber,
  onTrackOrder,
  onContinueShopping,
  onViewOrders,
}) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, openAuthModal, getAuthHeaders } = useAuth();

  useEffect(() => {
    async function loadOrder() {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${orderNumber}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
        } else if (res.status === 401 || res.status === 403 || res.status === 404) {
          setOrder(null);
        }
      } catch (err) {
        console.error('Failed to load order confirmation details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderNumber, isAuthenticated, getAuthHeaders]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#F3EBE0] text-[#8A1538] flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10" />
        </div>
        <h1 className="font-display font-bold text-3xl text-[#1F1B16]">
          Authentication Required
        </h1>
        <p className="text-[#6B6258] max-w-md mx-auto">
          Please log in to view the details for order #{orderNumber}. This protects your personal information.
        </p>
        <button
          onClick={openAuthModal}
          className="px-8 py-3 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white font-semibold transition-colors shadow-sm"
        >
          Log in to view order
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Celebratory Banner */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-[#2E7D4F]/10 text-[#2E7D4F] flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7E9EE] text-[#8A1538] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
          <span>Barabanki Sweet Kitchen Notified</span>
        </div>

        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1F1B16]">
          Mithai Order Confirmed!
        </h1>

        <p className="text-sm sm:text-base text-[#6B6258] max-w-md mx-auto">
          Thank you for choosing Saraswati Sweets. Your authentic desi ghee sweets are being prepared fresh for delivery.
        </p>

        <div className="pt-2">
          <div className="inline-block bg-[#F3EBE0] px-4 py-2 rounded-xl border border-[#E8DFD2] font-mono text-sm font-bold text-[#8A1538]">
            Order #{orderNumber}
          </div>
        </div>
      </div>

      {order && (
        <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 sm:p-8 shadow-xs space-y-6">
          {/* Status & Delivery Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[#E8DFD2]">
            <div className="space-y-1">
              <span className="text-xs text-[#6B6258] font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#8A1538]" /> Scheduled Delivery Slot
              </span>
              <div className="font-bold text-sm text-[#1F1B16]">
                {order.slot_snapshot?.slot_date} ({order.slot_snapshot?.start_time} - {order.slot_snapshot?.end_time})
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-[#6B6258] font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#8A1538]" /> Delivery Destination
              </span>
              <div className="font-bold text-sm text-[#1F1B16] truncate">
                {order.address_snapshot?.street_address}, {order.address_snapshot?.city} ({order.address_snapshot?.pincode})
              </div>
            </div>
          </div>

          {/* Items breakdown */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-base text-[#1F1B16]">
              Items in Your Box
            </h3>

            <div className="divide-y divide-[#E8DFD2] text-xs">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-[#1F1B16]">{item.product_name}</span>
                    <span className="text-[#6B6258] ml-2">({item.variant_label}) × {item.quantity}</span>
                  </div>
                  <span className="font-bold text-sm text-[#1F1B16] tabular-nums">
                    {formatINR(item.total_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="pt-4 border-t border-[#E8DFD2] space-y-1.5 text-xs text-[#6B6258]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-[#1F1B16] font-medium tabular-nums">{formatINR(order.subtotal)}</span>
            </div>

            {order.discount_amount > 0 && (
              <div className="flex justify-between text-[#2E7D4F]">
                <span>Coupon Discount ({order.coupon_code})</span>
                <span className="font-medium tabular-nums">- {formatINR(order.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Delivery Charge</span>
              <span className="text-[#1F1B16] font-medium tabular-nums">
                {order.delivery_charge === 0 ? 'FREE' : formatINR(order.delivery_charge)}
              </span>
            </div>

            <div className="pt-2 border-t border-[#E8DFD2] flex justify-between items-baseline text-base font-bold text-[#1F1B16]">
              <span>Cash on Delivery Total</span>
              <span className="text-xl font-display text-[#8A1538] tabular-nums">
                {formatINR(order.total_amount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onTrackOrder(orderNumber)}
          className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <Truck className="w-4 h-4 text-[#F6E08B]" />
          <span>Track Order Timeline</span>
        </button>

        <button
          type="button"
          onClick={onViewOrders}
          className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-white border border-[#E8DFD2] hover:bg-[#F3EBE0] text-[#1F1B16] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          <span>My Orders</span>
        </button>

        <button
          type="button"
          onClick={onContinueShopping}
          className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl text-xs font-semibold text-[#8A1538] hover:underline"
        >
          Back to Sweet Catalog
        </button>
      </div>
    </div>
  );
};
