import React from 'react';

// Generates smooth repeating SVG cubic bezier scallop curves across 1200 units
const SCALLOP_COUNT = 40;
const TOTAL_WIDTH = 1200;
const STEP = TOTAL_WIDTH / SCALLOP_COUNT; // 30 units per scallop
const DEPTH = 20;

let scallopPathD = 'M 0 0 ';
for (let i = 0; i < SCALLOP_COUNT; i++) {
  const x = i * STEP;
  const c1 = x + STEP * 0.2;
  const c2 = x + STEP * 0.8;
  const end = x + STEP;
  scallopPathD += `C ${c1.toFixed(1)} ${DEPTH}, ${c2.toFixed(1)} ${DEPTH}, ${end.toFixed(1)} 0 `;
}

/**
 * 1. Double Scallop Wave Divider (From Reference Image 2)
 * Features an ivory/surface scallop wave with a rich royal gold accent scallop wave
 * peeking out underneath with a slight downward offset.
 */
export const DoubleScallopDivider: React.FC<{
  className?: string;
  fillColor?: string;
  accentColor?: string;
  flip?: boolean;
}> = ({
  className = '',
  fillColor = '#FBF6EF',
  accentColor = '#C79A3D',
  flip = false,
}) => {
  return (
    <div
      className={`w-full overflow-hidden pointer-events-none leading-none select-none ${
        flip ? 'rotate-180' : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 1200 32"
        preserveAspectRatio="none"
        className="w-full h-5 sm:h-7 md:h-9 block"
        aria-hidden="true"
      >
        {/* Layer 1: Gold Accent Wave (Offset 5px downwards as in reference image) */}
        <path
          d={`${scallopPathD} L 1200 32 L 0 32 Z`}
          transform="translate(0, 5)"
          fill={accentColor}
          opacity="0.95"
        />
        {/* Layer 2: Main Foreground Wave */}
        <path
          d={`${scallopPathD} L 1200 32 L 0 32 Z`}
          fill={fillColor}
        />
      </svg>
    </div>
  );
};

/**
 * 2. Scallop Trim Border (From Reference Image 3)
 * Continuous repeating scallop lace border for the top or bottom of a full-width section.
 */
export const ScallopTrim: React.FC<{
  position?: 'top' | 'bottom';
  fillColor?: string;
  accentColor?: string;
  className?: string;
}> = ({
  position = 'top',
  fillColor = '#FBF6EF',
  accentColor,
  className = '',
}) => {
  const isBottom = position === 'bottom';
  return (
    <div
      className={`w-full overflow-hidden pointer-events-none leading-none select-none ${
        isBottom ? 'rotate-180' : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 1200 32"
        preserveAspectRatio="none"
        className="w-full h-4 sm:h-6 md:h-8 block"
        aria-hidden="true"
      >
        {accentColor && (
          <path
            d={`${scallopPathD} L 1200 32 L 0 32 Z`}
            transform="translate(0, 4)"
            fill={accentColor}
            opacity="0.9"
          />
        )}
        <path
          d={`${scallopPathD} L 1200 32 L 0 32 Z`}
          fill={fillColor}
        />
      </svg>
    </div>
  );
};

/**
 * 3. Ornate Bracket / Scalloped Corner Cutouts (From Reference Image 1)
 * Traditional Indian sweet box label & jharokha bracket silhouette.
 */
export const OrnateCornerCutout: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fillColor?: string;
  borderColor?: string;
  size?: number;
}> = ({
  position,
  fillColor = '#FBF6EF',
  borderColor = '#C79A3D',
  size = 44,
}) => {
  // Transform classes for 4 corners
  const rotationClass = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0 scale-x-[-1]',
    'bottom-left': 'bottom-0 left-0 scale-y-[-1]',
    'bottom-right': 'bottom-0 right-0 scale-x-[-1] scale-y-[-1]',
  }[position];

  // Curve: Concave inward -> convex corner bulge -> concave inward
  const curve = 'M 44 0 C 30 0, 26 12, 26 18 C 26 26, 18 26, 18 26 C 12 26, 0 30, 0 44';

  return (
    <div
      className={`absolute ${rotationClass} pointer-events-none select-none z-10`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 44 44" className="w-full h-full block">
        {/* Mask shape filled with outer page background */}
        <path d={`${curve} L 0 0 Z`} fill={fillColor} />
        {/* Ornate Gold Border Line */}
        <path
          d={curve}
          fill="none"
          stroke={borderColor}
          strokeWidth="1.75"
          opacity="0.85"
        />
      </svg>
    </div>
  );
};

/**
 * 4. Ornate Bracket Card Wrapper (Applies the Image 1 shape to any card/banner)
 */
export const OrnateCardFrame: React.FC<{
  children: React.ReactNode;
  className?: string;
  bgFillColor?: string;
  pageBgColor?: string;
  borderColor?: string;
}> = ({
  children,
  className = '',
  pageBgColor = '#FBF6EF',
  borderColor = '#C79A3D',
}) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 4 Ornate Bracket Corners */}
      <OrnateCornerCutout position="top-left" fillColor={pageBgColor} borderColor={borderColor} />
      <OrnateCornerCutout position="top-right" fillColor={pageBgColor} borderColor={borderColor} />
      <OrnateCornerCutout position="bottom-left" fillColor={pageBgColor} borderColor={borderColor} />
      <OrnateCornerCutout position="bottom-right" fillColor={pageBgColor} borderColor={borderColor} />

      {/* Card Content */}
      <div className="relative z-0 h-full w-full">
        {children}
      </div>
    </div>
  );
};
