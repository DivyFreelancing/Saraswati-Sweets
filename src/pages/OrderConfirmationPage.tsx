import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Package,
  MapPin,
  Clock,
  ArrowRight,
  Truck,
  FileText,
  Sparkles,
  Lock,
  Store,
  Calendar,
  CreditCard,
  Ban,
  ShoppingBag,
} from 'lucide-react';
import { formatINR } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { shouldHandleSpaClick } from '../utils/navigation';
import { OrderConfirmationSkeleton } from '../components/common/LoadingSkeleton';

interface OrderConfirmationPageProps {
  orderNumber: string;
  onTrackOrder: (orderNumber: string) => void;
  onContinueShopping: () => void;
  onViewOrders: () => void;
}

const DELIVERY_STEPS = [
  { key: 'PLACED', label: 'Order Received', desc: 'Received at Barabanki shop' },
  { key: 'CONFIRMED', label: 'Preparing Fresh', desc: 'Pure desi ghee sweets in preparation' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Dispatched for Barabanki delivery' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Delivered fresh to doorstep' },
];

const TAKEAWAY_STEPS = [
  { key: 'PLACED', label: 'Order Received', desc: 'Received at Barabanki shop' },
  { key: 'CONFIRMED', label: 'Preparing Fresh', desc: 'Pure desi ghee sweets in preparation' },
  { key: 'READY_FOR_PICKUP', label: 'Ready at Counter', desc: 'Packed and waiting at sweet shop' },
  { key: 'DELIVERED', label: 'Collected', desc: 'Handed over at store counter' },
];

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

    // Read phone from URL query param if present (?phone=9876543210)
    let phoneFromUrl = '';
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const rawPhone = urlParams.get('phone') || '';
      const cleanUrlPhone = rawPhone.replace(/\D/g, '').slice(-10);
      if (cleanUrlPhone.length === 10) {
        phoneFromUrl = cleanUrlPhone;
        setGuestPhoneInput(cleanUrlPhone);
      }
    }

    async function loadOrder() {
      // 1. Logged-in path (strictly authenticated via JWT)
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

      // 2. Guest path: check URL query phone or sessionStorage recorded during checkout
      const storedPhone =
        phoneFromUrl ||
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
    return <OrderConfirmationSkeleton />;
  }

  // If unauthenticated and order not loaded yet, require mobile phone verification (prevents leaking order data)
  if (!isAuthenticated && !order) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#FAF4DE] text-[#7A1129] flex items-center justify-center mx-auto border border-[#C79A3D]/40 shadow-xs">
          <Package className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#221A14]">
            Track Order #{orderNumber}
          </h1>
          <p className="text-sm text-[#6E6259] leading-relaxed">
            Enter the 10-digit mobile number used at checkout to securely verify ownership and view your order confirmation & timeline.
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

  const isTakeaway = order?.fulfilment_type === 'TAKEAWAY';
  const steps = isTakeaway ? TAKEAWAY_STEPS : DELIVERY_STEPS;
  const isCancelled = order?.status === 'CANCELLED';
  const isDelivered = order?.status === 'DELIVERED';

  const currentStepIndex = (() => {
    if (isCancelled) return -1;
    if (order?.status === 'DELIVERED') return 3;
    if (order?.status === 'OUT_FOR_DELIVERY' || order?.status === 'READY_FOR_PICKUP') return 2;
    if (order?.status === 'CONFIRMED' || order?.status === 'PREPARING') return 1;
    if (order?.status === 'PLACED') return 0;
    return 0;
  })();

  const isPaidCaptured = order?.payment_status === 'CAPTURED';
  const isCOD = order?.payment_method === 'COD';
  const isPendingPayment = order?.status === 'PENDING_PAYMENT' || order?.payment_status === 'PENDING';

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
          {isTakeaway ? 'Takeaway Order Confirmed!' : 'Mithai Order Confirmed!'}
        </h1>

        <p className="text-sm sm:text-base text-[#6B6258] max-w-md mx-auto">
          {isTakeaway
            ? 'Thank you for choosing Saraswati Sweets. Your authentic desi ghee sweets are being packed fresh for store counter pickup.'
            : 'Thank you for choosing Saraswati Sweets. Your authentic desi ghee sweets are being prepared fresh for delivery in Barabanki.'}
        </p>

        <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
          <div className="inline-block bg-[#F3EBE0] px-4 py-2 rounded-xl border border-[#E8DFD2] font-mono text-sm font-bold text-[#8A1538]">
            Order #{orderNumber}
          </div>

          {/* Payment Status Badge */}
          {isPaidCaptured ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-[#2E7D4F] border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Paid Online (Cashfree Verified)
            </span>
          ) : isCOD ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 text-[#8A1538] border border-amber-200 text-xs font-bold">
              <CreditCard className="w-3.5 h-3.5" />
              Cash on {isTakeaway ? 'Pickup' : 'Delivery'}
            </span>
          ) : isPendingPayment ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-yellow-50 text-yellow-800 border border-yellow-200 text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              Payment Pending
            </span>
          ) : null}
        </div>
      </div>

      {/* Visual Order-Status Timeline */}
      <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-[#E8DFD2] pb-3">
          <h2 className="font-display font-bold text-base sm:text-lg text-[#1F1B16] flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#8A1538]" />
            <span>Order Status & Tracking Timeline</span>
          </h2>
          <span
            className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
              isDelivered
                ? 'bg-emerald-100 text-[#2E7D4F]'
                : isCancelled
                ? 'bg-red-100 text-[#B3261E]'
                : 'bg-[#F7E9EE] text-[#8A1538]'
            }`}
          >
            {order?.status || 'PLACED'}
          </span>
        </div>

        {isCancelled ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-[#B3261E] flex items-start gap-2.5">
            <Ban className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Order Cancelled</div>
              <p className="mt-0.5 text-stone-600">
                This order has been cancelled. If payment was deducted, refund will be processed within 5-7 working days.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {steps.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step.key} className="flex flex-col items-start relative text-left">
                    {/* Connecting line to next step on sm+ screens */}
                    {idx < steps.length - 1 && (
                      <div
                        className={`hidden sm:block absolute top-4 left-8 right-[-1.5rem] h-0.5 transition-colors -z-0 ${
                          currentStepIndex > idx ? 'bg-[#2E7D4F]' : 'bg-stone-200'
                        }`}
                        aria-hidden="true"
                      />
                    )}

                    {/* Circle icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all relative z-10 ${
                        isDelivered
                          ? 'bg-[#2E7D4F] text-white'
                          : isCurrent
                          ? 'bg-[#8A1538] text-white ring-4 ring-[#8A1538]/20 shadow-xs'
                          : isPassed
                          ? 'bg-[#2E7D4F] text-white'
                          : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {(isPassed && !isCurrent) || (isDelivered && isCurrent) ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <div className="font-bold text-xs text-[#1F1B16]">{step.label}</div>
                    <div className="text-[11px] text-[#6B6258] mt-0.5 leading-snug">{step.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {order && (
        <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 sm:p-8 shadow-xs space-y-6">
          {/* Status & Fulfillment Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[#E8DFD2]">
            <div className="space-y-1">
              <span className="text-xs text-[#6B6258] font-medium flex items-center gap-1">
                {isTakeaway ? (
                  <Store className="w-3.5 h-3.5 text-[#8A1538]" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-[#8A1538]" />
                )}
                <span>Fulfillment Mode</span>
              </span>
              <div className="font-bold text-sm text-[#1F1B16]">
                {isTakeaway ? '🏪 Store Counter Pickup (Takeaway)' : '🚚 Fresh Direct Delivery (Barabanki)'}
              </div>
              {isTakeaway && order.slot_snapshot?.slot_time_formatted && (
                <p className="text-xs text-[#8A1538] font-semibold flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  Slot: {order.slot_snapshot.slot_time_formatted}
                  {order.slot_snapshot.slot_date ? ` (${order.slot_snapshot.slot_date})` : ''}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-xs text-[#6B6258] font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#8A1538]" />
                <span>{isTakeaway ? 'Pickup Location' : 'Delivery Destination'}</span>
              </span>
              <div className="font-bold text-sm text-[#1F1B16]">
                {isTakeaway ? (
                  <span>Saraswati Sweets Counter, Main Road, Barabanki</span>
                ) : (
                  <span>
                    {order.address_snapshot?.street_address || 'Address provided'},{' '}
                    {order.address_snapshot?.city || 'Barabanki'} ({order.address_snapshot?.pincode || '225001'})
                  </span>
                )}
              </div>
              {isTakeaway && (
                <p className="text-[11px] text-[#6B6258]">
                  * Please present Order #{orderNumber} at the shop counter.
                </p>
              )}
            </div>
          </div>

          {/* Items breakdown */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-base text-[#1F1B16] flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#8A1538]" />
              <span>Items in Your Box</span>
            </h3>

            <div className="divide-y divide-[#E8DFD2] text-xs">
              {order.items?.map((item: any, idx: number) => (
                <div key={item.id || idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-[#1F1B16]">{item.product_name}</span>
                    <span className="text-[#6B6258] ml-2">
                      ({item.variant_label}) × {item.quantity}
                    </span>
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
                {order.delivery_charge === 0
                  ? isTakeaway
                    ? 'FREE (Store Pickup)'
                    : 'FREE'
                  : formatINR(order.delivery_charge)}
              </span>
            </div>

            <div className="pt-2 border-t border-[#E8DFD2] flex justify-between items-baseline text-base font-bold text-[#1F1B16]">
              <span>
                {order.payment_method === 'ONLINE'
                  ? isPaidCaptured
                    ? 'Total Paid (Cashfree)'
                    : 'Online Payment Amount'
                  : 'Cash on Delivery Total'}
              </span>
              <span className="text-xl font-display text-[#8A1538] tabular-nums">
                {formatINR(order.total_amount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {isAuthenticated ? (
          <a
            href="/orders"
            onClick={(e) => {
              if (shouldHandleSpaClick(e)) {
                e.preventDefault();
                onViewOrders();
              }
            }}
            className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <FileText className="w-4 h-4 text-[#F6E08B]" />
            <span>View All My Orders</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={openAuthModal}
            className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Lock className="w-4 h-4 text-[#F6E08B]" />
            <span>Sign In to Save Order History</span>
          </button>
        )}

        <a
          href="/catalog"
          onClick={(e) => {
            if (shouldHandleSpaClick(e)) {
              e.preventDefault();
              onContinueShopping();
            }
          }}
          className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-white border border-[#E8DFD2] hover:bg-[#F3EBE0] text-[#1F1B16] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          <span>Back to Sweet Catalog</span>
        </a>
      </div>
    </div>
  );
};
