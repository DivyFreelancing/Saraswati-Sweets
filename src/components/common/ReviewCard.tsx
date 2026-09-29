import React from 'react';
import { Star, CheckCircle } from 'lucide-react';
import { Review } from '../../types/database';

interface ReviewCardProps {
  review: Review;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  return (
    <div className="bg-white rounded-xl border border-[#E8DFD2] p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Star rating */}
          <div className="flex items-center gap-1 text-[#C9A227]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < review.rating ? 'fill-[#C9A227] text-[#C9A227]' : 'text-stone-300'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-[#2E7D4F] font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Verified Order</span>
          </div>
        </div>

        <p className="text-sm text-[#1F1B16] leading-relaxed italic">
          "{review.comment}"
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[#E8DFD2]/60 flex items-center justify-between text-xs text-[#6B6258]">
        <span className="font-semibold text-[#1F1B16]">{review.customer_name}</span>
        <span>Barabanki, UP</span>
      </div>
    </div>
  );
};
