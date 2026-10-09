import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { DoubleScallopDivider } from './DecorativeBorders';

interface HeroSectionProps {
  onExploreClick: () => void;
  onGiftingClick: () => void;
}

interface HeroSlide {
  id: number;
  image: string;
  eyebrow: string;
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  onPrimaryClick: 'catalog' | 'hampers';
  onSecondaryClick: 'catalog' | 'hampers';
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    image: '/images/1.webp',
    eyebrow: 'Since 1989 · Barabanki',
    titlePrefix: 'Authentic Mithai,',
    titleHighlight: 'Crafted Fresh Daily.',
    description: 'Pure cow desi ghee sweets slow-cooked every morning near Ghantaghar.',
    primaryCtaText: 'Shop Bestsellers',
    secondaryCtaText: 'Explore Hampers',
    onPrimaryClick: 'catalog',
    onSecondaryClick: 'hampers',
  },
  {
    id: 2,
    image: '/images/2.webp',
    eyebrow: 'Festive Celebrations',
    titlePrefix: 'Pure Desi Ghee,',
    titleHighlight: 'Pure Celebrations.',
    description: 'Traditional Awadhi recipes for every auspicious family occasion.',
    primaryCtaText: 'Explore Sweets',
    secondaryCtaText: 'Bulk Enquiries',
    onPrimaryClick: 'catalog',
    onSecondaryClick: 'catalog',
  },
  {
    id: 3,
    image: '/images/3.webp',
    eyebrow: 'Royal Keepsakes',
    titlePrefix: 'Handcrafted',
    titleHighlight: 'Gift Hampers.',
    description: 'Regal presentation boxes filled with signature sweets & dry fruits.',
    primaryCtaText: 'Shop Hampers',
    secondaryCtaText: 'All Sweets',
    onPrimaryClick: 'hampers',
    onSecondaryClick: 'catalog',
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreClick,
  onGiftingClick,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Auto-advance carousel every 5.5 seconds
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (deltaX > 45) {
      handlePrev();
    } else if (deltaX < -45) {
      handleNext();
    }
    touchStartXRef.current = null;
  };

  const activeSlide = HERO_SLIDES[currentSlide];

  return (
    <section
      aria-label="Featured Sweet Collections and Banners"
      className="relative overflow-hidden w-full min-h-[380px] sm:min-h-[520px] md:min-h-[600px] flex items-end sm:items-center bg-[#2A0E14] select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Full-bleed Sliding Banner Images with smooth cross-fade */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
              }`}
            >
              <picture>
                {index === 0 && (
                  <source media="(max-width: 640px)" srcSet="/images/1-mobile.webp" type="image/webp" />
                )}
                <source srcSet={slide.image} type="image/webp" />
                <img
                  src={slide.image}
                  alt={slide.titlePrefix}
                  width="1920"
                  height="731"
                  className="w-full h-full object-cover object-center scale-102 transition-transform duration-7000 ease-out"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding={index === 0 ? 'sync' : 'async'}
                  fetchPriority={index === 0 ? 'high' : 'low'}
                />
              </picture>
            </div>
          );
        })}

        {/* Gradient overlay: On mobile, only a light bottom gradient so background sweets image is 100% visible & bright */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent sm:bg-gradient-to-r sm:from-[#2A0E14]/90 sm:via-[#2A0E14]/70 sm:to-[#2A0E14]/20 z-[1]" />
        <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-[#2A0E14]/80 via-transparent to-black/30 z-[1]" />
      </div>

      {/* 2. Previous / Next Arrow Controls (Desktop only — keeps mobile completely clear for touch swipe) */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Previous banner slide"
        className="hidden sm:flex absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-black/40 hover:bg-[#7A1129] text-white backdrop-blur-xs items-center justify-center transition-all duration-150 border border-white/20 active:scale-95 shadow-md"
      >
        <ChevronLeft className="w-5 h-5 text-[#FAF4DE]" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Next banner slide"
        className="hidden sm:flex absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-black/40 hover:bg-[#7A1129] text-white backdrop-blur-xs items-center justify-center transition-all duration-150 border border-white/20 active:scale-95 shadow-md"
      >
        <ChevronRight className="w-5 h-5 text-[#FAF4DE]" />
      </button>

      {/* 3. Hero Overlay Content (On mobile: docked at the bottom with small, sleek text so the photo has maximum focus) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 sm:py-16 lg:py-20 w-full">
        <div className="max-w-xl lg:max-w-2xl space-y-2.5 sm:space-y-4">
          {/* Eyebrow Line (Hidden on mobile to eliminate clutter) */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF4DE]/15 backdrop-blur-md border border-[#C79A3D]/50 text-[11px] sm:text-xs font-semibold tracking-wide shadow-xs"
            style={{ color: '#FAF4DE' }}
          >
            <Sparkles className="w-3 h-3 text-[#C79A3D]" />
            <span>{activeSlide.eyebrow}</span>
          </div>

          {/* Serif H1 with subtle text-shadow — small & compact on mobile */}
          <h1
            className="font-display text-xl sm:text-3xl md:text-5xl font-bold leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
            style={{ color: '#FAF4DE' }}
          >
            {activeSlide.titlePrefix}{' '}
            <span className="italic font-serif" style={{ color: '#E8C872' }}>
              {activeSlide.titleHighlight}
            </span>
          </h1>

          {/* One short supporting line — hidden on mobile so customer focus is 100% on sweets imagery */}
          <p
            className="hidden sm:block text-xs sm:text-sm md:text-base max-w-md leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] font-normal opacity-90"
            style={{ color: '#FAF4DE' }}
          >
            {activeSlide.description}
          </p>

          {/* Two PILL Buttons side by side — sleek and compact on mobile */}
          <div className="flex items-center gap-2.5 sm:gap-3 pt-0.5 sm:pt-1">
            <button
              type="button"
              onClick={activeSlide.onPrimaryClick === 'hampers' ? onGiftingClick : onExploreClick}
              className="min-h-[36px] sm:min-h-[42px] px-4 sm:px-7 py-1.5 sm:py-2.5 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] text-white font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] border border-[#C79A3D]/40 transition-all duration-150 active:scale-[0.98]"
            >
              <span>{activeSlide.primaryCtaText}</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FAF4DE]" />
            </button>

            <button
              type="button"
              onClick={activeSlide.onSecondaryClick === 'hampers' ? onGiftingClick : onExploreClick}
              style={{ color: '#FAF4DE', borderColor: '#FAF4DE' }}
              className="min-h-[36px] sm:min-h-[42px] px-3.5 sm:px-6 py-1.5 sm:py-2.5 rounded-full border border-white/60 sm:border-2 bg-black/25 sm:bg-transparent hover:bg-white hover:text-[#7A1129] font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.98] shadow-sm backdrop-blur-xs"
            >
              <Gift className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C79A3D]" />
              <span>{activeSlide.secondaryCtaText}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Slide Pagination Indicator Dots */}
      <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2.5 transition-all duration-300 rounded-full ${
                isActive
                  ? 'w-8 bg-[#C79A3D] shadow-xs'
                  : 'w-2.5 bg-[#FAF4DE]/50 hover:bg-[#FAF4DE]'
              }`}
            />
          );
        })}
      </div>

      {/* 5. Layered Double-Scallop Wave Divider (Ivory over Royal Gold, directly below hero) */}
      <div className="absolute -bottom-px left-0 right-0 w-full overflow-hidden pointer-events-none z-10 leading-none">
        <DoubleScallopDivider fillColor="#FBF6EF" accentColor="#C79A3D" />
      </div>
    </section>
  );
};
