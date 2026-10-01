import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Sparkles, Clock, CheckCircle2, ChevronRight, Star, MessageSquarePlus, AlertCircle } from 'lucide-react';
import { Product, ProductVariant, Review } from '../../types/database';
import { PriceDisplay } from '../common/PriceDisplay';
import { VariantSelector } from '../common/VariantSelector';
import { QuantitySelector } from '../common/QuantitySelector';
import { AddToCartButton } from '../common/AddToCartButton';
import { ReviewCard } from '../common/ReviewCard';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { catalogService } from '../../services/catalogService';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectRelatedProduct?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onSelectRelatedProduct,
}) => {
  const { addItem } = useCart();
  const { isAuthenticated, getAuthHeaders, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Review Form States
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState<{
    checked: boolean;
    canReview: boolean;
    reason?: string;
  }>({ checked: false, canReview: false });

  useEffect(() => {
    if (product) {
      setSelectedVariant(product.variants[0] || null);
      setActiveImageIndex(0);
      setQuantity(1);
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      setReviewEligibility({ checked: false, canReview: false });

      // Load reviews and related products
      catalogService.getReviews(product.id).then(setReviews);
      catalogService.getProducts({ categorySlug: product.category?.slug }).then((all) => {
        setRelatedProducts(all.filter((p) => p.id !== product.id).slice(0, 3));
      });
    }
  }, [product]);

  const handleOpenReviewForm = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to write a review as a verified customer.', 'warning');
      openAuthModal();
      return;
    }

    if (!product) return;

    const res = await catalogService.checkReviewEligibility(product.id, getAuthHeaders());
    setReviewEligibility({
      checked: true,
      canReview: res.canReview,
      reason: res.reason,
    });
    setShowReviewForm(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !reviewComment.trim()) return;

    try {
      setSubmittingReview(true);
      const res = await catalogService.submitReview(
        product.id,
        reviewRating,
        reviewComment.trim(),
        getAuthHeaders()
      );

      if (res.success) {
        showToast(res.message, 'success');
        setShowReviewForm(false);
        setReviewComment('');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!isOpen || !product) return null;

  const currentVariant = selectedVariant || product.variants[0];
  const hasImages = Boolean(product.images && product.images.length > 0 && product.images.some((i) => Boolean(i.image_url)));
  const images = hasImages ? product.images.filter((i) => Boolean(i.image_url)) : [];
  const currentImage = images[activeImageIndex] || images[0] || null;

  const handleAddToCart = () => {
    if (!currentVariant) return;
    addItem(
      {
        productId: product.id,
        productName: product.name,
        variantId: currentVariant.id,
        variantLabel: currentVariant.label,
        weightGrams: currentVariant.weight_grams,
        price: currentVariant.price,
        mrp: currentVariant.mrp,
        imageUrl: currentImage?.image_url || '',
      },
      quantity
    );
  };

  const isOutOfStock = currentVariant?.stock_status === 'OUT_OF_STOCK' || (currentVariant && currentVariant.stock_quantity === 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 lg:p-8">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl border border-[#E8DFD2] shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-xs text-[#1F1B16] hover:bg-white flex items-center justify-center border border-[#E8DFD2] shadow-xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
            {/* Left Column: Gallery */}
            <div className="md:col-span-6 bg-[#F3EBE0] p-6 flex flex-col justify-between">
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white border border-[#E8DFD2] shadow-xs flex items-center justify-center">
                {currentImage ? (
                  <img
                    src={currentImage.image_url}
                    alt={currentImage.alt_text || product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ProductImagePlaceholder
                    aspect="square"
                    size="lg"
                    productName={product.name}
                    className="w-full h-full"
                  />
                )}

                {/* Pure Veg Indicator */}
                <div className="absolute top-3 left-3 bg-white/90 p-1.5 rounded-sm border border-stone-200">
                  <div className="w-4 h-4 border-2 border-[#2E7D4F] flex items-center justify-center p-[2px]">
                    <div className="w-2 h-2 rounded-full bg-[#2E7D4F]" />
                  </div>
                </div>

                {product.badge_label && (
                  <div className="absolute top-3 right-3 bg-[#8A1538] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-xs">
                    {product.badge_label}
                  </div>
                )}
              </div>

              {/* Thumbnails if multiple images */}
              {images.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIndex === idx
                          ? 'border-[#8A1538] shadow-xs scale-105'
                          : 'border-white opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust highlights */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-[#E8DFD2] text-xs text-[#1F1B16]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#8A1538]" />
                  <span>100% Pure Cow Ghee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8A1538]" />
                  <span>Shelf Life: {product.shelf_life_days} Days</span>
                </div>
              </div>
            </div>

            {/* Right Column: Product Info & Actions */}
            <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Category & Freshness Kicker */}
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8A1538] uppercase tracking-wider">
                  <span>{product.category?.name || 'Artisanal Mithai'}</span>
                  <span>•</span>
                  <span>Fresh Batch Today</span>
                </div>

                {/* Title */}
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1F1B16] leading-tight">
                  {product.name}
                </h2>

                {/* Price Display */}
                <PriceDisplay
                  price={currentVariant ? currentVariant.price : 0}
                  mrp={currentVariant ? currentVariant.mrp : undefined}
                  size="xl"
                />

                {/* Full Description */}
                <p className="text-sm text-[#6B6258] leading-relaxed">
                  {product.description}
                </p>

                {/* Ingredients */}
                {product.ingredients && (
                  <div className="p-3 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2] text-xs">
                    <span className="font-bold text-[#1F1B16]">Ingredients: </span>
                    <span className="text-[#6B6258]">{product.ingredients}</span>
                  </div>
                )}

                {/* Weight Variant Selector */}
                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-2">
                    Select Weight / Box Size:
                  </label>
                  <VariantSelector
                    variants={product.variants}
                    selectedVariantId={currentVariant?.id || ''}
                    onSelect={(v) => setSelectedVariant(v)}
                    size="md"
                  />
                </div>

                {/* Quantity and Add CTA */}
                <div className="pt-4 flex items-center gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#6B6258] mb-1">
                      Quantity:
                    </label>
                    <QuantitySelector
                      quantity={quantity}
                      onChange={setQuantity}
                      size="md"
                    />
                  </div>

                  <div className="flex-1 pt-4">
                    <AddToCartButton
                      onClick={handleAddToCart}
                      disabled={isOutOfStock}
                      isFullWidth
                      size="lg"
                      label={`Add to Box • ₹${(currentVariant?.price || 0) * quantity}`}
                    />
                  </div>
                </div>
              </div>

              {/* Verified Customer Reviews Summary & Submission */}
              <div className="mt-8 pt-6 border-t border-[#E8DFD2]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#1F1B16]">
                      Verified Customer Reviews ({reviews.length})
                    </h4>
                    <span className="text-[11px] text-[#6B6258]">
                      Only purchasers with delivered orders can review
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenReviewForm}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#8A1538] text-[#8A1538] hover:bg-[#8A1538]/5 transition-colors flex items-center gap-1"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>Write Review</span>
                    </button>
                  </div>
                </div>

                {/* Review Form Drawer/Panel */}
                {showReviewForm && (
                  <div className="mb-4 p-4 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2] space-y-3">
                    {reviewEligibility.checked && !reviewEligibility.canReview ? (
                      <div className="text-xs text-[#B3261E] flex items-start gap-2 bg-[#FEECEC] p-3 rounded-lg border border-[#F5C2C7]">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Review Not Permitted</p>
                          <p className="mt-0.5 text-[#1F1B16]">
                            {reviewEligibility.reason ||
                              'Reviews are exclusive to verified purchasers with a DELIVERED order containing this sweet.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReview} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#1F1B16]">
                            Your Rating:
                          </label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                className="p-0.5 text-[#C9A227] hover:scale-110 transition-transform"
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    star <= reviewRating ? 'fill-[#C9A227]' : 'text-stone-300'
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="text-xs font-bold ml-1 text-[#1F1B16]">
                              {reviewRating} / 5
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#6B6258] mb-1">
                            Your Review / Experience:
                          </label>
                          <textarea
                            rows={3}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Share details about the taste, aroma, desi ghee freshness, or packaging..."
                            className="w-full text-xs p-2.5 rounded-lg border border-[#E8DFD2] focus:outline-hidden focus:border-[#8A1538] bg-white resize-none"
                            required
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <span className="text-[10px] text-[#6B6258] italic">
                            * Reviews will be published upon admin approval.
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowReviewForm(false)}
                              className="px-3 py-1.5 text-xs text-[#6B6258] hover:underline"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={submittingReview || !reviewComment.trim()}
                              className="px-3.5 py-1.5 rounded-lg bg-[#8A1538] text-white text-xs font-semibold hover:bg-[#701029] transition-colors disabled:opacity-50"
                            >
                              {submittingReview ? 'Submitting...' : 'Submit Review'}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.slice(0, 3).map((rev) => (
                      <ReviewCard key={rev.id} review={rev} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B6258] py-2">
                    No approved reviews yet. Be the first verified customer to share your thoughts!
                  </p>
                )}
              </div>

              {/* Related Products */}
              {relatedProducts.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[#E8DFD2]">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#1F1B16] mb-3">
                    You Might Also Like
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {relatedProducts.map((rel) => (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() => onSelectRelatedProduct && onSelectRelatedProduct(rel)}
                        className="p-2 rounded-lg border border-[#E8DFD2] hover:border-[#8A1538] text-left transition-colors bg-[#FBF7F1]"
                      >
                        <div className="aspect-square rounded-md overflow-hidden bg-[#F5EAD9] mb-1.5 flex items-center justify-center">
                          {rel.images?.[0]?.image_url ? (
                            <img
                              src={rel.images[0].image_url}
                              alt={rel.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ProductImagePlaceholder
                              aspect="square"
                              size="sm"
                              showText={false}
                              productName={rel.name}
                              className="w-full h-full"
                            />
                          )}
                        </div>
                        <div className="font-display font-bold text-xs text-[#1F1B16] truncate">
                          {rel.name}
                        </div>
                        <div className="text-[11px] font-semibold text-[#8A1538] tabular-nums mt-0.5">
                          ₹{rel.variants[0]?.price}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
