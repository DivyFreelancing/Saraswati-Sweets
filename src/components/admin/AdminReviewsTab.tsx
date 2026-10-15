import React, { useState } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';

interface Review {
  id: string;
  product_id: string;
  product_name: string;
  order_id: string;
  user_id?: string;
  user_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
  approved_at?: string;
}

interface AdminReviewsTabProps {
  reviews: Review[];
  isAdmin: boolean;
  getAuthHeaders: () => Record<string, string>;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AdminReviewsTab: React.FC<AdminReviewsTabProps> = ({
  reviews,
  isAdmin,
  getAuthHeaders,
  onRefresh,
  showToast,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('PENDING');
  const [search, setSearch] = useState('');

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'PENDING' && r.is_approved) return false;
    if (filter === 'APPROVED' && !r.is_approved) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.product_name.toLowerCase().includes(q) ||
        r.user_name.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleStatus = async (review: Review, approve: boolean) => {
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ is_approved: approve }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(approve ? 'Review approved and published!' : 'Review unpublished.', 'success');
        onRefresh();
      } else {
        showToast(data.message || 'Failed to update review status', 'error');
      }
    } catch {
      showToast('Error updating review status', 'error');
    }
  };

  const handleDeleteReview = async (review: Review) => {
    if (!isAdmin) {
      showToast('Admin privilege required.', 'error');
      return;
    }

    if (!window.confirm(`Delete review from ${review.user_name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        showToast('Review deleted permanently.', 'info');
        onRefresh();
      } else {
        showToast('Failed to delete review', 'error');
      }
    } catch {
      showToast('Error deleting review', 'error');
    }
  };

  const pendingCount = reviews.filter((r) => !r.is_approved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1129] uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#E8C16A]" />
            <span>Verified Purchase Moderation</span>
          </div>
          <h2 className="font-extrabold text-xl sm:text-2xl text-[#241C17]">
            Customer Reviews Moderation
          </h2>
          <p className="text-xs sm:text-sm text-[#6B5F55] mt-0.5">
            Strict policy enforced: only customers with a <strong>DELIVERED</strong> order can submit reviews. All reviews remain unpublished until approved here.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex rounded-[10px] bg-[#F7F4EF] p-1 border border-[#E9E2D8] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('PENDING')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'PENDING'
                ? 'bg-[#7A1129] text-white shadow-xs'
                : 'text-[#241C17] hover:bg-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('APPROVED')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'APPROVED'
                ? 'bg-[#7A1129] text-white shadow-xs'
                : 'text-[#241C17] hover:bg-white/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Published ({reviews.length - pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-colors cursor-pointer ${
              filter === 'ALL'
                ? 'bg-[#7A1129] text-white shadow-xs'
                : 'text-[#241C17] hover:bg-white/60'
            }`}
          >
            All ({reviews.length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B5F55]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, sweet, or review content..."
          className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] text-xs focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
        />
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-[14px] border border-[#E9E2D8] text-[#6B5F55] text-xs">
          No reviews found matching the selected filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className={`p-5 rounded-[14px] border transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs ${
                rev.is_approved ? 'border-[#E9E2D8]' : 'border-[#E8C16A]/60 bg-[#F7F4EF]/50'
              }`}
            >
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-0.5 text-[#E8C16A]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating ? 'fill-[#E8C16A]' : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </div>

                  <span className="font-bold text-xs text-[#241C17]">{rev.user_name}</span>
                  <span className="text-[#6B5F55] text-xs">•</span>
                  <span className="font-semibold text-xs text-[#7A1129]">{rev.product_name}</span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rev.is_approved
                        ? 'bg-[#E3F4EA] text-[#17663E]'
                        : 'bg-[#FDEFD0] text-[#8A4B00]'
                    }`}
                  >
                    {rev.is_approved ? 'PUBLISHED' : 'PENDING APPROVAL'}
                  </span>
                </div>

                <p className="text-xs text-[#241C17] leading-relaxed">
                  "{rev.comment}"
                </p>

                <div className="text-[11px] text-[#6B5F55] flex items-center gap-3">
                  <span>Order Ref: <code className="font-mono text-[10px] bg-[#F7F4EF] px-1.5 py-0.5 rounded border border-[#E9E2D8]">{rev.order_id}</code> (Verified Delivered)</span>
                  <span>•</span>
                  <span>{new Date(rev.created_at).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Moderation Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {!rev.is_approved ? (
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(rev, true)}
                    className="min-h-[44px] px-4 py-2 rounded-[10px] bg-[#1E7A4B] hover:bg-[#165c38] text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Publish</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(rev, false)}
                    className="min-h-[44px] px-4 py-2 rounded-[10px] border border-[#E9E2D8] bg-white hover:bg-[#F7F4EF] text-[#241C17] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-[#6B5F55]" />
                    <span>Unpublish</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(rev)}
                    className="p-2.5 rounded-[10px] border border-[#E9E2D8] text-[#A8261E] hover:bg-[#FDE8E8] transition-colors cursor-pointer"
                    title="Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
