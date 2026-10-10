import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  HeartHandshake,
  ArrowRight,
  Building2,
  Gift,
  CheckCircle2,
  Calendar,
  Truck,
  Leaf,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { HeroSection } from '../components/common/HeroSection';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { ProductGrid } from '../components/common/ProductGrid';
import { ProductCarousel } from '../components/common/ProductCarousel';
import { PromoBanner } from '../components/common/PromoBanner';
import { HamperCard } from '../components/common/HamperCard';
import { ReviewCard } from '../components/common/ReviewCard';
import { ScallopTrim } from '../components/common/DecorativeBorders';
import {
  CategoryCardSkeleton,
  HamperCardSkeleton,
  ReviewCardSkeleton,
} from '../components/common/LoadingSkeleton';
import { Category, Product, GiftHamper, Banner, Review, Offer } from '../types/database';
import { catalogService } from '../services/catalogService';
import { SEED_CATEGORIES } from '../data/seedCategories';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenProductDetail: (product: Product) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenProductDetail,
}) => {
  // Pre-seed categories to ensure zero layout shift in the quick-nav and category grid
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [hampers, setHampers] = useState<GiftHamper[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        setLoading(true);
        const [cats, prods, hamps, bans, offs, revs] = await Promise.all([
          catalogService.getCategories(),
          catalogService.getProducts({}),
          catalogService.getGiftHampers(),
          catalogService.getBanners(),
          catalogService.getOffers(),
          catalogService.getReviews(), // fetch global recent reviews
        ]);

        setCategories(cats);

        // Exclude Savory & Namkeen products from the Bestselling Mithai carousel
        const savorySlugs = ['namkeen-savories', 'namkeen-snacks'];
        const savoryCategoryIds = cats
          .filter(
            (c) =>
              (c.slug && savorySlugs.includes(c.slug.toLowerCase())) ||
              (c.name && (c.name.toLowerCase().includes('savory') || c.name.toLowerCase().includes('namkeen')))
          )
          .map((c) => c.id);

        const sweetsOnly = prods.filter((p) => {
          // If no category ID is assigned or it's missing, safely keep it (assume it's a sweet)
          if (!p.category_id) return true;
          return !savoryCategoryIds.includes(p.category_id);
        });

        // Cap to top curated 12 sweets to prevent rendering 60 heavy cards in initial carousel
        setBestsellers(sweetsOnly.slice(0, 12));
        setHampers(hamps);
        setBanners(bans.filter((b) => b.is_active));
        setOffers(offs.filter((o) => o.is_active));
        setReviews(revs);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, []);

  // Quick navigation categories mapped to actual catalogue slugs
  const quickNavItems = [
    { label: 'All Sweets', slug: '', isAll: true },
    ...categories.map((c) => ({ label: c.name, slug: c.slug })),
    { label: 'Festive Hampers', slug: 'hampers', isHamperPage: true },
  ];

  return (
    <div className="pb-16">
      {/* 3. Hero Section */}
      <HeroSection
        onExploreClick={() => onNavigate('/catalog')}
        onGiftingClick={() => onNavigate('/hampers')}
      />

      {/* Cursive / Script Accent Line (Gold #C79A3D) with thin decorative flourish lines on either side */}
      <div className="max-w-3xl mx-auto px-4 pt-2.5 sm:pt-4 pb-1 sm:pb-2 flex items-center justify-center gap-2 sm:gap-4 text-center select-none overflow-hidden min-h-[44px] sm:min-h-[52px]">
        <div className="h-px flex-1 min-w-[12px] bg-gradient-to-r from-transparent via-[#C79A3D]/40 to-[#C79A3D]" />
        <span className="font-script text-base sm:text-2xl md:text-3xl text-[#C79A3D] font-normal tracking-wide px-1.5 text-center max-w-full leading-normal">
          Handcrafted with pure devotion since 1989
        </span>
        <div className="h-px flex-1 min-w-[12px] bg-gradient-to-l from-transparent via-[#C79A3D]/40 to-[#C79A3D]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-14">
        {/* 4. Category Quick-Nav (Horizontal scrollable pill row for fast jumps) */}
        <section id="quick-browse" aria-label="Category Quick Navigation" className="pt-0 pb-0.5">
          <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto py-1 no-scrollbar scroll-smooth">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E6259] shrink-0 mr-1 hidden sm:inline">
              Quick Browse:
            </span>
            {quickNavItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if ((item as any).isHamperPage) {
                    onNavigate('/hampers');
                  } else if ((item as any).isAll) {
                    onNavigate('/catalog');
                  } else {
                    onNavigate(`/catalog?category=${item.slug}`);
                  }
                }}
                className="shrink-0 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#E8DCC8] bg-white hover:bg-[#F5EAD9] hover:border-[#7A1129]/40 text-[#221A14] text-xs sm:text-sm font-semibold transition-all duration-150 shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                {(item as any).isHamperPage && <Gift className="w-3.5 h-3.5 text-[#C79A3D]" />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 5. "Our Bestsellers" Section */}
        <section>
          <SectionHeader
            eyebrow="Customer Favorites"
            title="Our Bestselling Mithai"
            actionText="View All Sweets"
            onAction={() => onNavigate('/catalog')}
          />

          <ProductCarousel
            products={bestsellers}
            isLoading={loading}
            onOpenDetail={onOpenProductDetail}
          />
        </section>

        {/* 6. "Shop by Category" Section (Clean Ecommerce) */}
        <section className="-mt-3 sm:-mt-6">
          <SectionHeader
            eyebrow="Authentic Collections"
            title="Shop by Category"
            actionText="View All Categories"
            onAction={() => onNavigate('/categories')}
          />

          {loading && categories.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <CategoryCardSkeleton key={i} />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-5">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onClick={(slug) => onNavigate(`/catalog?category=${slug}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-[#F5EAD9]/40 rounded-2xl border border-[#E8DCC8]">
              <p className="text-[#6E6259] font-medium">No categories available at the moment.</p>
            </div>
          )}
        </section>

        {/* 7. Heritage Maroon: "The Saraswati Promise / Made With Tradition. Served With Care." */}
        <section
          id="promise"
          aria-label="The Saraswati Promise"
          className="relative rounded-3xl overflow-hidden shadow-[0_12px_40px_-6px_rgba(74,8,14,0.35)] border border-[#C79A3D]/40 text-white content-visibility-auto"
          style={{ backgroundColor: '#4a080e' }}
        >
          {/* Top Scalloped Border Trim (from Reference Image 3) */}
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
            <ScallopTrim position="top" fillColor="#FBF6EF" accentColor="#C79A3D" />
          </div>

          {/* Bottom Ornamental Heritage Border (Decorating only the bottom ~35% of the sweets box) */}
          <div
            className="absolute inset-x-0 bottom-0 h-36 sm:h-48 md:h-56 lg:h-64 pointer-events-none select-none"
            style={{
              backgroundImage: `url('/images/saraswati-heritage-border.webp')`,
              backgroundPosition: 'center bottom',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* Subtle gradient overlay to merge upper clean wine with the floral pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(74, 8, 14, 0.98) 0%, rgba(74, 8, 14, 0.85) 50%, rgba(74, 8, 14, 0.2) 75%, transparent 100%)',
            }}
          />

          {/* Content Layer (Kept strictly in the clean upper zone with generous buffer above the bottom border) */}
          <div className="relative z-10 px-6 sm:px-10 lg:px-14 pt-14 sm:pt-20 pb-40 sm:pb-52 md:pb-64 text-center max-w-5xl mx-auto space-y-8 sm:space-y-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C79A3D]/25 border border-[#C79A3D]/60 text-[#F6E08B] text-[11px] sm:text-xs font-bold uppercase tracking-widest backdrop-blur-xs shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#F6E08B]" />
                <span>The Saraswati Promise</span>
              </div>

              <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white tracking-tight leading-tight drop-shadow-xs">
                Made With Tradition. Served With Care.
              </h2>

              <p className="text-sm sm:text-base text-white/95 leading-relaxed max-w-2xl mx-auto font-normal drop-shadow-2xs">
                Since 1989 near historic Ghantaghar, every batch of our mithai is crafted with sacred halwai devotion — slow-cooked in pure cow bilona ghee, prepared without chemical preservatives, and served fresh daily across Barabanki.
              </p>
            </div>

            {/* 4 Pillars: Clean white typography with restrained antique-gold accents */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pt-4 sm:pt-6 text-left border-t border-[#C79A3D]/30">
              {/* Pillar 1 */}
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#C79A3D]/20 border border-[#C79A3D]/50 flex items-center justify-center text-[#F6E08B] shadow-xs">
                  <Sparkles className="w-5 h-5 text-[#F6E08B]" />
                </div>
                <h4 className="font-display font-bold text-base sm:text-lg text-white">
                  100% Pure Cow Ghee
                </h4>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal">
                  Traditional slow-cooked bilona ghee preparations with zero vanaspati, palm oil, or additives.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#C79A3D]/20 border border-[#C79A3D]/50 flex items-center justify-center text-[#F6E08B] shadow-xs">
                  <Clock className="w-5 h-5 text-[#F6E08B]" />
                </div>
                <h4 className="font-display font-bold text-base sm:text-lg text-white">
                  Fresh Daily Batches
                </h4>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal">
                  Cooked every morning at dawn using fresh local milk chhena and genuine ground spices.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#C79A3D]/20 border border-[#C79A3D]/50 flex items-center justify-center text-[#F6E08B] shadow-xs">
                  <Leaf className="w-5 h-5 text-[#F6E08B]" />
                </div>
                <h4 className="font-display font-bold text-base sm:text-lg text-white">
                  100% Vegetarian
                </h4>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal">
                  Strict satvik kitchen discipline with certified 100% cruelty-free vegetarian silver vark.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#C79A3D]/20 border border-[#C79A3D]/50 flex items-center justify-center text-[#F6E08B] shadow-xs">
                  <Truck className="w-5 h-5 text-[#F6E08B]" />
                </div>
                <h4 className="font-display font-bold text-base sm:text-lg text-white">
                  Barabanki Delivery
                </h4>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal">
                  Dispatched fresh from Ghantaghar directly to your doorstep with prompt local delivery.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. "Order Now or Plan Ahead" — Two-Card Split Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 content-visibility-auto">
          {/* Card A: Order for Today (Retail Fast Checkout) */}
          <div className="bg-white rounded-2xl border border-[#E8DCC8] p-6 sm:p-8 flex flex-col justify-between shadow-[0_2px_12px_-2px_rgba(34,26,20,0.04)] relative overflow-hidden group">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF4DE] text-[#7A1129] text-xs font-bold uppercase tracking-wider border border-[#C79A3D]/30">
                <Truck className="w-3.5 h-3.5 text-[#C79A3D]" />
                <span>Order for Today</span>
              </div>

              <h3 className="font-display font-bold text-2xl text-[#221A14]">
                Craving Fresh Mithai Tonight?
              </h3>

              <p className="text-sm text-[#6E6259] leading-relaxed">
                Order our freshly prepared sweets, hot gulab jamun, and crispy namkeen for same-day delivery right to your doorstep anywhere in Barabanki.
              </p>

              <ul className="space-y-1.5 pt-2 text-xs text-[#221A14] font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D4F]" />
                  <span>Fast same-day delivery across Barabanki</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D4F]" />
                  <span>Free delivery on all orders above ₹499</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => onNavigate('/catalog')}
                className="w-full sm:w-auto min-h-[46px] px-8 py-3 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] text-white text-sm font-semibold transition-all duration-150 inline-flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
              >
                <span>Browse & Order Now</span>
                <ArrowRight className="w-4 h-4 text-[#FAF4DE]" />
              </button>
            </div>
          </div>

          {/* Card B: Planning a Wedding or Bulk Order? (Enquiry-based, no payment) */}
          <div className="bg-[#F5EAD9]/70 rounded-2xl border border-[#E8DCC8] p-6 sm:p-8 flex flex-col justify-between shadow-[0_2px_12px_-2px_rgba(34,26,20,0.04)] relative overflow-hidden">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#7A1129] text-xs font-bold uppercase tracking-wider border border-[#E8DCC8]">
                <Building2 className="w-3.5 h-3.5 text-[#C79A3D]" />
                <span>Weddings & Ceremonies</span>
              </div>

              <h3 className="font-display font-bold text-2xl text-[#221A14]">
                Planning a Wedding or Bulk Order?
              </h3>

              <p className="text-sm text-[#6E6259] leading-relaxed">
                Elevate your special celebrations with customized sweet boxes, embossed gift trays, and wholesale volume pricing. We coordinate delivery directly to your venue.
              </p>

              <ul className="space-y-1.5 pt-2 text-xs text-[#221A14] font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D4F]" />
                  <span>Custom box printing & auspicious gift tags</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D4F]" />
                  <span>No upfront payment required — submit enquiry for custom quote</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => onNavigate('/bulk-enquiry')}
                className="w-full sm:w-auto min-h-[46px] px-8 py-3 rounded-full border-2 border-[#7A1129] bg-white hover:bg-[#FAF4DE] text-[#7A1129] text-sm font-semibold transition-all duration-150 inline-flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
              >
                <span>Request Custom Bulk Quote</span>
                <ArrowRight className="w-4 h-4 text-[#7A1129]" />
              </button>
            </div>
          </div>
        </section>

        {/* 9. Heritage Gifting: "Handcrafted Gift Hampers" Section */}
        <section
          id="gift-hampers"
          aria-label="Handcrafted Gift Hampers"
          className="relative rounded-3xl overflow-hidden border border-[#E8DCC8] bg-[#F5EAD9]/70 shadow-[0_4px_24px_-4px_rgba(34,26,20,0.04)] content-visibility-auto"
        >
          {/* Subtle heritage background decorative border positioned at center bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-44 sm:h-56 md:h-64 pointer-events-none opacity-20 sm:opacity-25 select-none"
            style={{
              backgroundImage: `url('/images/saraswati-heritage-border.webp')`,
              backgroundPosition: 'center bottom',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              maskImage: 'linear-gradient(to top, black 30%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent 100%)',
            }}
          />

          <div className="relative z-10 p-6 sm:p-10 lg:p-12 space-y-6 sm:space-y-8">
            <SectionHeader
              eyebrow="Festive & Royal Keepsakes"
              title="Handcrafted Gift Hampers"
              subtitle="Regal velvet and raw silk keepsake presentation boxes filled with signature mithai and dry fruits."
              actionText="View All Hampers"
              onAction={() => onNavigate('/hampers')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {loading && hampers.length === 0
                ? Array.from({ length: 2 }).map((_, i) => (
                    <HamperCardSkeleton key={i} />
                  ))
                : hampers.map((hamper) => (
                    <HamperCard key={hamper.id} hamper={hamper} />
                  ))}
            </div>
          </div>
        </section>

        {/* 10. Festival / Seasonal Rail (Only if a festival collection / banner is active) */}
        {banners.length > 0 && (
          <section className="space-y-4">
            {banners.map((banner) => (
              <PromoBanner
                key={banner.id}
                banner={banner}
                onCtaClick={() => onNavigate(banner.cta_link || '/catalog')}
              />
            ))}
          </section>
        )}

        {/* 11. "Our Legacy" / Brand Story & Store Showcase (from Reference Image 3) */}
        <section
          id="heritage-stores"
          aria-label="Our Barabanki Heritage & Sweet Shops"
          className="relative rounded-3xl overflow-hidden shadow-[0_12px_40px_-6px_rgba(122,17,41,0.25)] border border-[#C79A3D]/40 text-white content-visibility-auto"
          style={{ backgroundColor: '#7A1129' }}
        >
          {/* Top Scalloped Border (from Reference Image 3) */}
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
            <ScallopTrim position="top" fillColor="#FBF6EF" accentColor="#C79A3D" />
          </div>

          {/* Delicate Indian background motif */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10 select-none"
            style={{
              backgroundImage: `radial-gradient(#FAF4DE 1.5px, transparent 1.5px), radial-gradient(#C79A3D 1.5px, transparent 1.5px)`,
              backgroundSize: '32px 32px',
              backgroundPosition: '0 0, 16px 16px',
            }}
          />

          {/* Golden Corner Stars (from Reference Image 3) */}
          <div className="absolute top-12 left-6 text-[#E8C872] opacity-80 hidden sm:block pointer-events-none text-2xl select-none">
            ★
          </div>
          <div className="absolute bottom-12 right-6 text-[#E8C872] opacity-80 hidden sm:block pointer-events-none text-2xl select-none">
            ★
          </div>

          <div className="relative z-10 px-6 sm:px-10 lg:px-14 pt-16 sm:pt-20 pb-16 sm:pb-20 text-center max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight drop-shadow-xs">
                Heritage Sweet Shops & Kitchens in Barabanki!
              </h2>
              <p className="text-xs sm:text-sm text-white/90 max-w-xl mx-auto font-normal">
                Experience the warmth of traditional Awadhi sweets, pure bilona cow ghee preparations, and fresh chhena made daily since 1989.
              </p>
            </div>

            {/* 3 Arched Capsule Photo Frames (from Reference Image 3) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 pt-2">
              {/* Store 1 */}
              <div className="space-y-3 group">
                <div className="relative aspect-[3/4] max-w-[190px] sm:max-w-[210px] mx-auto rounded-full overflow-hidden border-2 border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] bg-[#5E0D20] p-1">
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80"
                      alt="Historic Ghantaghar Flagship Store"
                      width="210"
                      height="280"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                  {/* Twinkle Star Accent */}
                  <span className="absolute -top-1 right-3 text-white text-xs select-none">✦</span>
                  <span className="absolute bottom-6 left-1 text-white text-xs select-none">✦</span>
                </div>
                <h4 className="font-display font-bold text-sm sm:text-base text-white">
                  Near Historic Ghantaghar
                </h4>
              </div>

              {/* Store 2 */}
              <div className="space-y-3 group">
                <div className="relative aspect-[3/4] max-w-[190px] sm:max-w-[210px] mx-auto rounded-full overflow-hidden border-2 border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] bg-[#5E0D20] p-1">
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80"
                      alt="Bilona Cow Ghee Kitchens"
                      width="210"
                      height="280"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                  {/* Twinkle Star Accent */}
                  <span className="absolute top-6 -left-1 text-white text-xs select-none">✦</span>
                  <span className="absolute bottom-8 right-2 text-white text-xs select-none">✦</span>
                </div>
                <h4 className="font-display font-bold text-sm sm:text-base text-white">
                  Bilona Desi Ghee Kitchens
                </h4>
              </div>

              {/* Store 3 */}
              <div className="space-y-3 group">
                <div className="relative aspect-[3/4] max-w-[190px] sm:max-w-[210px] mx-auto rounded-full overflow-hidden border-2 border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] bg-[#5E0D20] p-1">
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80"
                      alt="Artisanal Chhena & Namkeen Counter"
                      width="210"
                      height="280"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                  {/* Twinkle Star Accent */}
                  <span className="absolute top-2 left-3 text-white text-xs select-none">✦</span>
                  <span className="absolute -bottom-1 right-4 text-white text-xs select-none">✦</span>
                </div>
                <h4 className="font-display font-bold text-sm sm:text-base text-white">
                  Fresh Chhena & Namkeen
                </h4>
              </div>
            </div>

            {/* Pill Button (from Reference Image 3) */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="min-h-[44px] px-8 py-2.5 rounded-full bg-white hover:bg-[#FAF4DE] text-[#7A1129] font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-all duration-150 active:scale-95 border border-[#C79A3D]/40"
              >
                <span>Find Our Store & Directions</span>
                <ArrowRight className="w-4 h-4 text-[#7A1129]" />
              </button>
            </div>
          </div>

          {/* Bottom Scalloped Border (from Reference Image 3) */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
            <ScallopTrim position="bottom" fillColor="#FBF6EF" accentColor="#C79A3D" />
          </div>
        </section>

        {/* 12. Trust / Certification Badge Strip (Verifiable claims only) */}
        <section className="rounded-3xl border border-[#E8DCC8] py-8 sm:py-10 bg-[#F5EAD9]/60 px-6 sm:px-8 shadow-xs overflow-hidden content-visibility-auto">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-around items-center gap-6 text-center">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-white border border-[#E8DCC8] flex items-center justify-center text-[#7A1129] shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-[#2E7D4F]" />
              </div>
              <div>
                <div className="font-display font-bold text-sm text-[#221A14]">
                  FSSAI Licensed
                </div>
                <div className="text-xs text-[#6E6259]">Reg. Lic #12721008000492</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-white border border-[#E8DCC8] flex items-center justify-center text-[#7A1129] shrink-0 shadow-xs">
                <div className="w-4 h-4 border-2 border-[#2E7D4F] flex items-center justify-center p-[2px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2E7D4F]" />
                </div>
              </div>
              <div>
                <div className="font-display font-bold text-sm text-[#221A14]">
                  100% Vegetarian
                </div>
                <div className="text-xs text-[#6E6259]">Clean Kitchen Standards</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-white border border-[#E8DCC8] flex items-center justify-center text-[#7A1129] shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-[#C79A3D]" />
              </div>
              <div>
                <div className="font-display font-bold text-sm text-[#221A14]">
                  Pure Cow Desi Ghee
                </div>
                <div className="text-xs text-[#6E6259]">Zero Vanaspati / Palm Oil</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-white border border-[#E8DCC8] flex items-center justify-center text-[#7A1129] shrink-0 shadow-xs">
                <Layers className="w-5 h-5 text-[#7A1129]" />
              </div>
              <div>
                <div className="font-display font-bold text-sm text-[#221A14]">
                  Food-Safe Sealed Packaging
                </div>
                <div className="text-xs text-[#6E6259]">Tamper-Proof Freshness</div>
              </div>
            </div>
          </div>
        </section>



        {/* Customer Testimonials (Authentic Barabanki Patrons) */}
        {(loading || reviews.length > 0) && (
          <section className="content-visibility-auto">
            <SectionHeader
              eyebrow="Cherished Words"
              title="From Our Barabanki Patrons"
              subtitle="Honest reviews from families who trust Saraswati Sweets for their festivals and pujas."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {loading && reviews.length === 0
                ? Array.from({ length: 3 }).map((_, i) => (
                    <ReviewCardSkeleton key={i} />
                  ))
                : reviews.map((rev) => (
                    <ReviewCard key={rev.id} review={rev} />
                  ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
