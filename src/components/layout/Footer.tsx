import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  X,
  CreditCard,
  Truck,
  Facebook,
  Youtube,
  Instagram,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { BUSINESS_INFO } from '../../config/businessInfo';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [legalModal, setLegalModal] = useState<{ title: string; content: string } | null>(null);

  const openLegal = (title: string, content: string) => {
    setLegalModal({ title, content });
  };

  return (
    <>
      <footer id="footer" className="bg-[#FBF6EF] text-[#221A14] pt-0 pb-0 overflow-hidden relative border-t border-[#E8DCC8]/60 content-visibility-auto">
        {/* Subtle Darker/Cropped Heritage Ornamental Border Strip along Footer Top Edge */}
        <div
          className="w-full h-10 sm:h-14 md:h-16 overflow-hidden relative opacity-45 sm:opacity-55 select-none pointer-events-none mb-8 sm:mb-10"
          style={{
            backgroundImage: `url('/images/saraswati-heritage-border.webp')`,
            backgroundPosition: 'center bottom',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            filter: 'brightness(0.85) contrast(1.15)',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 1. 4-Column Navigation Links (inspired by luxury mithai store structure) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 pb-12 sm:pb-14">
            {/* Column 1: Quick Links */}
            <div className="space-y-3.5">
              <h4 className="font-display font-bold text-sm sm:text-base text-[#221A14] tracking-wide">
                Quick Links
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#6E6259]">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    World Of Saraswati
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/certifications')}
                    className="hover:text-[#7A1129] text-[#7A1129] font-medium transition-colors"
                  >
                    Our Legacy & Certifications
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/bulk-enquiry')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Bulk Order Enquiry
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/orders')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Track Order
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/contact')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Find A Store
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2: World Of Saraswati (Categories) */}
            <div className="space-y-3.5">
              <h4 className="font-display font-bold text-sm sm:text-base text-[#221A14] tracking-wide">
                World Of Saraswati
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#6E6259]">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/catalog')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    All Sweets
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/categories')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Shop by Category
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/hampers')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Premium Gift Hampers
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Customer Support */}
            <div className="space-y-3.5">
              <h4 className="font-display font-bold text-sm sm:text-base text-[#221A14] tracking-wide">
                Customer Support
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#6E6259]">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/contact')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Contact Store
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/orders')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Track Your Order
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/bulk-enquiry')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Weddings & Catering
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/shipping-policy')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Delivery Info & PIN Codes
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact Us */}
            <div className="space-y-3.5">
              <h4 className="font-display font-bold text-sm sm:text-base text-[#221A14] tracking-wide">
                Contact Us
              </h4>
              <div className="space-y-2 text-xs sm:text-sm text-[#6E6259]">
                <a
                  href={BUSINESS_INFO.phoneTel}
                  className="font-semibold text-[#221A14] hover:text-[#7A1129] block"
                >
                  {BUSINESS_INFO.phone}
                </a>
                <div className="text-xs text-[#6E6259]">
                  {BUSINESS_INFO.operatingSchedule}
                </div>
                <div className="text-xs text-[#6E6259] leading-relaxed">
                  {BUSINESS_INFO.address}
                </div>
                <div className="pt-1 space-y-1 text-xs">
                  <div>
                    <span className="font-medium text-[#221A14]">Orders: </span>
                    <a
                      href={`mailto:${BUSINESS_INFO.configuredSenderEmail}`}
                      className="hover:text-[#7A1129] text-[#7A1129] underline"
                    >
                      {BUSINESS_INFO.configuredSenderEmail}
                    </a>
                  </div>
                  <div>
                    <span className="font-medium text-[#221A14]">Support: </span>
                    <a
                      href={`mailto:${BUSINESS_INFO.configuredSupportEmail}`}
                      className="hover:text-[#7A1129] text-[#7A1129] underline"
                    >
                      {BUSINESS_INFO.configuredSupportEmail}
                    </a>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <PWAInstallButton variant="footer" />
                  <a
                    href={BUSINESS_INFO.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A1129] hover:underline pt-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Get Directions on Google Maps ↗</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Thin Divider Line */}
          <div className="w-full h-px bg-[#E8DCC8]/80" />

          {/* Centered Brand Emblem, Tagline, Badges & Social Media */}
          <div className="py-8 sm:py-10 text-center space-y-4">
            <div
              className="inline-block cursor-pointer select-none group"
              onClick={() => onNavigate('/')}
              title="Saraswati Sweets Since 1989"
            >
              <img
                src="/images/logo.webp"
                alt="Saraswati Sweets Since 1989"
                width="180"
                height="64"
                className="h-14 sm:h-16 w-auto mx-auto object-contain group-hover:scale-105 transition-transform drop-shadow-xs"
                loading="lazy"
                decoding="async"
              />
            </div>

            <p className="font-display italic text-sm sm:text-base text-[#6E6259] tracking-wide">
              Crafted with tradition, delivered with trust.
            </p>

            {/* Trust Badges Strip (FSSAI, Cashfree, Fast Delivery, 100% Veg) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-5 pt-1 text-xs text-[#6E6259]">
              <button
                type="button"
                onClick={() => onNavigate('/certifications')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8DCC8] hover:border-[#2E7D4F] shadow-2xs transition-colors cursor-pointer text-left"
                title="View official FSSAI State License Form C"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D4F]" />
                <span className="font-semibold text-[#221A14]">FSSAI: 12714022000190</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8DCC8] shadow-2xs">
                <span className="font-semibold text-[#221A14]">GST: 09ABEFS9729B1ZY</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8DCC8] shadow-2xs">
                <CreditCard className="w-3.5 h-3.5 text-[#7A1129]" />
                <span className="font-semibold text-[#221A14]">Cashfree & UPI Secure</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8DCC8] shadow-2xs">
                <Truck className="w-3.5 h-3.5 text-[#B8781E]" />
                <span className="font-semibold text-[#221A14]">Same-Day Barabanki Delivery</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8DCC8] shadow-2xs">
                <span className="w-3 h-3 rounded-xs border border-[#2E7D4F] flex items-center justify-center p-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D4F]" />
                </span>
                <span className="font-semibold text-[#221A14]">100% Pure Vegetarian</span>
              </div>
            </div>

            {/* Social Media Circles */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href="https://www.instagram.com/saraswati.sweets/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-[#7A1129] text-white hover:bg-[#5E0D20] flex items-center justify-center transition-colors shadow-2xs"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.facebook.com/vishwanathsweets"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full bg-[#7A1129] text-white hover:bg-[#5E0D20] flex items-center justify-center transition-colors shadow-2xs"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={BUSINESS_INFO.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-8 h-8 rounded-full bg-[#2E7D4F] text-white hover:bg-[#256640] flex items-center justify-center transition-colors shadow-2xs"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-8 h-8 rounded-full bg-[#B3261E] text-white hover:bg-[#901e18] flex items-center justify-center transition-colors shadow-2xs"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>

            {/* Copyright & Legal Links */}
            <div className="pt-3 text-[11px] sm:text-xs text-[#6E6259] space-y-1.5">
              <div>
                All rights reserved © {new Date().getFullYear()} {BUSINESS_INFO.legalName} · Pure Desi Ghee Mithai Since {BUSINESS_INFO.establishedYear}
              </div>
              <div className="text-[11px] text-[#8A1538] font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D4F]" />
                <span>FSSAI State License No. <strong>{BUSINESS_INFO.fssaiLicenseNumber}</strong></span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('/privacy-policy')}
                  className="hover:text-[#7A1129] hover:underline font-medium"
                >
                  Privacy Policy
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => onNavigate('/terms')}
                  className="hover:text-[#7A1129] hover:underline font-medium"
                >
                  Terms & Conditions
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => onNavigate('/shipping-policy')}
                  className="hover:text-[#7A1129] hover:underline font-medium"
                >
                  Shipping & Delivery
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => onNavigate('/refund-policy')}
                  className="hover:text-[#7A1129] hover:underline font-medium"
                >
                  Cancellation & Refund
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => onNavigate('/contact')}
                  className="hover:text-[#7A1129] hover:underline font-medium"
                >
                  Grievance Redressal
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => onNavigate('/admin')}
                  className="text-[#7A1129] hover:underline font-semibold"
                >
                  Staff Portal
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. PANORAMIC WATERCOLOR LANDMARK BANNER AT THE VERY BOTTOM OF THE PAGE
            User request:
            "page ke last ko aisa banao , jo image maine di hai folder me , bottom_banner naam ka , usko implement karo , border blurry rkhna ki match kar jaaye website se"
            The top border is blurry and smoothly dissolves directly into #FBF6EF using CSS mask & gradient overlay!
        */}
        <div className="relative w-full overflow-hidden select-none -mb-1 mt-2">
          {/* Panoramic artwork with CSS linear gradient mask for blurry watercolor dissolve */}
          <div
            className="w-full relative"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 10%, rgba(0,0,0,0.6) 24%, rgba(0,0,0,0.95) 42%, black 60%, black 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 10%, rgba(0,0,0,0.6) 24%, rgba(0,0,0,0.95) 42%, black 60%, black 100%)',
            }}
          >
            <img
              src="/images/bottom_banner.webp"
              alt="Historic Barabanki Ghantaghar & Saraswati Sweets Landmark Panorama - Mithas Ki Purani Dukan"
              width="1920"
              height="640"
              className="w-full h-auto min-h-[160px] sm:min-h-[220px] md:min-h-[280px] lg:min-h-[360px] xl:min-h-[420px] max-h-[520px] object-cover object-bottom aspect-[3/1]"
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* Smooth watercolor blur overlay blending the sky seamlessly into the website's background color #FBF6EF */}
          <div
            className="absolute inset-x-0 top-0 h-16 sm:h-28 md:h-36 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, #FBF6EF 0%, rgba(251, 246, 239, 0.85) 30%, rgba(251, 246, 239, 0.3) 70%, rgba(251, 246, 239, 0) 100%)',
            }}
          />
        </div>
      </footer>

      {/* Lightweight Legal Modal */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-[#E8DCC8] p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8DCC8] pb-3">
              <h3 className="font-display font-bold text-lg text-[#221A14]">
                {legalModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#6E6259] hover:bg-[#F5EAD9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#6E6259] leading-relaxed">
              {legalModal.content}
            </p>
            <div className="text-right pt-2">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 bg-[#7A1129] text-white text-xs font-semibold rounded-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
