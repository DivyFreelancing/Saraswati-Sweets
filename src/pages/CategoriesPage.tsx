import React, { useEffect, useState } from 'react';
import { Category } from '../types/database';
import { catalogService } from '../services/catalogService';
import { ArrowRight } from 'lucide-react';
import { CategoryCardSkeleton } from '../components/common/LoadingSkeleton';

interface CategoriesPageProps {
  onSelectCategory: (slug: string) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ onSelectCategory }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalogService.getCategories().then((cats) => {
      setCategories(cats);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1F1B16] tracking-tight">
          Explore Our Sweet Categories
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[#6B6258] max-w-2xl">
          From Awadhi mawa peda to 100% cow desi ghee motichoor and savory dalmoth, explore the heritage of Saraswati Sweets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => onSelectCategory(cat.slug)}
            className="group cursor-pointer bg-white rounded-2xl border border-[#E8DFD2] overflow-hidden shadow-xs hover:shadow-[0_8px_30px_-4px_rgba(138,21,56,0.1)] transition-all duration-200 flex flex-col justify-between"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-[#F3EBE0]">
              <img
                src={cat.image_url || ''}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-xl text-[#1F1B16] group-hover:text-[#8A1538] transition-colors">
                  {cat.name}
                </h3>
                <p className="mt-2 text-sm text-[#6B6258] leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E8DFD2] flex items-center justify-between text-xs font-semibold text-[#8A1538]">
                <span>Browse Products</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
