import React from 'react';
import { Category } from '../../types/database';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { shouldHandleSpaClick } from '../../utils/navigation';

interface CategoryCardProps {
  category: Category;
  onClick: (slug: string) => void;
  isSelected?: boolean;
  href?: string;
}

const CATEGORY_IMAGE_FALLBACKS: Record<string, string> = {
  'meva': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  'bengali': 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=400&q=80',
  'ghee': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80',
  'khoya': 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=400&q=80',
  'namkeen': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  'desi-ghee-sweets': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80',
  'traditional-sweets': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80',
  'kaju-dry-fruits': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  'dry-fruit-sweets': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  'chhena-syrupy': 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=400&q=80',
  'specialty-sweets': 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=400&q=80',
  'khoya-mawa': 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=400&q=80',
  'namkeen-savories': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  'namkeen-snacks': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  'savory-namkeen': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  'gift-hampers': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80',
  'hampers': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80',
};

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onClick,
  isSelected = false,
  href,
}) => {
  // Guard against irrelevant placeholder images (e.g. cat photo 1541781774459)
  const isInvalidPlaceholder =
    !category.image_url ||
    category.image_url.includes('1541781774459') ||
    category.image_url.includes('placeholder');

  const resolvedImageUrl = isInvalidPlaceholder
    ? CATEGORY_IMAGE_FALLBACKS[category.slug] || 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40'
    : category.image_url;

  const optimizedImage = getOptimizedImageUrl(resolvedImageUrl, 160, 75);
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
      className={`group relative flex flex-col items-center justify-between min-h-[195px] sm:min-h-[220px] text-center pt-6 pb-4 px-3 sm:px-4 transition-all duration-200 border w-full cursor-pointer rounded-t-full rounded-b-xl focus:outline-none focus:ring-2 focus:ring-[#7A1129] ${
        isSelected
          ? 'bg-[#7A1129] text-white border-[#7A1129] shadow-md'
          : 'bg-[#F5EAD9] hover:bg-[#ebdcc7] text-[#221A14] border-[#E8DCC8] hover:border-[#7A1129]/40 shadow-[0_2px_12px_-2px_rgba(34,26,20,0.05),0_1px_3px_0_rgba(34,26,20,0.03)] hover:shadow-[0_6px_20px_-3px_rgba(122,17,41,0.08)]'
      }`}
    >
      {/* Centered Circular Product / Category Photo inside Arch */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white mb-2 sm:mb-3 border-2 border-white shadow-xs shrink-0 ring-1 ring-[#E8DCC8]/60 transition-transform duration-300 group-hover:scale-105">
        <img
          src={optimizedImage}
          alt={category.name}
          width="96"
          height="96"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col items-center w-full">
        {/* Category Name Label */}
        <span
          className={`font-display font-bold text-xs sm:text-sm line-clamp-1 transition-colors ${
            isSelected ? 'text-white' : 'text-[#221A14] group-hover:text-[#7A1129]'
          }`}
        >
          {category.name}
        </span>

        {category.description ? (
          <span
            className={`mt-1 text-xs line-clamp-1 hidden sm:block ${
              isSelected ? 'text-white/80' : 'text-[#6E6259]'
            }`}
          >
            {category.description}
          </span>
        ) : (
          <span className="mt-1 text-xs invisible hidden sm:block">
            &nbsp;
          </span>
        )}
      </div>
    </a>
  );
};
