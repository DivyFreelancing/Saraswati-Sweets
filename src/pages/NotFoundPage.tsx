import React, { useEffect } from 'react';
import { Compass, ShoppingBag, Home } from 'lucide-react';
import { handleSpaNavigation } from '../utils/navigation';
import { BUSINESS_INFO } from '../config/businessInfo';

interface NotFoundPageProps {
  onNavigate?: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'Page Not Found (404) | Saraswati Sweets Barabanki';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const popularLinks = [
    { label: 'All Sweets & Namkeen', href: '/catalog' },
    { label: 'Gift Hampers', href: '/hampers' },
    { label: 'Bulk & Wedding Orders', href: '/bulk-enquiry' },
    { label: 'Visit Our Shop', href: '/contact' },
    { label: 'Quality & Certifications', href: '/certifications' },
  ];

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-[#FBF6EF] text-[#221A14]">
      <div className="max-w-xl w-full text-center space-y-6 bg-white rounded-3xl border border-[#E8DCC8] p-6 sm:p-10 shadow-[0_4px_20px_-4px_rgba(34,26,20,0.06)]">
        <div className="w-16 h-16 rounded-2xl bg-[#F5EAD9] text-[#7A1129] flex items-center justify-center mx-auto border border-[#C79A3D]/30 shadow-xs">
          <Compass className="w-8 h-8 stroke-[1.75]" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C79A3D] px-3 py-1 rounded-full bg-[#FAF4DE] border border-[#C79A3D]/30 inline-block">
            404 Error - Page Not Found
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#221A14] tracking-tight">
            This Sweet Page Does Not Exist
          </h1>
          <p className="text-sm sm:text-base text-[#6E6259] leading-relaxed max-w-md mx-auto">
            The page or confection you are looking for may have moved, expired, or was typed incorrectly. Taste our freshly crafted sweets in our catalog or return to the main counter.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href="/catalog"
            onClick={(e) => handleSpaNavigation(e, '/catalog', onNavigate)}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#7A1129] hover:bg-[#600E20] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <ShoppingBag className="w-4 h-4 text-[#F2C94C]" />
            <span>Explore Sweet Catalog</span>
          </a>

          <a
            href="/"
            onClick={(e) => handleSpaNavigation(e, '/', onNavigate)}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl border border-[#E8DCC8] hover:bg-[#F5EAD9] text-[#221A14] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-[#6E6259]" />
            <span>Return to Home</span>
          </a>
        </div>

        <div className="pt-6 border-t border-[#E8DCC8] space-y-3">
          <p className="text-xs font-semibold text-[#6E6259] uppercase tracking-wider">
            Popular Destinations
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {popularLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleSpaNavigation(e, item.href, onNavigate)}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#FBF6EF] border border-[#E8DCC8] text-[#7A1129] font-medium hover:bg-[#F5EAD9] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#6E6259] pt-2">
          Need immediate assistance? Call our Barabanki shop directly at{' '}
          <a href={BUSINESS_INFO.phoneTel} className="text-[#7A1129] font-bold underline">
            {BUSINESS_INFO.phone}
          </a>.
        </p>
      </div>
    </div>
  );
};
