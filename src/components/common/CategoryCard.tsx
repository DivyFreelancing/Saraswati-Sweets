import React from 'react';
import { Category } from '../../types/database';

interface CategoryCardProps {
  category: Category;
  onClick: (slug: string) => void;
  isSelected?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onClick,
  isSelected = false,
}) => {
  return (
    <button
      type="button"
      onClick={() => onClick(category.slug)}
      className={`group relative flex flex-col items-center text-center pt-6 pb-4 px-3 sm:px-4 transition-all duration-200 border w-full cursor-pointer rounded-t-[70px] sm:rounded-t-[90px] rounded-b-xl ${
        isSelected
          ? 'bg-[#7A1129] text-white border-[#7A1129] shadow-md'
          : 'bg-[#F5EAD9] hover:bg-[#ebdcc7] text-[#221A14] border-[#E8DCC8] hover:border-[#7A1129]/40 shadow-[0_2px_12px_-2px_rgba(34,26,20,0.05),0_1px_3px_0_rgba(34,26,20,0.03)] hover:shadow-[0_6px_20px_-3px_rgba(122,17,41,0.08)]'
      }`}
    >
      {/* Centered Circular Product / Category Photo inside Arch */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white mb-3 border-2 border-white shadow-xs shrink-0 ring-1 ring-[#E8DCC8]/60 transition-transform duration-300 group-hover:scale-105">
        <img
          src={category.image_url || 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=300&q=80'}
          alt={category.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Category Name Label */}
      <span className={`font-display font-bold text-xs sm:text-sm line-clamp-1 transition-colors ${
        isSelected ? 'text-white' : 'text-[#221A14] group-hover:text-[#7A1129]'
      }`}>
        {category.name}
      </span>

      {category.description && (
        <span
          className={`mt-1 text-[11px] line-clamp-1 hidden sm:block ${
            isSelected ? 'text-white/80' : 'text-[#6E6259]'
          }`}
        >
          {category.description}
        </span>
      )}
    </button>
  );
};
