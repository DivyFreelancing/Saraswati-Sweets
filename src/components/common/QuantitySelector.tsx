import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onChange: (newQuantity: number) => void;
  max?: number;
  min?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onChange,
  max = 99,
  min = 1,
  className = '',
  size = 'md',
}) => {
  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > min) {
      onChange(quantity - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity < max) {
      onChange(quantity + 1);
    }
  };

  const buttonSize = {
    sm: 'w-8 h-8 min-w-[32px] min-h-[32px]',
    md: 'w-11 h-11 min-w-[44px] min-h-[44px]', // >=44px standard mobile tap target
    lg: 'w-12 h-12 min-w-[48px] min-h-[48px]',
  }[size];

  return (
    <div
      className={`inline-flex items-center border border-[#E8DFD2] rounded-xl bg-white overflow-hidden shadow-xs ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
        className={`${buttonSize} flex items-center justify-center text-[#1F1B16] hover:bg-[#F3EBE0] active:bg-[#E8DFD2] disabled:opacity-30 disabled:hover:bg-transparent transition-colors`}
      >
        <Minus className="w-4 h-4" />
      </button>

      <span className="w-10 text-center font-semibold text-[#1F1B16] tabular-nums select-none text-base">
        {quantity}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={quantity >= max}
        aria-label="Increase quantity"
        className={`${buttonSize} flex items-center justify-center text-[#1F1B16] hover:bg-[#F3EBE0] active:bg-[#E8DFD2] disabled:opacity-30 disabled:hover:bg-transparent transition-colors`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
