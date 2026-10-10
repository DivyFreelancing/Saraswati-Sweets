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
  const [guestPhoneInput, setGuestPhoneInput] = useState('');
  const [isLookingUpGuest, setIsLookingUpGuest] = useState(false);
  const [guestLookupError, setGuestLookupError] = useState('');
  const { isAuthenticated, isLoading: isAuthLoading, openAuthModal, getValidAuthHeaders } = useAuth();

  useEffect(() => {
    if (isAuthLoading) return;

    async function loadOrder() {
      // 1. Logged-in path (strictly unchanged)
      if (isAuthenticated) {
        try {
          setLoading(true);
          const headers = await getValidAuthHeaders();
          const res = await fetch(`/api/orders/${orderNumber}`, {
            headers,
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
        return;
      }

      // 2. Guest path: check sessionStorage for phone recorded during checkout
      const storedPhone =
        sessionStorage.getItem('ss_checkout_phone') ||
        sessionStorage.getItem('guest_checkout_phone') ||
        sessionStorage.getItem(`guest_phone_${orderNumber}`);

      if (storedPhone) {
        try {
          setLoading(true);
          const res = await fetch('/api/orders/guest-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_number: orderNumber,
              phone: storedPhone,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setOrder(data.order);
          } else {
            setOrder(null);
          }
        } catch (err) {
          console.error('Failed to load guest order confirmation details:', err);
          setOrder(null);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderNumber, isAuthenticated, isAuthLoading, getValidAuthHeaders]);

  const handleGuestPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestLookupError('');
    const cleanPhone = guestPhoneInput.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setGuestLookupError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLookingUpGuest(true);
    try {
      const res = await fetch('/api/orders/guest-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          phone: cleanPhone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        try {
          sessionStorage.setItem('ss_checkout_phone', cleanPhone);
          sessionStorage.setItem(`guest_phone_${orderNumber}`, cleanPhone);
        } catch (_) {}
      } else {
        const errData = await res.json().catch(() => ({}));
        setGuestLookupError(errData.message || 'No order found matching this order number and mobile number.');
      }
    } catch (err: any) {
      setGuestLookupError('Failed to verify order. Please check your connection and retry.');
    } finally {
      setIsLookingUpGuest(false);
    }
  };

  if (isAuthLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-3 border-[#7A1129] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[#6E6259]">Loading order confirmation details...</p>
      </div>
    );
  }

  // If unauthenticated and order not loaded yet, allow phone verification instead of blocking with lock wall
  if (!isAuthenticated && !order) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#FAF4DE] text-[#7A1129] flex items-center justify-center mx-auto border border-[#C79A3D]/40 shadow-xs">
          <Package className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#221A14]">
            View Order #{orderNumber}
          </h1>
          <p className="text-sm text-[#6E6259] leading-relaxed">
            Enter the 10-digit mobile number used at checkout to view your order confirmation and dispatch timeline.
          </p>
        </div>

        <form onSubmit={handleGuestPhoneSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
              Mobile Number *
            </label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="e.g. 9876543210"
              value={guestPhoneInput}
              onChange={(e) => setGuestPhoneInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E8DFD2] focus:border-[#7A1129] focus:outline-none text-center font-mono text-base tracking-wider"
              maxLength={14}
            />
          </div>

          {guestLookupError && (
            <p className="text-xs text-[#8A1538] font-medium text-center">{guestLookupError}</p>
          )}

          <button
            type="submit"
            disabled={isLookingUpGuest}
            className="w-full min-h-[48px] py-3 px-6 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] disabled:bg-stone-300 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            {isLookingUpGuest ? 'Verifying with Store...' : 'Confirm Mobile & View Order'}
          </button>
        </form>

        <div className="pt-2 border-t border-[#E8DFD2]/60">
          <button
            type="button"
            onClick={openAuthModal}
            className="text-xs font-semibold text-[#8A1538] hover:underline"
          >
            Registered customer? Sign in with account instead
          </button>
        </div>
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
              <span>{order.payment_method === 'ONLINE' ? 'Total Paid (Cashfree)' : 'Cash on Delivery Total'}</span>
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
