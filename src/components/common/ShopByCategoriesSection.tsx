import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Category } from '../../types/database';
import { CategoryCard, getCategoryResolvedImageUrl } from './CategoryCard';
import { shouldHandleSpaClick } from '../../utils/navigation';

interface ShopByCategoriesSectionProps {
  categories: Category[];
  loading?: boolean;
  onSelectCategory: (slug: string) => void;
}

export const ShopByCategoriesSection: React.FC<ShopByCategoriesSectionProps> = ({
  categories,
  loading = false,
  onSelectCategory,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Touch swipe refs
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = categories.length;

  // Keep activeIndex within bounds if categories change dynamically
  useEffect(() => {
    if (total > 0 && activeIndex >= total) {
      setActiveIndex(0);
    }
  }, [total, activeIndex]);

  const handleNext = useCallback(() => {
    if (total <= 1 || isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
    setTimeout(() => setIsAnimating(false), 280);
  }, [total, isAnimating]);

  const handlePrev = useCallback(() => {
    if (total <= 1 || isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
    setTimeout(() => setIsAnimating(false), 280);
  }, [total, isAnimating]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45; // Minimum px to trigger swipe

    if (diff > minSwipeDistance) {
      handleNext();
    } else if (diff < -minSwipeDistance) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    }
  };

  const activeCategory = categories[activeIndex] || categories[0];

  return (
    <section
      aria-label="Shop By Categories"
      className="w-full bg-[#FAF5EB] py-8 sm:py-14 my-4 sm:my-10 border-y border-[#EBDCC8]/60 content-visibility-auto select-none"
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header: Eyebrow + Centered Title */}
        <div className="text-center mb-5 sm:mb-10">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#7A1129] inline-block mb-1.5 sm:mb-2">
            OUR EXCLUSIVE COLLECTIONS
          </span>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#221A14] tracking-tight">
            Shop By Categories
          </h2>
        </div>

        {/* Loading Skeleton */}
        {loading && total === 0 ? (
          <div>
            {/* Mobile Loading Skeleton: Single Large Circle */}
            <div className="flex flex-col items-center justify-center md:hidden animate-pulse">
              <div className="w-[240px] h-[240px] min-[360px]:w-[280px] min-[360px]:h-[280px] rounded-full bg-[#E8DCC8]/60 border-4 border-[#E8DCC8]" />
              <div className="mt-4 h-6 w-36 bg-[#E8DCC8]/80 rounded-md" />
              <div className="flex gap-2 mt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#E8DCC8]" />
                ))}
              </div>
            </div>

            {/* Desktop Loading Skeleton: Horizontal Row of Small Circles */}
            <div className="hidden md:flex items-center justify-center gap-6 lg:gap-10 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center w-20 md:w-24 lg:w-28 p-1">
                  <div className="w-20 h-20 md:w-24 md:h-24 lg:w-[96px] lg:h-[96px] rounded-full bg-[#E8DCC8]/60 border-2 border-[#E8DCC8]" />
                  <div className="mt-2.5 h-3.5 w-16 bg-[#E8DCC8]/80 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ) : total > 0 && activeCategory ? (
          <div>
            {/* 1. Mobile Layout (< 768px): Only ONE prominent large category at a time */}
            <div
              className="flex flex-col items-center justify-center md:hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Image with subtle Left/Right Nav Arrows */}
              <div className="relative flex items-center justify-center w-full max-w-[400px] mx-auto">
                {/* Previous Category Button */}
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous category"
                  className="absolute left-0 sm:left-1 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 border border-[#E8DCC8] text-[#7A1129] shadow-md flex items-center justify-center hover:bg-white active:scale-90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1129] cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Large Circular Category Image (280-340px diameter, adjusted to viewport) */}
                <a
                  href={`/categories/${activeCategory.slug}`}
                  onClick={(e) => {
                    if (shouldHandleSpaClick(e)) {
                      e.preventDefault();
                      onSelectCategory(activeCategory.slug);
                    }
                  }}
                  aria-label={`Explore ${activeCategory.name} category`}
                  className="group block relative p-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#7A1129]/30 rounded-full"
                >
                  <div className="w-[240px] h-[240px] min-[360px]:w-[280px] min-[360px]:h-[280px] min-[400px]:w-[320px] min-[400px]:h-[320px] max-w-[calc(100vw-3.5rem)] max-h-[calc(100vw-3.5rem)] aspect-square rounded-full overflow-hidden bg-[#FAF4DE] border-3 sm:border-4 border-[#E8DCC8] shadow-[0_12px_36px_-6px_rgba(74,8,14,0.14)] transition-all duration-300 group-hover:border-[#C79A3D] group-hover:scale-102">
                    <img
                      key={activeCategory.id}
                      src={getCategoryResolvedImageUrl(activeCategory, 640)}
                      alt={activeCategory.name}
                      width={340}
                      height={340}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover rounded-full transition-all duration-300 ease-out"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/categories/meva.webp';
                      }}
                    />
                  </div>
                </a>

                {/* Next Category Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next category"
                  className="absolute right-0 sm:right-1 z-10 w-11 h-11 rounded-full bg-white/95 border border-[#E8DCC8] text-[#7A1129] shadow-md flex items-center justify-center hover:bg-white active:scale-90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1129] cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Category Name Label Directly Underneath */}
              <div className="text-center mt-3 sm:mt-4">
                <a
                  href={`/categories/${activeCategory.slug}`}
                  onClick={(e) => {
                    if (shouldHandleSpaClick(e)) {
                      e.preventDefault();
                      onSelectCategory(activeCategory.slug);
                    }
                  }}
                  className="inline-block group focus:outline-none"
                  aria-label={`View ${activeCategory.name} products`}
                >
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[#221A14] group-hover:text-[#7A1129] transition-colors tracking-tight">
                    {activeCategory.name}
                  </h3>
                  {activeCategory.description && (
                    <p className="mt-1 text-xs sm:text-sm text-[#6E6259] max-w-xs mx-auto line-clamp-1 px-4">
                      {activeCategory.description}
                    </p>
                  )}
                </a>
              </div>

              {/* Dot Indicators for Mobile Carousel */}
              <div
                className="flex items-center justify-center gap-2 mt-4"
                role="tablist"
                aria-label="Category selector"
              >
                {categories.map((cat, idx) => (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={idx === activeIndex}
                    aria-label={`View ${cat.name}`}
                    onClick={() => setActiveIndex(idx)}
                    className={`transition-all duration-300 rounded-full h-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1129] ${
                      idx === activeIndex
                        ? 'w-7 bg-[#7A1129]'
                        : 'w-2 bg-[#D1C4B2] hover:bg-[#A89885]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 2. Desktop & Tablet Layout (>= 768px): All categories in a centered horizontal row with small circular images (80-100px) */}
            <div className="hidden md:flex items-start justify-center gap-6 lg:gap-10 flex-wrap">
              {categories.map((cat, idx) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  isSelected={idx === activeIndex}
                  href={`/categories/${cat.slug}`}
                  onClick={(slug) => onSelectCategory(slug)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-[#F5EAD9]/40 rounded-2xl border border-[#E8DCC8]">
            <p className="text-[#6E6259] font-medium">No categories available at the moment.</p>
          </div>
        )}
      </div>
    </section>
  );
};
