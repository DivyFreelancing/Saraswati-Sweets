import React, { useState } from 'react';
import {
  ShieldCheck,
  Award,
  Flame,
  ZoomIn,
  Calendar,
  Building2,
  FileText,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  CERTIFICATION_DOCUMENTS,
  CertificationDocument,
} from '../../data/certificationsData';
import { DocumentViewerModal } from './DocumentViewerModal';
import { handleSpaNavigation } from '../../utils/navigation';

interface CertificationsSectionProps {
  isPage?: boolean;
  onNavigate?: (path: string) => void;
}

export const CertificationsSection: React.FC<CertificationsSectionProps> = ({
  isPage = false,
  onNavigate,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<CertificationDocument | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredDocs =
    activeFilter === 'all'
      ? CERTIFICATION_DOCUMENTS
      : CERTIFICATION_DOCUMENTS.filter((d) => d.category === activeFilter);

  const featuredDoc = CERTIFICATION_DOCUMENTS.find((d) => d.featured) || CERTIFICATION_DOCUMENTS[0];
  const supportingDocs = CERTIFICATION_DOCUMENTS.filter((d) => d.id !== featuredDoc.id);

  const getCategoryBadge = (category: CertificationDocument['category']) => {
    switch (category) {
      case 'food-safety':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#2E7D4F]/10 text-[#2E7D4F] border border-[#2E7D4F]/25">
            <ShieldCheck className="w-3.5 h-3.5" />
            Food Safety Compliance
          </span>
        );
      case 'agricultural-programme':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C79A3D]/15 text-[#8F6410] border border-[#C79A3D]/30">
            <Award className="w-3.5 h-3.5" />
            State Programme Recognition
          </span>
        );
      case 'facility-safety':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C84B31]/10 text-[#9E2B14] border border-[#C84B31]/25">
            <Flame className="w-3.5 h-3.5" />
            Safety Maintenance Record
          </span>
        );
    }
  };

  return (
    <section
      id="certifications"
      aria-label="Our Legacy & Certifications"
      className={`${isPage ? 'py-8 sm:py-12' : 'py-12 sm:py-16'} content-visibility-auto`}
    >
      {/* 1. Refined Introductory Section Header */}
      <div className="text-center max-w-3xl mx-auto px-4 mb-10 sm:mb-14 space-y-3">
        {/* Subtle Ornamental Heritage Accent Motif */}
        <div className="flex items-center justify-center gap-3 select-none">
          <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-[#C79A3D]" />
          <span className="text-[#C79A3D] text-xs sm:text-sm font-serif tracking-widest uppercase font-bold flex items-center gap-1.5">
            <span>✦</span>
            <span>A Tradition of Trust Since 1989</span>
            <span>✦</span>
          </span>
          <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-[#C79A3D]" />
        </div>

        <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-[#221A14] tracking-tight">
          Our Legacy & Certifications
        </h2>

        <p className="text-sm sm:text-base text-[#6E6259] leading-relaxed max-w-2xl mx-auto">
          Every batch of sweet and savory prepared at Saraswati Sweets honors our three-decade legacy.
          Explore the official food safety licenses, state agricultural recognitions, and verified store safety documentation displayed at our Barabanki establishment.
        </p>

        {/* Filter Pills */}
        <div className="flex items-center justify-center flex-wrap gap-2 pt-3">
          {[
            { id: 'all', label: 'All Documents (4)' },
            { id: 'food-safety', label: 'Food Safety (FSSAI)' },
            { id: 'agricultural-programme', label: 'Millets Programmes' },
            { id: 'facility-safety', label: 'Safety Services' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === tab.id
                  ? 'bg-[#7A1129] text-white shadow-xs border border-[#7A1129]'
                  : 'bg-white hover:bg-[#F5EAD9] text-[#6E6259] border border-[#E8DCC8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Editorial Gallery Presentation */}
      {activeFilter === 'all' ? (
        /* Editorial layout: Featured centerpiece (FSSAI) + Supporting cards */
        <div className="space-y-8">
          {/* Featured Card (FSSAI Form C) */}
          <div className="bg-gradient-to-br from-[#FFFDF9] to-[#FBF6EF] rounded-3xl border-2 border-[#C79A3D]/40 p-5 sm:p-7 md:p-9 shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
              {/* Document Image Frame */}
              <div className="lg:col-span-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(featuredDoc)}
                  aria-label={`Open document preview for ${featuredDoc.title}`}
                  className="group relative block w-full max-w-md rounded-2xl overflow-hidden bg-white shadow-lg border border-[#E8DCC8] hover:border-[#7A1129] focus:outline-none focus:ring-3 focus:ring-[#7A1129]/30 transition-all cursor-pointer transform hover:-translate-y-1 duration-300"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5EAD9]/40 flex items-center justify-center p-3">
                    <img
                      src={featuredDoc.image}
                      alt={featuredDoc.altText}
                      loading="lazy"
                      className="w-full h-full object-contain rounded-lg transition-transform duration-500 group-hover:scale-102"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 text-[#7A1129] text-xs font-bold shadow-lg">
                        <ZoomIn className="w-4 h-4" />
                        Click to Inspect Full Document
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#FAF4DE] px-4 py-2 text-center border-t border-[#E8DCC8]">
                    <span className="text-[11px] font-mono font-medium text-[#785412]">
                      Official Form C · Lic. No. 12714022000190
                    </span>
                  </div>
                </button>
              </div>

              {/* Editorial Description Column */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {getCategoryBadge(featuredDoc.category)}
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#7A1129] bg-[#7A1129]/10 px-3 py-1 rounded-full">
                    Core Food Safety License
                  </span>
                </div>

                <h3 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-[#221A14]">
                  {featuredDoc.title}
                </h3>
                {featuredDoc.hindiTitle && (
                  <p className="text-sm font-medium text-[#7A1129]">
                    {featuredDoc.hindiTitle}
                  </p>
                )}

                <p className="text-sm sm:text-base text-[#4A3E37] leading-relaxed">
                  {featuredDoc.factualSummary}
                </p>

                {/* Structured Metadata Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-[#E8DCC8] shadow-xs">
                    <span className="font-bold text-[#221A14] block mb-0.5">Issuing Authority:</span>
                    <span className="text-[#6E6259]">{featuredDoc.authority}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#E8DCC8] shadow-xs">
                    <span className="font-bold text-[#221A14] block mb-0.5">Validity Status:</span>
                    <span className="font-mono text-[#2E7D4F] font-semibold">{featuredDoc.dateOrValidity}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6E6259] block">
                    Statutory Details:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#4A3E37]">
                    {featuredDoc.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D4F] shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(featuredDoc)}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#7A1129] hover:bg-[#5E0D20] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-all duration-150 active:scale-95"
                  >
                    <ZoomIn className="w-4 h-4 text-[#F2C94C]" />
                    <span>Examine License in High Resolution</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Supporting Cards Grid (Millets 2024-25, Millets 2023-24, Fire Safety) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {supportingDocs.map((doc) => (
              <article
                key={doc.id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-[#E8DCC8] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Category Pill */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {getCategoryBadge(doc.category)}
                    <span className="text-[11px] text-[#6E6259] font-medium">
                      {doc.classification}
                    </span>
                  </div>

                  {/* Document Preview Box */}
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    aria-label={`Open document preview for ${doc.title}`}
                    className="relative w-full rounded-xl overflow-hidden bg-[#FBF6EF] border border-[#E8DCC8] group-hover:border-[#C79A3D] focus:outline-none focus:ring-2 focus:ring-[#7A1129] transition-all cursor-pointer block"
                  >
                    <div
                      className={`relative w-full overflow-hidden flex items-center justify-center p-2.5 ${
                        doc.aspectRatio === '4/3' ? 'aspect-[4/3]' : 'aspect-[3/4]'
                      }`}
                    >
                      <img
                        src={doc.image}
                        alt={doc.altText}
                        loading="lazy"
                        className="w-full h-full object-contain rounded-md transition-transform duration-300 group-hover:scale-102"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#7A1129] text-xs font-bold shadow-md">
                          <ZoomIn className="w-3.5 h-3.5" />
                          View Document
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Title & Hindi Title */}
                  <div>
                    <h4 className="font-display font-bold text-base sm:text-lg text-[#221A14] leading-snug group-hover:text-[#7A1129] transition-colors">
                      {doc.title}
                    </h4>
                    {doc.hindiTitle && (
                      <p className="text-xs text-[#7A1129] font-medium mt-0.5">
                        {doc.hindiTitle}
                      </p>
                    )}
                  </div>

                  {/* Factual Summary */}
                  <p className="text-xs text-[#6E6259] leading-relaxed line-clamp-3">
                    {doc.factualSummary}
                  </p>

                  {/* Metadata Chips */}
                  <div className="space-y-1.5 text-xs text-[#4A3E37] pt-1 border-t border-[#E8DCC8]/60">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-[#7A1129] shrink-0" />
                      <span className="truncate">{doc.authority}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#C79A3D] shrink-0" />
                      <span className="font-mono text-[11px]">{doc.dateOrValidity}</span>
                    </div>
                  </div>

                  {doc.disclaimer && (
                    <div className="rounded-lg bg-[#FAF4DE] p-2 text-[10px] text-[#785412] leading-tight flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#C79A3D]" />
                      <span>{doc.disclaimer}</span>
                    </div>
                  )}
                </div>

                {/* Inspect Action Button */}
                <div className="pt-4 mt-3 border-t border-[#E8DCC8]/60">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    className="w-full min-h-[38px] py-2 px-3 rounded-xl bg-[#F5EAD9] hover:bg-[#7A1129] text-[#7A1129] hover:text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors duration-150 active:scale-98"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Inspect Document Details</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        /* Filtered Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredDocs.map((doc) => (
            <article
              key={doc.id}
              className="bg-white rounded-2xl sm:rounded-3xl border border-[#E8DCC8] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {getCategoryBadge(doc.category)}
                  <span className="text-[11px] text-[#6E6259] font-medium">
                    {doc.classification}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  aria-label={`Open document preview for ${doc.title}`}
                  className="relative w-full rounded-xl overflow-hidden bg-[#FBF6EF] border border-[#E8DCC8] group-hover:border-[#C79A3D] focus:outline-none focus:ring-2 focus:ring-[#7A1129] transition-all cursor-pointer block"
                >
                  <div
                    className={`relative w-full overflow-hidden flex items-center justify-center p-2.5 ${
                      doc.aspectRatio === '4/3' ? 'aspect-[4/3]' : 'aspect-[3/4]'
                    }`}
                  >
                    <img
                      src={doc.image}
                      alt={doc.altText}
                      loading="lazy"
                      className="w-full h-full object-contain rounded-md transition-transform duration-300 group-hover:scale-102"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#7A1129] text-xs font-bold shadow-md">
                        <ZoomIn className="w-3.5 h-3.5" />
                        View Document
                      </span>
                    </div>
                  </div>
                </button>

                <div>
                  <h4 className="font-display font-bold text-base sm:text-lg text-[#221A14] leading-snug group-hover:text-[#7A1129] transition-colors">
                    {doc.title}
                  </h4>
                  {doc.hindiTitle && (
                    <p className="text-xs text-[#7A1129] font-medium mt-0.5">
                      {doc.hindiTitle}
                    </p>
                  )}
                </div>

                <p className="text-xs text-[#6E6259] leading-relaxed line-clamp-3">
                  {doc.factualSummary}
                </p>

                <div className="space-y-1.5 text-xs text-[#4A3E37] pt-1 border-t border-[#E8DCC8]/60">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[#7A1129] shrink-0" />
                    <span className="truncate">{doc.authority}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#C79A3D] shrink-0" />
                    <span className="font-mono text-[11px]">{doc.dateOrValidity}</span>
                  </div>
                </div>

                {doc.disclaimer && (
                  <div className="rounded-lg bg-[#FAF4DE] p-2 text-[10px] text-[#785412] leading-tight flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#C79A3D]" />
                    <span>{doc.disclaimer}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-3 border-t border-[#E8DCC8]/60">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  className="w-full min-h-[38px] py-2 px-3 rounded-xl bg-[#F5EAD9] hover:bg-[#7A1129] text-[#7A1129] hover:text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors duration-150 active:scale-98"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Inspect Document Details</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 3. Bottom Trust Seal Banner */}
      <div className="mt-12 rounded-2xl bg-[#F5EAD9]/80 border border-[#E8DCC8] p-6 text-center max-w-4xl mx-auto space-y-2">
        <h4 className="font-display font-bold text-sm sm:text-base text-[#221A14]">
          Verifiable Transparency at Our Barabanki Store
        </h4>
        <p className="text-xs sm:text-sm text-[#6E6259] max-w-2xl mx-auto">
          All original physical certificates and statutory licenses are proudly framed and available for public viewing in our retail salon at Indira Market, Near Chaya Chauraha, Barabanki.
        </p>
        {onNavigate && !isPage && (
          <div className="pt-2">
            <a
              href="/certifications"
              onClick={(e) => handleSpaNavigation(e, '/certifications', onNavigate)}
              className="text-xs font-bold text-[#7A1129] hover:underline inline-flex items-center gap-1 focus:outline-none focus:underline"
            >
              <span>Explore Dedicated Legacy & Certifications Page</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* 4. Lightbox Modal */}
      <DocumentViewerModal
        document={selectedDoc}
        documents={CERTIFICATION_DOCUMENTS}
        onClose={() => setSelectedDoc(null)}
        onSelectDocument={(d) => setSelectedDoc(d)}
      />
    </section>
  );
};
