import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../../types/database';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './LoadingSkeleton';

interface ProductCarouselProps {
  products: Product[];
  isLoading?: boolean;
  onOpenDetail?: (product: Product) => void;
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  products,
  isLoading = false,
  onOpenDetail,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Detect mobile / touch devices to prevent unwanted autoplay reflows
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track system preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const slideNext = useCallback(() => {
    if (!containerRef.current || products.length <= 1) return;
    
    window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const width = container.clientWidth;
      const maxScroll = container.scrollWidth - width;
      const scrollAmount = Math.max(280, Math.round(width * 0.75));
      
      if (container.scrollLeft >= maxScroll - 10) {
        // Reached the end, loop back to start
        container.scrollTo({ left: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });
  }, [products.length, prefersReducedMotion]);

  const slidePrev = useCallback(() => {
    if (!containerRef.current || products.length <= 1) return;
    
    window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const width = container.clientWidth;
      const maxScroll = container.scrollWidth - width;
      const scrollAmount = Math.max(280, Math.round(width * 0.75));
      
      if (container.scrollLeft <= 10) {
        // Reached the start, loop to end
        container.scrollTo({ left: maxScroll, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      } else {
        container.scrollBy({ left: -scrollAmount, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });
  }, [products.length, prefersReducedMotion]);

  // Auto-slide logic (desktop only, relaxed 5s interval to eliminate forced reflow)
  useEffect(() => {
    if (isLoading || products.length <= 1 || prefersReducedMotion || isMobileDevice || isHovered || isInteracting) {
      return;
    }

    const timer = setInterval(() => {
      slideNext();
    }, 5000);

    return () => clearInterval(timer);
  }, [isLoading, products.length, prefersReducedMotion, isMobileDevice, isHovered, isInteracting, slideNext]);

  // Handle touch events to pause autoplay
  const handleTouchStart = () => setIsInteracting(true);
  const handleTouchEnd = () => {
    setTimeout(() => setIsInteracting(false), 2000); // Wait 2s before resuming after touch
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 sm:gap-6 lg:gap-8 overflow-hidden">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="w-[85vw] sm:w-[45vw] md:w-[30vw] lg:w-[23vw] shrink-0">
            <ProductCardSkeleton imageShape="circle" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div 
      className="relative group w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Bestselling Mithai Carousel"
    >
      <div className="w-full relative">
        <div 
          ref={containerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-4 -mb-4"
        >
          {products.map((product, idx) => (
            <div 
              key={`${product.id}-${idx}`}
              className="w-[85vw] sm:w-[38vw] md:w-[30vw] lg:w-[24vw] xl:w-[23vw] shrink-0 snap-start px-2 sm:px-3 lg:px-4"
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} of ${products.length}`}
            >
              <ProductCard
                product={product}
                index={idx}
                imageShape="circle"
                onOpenDetail={onOpenDetail}
              />
            </div>
          ))}
        </div>
      </div>

      {products.length > 1 && (
        <>
          <button
            onClick={slidePrev}
            aria-label="Previous products"
            className="absolute -left-3 sm:-left-7 lg:-left-9 top-[34%] -translate-y-1/2 z-10 p-2 sm:p-2.5 rounded-full bg-white/95 border border-[#E8DCC8] text-[#7A1129] shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-[#F5EAD9] focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#C79A3D] disabled:opacity-0 active:scale-95 cursor-pointer"
            disabled={products.length <= 1}
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <button
            onClick={slideNext}
            aria-label="Next products"
            className="absolute -right-3 sm:-right-7 lg:-right-9 top-[34%] -translate-y-1/2 z-10 p-2 sm:p-2.5 rounded-full bg-white/95 border border-[#E8DCC8] text-[#7A1129] shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-[#F5EAD9] focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#C79A3D] disabled:opacity-0 active:scale-95 cursor-pointer"
            disabled={products.length <= 1}
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}
      
      {/* Reduced Motion Toggle Announcer */}
      {prefersReducedMotion && (
        <div className="sr-only" aria-live="polite">
          Carousel autoplay is disabled due to your system motion preferences.
        </div>
      )}
    </div>
  );
};
