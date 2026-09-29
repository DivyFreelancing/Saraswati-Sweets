import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  X,
  CreditCard,
  Truck,
  Instagram,
  Facebook,
  Youtube,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';

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
      <footer id="footer" className="bg-[#FBF6EF] text-[#221A14] pt-0 pb-0 overflow-hidden relative border-t border-[#E8DCC8]/60">
        {/* Subtle Darker/Cropped Heritage Ornamental Border Strip along Footer Top Edge */}
        <div
          className="w-full h-10 sm:h-14 md:h-16 overflow-hidden relative opacity-45 sm:opacity-55 select-none pointer-events-none mb-8 sm:mb-10"
          style={{
            backgroundImage: `url('/images/saraswati-heritage-border.png')`,
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
                    onClick={() => onNavigate('/catalog?category=desi-ghee-sweets')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Mithai
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/catalog?category=namkeen-savories')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Namkeen & Snacks
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/catalog?category=kaju-dry-fruits')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Luxury Dry Fruits
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/catalog?category=breakfast-chaat')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Breakfast Delights
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/catalog?category=chhena-syrupy')}
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Healthy Indulgence
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
                    Contact Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      openLegal(
                        'Shipping & Delivery',
                        'We deliver freshly prepared sweets across Barabanki (PIN codes: 225001, 225002, 225003, 225122) within chosen 2-hour slots. Free delivery on orders above ₹499. Small nominal fee of ₹40 for smaller orders.'
                      )
                    }
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Shipping & Delivery
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      openLegal(
                        'Return Policy',
                        'Given the perishable nature of fresh traditional Indian sweets, orders may be cancelled up to 1 hour before dispatch. In the rare event of transit damage or quality concern, we provide immediate replacements or full refunds.'
                      )
                    }
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Return Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      openLegal(
                        'Privacy Policy',
                        'At Saraswati Sweets, we value your privacy. We collect customer names, delivery addresses, and phone numbers strictly to fulfill sweet delivery orders in Barabanki and send status updates. We never sell or share your personal data with third-party advertisers.'
                      )
                    }
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      openLegal(
                        'Terms & Conditions',
                        'All sweets are prepared fresh in our Barabanki kitchen. Product weights include standard food-grade packaging. Orders are fulfilled within chosen delivery slots. Prices are inclusive of all local taxes.'
                      )
                    }
                    className="hover:text-[#7A1129] transition-colors"
                  >
                    Terms & Conditions
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
                  href="tel:+919450012345"
                  className="font-semibold text-[#221A14] hover:text-[#7A1129] block"
                >
                  +91 94500 12345
                </a>
                <div className="text-xs text-[#6E6259]">
                  Mon – Sun: 8:00 am – 10:00 pm IST
                </div>
                <div className="text-xs text-[#6E6259] leading-relaxed">
                  Main Market Road, Near Ghantaghar, Barabanki, UP 225001
                </div>
                <div className="pt-1">
                  <a
                    href="mailto:order@saraswatisweets.in"
                    className="text-xs hover:text-[#7A1129] text-[#7A1129] underline"
                  >
                    order@saraswatisweets.in
                  </a>
                </div>
                <div className="pt-2">
                  <PWAInstallButton variant="footer" />
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
                src="/images/logo.png"
                alt="Saraswati Sweets Since 1989"
                className="h-14 sm:h-16 w-auto mx-auto object-contain group-hover:scale-105 transition-transform drop-shadow-xs"
              />
            </div>

            <p className="font-display italic text-sm sm:text-base text-[#6E6259] tracking-wide">
              Crafted with tradition, delivered with trust.
            </p>

            {/* Trust Badges Strip (FSSAI, Razorpay, Fast Delivery, 100% Veg) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-5 pt-1 text-xs text-[#6E6259]">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8DCC8] shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D4F]" />
                <span className="font-semibold text-[#221A14]">FSSAI Lic: 12721008000492</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8DCC8] shadow-2xs">
                <CreditCard className="w-3.5 h-3.5 text-[#7A1129]" />
                <span className="font-semibold text-[#221A14]">Razorpay & UPI Secure</span>
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
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-[#7A1129] text-white hover:bg-[#5E0D20] flex items-center justify-center transition-colors shadow-2xs"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full bg-[#7A1129] text-white hover:bg-[#5E0D20] flex items-center justify-center transition-colors shadow-2xs"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/919450012345"
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
            <div className="pt-3 text-[11px] sm:text-xs text-[#6E6259] space-y-1">
              <div>
                All rights reserved © {new Date().getFullYear()} Saraswati Sweets Private Limited · Pure Desi Ghee Mithai Since 1989
              </div>
              <div className="flex items-center justify-center gap-4 text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() =>
                    openLegal(
                      'Privacy Policy',
                      'At Saraswati Sweets, we value your privacy. We collect customer names, delivery addresses, and phone numbers strictly to fulfill sweet delivery orders in Barabanki and send status updates. We never sell or share your personal data with third-party advertisers.'
                    )
                  }
                  className="hover:text-[#7A1129] hover:underline"
                >
                  Privacy Policy
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() =>
                    openLegal(
                      'Terms & Conditions',
                      'All sweets are prepared fresh in our Barabanki kitchen. Product weights include standard food-grade packaging. Orders are fulfilled within chosen delivery slots. Prices are inclusive of all local taxes.'
                    )
                  }
                  className="hover:text-[#7A1129] hover:underline"
                >
                  Terms & Conditions
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() =>
                    openLegal(
                      'Return Policy',
                      'Given the perishable nature of fresh traditional Indian sweets, orders may be cancelled up to 1 hour before dispatch. In the rare event of transit damage or quality concern, we provide immediate replacements or full refunds.'
                    )
                  }
                  className="hover:text-[#7A1129] hover:underline"
                >
                  Return Policy
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
              src="/images/bottom_banner.png"
              alt="Historic Barabanki Ghantaghar & Saraswati Sweets Landmark Panorama - Mithas Ki Purani Dukan"
              className="w-full h-auto min-h-[160px] sm:min-h-[220px] md:min-h-[280px] lg:min-h-[360px] xl:min-h-[420px] max-h-[520px] object-cover object-bottom"
              loading="lazy"
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
