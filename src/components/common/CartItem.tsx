import React from 'react';
import { Trash2 } from 'lucide-react';
import { CartItemType } from '../../context/CartContext';
import { QuantitySelector } from './QuantitySelector';
import { formatINR } from '../../utils/formatters';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
}) => {
  return (
    <div className="flex gap-4 py-4 border-b border-[#E8DFD2] last:border-b-0 items-center">
      {/* 1:1 image */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F3EBE0] shrink-0 border border-[#E8DFD2]">
        <img
          src={item.imageUrl}
          alt={item.productName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-display font-bold text-sm sm:text-base text-[#1F1B16] truncate">
          {item.productName}
        </h4>

        <div className="text-xs text-[#6B6258] mt-0.5 font-medium">
          Variant: <span className="text-[#1F1B16]">{item.variantLabel}</span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="font-display font-bold text-sm sm:text-base text-[#1F1B16] tabular-nums">
            {formatINR(item.price)}
          </span>
          {item.mrp > item.price && (
            <span className="text-xs text-[#6B6258] line-through tabular-nums">
              {formatINR(item.mrp)}
            </span>
          )}
        </div>
      </div>

      {/* Quantity & Actions */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <QuantitySelector
          quantity={item.quantity}
          onChange={onUpdateQuantity}
          size="sm"
        />

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove item"
          className="text-xs text-[#B3261E] hover:text-[#701029] p-1 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Remove</span>
        </button>
      </div>
    </div>
  );
};
