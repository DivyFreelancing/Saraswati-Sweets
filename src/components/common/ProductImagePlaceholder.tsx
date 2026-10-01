import React from 'react';

interface ProductImagePlaceholderProps {
  aspect?: 'circle' | 'square' | 'wide';
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  showText?: boolean;
  productName?: string;
  variant?: 'default' | 'admin-thumbnail';
}

export const ProductImagePlaceholder: React.FC<ProductImagePlaceholderProps> = ({
  aspect = 'square',
  size = 'md',
  className = '',
  showText,
  productName,
  variant = 'default',
}) => {
  const isCircle = aspect === 'circle';
  const isSmall = size === 'sm' || variant === 'admin-thumbnail';
  const shouldShowText = showText !== undefined ? showText : !isSmall;

  return (
    <div
      role="img"
      aria-label={productName ? `Placeholder image for ${productName}` : 'Product photograph coming soon'}
      className={`relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#FAF4DE] via-[#F5EAD9] to-[#EEDEC7] select-none text-center ${
        isCircle ? 'rounded-full' : 'rounded-2xl'
      } ${className}`}
    >
      {/* Decorative concentric subtle ring */}
      <div
        className={`absolute inset-2 border border-[#C79A3D]/25 ${
          isCircle ? 'rounded-full border-dashed' : 'rounded-xl border-dashed'
        } pointer-events-none`}
      />

      {/* Cloche / Sweet Dome Icon */}
      <svg
        viewBox="0 0 100 100"
        className={`${isSmall ? 'w-7 h-7' : 'w-14 h-14 sm:w-16 sm:h-16'} text-[#7A1129] shrink-0 mb-0.5`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Plate */}
        <ellipse cx="50" cy="72" rx="34" ry="5" fill="#C79A3D" opacity="0.85" />
        <ellipse cx="50" cy="72" rx="40" ry="7" stroke="#E8DCC8" strokeWidth="1" />
        {/* Dome */}
        <path
          d="M22 68 C22 38 34 26 50 26 C66 26 78 38 78 68 Z"
          fill="#FBF6EF"
          stroke="#C79A3D"
          strokeWidth="2"
        />
        {/* Knob */}
        <circle cx="50" cy="22" r="4.5" fill="#C79A3D" />
        {/* Inner subtle arch */}
        <path
          d="M32 66 C32 44 40 36 50 36 C60 36 68 44 68 66"
          stroke="#E8DCC8"
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />
        {/* Motichoor dots */}
        <circle cx="43" cy="56" r="2" fill="#7A1129" opacity="0.6" />
        <circle cx="50" cy="54" r="2.5" fill="#7A1129" opacity="0.85" />
        <circle cx="57" cy="56" r="2" fill="#7A1129" opacity="0.6" />
      </svg>

      {/* Subtle Caption */}
      {shouldShowText && (
        <div className="relative px-2 z-10 flex flex-col items-center">
          <span className="font-serif text-[10px] sm:text-[11px] font-bold text-[#7A1129] tracking-wider uppercase leading-tight">
            Photo Coming Soon
          </span>
          <span className="text-[8px] sm:text-[9px] font-sans font-medium text-[#6E6259] tracking-wide mt-0.5">
            Fresh Artisanal Batch
          </span>
        </div>
      )}
    </div>
  );
};
