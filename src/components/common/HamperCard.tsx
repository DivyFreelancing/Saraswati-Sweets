import React from 'react';
import { Gift, Check, Sparkles } from 'lucide-react';
import { GiftHamper } from '../../types/database';
import { PriceDisplay } from './PriceDisplay';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

interface HamperCardProps {
  hamper: GiftHamper;
  onViewDetails?: (hamper: GiftHamper) => void;
}

export const HamperCard: React.FC<HamperCardProps> = ({ hamper, onViewDetails }) => {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const handleAddToCart = () => {
    addItem(
      {
        productId: hamper.id,
        productName: hamper.name,
        variantId: `hamper-var-${hamper.id}`,
        variantLabel: hamper.box_type || 'Festive Hamper Box',
        weightGrams: 1000,
        price: hamper.hamper_price,
        mrp: hamper.mrp,
        imageUrl: hamper.image_url,
        item_type: 'HAMPER',
      },
      1
    );
    showToast(`Added ${hamper.name} to cart!`, 'success');
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-[#E8DCC8] overflow-hidden shadow-[0_2px_12px_-2px_rgba(34,26,20,0.05),0_1px_3px_0_rgba(34,26,20,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(122,17,41,0.09)] transition-all duration-200">
      {/* Visual Header with subtle festive badge */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#F5EAD9]">
        <img
          loading="lazy"
          decoding="async"
          width="400"
          height="250"
          src={getOptimizedImageUrl(hamper.image_url, 480, 80)}
          alt={hamper.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute top-3 left-3 bg-[#7A1129] text-[#FAF4DE] text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 border border-[#C79A3D]/40">
          <Gift className="w-3.5 h-3.5 text-[#C79A3D]" />
          <span>Royal Festive Trunk</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <span className="text-xs font-bold text-[#C79A3D] uppercase tracking-wider">
          {hamper.box_type}
        </span>

        <h3 className="font-display font-bold text-lg sm:text-xl text-[#221A14] mt-1">
          {hamper.name}
        </h3>

        <p className="text-xs sm:text-sm text-[#6E6259] mt-2 line-clamp-2 leading-relaxed">
          {hamper.description}
        </p>

        {/* What's Inside section preview */}
        {hamper.items && hamper.items.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-[#E8DCC8] bg-[#FBF6EF]/70 -mx-5 sm:-mx-6 px-5 sm:px-6 py-3.5 rounded-lg">
            <div className="text-[11px] font-bold text-[#221A14] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#C79A3D]" />
              <span>What's Inside This Casket:</span>
            </div>
            <ul className="space-y-1.5">
              {hamper.items.map((item) => (
                <li key={item.id} className="text-xs text-[#221A14] flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#2E7D4F] shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold">{item.item_name}</strong>{' '}
                    <span className="text-[#6E6259]">({item.item_quantity})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto pt-5 border-t border-[#E8DCC8] flex items-center justify-between gap-3">
          <PriceDisplay price={hamper.hamper_price} mrp={hamper.mrp} size="lg" />
          <button
            type="button"
            onClick={handleAddToCart}
            className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-[0.98] shadow-xs flex items-center gap-2"
          >
            <Gift className="w-4 h-4 text-[#FAF4DE]" />
            <span>Add Hamper</span>
          </button>
        </div>
      </div>
    </div>
  );
};
