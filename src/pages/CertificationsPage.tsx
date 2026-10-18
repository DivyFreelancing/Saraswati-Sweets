import React, { useEffect } from 'react';
import { CertificationsSection } from '../components/certifications/CertificationsSection';
import { ChevronRight, ShieldCheck, MapPin, Award, CheckCircle } from 'lucide-react';
import { handleSpaNavigation } from '../utils/navigation';

interface CertificationsPageProps {
  onNavigate?: (path: string) => void;
}

export const CertificationsPage: React.FC<CertificationsPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'Our Legacy & Certifications | Saraswati Sweets Barabanki';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF6EF] text-[#221A14]">
      {/* Editorial Breadcrumb Bar */}
      <nav aria-label="Breadcrumb" className="bg-[#F5EAD9]/70 border-b border-[#E8DCC8] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-[#6E6259]">
          <a
            href="/"
            onClick={(e) => handleSpaNavigation(e, '/', onNavigate)}
            className="hover:text-[#7A1129] transition-colors"
          >
            Home
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-[#C79A3D]" />
          <span className="text-[#221A14] font-semibold">Our Legacy & Certifications</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12 sm:space-y-16">
        {/* Heritage Story Introduction Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#7A1129] via-[#650E22] to-[#450816] text-white p-6 sm:p-10 md:p-12 shadow-xl border border-[#C79A3D]/40">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[#F2C94C] text-xs font-semibold uppercase tracking-wider border border-[#F2C94C]/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>A Tradition of Trust Since 1989</span>
            </div>

            <h1 className="font-display font-bold text-2xl sm:text-4xl md:text-5xl text-white leading-tight">
              Authenticity, Safety & Awadhi Confectionery Heritage
            </h1>

            <p className="text-sm sm:text-base text-white/85 leading-relaxed">
              For over three decades, Saraswati Sweets has welcomed generations of families in Barabanki.
              We believe pure ingredients and uncompromised food safety are matters of pride and responsibility.
              Below are the actual photographs of the official statutory food safety licenses, state awards, and safety service records displayed at our store.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-white/90">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#F2C94C]" />
                <span>100% Pure Cow Desi Ghee</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#F2C94C]" />
                <span>Statutory FSSAI State License</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#F2C94C]" />
                <span>State Millets Programme Winner</span>
              </div>
            </div>
          </div>

          {/* Decorative Background Accents */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-[#C79A3D]/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-[#C79A3D]/10 blur-3xl pointer-events-none" />
        </div>

        {/* The Certifications Section Component */}
        <CertificationsSection isPage={true} onNavigate={onNavigate} />

        {/* Visit Our Store Physical Callout */}
        <div className="rounded-3xl border border-[#E8DCC8] bg-white p-6 sm:p-10 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#7A1129] uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-[#7A1129]" />
              <span>Visit Us in Person</span>
            </div>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-[#221A14]">
              Inspect Our Heritage & Licenses In-Store
            </h3>
            <p className="text-xs sm:text-sm text-[#6E6259] leading-relaxed">
              Every document featured above is framed on our retail wall at Saraswati Sweets, Indira Market, Near Chaya Chauraha, Barabanki.
              We invite every customer to experience the aroma of fresh desi ghee mithai prepared each morning.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <a
              href="/contact"
              onClick={(e) => handleSpaNavigation(e, '/contact', onNavigate)}
              className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] text-white font-bold text-xs sm:text-sm shadow-sm transition-all inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#7A1129]"
            >
              Get Directions to Store
            </a>
            <a
              href="/catalog"
              onClick={(e) => handleSpaNavigation(e, '/catalog', onNavigate)}
              className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#F5EAD9] hover:bg-[#E8DCC8] text-[#7A1129] font-bold text-xs sm:text-sm transition-all inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#7A1129]"
            >
              Browse Sweet Catalog
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};
