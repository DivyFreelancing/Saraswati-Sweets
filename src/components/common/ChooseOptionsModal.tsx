import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, BellRing, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { Product, ProductVariant } from '../../types/database';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/formatters';

interface ChooseOptionsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onFullDetails?: (product: Product) => void;
}

export const ChooseOptionsModal: React.FC<ChooseOptionsModalProps> = ({
  product,
  isOpen,
  onClose,
  onFullDetails,
}) => {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [notified, setNotified] = useState(false);

  // Initialize selected variant when product opens
  useEffect(() => {
    if (product && product.variants && product.variants.length > 0) {
      // Prefer the first in-stock variant, otherwise the first variant
      const firstInStock = product.variants.find(
        (v) => v.stock_status !== 'OUT_OF_STOCK' && (v.stock_quantity === undefined || v.stock_quantity > 0)
      );
      setSelectedVariant(firstInStock || product.variants[0]);
      setQuantity(1);
      setJustAdded(false);
      setNotified(false);
    }
  }, [product, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const primaryImage =
    product.images.find((i) => i.is_primary)?.image_url ||
    product.images[0]?.image_url ||
    'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80';

  const isCurrentVariantOutOfStock = Boolean(
    !selectedVariant ||
    selectedVariant.stock_status === 'OUT_OF_STOCK' ||
    (selectedVariant.stock_quantity !== undefined && selectedVariant.stock_quantity === 0)
  );

  const currentPrice = selectedVariant?.price || 0;
  const currentMrp = selectedVariant?.mrp;
  const hasDiscount = currentMrp && currentMrp > currentPrice;
  const discountPercent = hasDiscount ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100) : 0;
  const totalPrice = currentPrice * quantity;

  const handleAddToCart = () => {
    if (!selectedVariant || isCurrentVariantOutOfStock) return;

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
      quantity
    );

    setJustAdded(true);
    showToast(`Added ${quantity} × ${product.name} (${selectedVariant.label}) to cart!`, 'success');

    setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 900);
  };

  const handleNotifyMe = () => {
    setNotified(true);
    showToast(
      `We will notify you when ${product.name} (${selectedVariant?.label || 'fresh batch'}) is available!`,
      'info'
    );
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-options-title"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-[#E8DCC8] shadow-[0_20px_50px_rgba(34,26,20,0.18)] overflow-hidden transition-all max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Swipe / Sheet Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 bg-[#E8DCC8] rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#E8DCC8] flex items-center justify-between bg-[#FBF6EF]/60">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#C79A3D]">
              Artisanal Selection
            </span>
            <h3 id="choose-options-title" className="font-display font-bold text-lg text-[#221A14] leading-tight">
              Choose Size & Quantity
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close options modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6E6259] hover:text-[#221A14] hover:bg-[#F5EAD9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Product Thumbnail & Details */}
          <div className="flex gap-4 items-center">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#F5EAD9] border border-[#E8DCC8] shrink-0">
              <img
                src={primaryImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {/* Veg icon */}
              <div className="absolute top-1.5 left-1.5 bg-white/95 p-0.5 rounded-[2px] shadow-xs">
                <div className="w-2.5 h-2.5 border border-[#2E7D4F] flex items-center justify-center p-[1px]">
                  <div className="w-1 h-1 rounded-full bg-[#2E7D4F]" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-display font-bold text-base text-[#221A14] line-clamp-1">
                {product.name}
              </h4>

              <div className="flex items-center gap-2 text-xs text-[#6E6259] mt-0.5 font-medium">
                {product.is_pure_ghee && (
                  <span className="text-[#7A1129] font-semibold">100% Desi Ghee</span>
                )}
                {product.is_pure_ghee && <span aria-hidden="true">·</span>}
                <span>Shelf Life {product.shelf_life_days}d</span>
              </div>

              {/* Price display for currently selected variant */}
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display font-bold text-lg text-[#7A1129] tabular-nums">
                  {formatINR(currentPrice)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-xs text-[#6E6259] line-through tabular-nums">
                      {formatINR(currentMrp)}
                    </span>
                    <span className="text-[11px] font-semibold text-[#2E7D4F] bg-[#2E7D4F]/10 px-1.5 py-0.5 rounded-sm">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Variant Selector Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#221A14]">
                Select Weight / Pack:
              </span>
              <span className="text-xs text-[#6E6259]">
                {selectedVariant ? selectedVariant.label : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {product.variants.map((v) => {
                const isSelected = selectedVariant?.id === v.id;
                const isOos =
                  v.stock_status === 'OUT_OF_STOCK' ||
                  (v.stock_quantity !== undefined && v.stock_quantity === 0);

                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariant(v);
                      setNotified(false);
                    }}
                    className={`relative p-2.5 rounded-xl text-left border transition-all duration-150 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#7A1129] text-white border-[#7A1129] shadow-sm'
                        : isOos
                        ? 'bg-[#F5EAD9]/40 border-[#E8DCC8] text-[#6E6259] hover:border-[#7A1129]/30'
                        : 'bg-white border-[#E8DCC8] hover:border-[#7A1129]/40 hover:bg-[#FBF6EF] text-[#221A14]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-[#221A14]'}`}>
                        {v.label}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#FAF4DE]" />}
                    </div>

                    <div className="mt-1 flex items-baseline justify-between w-full">
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          isSelected ? 'text-[#FAF4DE]' : 'text-[#7A1129]'
                        }`}
                      >
                        {formatINR(v.price)}
                      </span>
                      {isOos && (
                        <span
                          className={`text-[10px] font-medium uppercase tracking-tight px-1 py-0.2 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          Sold Out
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Stepper (Only active if selected variant is in stock) */}
          {!isCurrentVariantOutOfStock && (
            <div className="pt-2 flex items-center justify-between border-t border-[#E8DCC8]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#221A14]">
                Quantity:
              </span>

              <div className="inline-flex items-center border border-[#E8DCC8] rounded-full bg-white shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 flex items-center justify-center text-[#221A14] hover:bg-[#F5EAD9] disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-base font-bold"
                >
                  −
                </button>
                <span className="w-10 text-center font-bold text-sm text-[#221A14] tabular-nums select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  disabled={quantity >= 20}
                  aria-label="Increase quantity"
                  className="w-10 h-10 flex items-center justify-center text-[#221A14] hover:bg-[#F5EAD9] disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-base font-bold"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Full details link */}
          {onFullDetails && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFullDetails(product);
                }}
                className="text-xs text-[#7A1129] hover:underline font-semibold"
              >
                View full ingredients, nutrition & verified reviews →
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 sm:p-5 border-t border-[#E8DCC8] bg-[#FBF6EF]/80">
          {isCurrentVariantOutOfStock ? (
            <button
              type="button"
              onClick={handleNotifyMe}
              disabled={notified}
              className={`w-full min-h-[48px] py-3 px-6 rounded-full font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
                notified
                  ? 'bg-[#2E7D4F] text-white shadow-xs'
                  : 'bg-[#B8781E] hover:bg-[#976016] text-white shadow-xs'
              }`}
            >
              {notified ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Notification Requested!</span>
                </>
              ) : (
                <>
                  <BellRing className="w-4 h-4" />
                  <span>Notify Me When Fresh Batch is Ready</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={justAdded}
              className={`w-full min-h-[48px] py-3 px-6 rounded-full font-semibold text-sm transition-all duration-150 flex items-center justify-between text-white ${
                justAdded
                  ? 'bg-[#2E7D4F] shadow-xs'
                  : 'bg-[#7A1129] hover:bg-[#5E0D20] active:scale-[0.99] shadow-sm'
              }`}
            >
              {justAdded ? (
                <div className="w-full flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Added to Cart!</span>
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#FAF4DE]" />
                    <span>Add to Cart</span>
                  </span>
                  <span className="font-display font-bold text-base tabular-nums">
                    {formatINR(totalPrice)}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
