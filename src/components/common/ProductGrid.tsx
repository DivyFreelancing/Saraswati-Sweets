import React from 'react';
import { Product } from '../../types/database';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  onOpenDetail?: (product: Product) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onResetFilter?: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading = false,
  onOpenDetail,
  emptyTitle = 'No sweets found',
  emptyDescription = 'We could not find any sweets matching your criteria. Try adjusting your search or filters.',
  onResetFilter,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {Array.from({ length: 8 }).map((_, idx) => (
          <ProductCardSkeleton key={idx} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={onResetFilter ? 'Clear Filters' : undefined}
        onAction={onResetFilter}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
};
