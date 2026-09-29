import React from 'react';
import { ProductVariant } from '../../types/database';
import { formatINR } from '../../utils/formatters';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariantId: string;
  onSelect: (variant: ProductVariant) => void;
  size?: 'sm' | 'md';
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariantId,
  onSelect,
  size = 'md',
}) => {
  if (!variants || variants.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((v) => {
        const isSelected = v.id === selectedVariantId;
        const isOutOfStock = v.stock_status === 'OUT_OF_STOCK' || v.stock_quantity === 0;

        return (
          <button
            key={v.id}
            type="button"
            disabled={isOutOfStock}
            onClick={() => onSelect(v)}
            className={`transition-all duration-150 rounded-lg text-left border ${
              size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
            } ${
              isOutOfStock
                ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400'
                : isSelected
                ? 'bg-[#8A1538] text-white border-[#8A1538] shadow-xs'
                : 'bg-white text-[#1F1B16] border-[#E8DFD2] hover:border-[#8A1538]/50 hover:bg-[#FBF7F1]'
            }`}
          >
            <div className="font-medium">{v.label}</div>
            <div className={`text-[11px] tabular-nums mt-0.5 ${isSelected ? 'text-white/90' : 'text-[#6B6258]'}`}>
              {formatINR(v.price)}
            </div>
          </button>
        );
      })}
    </div>
  );
};
