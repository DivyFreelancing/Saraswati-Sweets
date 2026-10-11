import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAddresses, UserAddress, SERVICEABLE_PINCODES } from '../context/AddressContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PriceDisplay } from '../components/common/PriceDisplay';
import { formatINR } from '../utils/formatters';
import { loadCashfreeScript } from '../utils/cashfreeLoader';
import {
  MapPin,
  Banknote,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Package,
  Truck,
  Store,
  Clock,
  Calendar,
} from 'lucide-react';

interface CheckoutPageProps {
  onBackToMenu: () => void;
  onOrderSuccess: (orderNumber: string) => void;
}

export interface StoreAvailability {
  delivery_enabled: boolean;
  takeaway_enabled: boolean;
  closure_message: string | null;
  pickup_opening_time: string;
  pickup_closing_time: string;
  pickup_slot_duration_minutes: number;
  pickup_max_orders_per_slot: number;
  pickup_advance_days: number;
  auto_reopen_at: string | null;
  store_address?: string;
  store_phone?: string;
}

export interface PickupSlot {
  time_12h: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  available_capacity: number;
  is_available: boolean;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onBackToMenu,
  onOrderSuccess,
}) => {
  const { items, subtotal, savings, deliveryCharge, total, clearCart } = useCart();
  const { addresses, defaultAddress, addAddress } = useAddresses();
  const { user, isAuthenticated, isLoading: isAuthLoading, openAuthModal, getAuthHeaders, getValidAuthHeaders, refreshAuthSession } = useAuth();
  const { showToast } = useToast();

  const [fulfilmentType, setFulfilmentType] = useState<'DELIVERY' | 'TAKEAWAY'>('DELIVERY');
  const [storeAvailability, setStoreAvailability] = useState<StoreAvailability | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedPickupDate, setSelectedPickupDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [selectedPickupSlot, setSelectedPickupSlot] = useState<PickupSlot | null>(null);

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);

  const [specialInstructions, setSpecialInstructions] = useState('');
  const [packagingNotes, setPackagingNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const orderIdFromUrl = searchParams.get('order_id');
  const isPaymentReturn = Boolean(orderIdFromUrl);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(isPaymentReturn);
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'pending' | 'failed' | null>(
    isPaymentReturn ? 'verifying' : null
  );
  const [guestPhoneInput, setGuestPhoneInput] = useState('');
  const [isPromptingGuestPhone, setIsPromptingGuestPhone] = useState(false);

  // Helper to generate selectable pickup dates based on advance days
  const getAvailableDates = (advanceDays: number = 3) => {
    const dates: { dateStr: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < Math.max(1, advanceDays); i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      let label = '';
      if (i === 0) label = 'Today';
      else if (i === 1) label = 'Tomorrow';
      else {
        label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      }
      dates.push({ dateStr, label });
    }
    return dates;
  };

  // Inline address creation state (for guest or when user has no saved address)
  const [guestAddress, setGuestAddress] = useState({
    recipient_name: '',
    recipient_phone: user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '',
    street_address: '',
    landmark: '',
    city: 'Barabanki',
    state: 'Uttar Pradesh',
    pincode: '225001',
  });

  const [showAddAddressForm, setShowAddAddressForm] = useState(addresses.length === 0);

  // Fetch store operational availability
  useEffect(() => {
    let isMounted = true;
    async function fetchAvailability() {
      try {
        setIsLoadingAvailability(true);
        const res = await fetch('/api/checkout/availability');
        if (res.ok) {
          const data: StoreAvailability = await res.json();
          if (isMounted) {
            setStoreAvailability(data);
            if (!data.delivery_enabled && data.takeaway_enabled) {
              setFulfilmentType('TAKEAWAY');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load store availability:', err);
      } finally {
        if (isMounted) setIsLoadingAvailability(false);
      }
    }
    fetchAvailability();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch pickup slots when takeaway mode is active or pickup date changes
  useEffect(() => {
    if (fulfilmentType !== 'TAKEAWAY') return;

    let isMounted = true;
    async function fetchSlots() {
      try {
        setIsLoadingSlots(true);
        const res = await fetch(`/api/checkout/pickup-slots?date=${selectedPickupDate}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const slots: PickupSlot[] = data.slots || [];
            setPickupSlots(slots);
            // Default to first available slot if not selected
            const currentStillValid = slots.find(
              (s) => s.start_time === selectedPickupSlot?.start_time && s.is_available
            );
            if (!currentStillValid) {
              const firstAvail = slots.find((s) => s.is_available);
              setSelectedPickupSlot(firstAvail || null);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load pickup slots:', err);
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    }
    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [fulfilmentType, selectedPickupDate]);

  // Lock to Online payment when Takeaway is chosen
  useEffect(() => {
    if (fulfilmentType === 'TAKEAWAY') {
      setPaymentMethod('ONLINE');
    }
  }, [fulfilmentType]);

  useEffect(() => {
    if (user) {
      setGuestAddress((prev) => ({
        ...prev,
        // Bug #2 fix: only pre-fill name if user has a real non-empty name saved
        recipient_name: prev.recipient_name || (user.full_name && user.full_name.trim() ? user.full_name.trim() : ''),
        recipient_phone: prev.recipient_phone || (user.phone ? user.phone.replace(/\D/g, '').slice(-10) : ''),
      }));
    }
  }, [user]);

  // Set default address when loaded
  useEffect(() => {
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
    } else if (addresses.length > 0) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [defaultAddress, addresses]);

  // Proactively preload Cashfree SDK on Checkout mount without blocking initial page render
  useEffect(() => {
    loadCashfreeScript().catch(() => {});
  }, []);

  // Handle Coupon Apply via Server-side Validation
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCode).toUpperCase().trim();
    if (!code) return;

    try {
      const res = await fetch('/api/cart/apply-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          code,
          subtotal,
          guestPhone: guestAddress.recipient_phone,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCouponDiscount(data.discount);
        setAppliedCoupon(data.coupon.code);
        showToast(data.message || `Coupon '${data.coupon.code}' applied: ₹${data.discount} Off!`, 'success');
      } else {
        showToast(data.message || 'Invalid or ineligible coupon code.', 'error');
      }
    } catch (err) {
      showToast('Failed to validate coupon with Barabanki store server.', 'error');
    }
  };

  const effectiveDeliveryCharge = fulfilmentType === 'TAKEAWAY' ? 0 : (subtotal > 0 ? 50 : 0);
  const effectiveTotal = Math.max(0, subtotal - couponDiscount + effectiveDeliveryCharge);
  const isCodLimitExceeded = effectiveTotal > 2000;

  // Place Order Action
  const handlePlaceOrder = async () => {
    setErrorMessage('');

    if (!isAuthenticated) {
      showToast('Please sign in with your email to place an order.', 'info');
      openAuthModal();
      return;
    }

    const cleanPhoneDigits = user?.phone ? user.phone.replace(/\D/g, '') : '';
    const hasValidPhone = cleanPhoneDigits.length >= 10 && cleanPhoneDigits.slice(-10).length === 10;
    const hasValidName = Boolean(user?.full_name && user.full_name.trim().length > 0);

    if (isAuthenticated && (!hasValidPhone || !hasValidName)) {
      showToast('Please complete your profile (name and mobile) to continue.', 'info');
      openAuthModal();
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your mithai box is empty.');
      return;
    }

    // Check store availability
    if (storeAvailability) {
      if (fulfilmentType === 'DELIVERY' && !storeAvailability.delivery_enabled) {
        setErrorMessage(storeAvailability.closure_message || 'Home delivery is currently paused by store management.');
        return;
      }
      if (fulfilmentType === 'TAKEAWAY' && !storeAvailability.takeaway_enabled) {
        setErrorMessage(storeAvailability.closure_message || 'Store pickup / takeaway is currently paused by store management.');
        return;
      }
    }

    // Determine target address & validate based on fulfilment type
    let finalAddress: any = null;
    if (fulfilmentType === 'TAKEAWAY') {
      if (!selectedPickupSlot) {
        setErrorMessage('Please select a pickup time slot for your takeaway order.');
        return;
      }
      if (!selectedPickupSlot.is_available) {
        setErrorMessage('The selected pickup time slot is no longer available. Please select another slot.');
        return;
      }
      if (!guestAddress.recipient_name || !guestAddress.recipient_phone) {
        setErrorMessage('Please enter your full name and 10-digit mobile number for counter pickup verification.');
        return;
      }
      if (paymentMethod !== 'ONLINE') {
        setErrorMessage('Store pickup / takeaway orders require advance online payment via Cashfree.');
        return;
      }

      finalAddress = {
        recipient_name: guestAddress.recipient_name.trim(),
        recipient_phone: guestAddress.recipient_phone.trim(),
        street_address: 'Store Pickup Counter, Saraswati Sweets',
        city: 'Barabanki',
        state: 'Uttar Pradesh',
        pincode: '225001',
      };
    } else {
      if (addresses.length > 0 && selectedAddressId && !showAddAddressForm) {
        finalAddress = addresses.find((a) => a.id === selectedAddressId);
      } else {
        if (!guestAddress.recipient_name || !guestAddress.recipient_phone || !guestAddress.street_address) {
          setErrorMessage('Please enter complete recipient name, phone, and street address.');
          return;
        }
        finalAddress = guestAddress;
      }
    }

    if (paymentMethod === 'COD' && (fulfilmentType === 'TAKEAWAY' || isCodLimitExceeded)) {
      setErrorMessage(
        fulfilmentType === 'TAKEAWAY'
          ? 'Store takeaway orders must be prepaid online via Cashfree.'
          : 'Cash on Delivery is limited to orders up to ₹2,000 per store policy. Please choose Online Payment.'
      );
      return;
    }

    setIsPlacingOrder(true);

    try {
      // 1. Generate unique Idempotency-Key
      const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          ...(await getValidAuthHeaders()),
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            item_type: i.item_type || (i.variantId.startsWith('hamper-') ? 'HAMPER' : 'PRODUCT'),
          })),
          fulfilment_type: fulfilmentType,
          pickup_slot:
            fulfilmentType === 'TAKEAWAY' && selectedPickupSlot
              ? {
                  slot_date: selectedPickupDate,
                  slot_time_formatted: selectedPickupSlot.time_12h,
                  start_time: selectedPickupSlot.start_time,
                  end_time: selectedPickupSlot.end_time,
                }
              : undefined,
          address: finalAddress,
          coupon_code: appliedCoupon || undefined,
          special_instructions: specialInstructions || undefined,
          packaging_notes: packagingNotes || undefined,
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setErrorMessage('Authentication required. Please sign in to complete your order.');
        showToast('Please sign in to place your order. Your cart items are preserved!', 'error');
        openAuthModal();
        setIsPlacingOrder(false);
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.message || 'Failed to place order.');
        setIsPlacingOrder(false);
        return;
      }

      // If Cash on Delivery, order is confirmed immediately
      if (paymentMethod === 'COD') {
        await clearCart();
        showToast('Order confirmed! We are preparing your sweets fresh.', 'success');
        onOrderSuccess(data.order.order_number);
        return;
      }

      // If Online Payment, launch Cashfree Checkout modal
      if (data.cashfree) {
        try {
          if (finalAddress?.recipient_phone) {
            const cleanPhone = finalAddress.recipient_phone.replace(/\D/g, '').slice(-10);
            sessionStorage.setItem('ss_checkout_phone', cleanPhone);
            sessionStorage.setItem('guest_checkout_phone', cleanPhone);
          }
          if (data.order?.order_number) {
            sessionStorage.setItem('ss_checkout_order_number', data.order.order_number);
          }
          const CashfreeFactory = await loadCashfreeScript();
          const cashfree = await CashfreeFactory({
            mode: "sandbox" // Change to production in live
          });
          cashfree.checkout({
            paymentSessionId: data.cashfree.payment_session_id,
            returnUrl: window.location.origin + "/checkout?order_id={order_id}"
          });
        } catch (sdkErr: any) {
          showToast('Cashfree script failed to load. Please refresh.', 'error');
          setIsPlacingOrder(false);
        }
      } else {
        await clearCart();
        onOrderSuccess(data.order.order_number);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while placing order.');
      setIsPlacingOrder(false);
    }
  };


  // Cashfree redirect handler
  useEffect(() => {
    if (!orderIdFromUrl) return;

    // Must wait until Supabase auth initialization completes
    if (isAuthLoading) return;

    let isMounted = true;

    async function verifyReturnPayment() {
      setIsVerifyingPayment(true);
      setVerificationStatus('verifying');
      setErrorMessage('');

      try {
        // 1. Retrieve valid auth headers if logged in
        let headers = await getValidAuthHeaders();
        let isGuestVerification = false;
        let storedPhone = '';

        let res: Response;
        if (headers.Authorization) {
          // Logged-in path (strictly unchanged)
          res = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body: JSON.stringify({ cashfree_order_id: orderIdFromUrl }),
          });

          // If 401 Unauthorized, token may have expired while completing OTP verification on Cashfree.
          // Attempt safe session refresh and retry once.
          if (res.status === 401) {
            console.log('[Checkout] Verify received 401, attempting token refresh...');
            const freshHeaders = await refreshAuthSession();
            if (freshHeaders?.Authorization) {
              res = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...freshHeaders,
                },
                body: JSON.stringify({ cashfree_order_id: orderIdFromUrl }),
              });
            }
          }
        } else {
          // Guest path: no auth headers required!
          isGuestVerification = true;
          storedPhone =
            sessionStorage.getItem('ss_checkout_phone') ||
            sessionStorage.getItem('guest_checkout_phone') ||
            sessionStorage.getItem(`guest_phone_${orderIdFromUrl}`) ||
            guestAddress.recipient_phone ||
            '';

          if (storedPhone) {
            const cleanPhone = storedPhone.replace(/\D/g, '').slice(-10);
            res = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cashfree_order_id: orderIdFromUrl,
                phone: cleanPhone,
              }),
            });
          } else {
            // Need phone for guest verification; prompt guest cleanly without auth wall
            if (isMounted) {
              setIsPromptingGuestPhone(true);
              setIsVerifyingPayment(false);
            }
            return;
          }
        }

        const data = await res.json();
        if (!isMounted) return;

        if (res.status === 401 && !isGuestVerification) {
          setErrorMessage('Your session has expired. Please sign in to verify your payment.');
          setIsVerifyingPayment(false);
          setVerificationStatus('failed');
          openAuthModal();
          return;
        }

        if (data.success || data.idempotent) {
          let confirmedOrderNumber = data.order?.order_number || orderIdFromUrl;

          // For guests, also call /api/orders/guest-status for authoritative status
          if (isGuestVerification && storedPhone) {
            try {
              const statusRes = await fetch('/api/orders/guest-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order_number: confirmedOrderNumber,
                  phone: storedPhone.replace(/\D/g, '').slice(-10),
                }),
              });
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.order?.order_number) {
                  confirmedOrderNumber = statusData.order.order_number;
                }
              }
            } catch (_) {}
          }

          setVerificationStatus('success');
          await clearCart();
          showToast('Payment verified successfully! Fresh sweets are being prepared.', 'success');
          window.history.replaceState({}, '', '/checkout');
          onOrderSuccess(confirmedOrderNumber);
        } else if (data.pending) {
          setVerificationStatus('pending');
          setErrorMessage('Payment verification is pending confirmation from Cashfree. Please check your order history in a few minutes.');
          setIsVerifyingPayment(false);
        } else {
          setVerificationStatus('failed');
          setErrorMessage(data.message || 'Payment was not successful or was cancelled.');
          setIsVerifyingPayment(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setVerificationStatus('failed');
          setErrorMessage(err.message || 'Network error communicating with payment verification server.');
          setIsVerifyingPayment(false);
        }
      }
    }

    verifyReturnPayment();

    return () => {
      isMounted = false;
    };
  }, [orderIdFromUrl, isAuthLoading, getValidAuthHeaders, refreshAuthSession, clearCart, showToast, onOrderSuccess, openAuthModal, guestAddress.recipient_phone]);

  const handleGuestPhoneVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanPhone = guestPhoneInput.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsVerifyingPayment(true);
    setVerificationStatus('verifying');
    setIsPromptingGuestPhone(false);

    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashfree_order_id: orderIdFromUrl,
          phone: cleanPhone,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.success || data.idempotent)) {
        try {
          sessionStorage.setItem('ss_checkout_phone', cleanPhone);
          sessionStorage.setItem('guest_checkout_phone', cleanPhone);
          sessionStorage.setItem(`guest_phone_${orderIdFromUrl}`, cleanPhone);
          if (data.order?.order_number) {
            sessionStorage.setItem(`guest_phone_${data.order.order_number}`, cleanPhone);
          }
        } catch (_) {}

        // Also query guest-status as requested
        let confirmedOrderNumber = data.order?.order_number || orderIdFromUrl;
        try {
          const statusRes = await fetch('/api/orders/guest-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_number: confirmedOrderNumber,
              phone: cleanPhone,
            }),
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.order?.order_number) {
              confirmedOrderNumber = statusData.order.order_number;
            }
          }
        } catch (_) {}

        setVerificationStatus('success');
        await clearCart();
        showToast('Payment verified successfully! Fresh sweets are being prepared.', 'success');
        window.history.replaceState({}, '', '/checkout');
        onOrderSuccess(confirmedOrderNumber);
      } else {
        setVerificationStatus('failed');
        setErrorMessage(data.message || 'Verification failed. Please check your mobile number and retry.');
        setIsPromptingGuestPhone(true);
        setIsVerifyingPayment(false);
      }
    } catch (err: any) {
      setVerificationStatus('failed');
      setErrorMessage(err.message || 'Network error verifying payment.');
      setIsPromptingGuestPhone(true);
      setIsVerifyingPayment(false);
    }
  };

  if (isPaymentReturn && isPromptingGuestPhone) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#FAF4DE] text-[#7A1129] flex items-center justify-center mx-auto border border-[#C79A3D]/40 shadow-xs">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#221A14]">
            Verify Order Payment
          </h2>
          <p className="text-sm text-[#6E6259] leading-relaxed">
            Please enter the 10-digit mobile number used at checkout to finalize payment verification for order Reference: <strong className="font-mono text-[#7A1129]">{orderIdFromUrl}</strong>.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#FAF4DE] border border-[#B3261E]/40 text-xs text-[#8A1538] font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleGuestPhoneVerificationSubmit} className="space-y-4 text-left">
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

          <button
            type="submit"
            className="w-full min-h-[48px] py-3 px-6 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] text-white font-semibold text-sm transition-colors shadow-sm"
          >
            Verify Payment & View Confirmation
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

  if (isVerifyingPayment) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#FAF4DE] border-2 border-[#C79A3D]/40 flex items-center justify-center mx-auto shadow-sm">
          <div className="w-10 h-10 border-3 border-[#7A1129] border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#221A14]">
            Verifying Payment
          </h2>
          <p className="text-sm sm:text-base text-[#6E6259] max-w-md mx-auto leading-relaxed">
            Confirming your transaction with Cashfree and locking your fresh sweets batch. Please do not close or refresh this page...
          </p>
        </div>
        {orderIdFromUrl && (
          <div className="inline-block px-4 py-2 rounded-xl bg-[#FAF4DE] border border-[#C79A3D]/40 text-xs text-[#7A1129] font-medium">
            Order Reference: <span className="font-mono font-bold">{orderIdFromUrl}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1F1B16] tracking-tight">
          Checkout & Fresh Delivery
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[#6B6258]">
          Review your Barabanki delivery address, order details, and payment preferences.
        </p>
      </div>

      {/* Authentication Required Banner if guest */}
      {!isAuthLoading && !isAuthenticated && !isPaymentReturn && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#FAF4DE] to-[#F5EAD9] border border-[#C79A3D]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#7A1129] text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-[#FAF4DE]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#221A14]">
                Sign In Required to Complete Order
              </h3>
              <p className="text-xs sm:text-sm text-[#6E6259] leading-relaxed">
                Placing an order requires logging in with your phone or email. Your cart items are saved and will sync automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAuthModal}
            className="shrink-0 min-h-[44px] px-6 py-2.5 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            Sign In with Email
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#FAF4DE] border border-[#B3261E]/40 text-sm text-[#8A1538] font-medium flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#B3261E]" />
            <div>
              <div className="font-bold">Payment Notice</div>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
          {isPaymentReturn && (
            <button
              type="button"
              onClick={() => {
                setErrorMessage('');
                window.history.replaceState({}, '', '/checkout');
              }}
              className="text-xs font-semibold underline text-[#7A1129] hover:text-[#5E0D20] shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Options */}
        <div className="lg:col-span-7 space-y-6">

          {/* Fulfilment Method Choice */}
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-bold text-lg text-[#1F1B16]">
                <Package className="w-5 h-5 text-[#8A1538]" />
                <span>Choose How You'll Receive Your Order</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#FAF4DE] text-[#8A1538] border border-[#C79A3D]/40">
                Fresh from Barabanki
              </span>
            </div>

            {storeAvailability && !storeAvailability.delivery_enabled && !storeAvailability.takeaway_enabled ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span>Store Currently Closed for New Orders</span>
                </div>
                <p className="text-xs leading-relaxed">
                  {storeAvailability.closure_message ||
                    'We are temporarily paused for both home delivery and takeaway. Please check back shortly!'}
                </p>
                {storeAvailability.auto_reopen_at && (
                  <div className="text-[11px] font-semibold text-amber-800">
                    Expected reopening: {new Date(storeAvailability.auto_reopen_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Home Delivery Option */}
                <button
                  type="button"
                  disabled={storeAvailability ? !storeAvailability.delivery_enabled : false}
                  onClick={() => setFulfilmentType('DELIVERY')}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 ${
                    fulfilmentType === 'DELIVERY'
                      ? 'border-[#8A1538] bg-[#F7E9EE] shadow-xs ring-1 ring-[#8A1538]'
                      : 'border-[#E8DFD2] hover:bg-[#FBF7F1]'
                  } ${storeAvailability && !storeAvailability.delivery_enabled ? 'opacity-50 cursor-not-allowed bg-stone-100' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        fulfilmentType === 'DELIVERY' ? 'bg-[#8A1538] text-white' : 'bg-[#FAF4DE] text-[#8A1538]'
                      }`}
                    >
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#1F1B16]">Home Delivery</span>
                        <span className="text-xs font-bold text-[#8A1538] bg-white px-2 py-0.5 rounded border border-[#E8DFD2]">
                          Flat ₹50
                        </span>
                      </div>
                      <p className="text-xs text-[#6B6258] mt-1">
                        Doorstep delivery across Barabanki serviceable pincodes.
                      </p>
                    </div>
                  </div>
                  {storeAvailability && !storeAvailability.delivery_enabled && (
                    <div className="mt-1 pt-2 border-t border-red-200/60 space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-100/90 px-2 py-0.5 rounded">
                        <span>Doorstep Delivery Paused</span>
                      </div>
                      <p className="text-[11px] text-[#8A1538] font-medium leading-relaxed">
                        {storeAvailability.closure_message ||
                          'Home delivery is temporarily paused due to festival rush. Store counter pickup is available!'}
                      </p>
                    </div>
                  )}
                </button>

                {/* 2. Store Pickup / Takeaway Option */}
                <button
                  type="button"
                  disabled={storeAvailability ? !storeAvailability.takeaway_enabled : false}
                  onClick={() => setFulfilmentType('TAKEAWAY')}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 ${
                    fulfilmentType === 'TAKEAWAY'
                      ? 'border-[#8A1538] bg-[#F7E9EE] shadow-xs ring-1 ring-[#8A1538]'
                      : 'border-[#E8DFD2] hover:bg-[#FBF7F1]'
                  } ${storeAvailability && !storeAvailability.takeaway_enabled ? 'opacity-50 cursor-not-allowed bg-stone-100' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        fulfilmentType === 'TAKEAWAY' ? 'bg-[#2E7D4F] text-white' : 'bg-emerald-50 text-[#2E7D4F]'
                      }`}
                    >
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#1F1B16]">Store Pickup (Takeaway)</span>
                        <span className="text-xs font-bold text-[#2E7D4F] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          FREE (₹0)
                        </span>
                      </div>
                      <p className="text-xs text-[#6B6258] mt-1">
                        Packaged fresh for your selected slot at our Barabanki counter.
                      </p>
                    </div>
                  </div>
                  {storeAvailability && !storeAvailability.takeaway_enabled && (
                    <div className="mt-1 pt-2 border-t border-red-200/60 space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-100/90 px-2 py-0.5 rounded">
                        <span>Store Pickup Paused</span>
                      </div>
                      <p className="text-[11px] text-[#8A1538] font-medium leading-relaxed">
                        {storeAvailability.closure_message ||
                          'Store counter pickup is temporarily unavailable.'}
                      </p>
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Conditional Step 1: Takeaway Scheduling vs Delivery Address */}
          {fulfilmentType === 'TAKEAWAY' ? (
            /* 1. Store Pickup Scheduling & Customer Details */
            <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display font-bold text-lg text-[#1F1B16]">
                  <Store className="w-5 h-5 text-[#8A1538]" />
                  <span>1. Pickup Scheduling & Customer Details</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#2E7D4F] border border-emerald-200">
                  ₹0 Delivery Fee
                </span>
              </div>

              {/* Counter Location Card */}
              <div className="p-4 rounded-xl bg-[#FAF4DE]/70 border border-[#C79A3D]/40 space-y-1.5 text-xs">
                <div className="font-bold text-sm text-[#1F1B16] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#8A1538]" />
                  <span>Saraswati Sweets Store Counter</span>
                </div>
                <div className="text-[#6B6258]">
                  Main Market, Opposite Ghantaghar, Barabanki, UP - 225001
                </div>
                <div className="text-[#8A1538] font-medium pt-0.5">
                  Counter Operating Hours: {storeAvailability?.pickup_opening_time || '09:00'} - {storeAvailability?.pickup_closing_time || '21:30'} IST
                </div>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                    Your Name (For Counter Pickup) *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestAddress.recipient_name}
                    onChange={(e) => setGuestAddress({ ...guestAddress, recipient_name: e.target.value })}
                    placeholder="e.g. Ramesh Srivastava"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                    Mobile Number (For Verification SMS) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={guestAddress.recipient_phone}
                    onChange={(e) => setGuestAddress({ ...guestAddress, recipient_phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
                  />
                </div>
              </div>

              {/* Pickup Date Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16]">
                  Select Pickup Date
                </label>
                <div className="flex flex-wrap gap-2">
                  {getAvailableDates(storeAvailability?.pickup_advance_days || 3).map((d) => (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setSelectedPickupDate(d.dateStr)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedPickupDate === d.dateStr
                          ? 'bg-[#8A1538] text-white shadow-xs'
                          : 'bg-[#FBF7F1] text-[#6B6258] border border-[#E8DFD2] hover:bg-stone-100'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pickup Time Slots */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16]">
                    Select Pickup Time Slot
                  </label>
                  <span className="text-[11px] text-[#6B6258]">
                    Duration: {storeAvailability?.pickup_slot_duration_minutes || 30} mins
                  </span>
                </div>

                {isLoadingSlots ? (
                  <div className="py-8 text-center text-xs text-[#6B6258]">
                    <div className="w-6 h-6 border-2 border-[#8A1538] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Checking slot availability...
                  </div>
                ) : pickupSlots.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    No pickup slots remaining for this date. Store may be past operating hours.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {pickupSlots.map((slot) => {
                      const isSelected = selectedPickupSlot?.start_time === slot.start_time;
                      return (
                        <button
                          key={slot.start_time}
                          type="button"
                          disabled={!slot.is_available}
                          onClick={() => setSelectedPickupSlot(slot)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-[#8A1538] bg-[#F7E9EE] ring-1 ring-[#8A1538]'
                              : slot.is_available
                              ? 'border-[#E8DFD2] hover:bg-[#FBF7F1]'
                              : 'border-stone-200 bg-stone-100 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="font-bold text-xs text-[#1F1B16] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#8A1538]" />
                            <span>{slot.time_12h}</span>
                          </div>
                          <div className="text-[10px] mt-1">
                            {slot.is_available ? (
                              <span className="text-[#2E7D4F] font-semibold">
                                {slot.available_capacity} slots left
                              </span>
                            ) : (
                              <span className="text-stone-400 font-medium">Sold Out / Passed</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 1. Delivery Address in Barabanki */
            <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display font-bold text-lg text-[#1F1B16]">
                  <MapPin className="w-5 h-5 text-[#8A1538]" />
                  <span>1. Delivery Address in Barabanki</span>
                </div>

                {addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddAddressForm(!showAddAddressForm)}
                    className="text-xs font-semibold text-[#8A1538] hover:underline"
                  >
                    {showAddAddressForm ? 'Select from Saved' : '+ New Address'}
                  </button>
                )}
              </div>

              {/* Saved Address List */}
              {addresses.length > 0 && !showAddAddressForm ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-[#8A1538] bg-[#F7E9EE] shadow-xs'
                          : 'border-[#E8DFD2] hover:bg-[#FBF7F1]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="address_choice"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 text-[#8A1538] focus:ring-[#8A1538]"
                        />
                        <div className="flex-1 text-xs">
                          <div className="font-bold text-sm text-[#1F1B16] flex items-center justify-between">
                            <span>
                              {addr.recipient_name} ({addr.label})
                            </span>
                            {addr.is_default && (
                              <span className="text-[10px] font-bold text-[#2E7D4F] bg-emerald-50 px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-[#6B6258] mt-0.5">Phone: {addr.recipient_phone}</div>
                          <div className="text-[#1F1B16] mt-1 leading-relaxed">
                            {addr.street_address}
                            {addr.landmark ? `, Near ${addr.landmark}` : ''}, {addr.city} -{' '}
                            <strong className="text-[#8A1538]">{addr.pincode}</strong>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                /* Inline Address Form */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestAddress.recipient_name}
                      onChange={(e) => setGuestAddress({ ...guestAddress, recipient_name: e.target.value })}
                      placeholder="e.g. Ramesh Srivastava"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={guestAddress.recipient_phone}
                      onChange={(e) => setGuestAddress({ ...guestAddress, recipient_phone: e.target.value })}
                      placeholder="10-digit mobile"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                      House / Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestAddress.street_address}
                      onChange={(e) => setGuestAddress({ ...guestAddress, street_address: e.target.value })}
                      placeholder="House number, apartment name, street"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={guestAddress.landmark}
                      onChange={(e) => setGuestAddress({ ...guestAddress, landmark: e.target.value })}
                      placeholder="e.g. Near Ghantaghar"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                      Barabanki Pincode *
                    </label>
                    <select
                      value={guestAddress.pincode}
                      onChange={(e) => setGuestAddress({ ...guestAddress, pincode: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-white text-sm font-medium focus:outline-none focus:border-[#8A1538]"
                    >
                      <option value="225001">225001 (City / Ghantaghar)</option>
                      <option value="225002">225002 (Civil Lines)</option>
                      <option value="225003">225003 (Deva Road)</option>
                      <option value="225122">225122 (Satrikh Road)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Payment Method */}
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-bold text-lg text-[#1F1B16]">
                <Banknote className="w-5 h-5 text-[#8A1538]" />
                <span>2. Payment Method</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#2E7D4F]/10 text-[#2E7D4F]">
                {paymentMethod === 'ONLINE' ? 'Cashfree Secure' : 'Cash on Delivery'}
              </span>
            </div>

            {fulfilmentType === 'TAKEAWAY' && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#2E7D4F] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Advance online payment via Cashfree is required for all store takeaway orders to reserve your preparation slot.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Online Payment (Cashfree) */}
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  paymentMethod === 'ONLINE'
                    ? 'border-[#8A1538] bg-[#F7E9EE] shadow-xs ring-1 ring-[#8A1538]'
                    : 'border-[#E8DFD2] hover:bg-[#FBF7F1]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="payment_method_choice"
                    checked={paymentMethod === 'ONLINE'}
                    onChange={() => setPaymentMethod('ONLINE')}
                    className="mt-1 text-[#8A1538] focus:ring-[#8A1538]"
                  />
                  <div>
                    <div className="font-bold text-sm text-[#1F1B16] flex items-center gap-1.5">
                      <span>Online Payment</span>
                      <span className="text-[10px] font-bold text-[#8A1538] bg-[#FAF4DE] px-1.5 py-0.5 rounded border border-[#C9A227]/40">
                        {fulfilmentType === 'TAKEAWAY' ? 'Required for Takeaway' : 'Recommended'}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B6258] mt-1 leading-relaxed">
                      UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards, NetBanking.
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-[#2E7D4F] font-semibold flex items-center gap-1 border-t border-black/5 pt-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>100% Secure via Cashfree</span>
                </div>
              </label>

              {/* Option 2: Cash on Delivery (COD) - Disabled for takeaway */}
              <label
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  fulfilmentType === 'TAKEAWAY' || isCodLimitExceeded
                    ? 'opacity-50 cursor-not-allowed bg-stone-100 border-stone-200'
                    : paymentMethod === 'COD'
                    ? 'border-[#8A1538] bg-[#F7E9EE] shadow-xs ring-1 ring-[#8A1538] cursor-pointer'
                    : 'border-[#E8DFD2] hover:bg-[#FBF7F1] cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="payment_method_choice"
                    disabled={fulfilmentType === 'TAKEAWAY' || isCodLimitExceeded}
                    checked={paymentMethod === 'COD'}
                    onChange={() => {
                      if (fulfilmentType !== 'TAKEAWAY' && !isCodLimitExceeded) setPaymentMethod('COD');
                    }}
                    className="mt-1 text-[#8A1538] focus:ring-[#8A1538]"
                  />
                  <div>
                    <div className="font-bold text-sm text-[#1F1B16] flex items-center gap-1.5">
                      <span>Cash on Delivery</span>
                      {fulfilmentType === 'TAKEAWAY' ? (
                        <span className="text-[10px] font-bold text-stone-500 bg-stone-200 px-1.5 py-0.5 rounded">
                          Delivery Only
                        </span>
                      ) : isCodLimitExceeded ? (
                        <span className="text-[10px] font-bold text-[#B3261E] bg-red-100 px-1.5 py-0.5 rounded">
                          Exceeds ₹2,000
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[#6B6258] mt-1 leading-relaxed">
                      {fulfilmentType === 'TAKEAWAY'
                        ? 'COD is unavailable for store takeaway orders.'
                        : 'Pay cash or QR upon doorstep delivery in Barabanki.'}
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-[#8A1538] font-semibold border-t border-black/5 pt-2">
                  {fulfilmentType === 'TAKEAWAY' ? '• Not available for takeaway' : '• Allowed up to ₹2,000'}
                </div>
              </label>
            </div>

            {paymentMethod === 'COD' && isCodLimitExceeded && (
              <div className="p-3.5 rounded-xl bg-[#FAF4DE] border border-[#B3261E]/40 text-xs text-[#B3261E] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Order total of {formatINR(effectiveTotal)} exceeds the ₹2,000 COD limit. Please switch to Online Payment.</span>
              </div>
            )}
          </div>

          {/* 3. Special Instructions & Packaging Notes */}
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg text-[#1F1B16]">
              <Package className="w-5 h-5 text-[#8A1538]" />
              <span>3. Custom Notes & Packaging Request</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#6B6258] mb-1">
                  Packaging Note (e.g. Wedding Gift Ribbon, Festival Box)
                </label>
                <input
                  type="text"
                  value={packagingNotes}
                  onChange={(e) => setPackagingNotes(e.target.value)}
                  placeholder="e.g. Pack with festive gold ribbon and greeting label"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-xs focus:outline-none focus:border-[#8A1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B6258] mb-1">
                  Special Instructions
                </label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder={
                    fulfilmentType === 'TAKEAWAY'
                      ? 'e.g. Pack cold, add extra paper bags'
                      : 'e.g. Call upon arriving at gate, ring second bell'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-xs focus:outline-none focus:border-[#8A1538]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary, Coupons & Place Order */}
        <div className="lg:col-span-5 space-y-4">
          {/* Coupon Box */}
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#1F1B16]">
              <Tag className="w-4 h-4 text-[#8A1538]" />
              <span>Have a Coupon Code?</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. SWAD100"
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#8A1538]"
              />
              <button
                type="button"
                onClick={() => handleApplyCoupon()}
                className="px-4 py-2 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-xs font-bold shrink-0 transition-colors"
              >
                Apply
              </button>
            </div>

            {appliedCoupon ? (
              <div className="text-xs font-semibold text-[#2E7D4F] flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-lg">
                <span>Coupon {appliedCoupon} applied: -{formatINR(couponDiscount)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponDiscount(0);
                    setCouponCode('');
                  }}
                  className="text-stone-500 hover:text-stone-700 underline text-[11px]"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCouponCode('SWAD100');
                    handleApplyCoupon('SWAD100');
                  }}
                  className="text-[11px] font-semibold text-[#8A1538] bg-[#F7E9EE] px-2.5 py-1 rounded-md"
                >
                  Apply SWAD100 (₹100 Off)
                </button>
              </div>
            )}
          </div>

          {/* Authoritative Order Summary */}
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-5 shadow-xs space-y-4">
            <h3 className="font-display font-bold text-lg text-[#1F1B16] border-b border-[#E8DFD2] pb-3">
              Order Calculation (Authoritative)
            </h3>

            {/* Itemized previews */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {items.map((i) => (
                <div key={i.variantId} className="flex justify-between items-center text-[#1F1B16]">
                  <span className="truncate pr-2">
                    {i.productName} <span className="text-[#6B6258]">({i.variantLabel}) × {i.quantity}</span>
                  </span>
                  <span className="font-semibold tabular-nums shrink-0">{formatINR(i.itemTotal)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-3 border-t border-[#E8DFD2] text-xs text-[#6B6258]">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="text-[#1F1B16] font-medium tabular-nums">{formatINR(subtotal)}</span>
              </div>

              {savings > 0 && (
                <div className="flex justify-between text-[#2E7D4F]">
                  <span>Total Savings</span>
                  <span className="font-medium tabular-nums">- {formatINR(savings)}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex justify-between text-[#2E7D4F]">
                  <span>Coupon Discount</span>
                  <span className="font-medium tabular-nums">- {formatINR(couponDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>
                  {fulfilmentType === 'TAKEAWAY' ? 'Store Counter Pickup Fee' : 'Barabanki Delivery Charge'}
                </span>
                <span className="text-[#1F1B16] font-medium tabular-nums">
                  {effectiveDeliveryCharge === 0 ? (
                    <span className="text-[#2E7D4F] font-semibold">FREE (₹0)</span>
                  ) : (
                    formatINR(effectiveDeliveryCharge)
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-[#E8DFD2] flex justify-between items-baseline text-base font-bold text-[#1F1B16]">
                <span>
                  {fulfilmentType === 'TAKEAWAY'
                    ? 'Total (Prepay via Cashfree)'
                    : paymentMethod === 'ONLINE'
                    ? 'Total (Online via Cashfree)'
                    : 'Total (Pay with Cash)'}
                </span>
                <span className="text-2xl font-display text-[#8A1538] tabular-nums">
                  {formatINR(effectiveTotal)}
                </span>
              </div>
            </div>

            {/* Place Order CTA with Idempotency Guard */}
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={openAuthModal}
                className="w-full min-h-[48px] py-3 px-4 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] text-white font-semibold text-sm transition-all duration-150 shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Sign In with Phone to Place Order</span>
                <ArrowRight className="w-4 h-4 text-[#FAF4DE]" />
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  isPlacingOrder ||
                  items.length === 0 ||
                  (storeAvailability && !storeAvailability.delivery_enabled && !storeAvailability.takeaway_enabled) ||
                  (fulfilmentType === 'TAKEAWAY' && !selectedPickupSlot) ||
                  (paymentMethod === 'COD' && isCodLimitExceeded)
                }
                onClick={handlePlaceOrder}
                className="w-full min-h-[48px] py-3 px-4 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-150 shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>
                  {isPlacingOrder
                    ? 'Connecting Secure Gateway...'
                    : fulfilmentType === 'TAKEAWAY'
                    ? `Pay ${formatINR(effectiveTotal)} & Confirm Takeaway`
                    : paymentMethod === 'ONLINE'
                    ? `Pay ${formatINR(effectiveTotal)} with Cashfree`
                    : 'Place Cash on Delivery Order'}
                </span>
                <ArrowRight className="w-4 h-4 text-[#FAF4DE]" />
              </button>
            )}

            <div className="text-[11px] text-center text-[#6B6258] pt-1">
              Secured with one-time server transaction and duplicate-order protection.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
