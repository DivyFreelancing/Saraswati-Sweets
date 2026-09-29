import React, { useState } from 'react';
import { ShoppingBag, BellRing, Check } from 'lucide-react';
import { Product, ProductVariant } from '../../types/database';
import { formatINR } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

interface ProductCardProps {
  product: Product;
  onOpenDetail?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetail }) => {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const primaryImage =
    product.images.find((i) => i.is_primary)?.image_url ||
    product.images[0]?.image_url ||
    'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=600&q=80';

  // Find first in-stock variant by default
  const defaultVariant =
    product.variants.find(
      (v) => v.stock_status !== 'OUT_OF_STOCK' && (v.stock_quantity === undefined || v.stock_quantity > 0)
    ) || product.variants[0];

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant || null);
  const [justAdded, setJustAdded] = useState(false);
  const [notified, setNotified] = useState(false);

  // Determine stock status for whole product and selected variant
  const isAllOutOfStock =
    product.variants.length > 0 &&
    product.variants.every(
      (v) => v.stock_status === 'OUT_OF_STOCK' || (v.stock_quantity !== undefined && v.stock_quantity === 0)
    );

  const isSelectedOutOfStock = Boolean(
    !selectedVariant ||
    selectedVariant.stock_status === 'OUT_OF_STOCK' ||
    (selectedVariant.stock_quantity !== undefined && selectedVariant.stock_quantity === 0)
  );

  // Single badge priority: Out of Stock > Festival Special > Bestseller
  let badge: { text: string; type: 'out_of_stock' | 'festival' | 'bestseller' } | null = null;
  if (isAllOutOfStock) {
    badge = { text: 'Out of Stock', type: 'out_of_stock' };
  } else if (
    product.badge_label?.toLowerCase().includes('festiv') ||
    product.badge_label?.toLowerCase().includes('special') ||
    product.badge_label?.toLowerCase().includes('utsav')
  ) {
    badge = { text: product.badge_label || 'Festival Special', type: 'festival' };
  } else if (
    product.is_bestseller ||
    product.badge_label?.toLowerCase().includes('bestseller') ||
    product.badge_label?.toLowerCase().includes('pride') ||
    product.badge_label?.toLowerCase().includes('hero')
  ) {
    badge = { text: product.badge_label || 'Bestseller', type: 'bestseller' };
  }

  const currentPrice = selectedVariant ? selectedVariant.price : product.variants[0]?.price || 0;
  const currentMrp = selectedVariant ? selectedVariant.mrp : product.variants[0]?.mrp;
  const hasDiscount = currentMrp && currentMrp > currentPrice;

  const handleCardClick = () => {
    if (onOpenDetail) {
      onOpenDetail(product);
    }
  };

  const handleSelectVariant = (e: React.MouseEvent, v: ProductVariant) => {
    e.stopPropagation();
    setSelectedVariant(v);
    setNotified(false);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectedOutOfStock) {
      setNotified(true);
      showToast(
        `We will notify you when ${product.name} (${selectedVariant?.label || 'fresh batch'}) is available!`,
        'info'
      );
      return;
    }

    if (!selectedVariant) return;

    addItem(
      {
        productId: product.id,
        productName: product.name,
        variantId: selectedVariant.id,
        variantLabel: selectedVariant.label,
        weightGrams: selectedVariant.weight_grams,
        price: selectedVariant.price,
        mrp: selectedVariant.mrp,
        imageUrl: primaryImage,
      },
      1
    );

    setJustAdded(true);
    showToast(`Added 1 × ${product.name} (${selectedVariant.label}) to cart!`, 'success');
    setTimeout(() => {
      setJustAdded(false);
    }, 1200);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group relative flex flex-col bg-white rounded-2xl border border-[#E8DCC8] p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-[0_2px_12px_-2px_rgba(34,26,20,0.05),0_1px_3px_0_rgba(34,26,20,0.03)] hover:shadow-[0_8px_24px_-4px_rgba(122,17,41,0.08)] hover:border-[#7A1129]/35 ${
        isAllOutOfStock ? 'opacity-90' : ''
      }`}
    >
      {/* Top Header Row inside Card: Veg icon + Badge */}
      <div className="flex items-center justify-between w-full mb-3 min-h-[24px]">
        {/* Authentic FSSAI Veg Indicator */}
        <div
          className="bg-[#FBF6EF] p-1 rounded-[3px] border border-[#E8DCC8] flex items-center justify-center shadow-2xs"
          title="100% Pure Vegetarian"
        >
          <div className="w-3.5 h-3.5 border-2 border-[#2E7D4F] flex items-center justify-center p-[2px]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2E7D4F]" />
          </div>
        </div>

        {/* Subtle Badge */}
        {badge && (
          <span
            className={`text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-2xs ${
              badge.type === 'out_of_stock'
                ? 'bg-stone-800 text-white'
                : badge.type === 'festival'
                ? 'bg-[#FAF4DE] text-[#7A1129] border border-[#C79A3D]/40 font-bold'
                : 'bg-[#F7E9EE] text-[#7A1129] border border-[#7A1129]/30 font-bold'
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {/* CIRCULAR Photo Crop with Generous Whitespace */}
      <div className="py-2 flex justify-center">
        <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#F5EAD9] border-2 border-white shadow-xs ring-1 ring-[#E8DCC8] relative shrink-0">
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
              isAllOutOfStock ? 'opacity-70 contrast-90 grayscale-[25%]' : ''
            }`}
          />
        </div>
      </div>

      {/* Metadata & Title */}
      <div className="mt-3 flex flex-col flex-1 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs text-[#6E6259] mb-1 font-medium">
          {product.is_pure_ghee && (
            <span className="text-[#7A1129] font-semibold">100% Desi Ghee</span>
          )}
          {product.is_pure_ghee && <span aria-hidden="true" className="text-[#6E6259]/60">·</span>}
          <span>Shelf Life {product.shelf_life_days}d</span>
        </div>

        <h3 className="font-display text-base sm:text-lg font-bold text-[#221A14] line-clamp-1 group-hover:text-[#7A1129] transition-colors">
          {product.name}
        </h3>

        {/* Dynamic Price Display */}
        <div className="mt-1.5 flex items-baseline justify-center gap-2">
          <span className="font-display font-bold text-lg text-[#221A14] tabular-nums tracking-tight">
            {formatINR(currentPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-[#6E6259] line-through tabular-nums">
              {formatINR(currentMrp)}
            </span>
          )}
          {selectedVariant && (
            <span className="text-[11px] text-[#6E6259] font-normal">
              / {selectedVariant.label}
            </span>
          )}
        </div>

        {/* Weight / Variant Options as Small Outline PILL Chips */}
        {product.variants.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-[#E8DCC8]/60 flex flex-wrap justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {product.variants.map((v) => {
              const isSelected = selectedVariant?.id === v.id;
              const isOos =
                v.stock_status === 'OUT_OF_STOCK' ||
                (v.stock_quantity !== undefined && v.stock_quantity === 0);

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={(e) => handleSelectVariant(e, v)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 border ${
                    isSelected
                      ? 'bg-[#7A1129] text-white border-[#7A1129] shadow-2xs'
                      : isOos
                      ? 'bg-[#F5EAD9]/40 border-[#E8DCC8] text-stone-400 line-through'
                      : 'bg-white text-[#221A14] border-[#E8DCC8] hover:border-[#7A1129]/50 hover:bg-[#FBF6EF]'
                  }`}
                  title={`${v.label} - ${formatINR(v.price)}${isOos ? ' (Out of stock)' : ''}`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Exactly ONE Solid Pill Add-to-Cart Button at bottom */}
        <div className="mt-4 pt-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className={`w-full min-h-[44px] px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 shadow-xs ${
              isSelectedOutOfStock
                ? 'bg-[#B8781E] hover:bg-[#976016] text-white'
                : justAdded
                ? 'bg-[#2E7D4F] text-white'
                : 'bg-[#7A1129] hover:bg-[#5E0D20] text-white'
            }`}
          >
            {isSelectedOutOfStock ? (
              <>
                <BellRing className="w-4 h-4 text-white" />
                <span>{notified ? 'Notified!' : 'Notify Me'}</span>
              </>
            ) : justAdded ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Added to Cart!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 text-[#FAF4DE]" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
