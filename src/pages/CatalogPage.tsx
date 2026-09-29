import React, { useEffect, useState, useMemo } from 'react';
import { Search, Sparkles, Check, X, RotateCcw } from 'lucide-react';
import { ProductGrid } from '../components/common/ProductGrid';
import { Product, Category } from '../types/database';
import { catalogService } from '../services/catalogService';

interface CatalogPageProps {
  initialCategorySlug?: string;
  onOpenProductDetail: (product: Product) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialCategorySlug = '',
  onOpenProductDetail,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('search') || '';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategorySlug);
  const [pureGheeOnly, setPureGheeOnly] = useState(false);
  const [bestsellerOnly, setBestsellerOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('search');
    if (s) setSearchTerm(s);
  }, []);

  useEffect(() => {
    setSelectedCategory(initialCategorySlug);
  }, [initialCategorySlug]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [allCats, allProds] = await Promise.all([
          catalogService.getCategories(),
          catalogService.getProducts(),
        ]);
        setCategories(allCats);
        setProducts(allProds);
      } catch (err) {
        console.error('Failed to load catalog data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPureGheeOnly(false);
    setBestsellerOnly(false);
    setSortBy('featured');
  };

  // Filter & sort logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.ingredients && p.ingredients.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory) {
      const cat = categories.find((c) => c.slug === selectedCategory);
      if (cat) {
        result = result.filter(
          (p) => p.category_id === cat.id || (p.category && p.category.slug === selectedCategory)
        );
      }
    }

    // Pure Ghee toggle
    if (pureGheeOnly) {
      result = result.filter((p) => p.is_pure_ghee);
    }

    // Bestseller toggle
    if (bestsellerOnly) {
      result = result.filter((p) => p.is_bestseller);
    }

    // Sort
    if (sortBy === 'price-asc') {
      result.sort((a, b) => (a.variants[0]?.price || 0) - (b.variants[0]?.price || 0));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (b.variants[0]?.price || 0) - (a.variants[0]?.price || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, categories, searchTerm, selectedCategory, pureGheeOnly, bestsellerOnly, sortBy]);

  const hasActiveFilters = Boolean(
    searchTerm || selectedCategory || pureGheeOnly || bestsellerOnly || sortBy !== 'featured'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#221A14] tracking-tight">
          All Sweets & Namkeen
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[#6E6259]">
          Pure ingredients, certified edible silver foil, and authentic slow-cooking taste from Barabanki.
        </p>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-white p-3 sm:p-4 rounded-2xl border border-[#E8DCC8] shadow-[0_2px_12px_-2px_rgba(34,26,20,0.04)]">
        {/* Search Bar */}
        <div className="md:col-span-7 relative">
          <Search className="w-4 h-4 text-[#6E6259] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by sweet name (e.g. Kaju Katli, Besan, Dalmoth)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DCC8] bg-[#FBF6EF] text-sm text-[#221A14] focus:outline-none focus:border-[#7A1129] focus:bg-white transition-all placeholder:text-[#6E6259]/60"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="md:col-span-5 flex items-center gap-2">
          <span className="text-xs font-semibold text-[#6E6259] shrink-0 hidden sm:inline">
            Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full py-2.5 px-3 rounded-xl border border-[#E8DCC8] bg-white text-sm text-[#221A14] font-medium focus:outline-none focus:border-[#7A1129]"
          >
            <option value="featured">Featured Collection</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Alphabetical (A to Z)</option>
          </select>
        </div>
      </div>

      {/* Category and Quick Filter Chips */}
      <div className="space-y-3">
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
              !selectedCategory
                ? 'bg-[#7A1129] text-white border-[#7A1129]'
                : 'bg-white text-[#221A14] border-[#E8DCC8] hover:bg-[#F5EAD9]'
            }`}
          >
            All Items ({products.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat.slug ? '' : cat.slug)}
              className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
                selectedCategory === cat.slug
                  ? 'bg-[#7A1129] text-white border-[#7A1129]'
                  : 'bg-white text-[#221A14] border-[#E8DCC8] hover:bg-[#F5EAD9]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Dietary & Highlight toggles */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setPureGheeOnly(!pureGheeOnly)}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all border ${
              pureGheeOnly
                ? 'bg-[#F7E9EE] text-[#7A1129] border-[#7A1129]'
                : 'bg-white text-[#6E6259] border-[#E8DCC8] hover:border-stone-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C79A3D]" />
            <span>100% Pure Desi Ghee Only</span>
            {pureGheeOnly && <Check className="w-3.5 h-3.5 text-[#7A1129]" />}
          </button>

          <button
            type="button"
            onClick={() => setBestsellerOnly(!bestsellerOnly)}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all border ${
              bestsellerOnly
                ? 'bg-[#F7E9EE] text-[#7A1129] border-[#7A1129]'
                : 'bg-white text-[#6E6259] border-[#E8DCC8] hover:border-stone-400'
            }`}
          >
            <span>Bestsellers</span>
            {bestsellerOnly && <Check className="w-3.5 h-3.5 text-[#7A1129]" />}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#7A1129] hover:bg-[#F7E9EE] transition-colors inline-flex items-center gap-1 ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <ProductGrid
        products={filteredProducts}
        isLoading={loading}
        onOpenDetail={onOpenProductDetail}
        emptyTitle="No sweets found matching filters"
        emptyDescription="We could not find any sweets matching your current search or category. Try clearing filters to see the full menu."
        onResetFilter={handleResetFilters}
      />
    </div>
  );
};
