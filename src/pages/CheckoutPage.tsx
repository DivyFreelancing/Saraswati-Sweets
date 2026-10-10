import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAddresses, UserAddress, SERVICEABLE_PINCODES } from '../context/AddressContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DeliverySlotSelector, ClientDeliverySlot } from '../components/common/DeliverySlotSelector';
import { PriceDisplay } from '../components/common/PriceDisplay';
import { formatINR } from '../utils/formatters';
import { loadCashfreeScript } from '../utils/cashfreeLoader';
import {
  MapPin,
  Clock,
  Banknote,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Package,
} from 'lucide-react';

interface CheckoutPageProps {
  onBackToMenu: () => void;
  onOrderSuccess: (orderNumber: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onBackToMenu,
  onOrderSuccess,
}) => {
  const { items, subtotal, savings, deliveryCharge, total, clearCart } = useCart();
  const { addresses, defaultAddress, addAddress } = useAddresses();
  const { user, isAuthenticated, isLoading: isAuthLoading, openAuthModal, getAuthHeaders, getValidAuthHeaders, refreshAuthSession } = useAuth();
  const { showToast } = useToast();

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<ClientDeliverySlot | null>(null);
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

  // Inline address creation state (for guest or when user has no saved address)
  const [guestAddress, setGuestAddress] = useState({
    // Bug #2 fix: Start recipient_name blank; the useEffect below will pre-fill only if user has a real name.
    recipient_name: '',
    recipient_phone: user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '',
    street_address: '',
    landmark: '',
    city: 'Barabanki',
    state: 'Uttar Pradesh',
    pincode: '225001',
  });

  const [showAddAddressForm, setShowAddAddressForm] = useState(addresses.length === 0);

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

  const effectiveTotal = Math.max(0, total - couponDiscount);
  const isCodLimitExceeded = effectiveTotal > 2000;

  // Place Order Action
  const handlePlaceOrder = async () => {
    setErrorMessage('');

    if (!isAuthenticated) {
      showToast('Please sign in with your email to place an order.', 'info');
      openAuthModal();
      return;
    }

    if (isAuthenticated && (!user?.phone || !user?.full_name)) {
      showToast('Please complete your profile (name and mobile) to continue.', 'info');
      openAuthModal();
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your mithai box is empty.');
      return;
    }

    if (!selectedSlot) {
      setErrorMessage('Please select a delivery slot.');
      return;
    }

    // Determine target address
    let finalAddress: any = null;
    if (addresses.length > 0 && selectedAddressId && !showAddAddressForm) {
      finalAddress = addresses.find((a) => a.id === selectedAddressId);
    } else {
      if (!guestAddress.recipient_name || !guestAddress.recipient_phone || !guestAddress.street_address) {
        setErrorMessage('Please enter complete recipient name, phone, and street address.');
        return;
      }
      finalAddress = guestAddress;
    }

    if (paymentMethod === 'COD' && isCodLimitExceeded) {
      setErrorMessage('Cash on Delivery is limited to orders up to ₹2,000 per store policy. Please choose Online Payment.');
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
          address: finalAddress,
          slot_id: selectedSlot.id,
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
          Review your Barabanki delivery address, time slot, and cash-on-delivery preferences.
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
          {/* 1. Address Section */}
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

            {/* Saved Address List (if available and not entering new) */}
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
                          <span>{addr.recipient_name} ({addr.label})</span>
                          {addr.is_default && (
                            <span className="text-[10px] font-bold text-[#2E7D4F] bg-emerald-50 px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-[#6B6258] mt-0.5">Phone: {addr.recipient_phone}</div>
                        <div className="text-[#1F1B16] mt-1 leading-relaxed">
                          {addr.street_address}{addr.landmark ? `, Near ${addr.landmark}` : ''}, {addr.city} - <strong className="text-[#8A1538]">{addr.pincode}</strong>
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

          {/* 2. Customer Delivery Slot Picker */}
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg text-[#1F1B16]">
              <Clock className="w-5 h-5 text-[#8A1538]" />
              <span>2. Delivery Date & Time Window</span>
            </div>

            <DeliverySlotSelector
              selectedSlotId={selectedSlot?.id}
              onSelectSlot={(s) => setSelectedSlot(s)}
            />
          </div>

          {/* 3. Payment Method: Online Cashfree vs COD */}
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-bold text-lg text-[#1F1B16]">
                <Banknote className="w-5 h-5 text-[#8A1538]" />
                <span>3. Payment Method</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#2E7D4F]/10 text-[#2E7D4F]">
                {paymentMethod === 'ONLINE' ? 'Cashfree Secure' : 'Cash on Delivery'}
              </span>
            </div>

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
                        Recommended
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

              {/* Option 2: Cash on Delivery (COD) */}
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  isCodLimitExceeded
                    ? 'opacity-60 cursor-not-allowed bg-stone-100 border-stone-200'
                    : paymentMethod === 'COD'
                    ? 'border-[#8A1538] bg-[#F7E9EE] shadow-xs ring-1 ring-[#8A1538]'
                    : 'border-[#E8DFD2] hover:bg-[#FBF7F1]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="payment_method_choice"
                    disabled={isCodLimitExceeded}
                    checked={paymentMethod === 'COD'}
                    onChange={() => {
                      if (!isCodLimitExceeded) setPaymentMethod('COD');
                    }}
                    className="mt-1 text-[#8A1538] focus:ring-[#8A1538]"
                  />
                  <div>
                    <div className="font-bold text-sm text-[#1F1B16] flex items-center gap-1.5">
                      <span>Cash on Delivery</span>
                      {isCodLimitExceeded && (
                        <span className="text-[10px] font-bold text-[#B3261E] bg-red-100 px-1.5 py-0.5 rounded">
                          Exceeds ₹2,000
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B6258] mt-1 leading-relaxed">
                      Pay cash or executive UPI QR upon doorstep delivery in Barabanki.
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-[#8A1538] font-semibold border-t border-black/5 pt-2">
                  • Allowed up to ₹2,000
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

          {/* 4. Special Instructions & Packaging Notes */}
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg text-[#1F1B16]">
              <Package className="w-5 h-5 text-[#8A1538]" />
              <span>4. Custom Notes & Packaging Request</span>
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
                  Special Delivery Instructions
                </label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Call upon arriving at gate, ring second bell"
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

              <div className="flex justify-between">
                <span>Barabanki Delivery Charge</span>
                <span className="text-[#1F1B16] font-medium tabular-nums">
                  {deliveryCharge === 0 ? 'FREE' : formatINR(deliveryCharge)}
                </span>
              </div>

              <div className="pt-3 border-t border-[#E8DFD2] flex justify-between items-baseline text-base font-bold text-[#1F1B16]">
                <span>{paymentMethod === 'ONLINE' ? 'Total (Online via Cashfree)' : 'Total (Pay with Cash)'}</span>
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
                  (paymentMethod === 'COD' && isCodLimitExceeded)
                }
                onClick={handlePlaceOrder}
                className="w-full min-h-[48px] py-3 px-4 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-150 shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>
                  {isPlacingOrder
                    ? 'Connecting Secure Gateway...'
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
