import React from 'react';
import { Truck, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

interface OrderSummaryProps {
  subtotal: number;
  savings?: number;
  deliveryCharge?: number;
  discount?: number;
  freeDeliveryThreshold?: number;
  onProceedToCheckout?: () => void;
  checkoutButtonLabel?: string;
  isProceedDisabled?: boolean;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  subtotal,
  savings = 0,
  deliveryCharge = 50,
  discount = 0,
  freeDeliveryThreshold = 0,
  onProceedToCheckout,
  checkoutButtonLabel = 'Proceed to Checkout',
  isProceedDisabled = false,
}) => {
  const effectiveDeliveryCharge = subtotal === 0 ? 0 : (deliveryCharge !== undefined ? deliveryCharge : 50);
  const grandTotal = Math.max(0, subtotal - discount + effectiveDeliveryCharge);

  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD2] p-5 sm:p-6 shadow-xs space-y-5">
      <h3 className="font-display font-bold text-lg text-[#1F1B16] border-b border-[#E8DFD2] pb-3">
        Order Summary
      </h3>

      {/* Flat delivery prompt bar */}
      <div className={`p-3 rounded-xl border ${effectiveDeliveryCharge === 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-[#F3EBE0]/70 border-[#E8DFD2]'}`}>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1F1B16]">
          {effectiveDeliveryCharge === 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#2E7D4F]" />
              <span>Store Pickup / Takeaway: <strong className="text-[#2E7D4F]">FREE (₹0 Delivery Fee)</strong></span>
            </>
          ) : (
            <>
              <Truck className="w-4 h-4 text-[#8A1538]" />
              <span>Flat <strong className="text-[#8A1538]">₹50 Delivery Fee</strong> across all Barabanki orders</span>
            </>
          )}
        </div>
      </div>

      {/* Bill items */}
      <div className="space-y-2.5 text-sm text-[#6B6258]">
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

        {discount > 0 && (
          <div className="flex justify-between text-[#2E7D4F]">
            <span>Coupon Discount</span>
            <span className="font-medium tabular-nums">- {formatINR(discount)}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span>Delivery Charge</span>
          <span className="text-[#1F1B16] font-medium tabular-nums">
            {effectiveDeliveryCharge === 0 ? (
              <span className="text-[#2E7D4F] font-semibold">FREE</span>
            ) : (
              formatINR(effectiveDeliveryCharge)
            )}
          </span>
        </div>

        <div className="pt-3 border-t border-[#E8DFD2] flex justify-between items-baseline text-base font-bold text-[#1F1B16]">
          <span>To Pay</span>
          <span className="text-xl sm:text-2xl font-display text-[#8A1538] tabular-nums">
            {formatINR(grandTotal)}
          </span>
        </div>
      </div>

      {onProceedToCheckout && (
        <button
          type="button"
          disabled={isProceedDisabled || subtotal === 0}
          onClick={onProceedToCheckout}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#8A1538] hover:bg-[#701029] disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold text-base transition-all duration-150 shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <span>{checkoutButtonLabel}</span>
        </button>
      )}
    </div>
  );
};
