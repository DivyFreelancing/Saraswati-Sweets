import React, { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';

interface AddToCartButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isFullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  onClick,
  disabled = false,
  isFullWidth = false,
  size = 'md',
  label = 'Add to Cart',
}) => {
  const [justAdded, setJustAdded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || justAdded) return;
    onClick();
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
    }, 1400);
  };

  const heightClasses = {
    sm: 'min-h-[36px] py-2 px-4 text-xs',
    md: 'min-h-[44px] py-2.5 px-6 text-sm',
    lg: 'min-h-[48px] py-3 px-8 text-base',
  }[size];

  if (disabled) {
    return (
      <button
        disabled
        className={`${heightClasses} ${isFullWidth ? 'w-full' : ''} inline-flex items-center justify-center gap-2 rounded-full bg-stone-200 text-stone-500 font-medium cursor-not-allowed`}
      >
        Out of Stock
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${heightClasses} ${isFullWidth ? 'w-full' : ''} inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 active:scale-[0.98] ${
        justAdded
          ? 'bg-[#2E7D4F] text-white shadow-xs'
          : 'bg-[#7A1129] hover:bg-[#5E0D20] text-white shadow-sm'
      }`}
    >
      {justAdded ? (
        <>
          <Check className="w-4 h-4" />
          <span className="whitespace-nowrap">Added!</span>
        </>
      ) : (
        <>
          <ShoppingBag className="w-4 h-4 text-[#FAF4DE]" />
          <span className="whitespace-nowrap">{label}</span>
        </>
      )}
    </button>
  );
};
