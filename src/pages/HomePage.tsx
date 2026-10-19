import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Gift,
} from 'lucide-react';
import { HeroSection } from '../components/common/HeroSection';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { ShopByCategoriesSection } from '../components/common/ShopByCategoriesSection';
import { ProductCarousel } from '../components/common/ProductCarousel';
import { PromoBanner } from '../components/common/PromoBanner';
import { HamperCard } from '../components/common/HamperCard';
import { ReviewCard } from '../components/common/ReviewCard';
import { ScallopTrim } from '../components/common/DecorativeBorders';
import { HomepageCertificationsPreview } from '../components/certifications/HomepageCertificationsPreview';
import {
  CategoryCardSkeleton,
  HamperCardSkeleton,
  ReviewCardSkeleton,
} from '../components/common/LoadingSkeleton';
import { Category, Product, GiftHamper, Banner, Review, Offer } from '../types/database';
import { catalogService } from '../services/catalogService';
import { SEED_CATEGORIES } from '../data/seedCategories';
import { shouldHandleSpaClick } from '../utils/navigation';

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

    // Smooth scroll to #gift-hampers if URL contains hash on mount
    if (typeof window !== 'undefined' && window.location.hash === '#gift-hampers') {
      const timer = setTimeout(() => {
        const el = document.getElementById('gift-hampers');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, []);

  // Quick navigation categories mapped to actual catalogue slugs
  const quickNavItems = [
    { label: 'All Sweets', slug: '', isAll: true },
    ...categories
      .filter((c) => !c.slug.includes('hamper') && c.is_active)
      .map((c) => ({ label: c.name, slug: c.slug })),
    { label: 'Gift Hampers', slug: 'hampers', isHamperPage: true },
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
        <span className="font-script text-lg sm:text-2xl md:text-3xl text-[#C79A3D] font-normal tracking-wide px-1.5 text-center max-w-full leading-normal">
          Handcrafted with pure devotion since 1989
        </span>
        <div className="h-px flex-1 min-w-[12px] bg-gradient-to-l from-transparent via-[#C79A3D]/40 to-[#C79A3D]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-14">
        {/* 4. Category Quick-Nav (Horizontal scrollable pill row, centered and balanced) */}
        <section id="quick-browse" aria-label="Category Quick Navigation" className="pt-0 pb-0.5">
          <div className="flex items-center sm:justify-center gap-2 sm:gap-2.5 overflow-x-auto py-1 no-scrollbar scroll-smooth">
            <span className="text-xs font-semibold text-[#6E6259] shrink-0 mr-1 hidden sm:inline">
              Quick Browse:
            </span>
            {quickNavItems.map((item) => {
              const isAll = (item as any).isAll;
              const href = (item as any).isHamperPage
                ? '/hampers'
                : isAll
                ? '/catalog'
                : `/categories/${item.slug}`;
              return (
                <a
                  key={item.label}
                  href={href}
                  onClick={(e) => {
                    if (shouldHandleSpaClick(e)) {
                      e.preventDefault();
                      onNavigate(href);
                    }
                  }}
                  className={`shrink-0 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border text-xs sm:text-sm font-semibold transition-all duration-150 shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                    isAll
                      ? 'bg-[#7A1129] text-white border-[#7A1129]'
                      : 'border-[#E8DCC8] bg-white hover:bg-[#F5EAD9] hover:border-[#7A1129]/40 text-[#221A14]'
                  }`}
                >
                  {(item as any).isHamperPage && <Gift className="w-3.5 h-3.5 text-[#C79A3D]" />}
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        </section>
      </div>

      {/* 5. "Our Bestsellers" Festive Section */}
      <section
        aria-label="Our Bestselling Mithai"
        className="relative w-full my-8 sm:my-14 py-12 sm:py-16 overflow-hidden bg-[#EE807F]"
      >
        {/* Festive Background Image Layer */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: `url('/images/bestsellers-festive-bg.webp')` }}
          aria-hidden="true"
        />

        {/* Softening Lighter Wash Overlay (keeps gold details while ensuring optimal readability) */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-white/15 via-white/5 to-white/15 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Customer Favorites"
            eyebrowClassName="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/85 border border-[#C79A3D]/40 text-[#7A1129] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shadow-2xs mb-1.5"
            title="Our Bestselling Mithai"
            titleClassName="text-[#221A14]"
            actionText="View All Sweets"
            actionClassName="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 hover:bg-white text-[#7A1129] hover:text-[#5E0D20] border border-[#C79A3D]/40 shadow-xs text-xs sm:text-sm font-bold transition-all duration-200 self-start sm:self-auto active:scale-95 cursor-pointer"
            actionHref="/catalog"
            onAction={() => onNavigate('/catalog')}
            className="mb-6 sm:mb-8"
          />

          <ProductCarousel
            products={bestsellers}
            isLoading={loading}
            onOpenDetail={onOpenProductDetail}
          />
        </div>
      </section>

      {/* 6. "Shop By Categories" Section (Responsive Mobile Single-View + Desktop Horizontal Row) */}
      <ShopByCategoriesSection
        categories={categories}
        loading={loading}
        onSelectCategory={(slug) => onNavigate(`/categories/${slug}`)}
      />

      {/* 7b. Luxury Gift Hamper Promotional Banner (Full-Width Horizontal Edge-to-Edge) */}
      <section aria-label="Gift Hamper Collections Promotional Banner" className="w-full my-8 sm:my-14 content-visibility-auto">
        <a
          href="/hampers"
          onClick={(e) => {
            if (shouldHandleSpaClick(e)) {
              e.preventDefault();
              onNavigate('/hampers');
            }
          }}
          aria-label="Explore Saraswati Sweets Handcrafted Gift Hampers Collection - Gifting, Made Extraordinary"
          className="group block relative w-full overflow-hidden bg-[#FAF4DE] border-y border-[#C79A3D]/30 shadow-[0_4px_24px_-4px_rgba(74,8,14,0.10)] transition-all duration-300 hover:shadow-[0_12px_36px_-4px_rgba(74,8,14,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#7A1129]/30 cursor-pointer"
        >
          <picture className="w-full block">
            <source
              media="(min-width: 1025px)"
              srcSet="/images/gift-hamper-banner-2x.webp"
              type="image/webp"
            />
            <source srcSet="/images/gift-hamper-banner.webp" type="image/webp" />
            <img
              src="/images/gift-hamper-banner.jpg"
              alt="Saraswati Sweets - Gifting, Made Extraordinary. Thoughtfully curated luxury gift hampers for celebrations, businesses, and weddings. Click to explore gift collections."
              width={2048}
              height={1142}
              loading="lazy"
              decoding="async"
              className="w-full h-auto block aspect-[1024/571] object-cover transition-transform duration-500 ease-out group-hover:scale-[1.004]"
            />
          </picture>
        </a>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-14">
        {/* 9. Heritage Gifting: "Handcrafted Gift Hampers" Section */}
        <section
          id="gift-hampers"
          aria-label="Handcrafted Gift Hampers"
          className="relative rounded-3xl overflow-hidden border border-[#E8DCC8] bg-[#F5EAD9]/70 shadow-[0_4px_24px_-4px_rgba(34,26,20,0.04)] content-visibility-auto scroll-mt-28 sm:scroll-mt-32"
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
              actionHref="/hampers"
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
                <div className="relative aspect-[4/5] max-w-[240px] sm:max-w-[260px] mx-auto rounded-2xl overflow-hidden border-2 border-white/80 shadow-[0_6px_24px_rgba(0,0,0,0.3)] bg-[#5E0D20] p-1.5">
                  <div className="w-full h-full rounded-xl overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=75"
                      alt="Indira Market Flagship Store"
                      width="260"
                      height="325"
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
                <h3 className="font-display font-bold text-base sm:text-lg text-white">
                  Indira Market, Near Chaya Chauraha
                </h3>
              </div>

              {/* Store 2 */}
              <div className="space-y-3 group">
                <div className="relative aspect-[4/5] max-w-[240px] sm:max-w-[260px] mx-auto rounded-2xl overflow-hidden border-2 border-white/80 shadow-[0_6px_24px_rgba(0,0,0,0.3)] bg-[#5E0D20] p-1.5">
                  <div className="w-full h-full rounded-xl overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=75"
                      alt="Bilona Cow Ghee Kitchens"
                      width="260"
                      height="325"
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
                <h3 className="font-display font-bold text-base sm:text-lg text-white">
                  Bilona Desi Ghee Kitchens
                </h3>
              </div>

              {/* Store 3 */}
              <div className="space-y-3 group">
                <div className="relative aspect-[4/5] max-w-[240px] sm:max-w-[260px] mx-auto rounded-2xl overflow-hidden border-2 border-white/80 shadow-[0_6px_24px_rgba(0,0,0,0.3)] bg-[#5E0D20] p-1.5">
                  <div className="w-full h-full rounded-xl overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=75"
                      alt="Artisanal Chhena & Namkeen Counter"
                      width="260"
                      height="325"
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
                <h3 className="font-display font-bold text-base sm:text-lg text-white">
                  Fresh Chhena & Namkeen
                </h3>
              </div>
            </div>

            {/* Pill Button (from Reference Image 3) */}
            <div className="pt-4">
              <a
                href="/contact"
                onClick={(e) => {
                  if (shouldHandleSpaClick(e)) {
                    e.preventDefault();
                    onNavigate('/contact');
                  }
                }}
                className="min-h-[44px] px-8 py-2.5 rounded-full bg-white hover:bg-[#FAF4DE] text-[#7A1129] font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-all duration-150 active:scale-95 border border-[#C79A3D]/40"
              >
                <span>Find Our Store & Directions</span>
                <ArrowRight className="w-4 h-4 text-[#7A1129]" />
              </a>
            </div>
          </div>

          {/* Bottom Scalloped Border (from Reference Image 3) */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
            <ScallopTrim position="bottom" fillColor="#FBF6EF" accentColor="#C79A3D" />
          </div>
        </section>

        {/* 11b. Our Legacy & Certifications Editorial Section Preview */}
        <HomepageCertificationsPreview onNavigate={onNavigate} />



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
