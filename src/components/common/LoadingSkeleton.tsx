import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-[#E8DCC8] p-4 sm:p-5 animate-pulse shadow-[0_2px_12px_-2px_rgba(34,26,20,0.05),0_1px_3px_0_rgba(34,26,20,0.03)] flex flex-col items-center">
      {/* Top row: badge skeleton */}
      <div className="w-full flex justify-between items-center mb-3">
        <div className="w-5 h-5 rounded-xs bg-[#E8DCC8]/60" />
        <div className="w-16 h-4 rounded-full bg-[#E8DCC8]/50" />
      </div>

      {/* Circular photo skeleton */}
      <div className="py-2">
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#F5EAD9] border-2 border-[#E8DCC8]/50" />
      </div>

      {/* Title & info skeletons */}
      <div className="mt-3 w-full flex flex-col items-center space-y-2 flex-1">
        <div className="h-3 w-24 bg-[#E8DCC8]/60 rounded-full" />
        <div className="h-4.5 w-3/4 bg-[#E8DCC8] rounded-md" />
        <div className="h-4 w-16 bg-[#E8DCC8] rounded-md" />

        {/* Variant chips skeleton */}
        <div className="mt-2 pt-2 border-t border-[#E8DCC8]/60 w-full flex justify-center gap-1.5">
          <div className="h-6 w-12 rounded-full bg-[#E8DCC8]/50" />
          <div className="h-6 w-12 rounded-full bg-[#E8DCC8]/50" />
          <div className="h-6 w-12 rounded-full bg-[#E8DCC8]/50" />
        </div>

        {/* Solid pill button skeleton */}
        <div className="mt-auto pt-3 w-full">
          <div className="h-11 w-full bg-[#E8DCC8] rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const CategoryCardSkeleton: React.FC = () => {
  return (
    <div className="relative flex flex-col items-center p-3.5 sm:p-4 rounded-t-[60px] sm:rounded-t-[80px] rounded-b-xl bg-[#F5EAD9] border border-[#E8DCC8] animate-pulse">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/70 border border-[#E8DCC8]" />
      <div className="mt-3 h-4 w-3/4 bg-[#E8DCC8] rounded-md" />
      <div className="mt-1 h-3 w-1/2 bg-[#E8DCC8]/60 rounded-xs" />
    </div>
  );
};

export const BannerSkeleton: React.FC = () => {
  return (
    <div className="w-full h-64 sm:h-80 rounded-3xl bg-[#F5EAD9] border border-[#E8DCC8] animate-pulse" />
  );
};

export const HamperCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-[#E8DCC8] overflow-hidden animate-pulse shadow-xs">
      <div className="aspect-[16/10] bg-[#F5EAD9]" />
      <div className="p-5 sm:p-6 space-y-3 flex-1 flex flex-col">
        <div className="h-3 w-28 bg-[#E8DCC8]/60 rounded-full" />
        <div className="h-5 w-3/4 bg-[#E8DCC8] rounded-md" />
        <div className="h-4 w-full bg-[#E8DCC8]/50 rounded-md" />
        <div className="mt-auto pt-5 border-t border-[#E8DCC8]/50 flex justify-between items-center">
          <div className="h-6 w-20 bg-[#E8DCC8] rounded-md" />
          <div className="h-10 w-28 bg-[#E8DCC8] rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const ReviewCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-[#E8DCC8] p-5 sm:p-6 space-y-3 animate-pulse shadow-xs">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-[#F5EAD9]" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-28 bg-[#E8DCC8] rounded-md" />
          <div className="h-3 w-20 bg-[#E8DCC8]/60 rounded-md" />
        </div>
      </div>
      <div className="h-3.5 w-full bg-[#E8DCC8]/50 rounded-md" />
      <div className="h-3.5 w-4/5 bg-[#E8DCC8]/50 rounded-md" />
    </div>
  );
};
