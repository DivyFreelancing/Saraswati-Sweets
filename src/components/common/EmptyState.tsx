import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-white border border-[#E8DFD2] max-w-lg mx-auto ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-[#F3EBE0] text-[#8A1538] flex items-center justify-center mb-4">
        {icon || <PackageOpen className="w-8 h-8 stroke-[1.5]" />}
      </div>

      <h3 className="font-display text-xl font-bold text-[#1F1B16] mb-2">
        {title}
      </h3>

      <p className="text-sm text-[#6B6258] leading-relaxed mb-6 max-w-sm">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-sm font-semibold transition-colors shadow-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
