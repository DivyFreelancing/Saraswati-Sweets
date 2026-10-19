import React from 'react';

interface OrnamentalCircleFrameProps {
  className?: string;
}

export const OrnamentalCircleFrame: React.FC<OrnamentalCircleFrameProps> = ({
  className = '',
}) => {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer concentric circular stroke in warm antique gold */}
      <circle cx="100" cy="100" r="86" stroke="#C99A3B" strokeWidth="1.25" />

      {/* Inner concentric circular stroke in lighter muted gold highlight */}
      <circle cx="100" cy="100" r="79" stroke="#DDB96B" strokeWidth="1" strokeOpacity="0.9" />

      {/* Delicate accent beads at the four 45-degree diagonals */}
      <circle cx="159" cy="41" r="1.3" fill="#DDB96B" />
      <circle cx="159" cy="159" r="1.3" fill="#DDB96B" />
      <circle cx="41" cy="159" r="1.3" fill="#DDB96B" />
      <circle cx="41" cy="41" r="1.3" fill="#DDB96B" />

      {/* 4 Symmetrical Cardinal Flourishes: Top, Right, Bottom, Left */}
      {/* Top Flourish */}
      <g>
        <path
          d="M 100 4 C 102.5 7.5 104 11 100 14 C 96 11 97.5 7.5 100 4 Z"
          fill="#DDB96B"
          stroke="#C99A3B"
          strokeWidth="0.75"
        />
        <path
          d="M 100 14 C 93.5 14 88 11.5 87 7.5 C 86.5 5.5 88.5 5 89.5 6.5 C 91.5 8.5 95 12.5 100 14"
          stroke="#C99A3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 100 14 C 106.5 14 112 11.5 113 7.5 C 113.5 5.5 111.5 5 110.5 6.5 C 108.5 8.5 105 12.5 100 14"
          stroke="#C99A3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="100" cy="14" r="2.2" fill="#F2DFAB" stroke="#C99A3B" strokeWidth="0.75" />
        <circle cx="94" cy="12" r="1" fill="#C99A3B" />
        <circle cx="106" cy="12" r="1" fill="#C99A3B" />
      </g>

      {/* Right Flourish (90deg) */}
      <g transform="rotate(90 100 100)">
        <path
          d="M 100 4 C 102.5 7.5 104 11 100 14 C 96 11 97.5 7.5 100 4 Z"
          fill="#DDB96B"
          stroke="#C99A3B"
          strokeWidth="0.75"
        />
        <path
          d="M 100 14 C 93.5 14 88 11.5 87 7.5 C 86.5 5.5 88.5 5 89.5 6.5 C 91.5 8.5 95 12.5 100 14"
          stroke="#C99A3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 100 14 C 106.5 14 112 11.5 113 7.5 C 113.5 5.5 111.5 5 110.5 6.5 C 108.5 8.5 105 12.5 100 14"
          stroke="#C99A3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="100" cy="14" r="2.2" fill="#F2DFAB" stroke="#C99A3B" strokeWidth="0.75" />
        <circle cx="94" cy="12" r="1" fill="#C99A3B" />
        <circle cx="106" cy="12" r="1" fill="#C99A3B" />
      </g>

      {/* Bottom Flourish (180deg) */}
      <g transform="rotate(180 100 100)">
        <path
          d="M 100 4 C 102.5 7.5 104 11 100 14 C 96 11 97.5 7.5 100 4 Z"
          fill="#DDB96B"
          stroke="#C99A3B"
          strokeWidth="0.75"
        />
        <path
          d="M 100 14 C 93.5 14 88 11.5 87 7.5 C 86.5 5.5 88.5 5 89.5 6.5 C 91.5 8.5 95 12.5 100 14"
          stroke="#C99A3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 100 14 C 106.5 14 112 11.5 113 7.5 C 113.5 5.5 111.5 5 110.5 6.5 C 108.5 8.5 105 12.5 100 14"
          stroke="#C99A3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="100" cy="14" r="2.2" fill="#F2DFAB" stroke="#C99A3B" strokeWidth="0.75" />
        <circle cx="94" cy="12" r="1" fill="#C99A3B" />
        <circle cx="106" cy="12" r="1" fill="#C99A3B" />
      </g>

      {/* Left Flourish (270deg) */}
      <g transform="rotate(270 100 100)">
        <path
          d="M 100 4 C 102.5 7.5 104 11 100 14 C 96 11 97.5 7.5 100 4 Z"
          fill="#DDB96B"
          stroke="#C99A3B"
          strokeWidth="0.75"
        />
        <path
          d="M 100 14 C 93.5 14 88 11.5 87 7.5 C 86.5 5.5 88.5 5 89.5 6.5 C 91.5 8.5 95 12.5 100 14"
          stroke="#C99A3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 100 14 C 106.5 14 112 11.5 113 7.5 C 113.5 5.5 111.5 5 110.5 6.5 C 108.5 8.5 105 12.5 100 14"
          stroke="#C99A3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="100" cy="14" r="2.2" fill="#F2DFAB" stroke="#C99A3B" strokeWidth="0.75" />
        <circle cx="94" cy="12" r="1" fill="#C99A3B" />
        <circle cx="106" cy="12" r="1" fill="#C99A3B" />
      </g>
    </svg>
  );
};
