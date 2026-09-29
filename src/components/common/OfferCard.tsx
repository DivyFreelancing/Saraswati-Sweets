import React, { useState } from 'react';
import { Copy, Check, Tag } from 'lucide-react';
import { Offer } from '../../types/database';
import { useToast } from '../../context/ToastContext';

interface OfferCardProps {
  offer: Offer;
}

export const OfferCard: React.FC<OfferCardProps> = ({ offer }) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = () => {
    if (!offer.code) return;
    navigator.clipboard.writeText(offer.code);
    setCopied(true);
    showToast(`Coupon code ${offer.code} copied to clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-2xl bg-white border border-[#E8DFD2] p-5 sm:p-6 shadow-xs overflow-hidden flex flex-col justify-between">
      {/* Decorative left ticket notch */}
      <div className="absolute top-0 bottom-0 left-0 w-2 bg-[#8A1538]" />

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A1538]">
            <Tag className="w-3.5 h-3.5" />
            <span>SPECIAL OFFER</span>
          </div>

          {offer.discount_text && (
            <span className="font-display font-bold text-sm text-[#2E7D4F]">
              {offer.discount_text}
            </span>
          )}
        </div>

        <h3 className="font-display font-bold text-lg text-[#1F1B16]">
          {offer.title}
        </h3>

        {offer.tagline && (
          <p className="text-sm font-medium text-[#1F1B16]/80 mt-1">
            {offer.tagline}
          </p>
        )}

        {offer.description && (
          <p className="text-xs text-[#6B6258] mt-2 leading-relaxed">
            {offer.description}
          </p>
        )}
      </div>

      {offer.code && (
        <div className="mt-5 pt-4 border-t border-dashed border-[#E8DFD2] flex items-center justify-between">
          <div className="bg-[#F3EBE0] px-3 py-1.5 rounded-lg border border-[#E8DFD2] font-mono text-xs font-bold tracking-wider text-[#1F1B16]">
            {offer.code}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A1538] hover:text-[#701029] transition-colors py-1 px-2 rounded-md"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#2E7D4F]" />
                <span className="text-[#2E7D4F]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
