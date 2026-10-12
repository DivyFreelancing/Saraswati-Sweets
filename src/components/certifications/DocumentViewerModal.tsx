import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  Award,
  Flame,
  CheckCircle2,
  Calendar,
  Building2,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';
import { CertificationDocument } from '../../data/certificationsData';

interface DocumentViewerModalProps {
  document: CertificationDocument | null;
  documents: CertificationDocument[];
  onClose: () => void;
  onSelectDocument: (doc: CertificationDocument) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  documents,
  onClose,
  onSelectDocument,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset zoom & pan when document changes
  useEffect(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  }, [doc?.id]);

  // Focus trap / initial focus on close button
  useEffect(() => {
    if (doc) {
      closeButtonRef.current?.focus();
      // Lock body scroll
      const prevOverflow = window.document.body.style.overflow;
      window.document.body.style.overflow = 'hidden';
      return () => {
        window.document.body.style.overflow = prevOverflow;
      };
    }
  }, [doc]);

  const currentIndex = doc ? documents.findIndex((d) => d.id === doc.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < documents.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onSelectDocument(documents[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, documents, onSelectDocument]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onSelectDocument(documents[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, documents, onSelectDocument]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(3, +(prev + 0.35).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(1, +(prev - 0.35).toFixed(2));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  // Keyboard navigation: Escape to close, Arrows to paginate, +/- to zoom
  useEffect(() => {
    if (!doc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, handlePrev, handleNext, onClose]);

  // Dragging / panning while zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!doc) return null;

  const getCategoryIcon = () => {
    switch (doc.category) {
      case 'food-safety':
        return <ShieldCheck className="w-5 h-5 text-[#2E7D4F]" />;
      case 'agricultural-programme':
        return <Award className="w-5 h-5 text-[#C79A3D]" />;
      case 'facility-safety':
        return <Flame className="w-5 h-5 text-[#C84B31]" />;
      default:
        return <FileCheck2 className="w-5 h-5 text-[#7A1129]" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-6xl max-h-[96vh] bg-[#FBF6EF] text-[#221A14] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#C79A3D]/40 flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#7A1129] to-[#550A1A] text-white border-b border-[#C79A3D]/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="p-1.5 rounded-lg bg-white/10 text-white shrink-0">
              {getCategoryIcon()}
            </span>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#F2C94C] font-semibold block">
                {doc.classification} · {doc.identifierLabel}: {doc.identifierValue.split('·')[0].trim()}
              </span>
              <h2
                id="document-modal-title"
                className="font-display font-bold text-sm sm:text-base md:text-lg truncate text-white"
              >
                {doc.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-black/30 rounded-full px-2 py-1 gap-1 border border-white/10">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                aria-label="Zoom out"
                className="p-1 rounded-full hover:bg-white/15 text-white/80 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-white/90 font-mono px-1 select-none min-w-[42px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                aria-label="Zoom in"
                className="p-1 rounded-full hover:bg-white/15 text-white/80 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {zoomLevel > 1 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  aria-label="Reset zoom"
                  className="p-1 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors ml-0.5"
                  title="Reset Zoom (0)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Document Index Pill */}
            <span className="hidden md:inline-block text-xs font-medium text-white/80 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              {currentIndex + 1} of {documents.length}
            </span>

            {/* Close Button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close document preview"
              className="p-2 rounded-full hover:bg-white/20 active:scale-95 text-white focus:outline-none focus:ring-2 focus:ring-[#F2C94C] transition-all ml-1"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </header>

        {/* Modal Main Content: Split View on Large Screens, Stacked on Mobile */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">
          {/* Document Canvas Area */}
          <div
            ref={containerRef}
            className="relative flex-1 bg-[#1A1412] min-h-[380px] sm:min-h-[460px] lg:min-h-[580px] flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing p-3 sm:p-6"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Subtle vintage texture bg glow */}
            <div className="absolute inset-0 bg-radial from-[#7A1129]/20 via-transparent to-black pointer-events-none" />

            {/* Interactive Image Container */}
            <div
              className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={doc.image}
                alt={doc.altText}
                className="max-h-[70vh] sm:max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-2xl border border-[#C79A3D]/30 select-none pointer-events-auto"
                draggable={false}
              />
            </div>

            {/* Floating Navigation Buttons */}
            {hasPrev && (
              <button
                type="button"
                onClick={handlePrev}
                aria-label="View previous document"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-[#7A1129] active:scale-90 text-white backdrop-blur-sm border border-white/20 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#F2C94C]"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {hasNext && (
              <button
                type="button"
                onClick={handleNext}
                aria-label="View next document"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-[#7A1129] active:scale-90 text-white backdrop-blur-sm border border-white/20 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#F2C94C]"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Mobile zoom indicator hint */}
            <div className="absolute bottom-2.5 left-3 sm:hidden text-[10px] text-white/60 bg-black/50 px-2 py-0.5 rounded-full">
              Pinch or tap +/- to zoom
            </div>
          </div>

          {/* Right Information Editorial Panel */}
          <aside className="w-full lg:w-96 lg:max-w-md bg-[#FBF6EF] p-5 sm:p-6 lg:p-7 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#E8DCC8] overflow-y-auto shrink-0 space-y-6">
            <div className="space-y-5">
              {/* Classification Tag */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#7A1129]/10 text-[#7A1129] border border-[#7A1129]/20">
                  {getCategoryIcon()}
                  <span>{doc.categoryLabel}</span>
                </span>
                <span className="text-xs text-[#6E6259] font-medium bg-[#F5EAD9] px-2.5 py-0.5 rounded-md">
                  {doc.classification}
                </span>
              </div>

              {/* Title & Hindi Title */}
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl text-[#221A14] leading-snug">
                  {doc.title}
                </h3>
                {doc.hindiTitle && (
                  <p className="text-xs sm:text-sm text-[#7A1129] font-medium mt-1">
                    {doc.hindiTitle}
                  </p>
                )}
              </div>

              {/* Factual Summary */}
              <p className="text-xs sm:text-sm text-[#4A3E37] leading-relaxed">
                {doc.factualSummary}
              </p>

              {/* Verified Metadata Card */}
              <div className="rounded-xl border border-[#E8DCC8] bg-white p-3.5 sm:p-4 space-y-2.5 text-xs text-[#4A3E37] shadow-xs">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-[#7A1129] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#221A14] block">Issuing Authority:</span>
                    <span>{doc.authority}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-[#C79A3D] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#221A14] block">Dates & Validity:</span>
                    <span className="font-mono text-[11px] sm:text-xs">{doc.dateOrValidity}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D4F] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#221A14] block">Official Establishment:</span>
                    <span>{doc.recipient} ({doc.premises})</span>
                  </div>
                </div>
              </div>

              {/* Key Document Highlights */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6E6259]">
                  Document Details & Highlights
                </h4>
                <ul className="space-y-1.5">
                  {doc.highlights.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-[#4A3E37]">
                      <span className="text-[#C79A3D] text-sm shrink-0">✦</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Signatories if present */}
              {doc.signatories && doc.signatories.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#6E6259]">
                    Authorized Signatories:
                  </h4>
                  <ul className="text-xs text-[#4A3E37] space-y-1">
                    {doc.signatories.map((sig, idx) => (
                      <li key={idx} className="italic text-[11px] text-[#6E6259]">
                        • {sig}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Factual Disclaimer Notice if present */}
              {doc.disclaimer && (
                <div className="rounded-lg bg-[#FAF4DE] border border-[#C79A3D]/40 p-2.5 text-[11px] text-[#785412] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#C79A3D] shrink-0 mt-0.5" />
                  <span>{doc.disclaimer}</span>
                </div>
              )}
            </div>

            {/* Thumbnail Quick Selector at Bottom of Panel */}
            <div className="pt-4 border-t border-[#E8DCC8]">
              <span className="text-[11px] uppercase tracking-wider text-[#6E6259] font-bold block mb-2">
                Browse All Documents ({documents.length})
              </span>
              <div className="grid grid-cols-4 gap-2">
                {documents.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onSelectDocument(d)}
                    className={`relative rounded-lg overflow-hidden border-2 aspect-square transition-all ${
                      d.id === doc.id
                        ? 'border-[#7A1129] shadow-md ring-2 ring-[#7A1129]/30 scale-102'
                        : 'border-[#E8DCC8] opacity-70 hover:opacity-100 hover:border-[#C79A3D]'
                    }`}
                    title={d.title}
                  >
                    <img
                      src={d.thumbnail}
                      alt={d.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
