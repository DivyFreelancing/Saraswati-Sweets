import React, { useState } from 'react';
import {
  ShieldCheck,
  Award,
  Flame,
  ZoomIn,
  ArrowRight,
  ExternalLink,
  Building2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  CERTIFICATION_DOCUMENTS,
  CertificationDocument,
} from '../../data/certificationsData';
import { DocumentViewerModal } from './DocumentViewerModal';
import { handleSpaNavigation } from '../../utils/navigation';

interface HomepageCertificationsPreviewProps {
  onNavigate: (path: string) => void;
}

export const HomepageCertificationsPreview: React.FC<HomepageCertificationsPreviewProps> = ({
  onNavigate,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<CertificationDocument | null>(null);

  return (
    <section
      id="our-legacy"
      aria-label="Our Legacy & Certifications"
      className="rounded-3xl border border-[#E8DCC8] bg-gradient-to-b from-[#FFFDF9] via-[#FAF4DE]/30 to-[#F5EAD9]/50 p-6 sm:p-10 md:p-12 shadow-xs relative overflow-hidden content-visibility-auto"
    >
      {/* Refined Header */}
      <div className="max-w-3xl mx-auto text-center space-y-3 mb-8 sm:mb-12">
        <div className="flex items-center justify-center gap-3 select-none">
          <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-[#C79A3D]" />
          <span className="text-[#C79A3D] text-xs sm:text-sm font-serif tracking-widest uppercase font-bold flex items-center gap-1.5">
            <span>✦</span>
            <span>A Tradition of Trust Since 1989</span>
            <span>✦</span>
          </span>
          <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-[#C79A3D]" />
        </div>

        <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-[#221A14]">
          Our Legacy & Certifications
        </h2>

        <p className="text-xs sm:text-sm md:text-base text-[#6E6259] leading-relaxed max-w-2xl mx-auto">
          Built on authentic taste and transparent hygiene. We proudly display our actual food safety licensing, state agricultural programme certificates, and verified safety maintenance records.
        </p>
      </div>

      {/* 4 Document Showcase Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {CERTIFICATION_DOCUMENTS.map((doc) => {
          const isFSSAI = doc.id === 'fssai-state-license';
          return (
            <div
              key={doc.id}
              className={`rounded-2xl bg-white border p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md group ${
                isFSSAI
                  ? 'border-[#C79A3D]/70 shadow-xs ring-1 ring-[#C79A3D]/20'
                  : 'border-[#E8DCC8]'
              }`}
            >
              <div className="space-y-3">
                {/* Badge */}
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-full ${
                      doc.category === 'food-safety'
                        ? 'bg-[#2E7D4F]/10 text-[#2E7D4F]'
                        : doc.category === 'agricultural-programme'
                        ? 'bg-[#C79A3D]/15 text-[#8F6410]'
                        : 'bg-[#C84B31]/10 text-[#9E2B14]'
                    }`}
                  >
                    {doc.category === 'food-safety' && <ShieldCheck className="w-3 h-3" />}
                    {doc.category === 'agricultural-programme' && <Award className="w-3 h-3" />}
                    {doc.category === 'facility-safety' && <Flame className="w-3 h-3" />}
                    <span>{doc.classification}</span>
                  </span>
                </div>

                {/* Document Photo Thumbnail (Clickable to Lightbox) */}
                <button
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  aria-label={`View ${doc.title}`}
                  className="relative w-full rounded-xl overflow-hidden bg-[#FBF6EF] border border-[#E8DCC8] group-hover:border-[#C79A3D] transition-all cursor-pointer block focus:outline-none focus:ring-2 focus:ring-[#7A1129]"
                >
                  <div className="relative w-full aspect-[4/3] flex items-center justify-center p-2 bg-[#F5EAD9]/30">
                    <img
                      src={doc.image}
                      alt={doc.altText}
                      loading="lazy"
                      className="w-full h-full object-contain rounded transition-transform duration-300 group-hover:scale-103"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#7A1129] text-[11px] font-bold shadow-sm">
                        <ZoomIn className="w-3.5 h-3.5" />
                        Quick View
                      </span>
                    </div>
                  </div>
                </button>

                {/* Title */}
                <div>
                  <h3 className="font-display font-bold text-sm sm:text-base text-[#221A14] group-hover:text-[#7A1129] transition-colors line-clamp-2">
                    {doc.title}
                  </h3>
                  {doc.hindiTitle && (
                    <p className="text-[11px] text-[#7A1129] font-medium mt-0.5 truncate">
                      {doc.hindiTitle}
                    </p>
                  )}
                </div>

                {/* Authority & Validity */}
                <div className="text-[11px] text-[#6E6259] space-y-1 pt-1 border-t border-[#E8DCC8]/60">
                  <div className="flex items-start gap-1.5">
                    <Building2 className="w-3 h-3 text-[#7A1129] shrink-0 mt-0.5" />
                    <span className="truncate">{doc.authority}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <Calendar className="w-3 h-3 text-[#C79A3D] shrink-0" />
                    <span>{doc.dateOrValidity.split('·')[0].trim()}</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 mt-2 border-t border-[#E8DCC8]/60">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#F5EAD9]/70 hover:bg-[#7A1129] text-[#7A1129] hover:text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ZoomIn className="w-3 h-3" />
                  <span>Inspect Document</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* View Our Documents CTA Button */}
      <div className="mt-8 sm:mt-10 pt-4 text-center border-t border-[#E8DCC8]/60 flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href="/certifications"
          onClick={(e) => handleSpaNavigation(e, '/certifications', onNavigate)}
          className="min-h-[46px] px-8 py-3 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#7A1129]"
        >
          <span>View Our Documents & Certifications</span>
          <ArrowRight className="w-4 h-4 text-[#F2C94C]" />
        </a>

        <span className="text-xs text-[#6E6259]">
          Framed and open for public inspection at our Indira Market flagship store.
        </span>
      </div>

      {/* Lightbox Modal */}
      <DocumentViewerModal
        document={selectedDoc}
        documents={CERTIFICATION_DOCUMENTS}
        onClose={() => setSelectedDoc(null)}
        onSelectDocument={(d) => setSelectedDoc(d)}
      />
    </section>
  );
};
