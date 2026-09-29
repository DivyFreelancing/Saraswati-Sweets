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
  deliveryCharge = 40,
  discount = 0,
  freeDeliveryThreshold = 499,
  onProceedToCheckout,
  checkoutButtonLabel = 'Proceed to Checkout',
  isProceedDisabled = false,
}) => {
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const effectiveDeliveryCharge = isFreeDelivery || subtotal === 0 ? 0 : deliveryCharge;
  const grandTotal = Math.max(0, subtotal - discount + effectiveDeliveryCharge);
  const shortfall = Math.max(0, freeDeliveryThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD2] p-5 sm:p-6 shadow-xs space-y-5">
      <h3 className="font-display font-bold text-lg text-[#1F1B16] border-b border-[#E8DFD2] pb-3">
        Order Summary
      </h3>

      {/* Free delivery prompt bar */}
      <div className="p-3 rounded-xl bg-[#F3EBE0]/70 border border-[#E8DFD2]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1F1B16] mb-1.5">
          <Truck className="w-4 h-4 text-[#8A1538]" />
          {isFreeDelivery ? (
            <span className="text-[#2E7D4F] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> You unlocked FREE delivery across Barabanki!
            </span>
          ) : (
            <span>
              Add <strong className="text-[#8A1538]">{formatINR(shortfall)}</strong> more for <strong>FREE Delivery</strong>
            </span>
          )}
        </div>
        <div className="w-full bg-[#E8DFD2] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#8A1538] h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
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
          <span className="flex items-center gap-1">
            Delivery Charge
            {isFreeDelivery && (
              <span className="text-[11px] font-semibold text-[#2E7D4F] uppercase">Free</span>
            )}
          </span>
          <span className="text-[#1F1B16] font-medium tabular-nums">
            {isFreeDelivery || subtotal === 0 ? '₹0' : formatINR(deliveryCharge)}
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
