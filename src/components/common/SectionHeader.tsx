import React from 'react';
import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  eyebrow?: string;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionText,
  onAction,
  eyebrow,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8 ${className}`}>
      <div className="space-y-1">
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#C79A3D]">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#221A14] tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm sm:text-base text-[#6E6259] max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#7A1129] hover:text-[#5E0D20] transition-colors self-start sm:self-auto py-1"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
        </button>
      )}
    </div>
  );
};
