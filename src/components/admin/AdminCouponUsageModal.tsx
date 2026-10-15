import React, { useState, useEffect } from 'react';
import { X, Sparkles, ShoppingBag, Clock, Users, ShieldCheck } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

interface AdminCouponUsageModalProps {
  coupon: any;
  isOpen: boolean;
  onClose: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export const AdminCouponUsageModal: React.FC<AdminCouponUsageModalProps> = ({
  coupon,
  isOpen,
  onClose,
  getAuthHeaders,
}) => {
  const [usages, setUsages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (coupon && isOpen) {
      setLoading(true);
      fetch(`/api/admin/coupons/${coupon.code}/usage`, {
        headers: getAuthHeaders(),
      })
        .then((res) => res.json())
        .then((data) => {
          setUsages(data.usages || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [coupon, isOpen]);

  if (!isOpen || !coupon) return null;

  const totalDiscountGranted = usages.reduce((acc, u) => acc + (u.discount_amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-[14px] bg-white p-6 shadow-xl border border-[#E9E2D8] space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-[#7A1129] text-white px-2.5 py-1 rounded-full shadow-xs">
              {coupon.code}
            </span>
            <h3 className="font-extrabold text-base text-[#241C17]">
              Redemption Audit History
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[10px] text-[#6B5F55] hover:text-[#241C17] hover:bg-[#E9E2D8]/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coupon summary cards */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-[12px] bg-[#F7F4EF] border border-[#E9E2D8]">
            <span className="text-[#6B5F55] block">Total Uses</span>
            <span className="font-extrabold text-base text-[#241C17] mt-0.5 block tabular-nums">
              {usages.length} {coupon.total_limit ? `/ ${coupon.total_limit}` : ''}
            </span>
            <span className="text-[10px] text-[#6B5F55]">
              {coupon.usage_limit_per_user ? `Max ${coupon.usage_limit_per_user}/user` : 'No user cap'}
            </span>
          </div>

          <div className="p-3 rounded-[12px] bg-[#F7F4EF] border border-[#E9E2D8]">
            <span className="text-[#6B5F55] block">Discount Value</span>
            <span className="font-extrabold text-base text-[#7A1129] mt-0.5 block tabular-nums">
              {coupon.type === 'FLAT' ? `₹${coupon.value}` : `${coupon.value}%`}
            </span>
            <span className="text-[10px] text-[#6B5F55]">Min Order ₹{coupon.min_order_value}</span>
          </div>

          <div className="p-3 rounded-[12px] bg-[#F7F4EF] border border-[#E9E2D8]">
            <span className="text-[#6B5F55] block">Savings Granted</span>
            <span className="font-extrabold text-base text-[#17663E] mt-0.5 block tabular-nums">
              {formatINR(totalDiscountGranted)}
            </span>
            <span className="text-[10px] text-[#17663E] font-semibold">Verified redemptions</span>
          </div>
        </div>

        {/* Usages List */}
        <div className="space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#241C17]">
            Orders Benefiting from {coupon.code}
          </h4>

          {loading ? (
            <p className="text-xs text-[#6B5F55] py-4 text-center">Loading audit log...</p>
          ) : usages.length === 0 ? (
            <p className="text-xs text-[#6B5F55] italic py-6 text-center bg-[#F7F4EF] rounded-[10px] border border-[#E9E2D8]">
              No customer orders have redeemed this coupon code yet.
            </p>
          ) : (
            <div className="divide-y divide-[#E9E2D8] max-h-60 overflow-y-auto pr-1">
              {usages.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-[#241C17]">
                      Order #{u.order_id}
                    </div>
                    <div className="text-[11px] text-[#6B5F55]">
                      Phone: {u.phone || 'Anonymous guest'} • {new Date(u.created_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <span className="font-bold text-[#17663E] tabular-nums">
                    - {formatINR(u.discount_amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-[#E9E2D8] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-xs font-bold text-white shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
