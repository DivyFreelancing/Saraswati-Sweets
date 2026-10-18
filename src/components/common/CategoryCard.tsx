import React from 'react';
import { Category } from '../../types/database';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { shouldHandleSpaClick } from '../../utils/navigation';

export interface CategoryCardProps {
  category: Category;
  onClick: (slug: string) => void;
  isSelected?: boolean;
  href?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CATEGORY_IMAGE_FALLBACKS: Record<string, string> = {
  'meva': '/images/categories/meva.webp',
  'bengali': '/images/categories/bengali.webp',
  'ghee': '/images/categories/ghee.webp',
  'khoya': '/images/categories/khoya.webp',
  'namkeen': '/images/categories/namkeen.webp',
  'desi-ghee-sweets': '/images/categories/ghee.webp',
  'traditional-sweets': '/images/categories/ghee.webp',
  'kaju-dry-fruits': '/images/categories/meva.webp',
  'dry-fruit-sweets': '/images/categories/meva.webp',
  'chhena-syrupy': '/images/categories/bengali.webp',
  'specialty-sweets': '/images/categories/bengali.webp',
  'khoya-mawa': '/images/categories/khoya.webp',
  'namkeen-savories': '/images/categories/namkeen.webp',
  'namkeen-snacks': '/images/categories/namkeen.webp',
  'savory-namkeen': '/images/categories/namkeen.webp',
  'gift-hampers': '/images/gift-hamper-banner.webp',
  'hampers': '/images/gift-hamper-banner.webp',
};

export function getCategoryResolvedImageUrl(category: Category, targetWidth = 320): string {
  const isInvalidPlaceholder =
    !category.image_url ||
    category.image_url.includes('1541781774459') ||
    category.image_url.includes('1668236543090') ||
    category.image_url.includes('1626082927389') ||
    category.image_url.includes('placeholder') ||
    category.image_url.includes('unsplash');

  const resolvedImageUrl = isInvalidPlaceholder
    ? CATEGORY_IMAGE_FALLBACKS[category.slug] || '/images/categories/meva.webp'
    : category.image_url;

  return getOptimizedImageUrl(resolvedImageUrl, targetWidth, 85);
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onClick,
  isSelected = false,
  href,
}) => {
  const optimizedImage = getCategoryResolvedImageUrl(category, 200);
  const targetHref = href || `/categories/${category.slug}`;

  const handleClick = (e: React.MouseEvent) => {
    if (shouldHandleSpaClick(e)) {
      e.preventDefault();
      onClick(category.slug);
    }
  };

  return (
    <a
      href={targetHref}
      onClick={handleClick}
      aria-label={`Shop ${category.name} collection`}
      className="group flex flex-col items-center shrink-0 w-20 md:w-24 lg:w-28 text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1129] rounded-2xl p-1 transition-all"
    >
      {/* Small Circular Category Image for Desktop/Expanded View (80-100px diameter) */}
      <div
        className={`relative w-20 h-20 md:w-24 md:h-24 lg:w-[96px] lg:h-[96px] rounded-full overflow-hidden bg-[#FAF4DE] transition-all duration-300 ease-out border-2 ${
          isSelected
            ? 'border-[#7A1129] ring-3 ring-[#7A1129]/30 shadow-md'
            : 'border-[#E8DCC8] group-hover:border-[#C79A3D] shadow-xs group-hover:shadow-[0_6px_18px_-3px_rgba(122,17,41,0.14)]'
        }`}
      >
        <img
          src={optimizedImage}
          alt={category.name}
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover rounded-full transition-transform duration-300 ease-out group-hover:scale-108"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/categories/meva.webp';
          }}
        />
      </div>

      {/* Compact Category Label Underneath */}
      <span
        className={`mt-2 font-display font-semibold text-xs md:text-sm leading-tight text-center max-w-[88px] md:max-w-[96px] line-clamp-2 transition-colors duration-200 ${
          isSelected
            ? 'text-[#7A1129]'
            : 'text-[#221A14] group-hover:text-[#7A1129]'
        }`}
      >
        {category.name}
      </span>
    </a>
  );
};
