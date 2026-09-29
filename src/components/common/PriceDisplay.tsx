import React from 'react';
import { formatINR } from '../../utils/formatters';

interface PriceDisplayProps {
  price: number;
  mrp?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSaveBadge?: boolean;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  mrp,
  size = 'md',
  className = '',
  showSaveBadge = true,
}) => {
  const hasDiscount = mrp && mrp > price;
  const discountPercent = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const sizeClasses = {
    sm: { price: 'text-sm font-semibold', mrp: 'text-xs', badge: 'text-[11px]' },
    md: { price: 'text-base font-bold', mrp: 'text-sm', badge: 'text-xs' },
    lg: { price: 'text-xl font-bold', mrp: 'text-base', badge: 'text-xs' },
    xl: { price: 'text-2xl sm:text-3xl font-bold', mrp: 'text-lg', badge: 'text-sm' },
  }[size];

  return (
    <div className={`flex items-baseline gap-2 flex-wrap ${className}`}>
      <span className={`${sizeClasses.price} text-[#1F1B16] font-display tabular-nums tracking-tight`}>
        {formatINR(price)}
      </span>

      {hasDiscount && (
        <>
          <span className={`${sizeClasses.mrp} text-[#6B6258] line-through tabular-nums`}>
            {formatINR(mrp)}
          </span>
          {showSaveBadge && discountPercent > 0 && (
            <span className={`${sizeClasses.badge} font-medium text-[#2E7D4F]`}>
              Save {discountPercent}%
            </span>
          )}
        </>
      )}
    </div>
  );
};
