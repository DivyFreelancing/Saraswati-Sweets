import React from 'react';
import { Banner } from '../../types/database';
import { ArrowRight, Sparkles } from 'lucide-react';
import { OrnateCardFrame } from './DecorativeBorders';

interface PromoBannerProps {
  banner: Banner;
  onCtaClick?: () => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ banner, onCtaClick }) => {
  return (
    <OrnateCardFrame
      className="bg-[#7A1129] text-white border border-[#C79A3D]/40 shadow-md"
      pageBgColor="#FBF6EF"
      borderColor="#C79A3D"
    >
      {/* Background Indian geometric floral motif overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 select-none"
        style={{
          backgroundImage: `radial-gradient(#FAF4DE 1.5px, transparent 1.5px), radial-gradient(#C79A3D 1.5px, transparent 1.5px)`,
          backgroundSize: '28px 28px',
          backgroundPosition: '0 0, 14px 14px',
        }}
      />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 items-center p-2 sm:p-4">
        {/* Text Area */}
        <div className="p-6 sm:p-10 md:col-span-7 space-y-4">
          {banner.badge && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF4DE] text-[#7A1129] text-xs font-bold uppercase tracking-wider border border-[#C79A3D]/50 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C79A3D]" />
              <span>{banner.badge}</span>
            </div>
          )}

          <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight drop-shadow-xs">
            {banner.title}
          </h3>

          {banner.subtitle && (
            <p className="text-white/90 text-sm sm:text-base max-w-lg leading-relaxed font-normal">
              {banner.subtitle}
            </p>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={onCtaClick}
              className="min-h-[44px] px-8 py-2.5 rounded-full bg-white hover:bg-[#FAF4DE] text-[#7A1129] font-bold text-sm inline-flex items-center gap-2 shadow-sm transition-all duration-150 active:scale-95"
            >
              <span>{banner.cta_text || 'Explore Sweets'}</span>
              <ArrowRight className="w-4 h-4 text-[#7A1129]" />
            </button>
          </div>
        </div>

        {/* Image Area */}
        <div className="md:col-span-5 h-56 md:h-72 relative overflow-hidden rounded-2xl p-2">
          <div className="w-full h-full rounded-xl overflow-hidden border border-[#C79A3D]/40 shadow-inner relative">
            <img
              src={banner.image_url}
              alt={banner.title}
              className="w-full h-full object-cover opacity-95 hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#7A1129]/60 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </OrnateCardFrame>
  );
};
