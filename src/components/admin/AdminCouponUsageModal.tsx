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
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-[#E8DFD2] space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-[#E8DFD2] pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-base bg-[#8A1538] text-white px-2.5 py-0.5 rounded shadow-xs">
              {coupon.code}
            </span>
            <h3 className="font-display font-bold text-base text-[#1F1B16]">
              Redemption Audit History
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coupon summary cards */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2]">
            <span className="text-[#6B6258] block">Total Uses</span>
            <span className="font-display font-bold text-base text-[#1F1B16] mt-0.5 block">
              {usages.length} {coupon.total_limit ? `/ ${coupon.total_limit}` : ''}
            </span>
            <span className="text-[10px] text-[#6B6258]">
              {coupon.usage_limit_per_user ? `Max ${coupon.usage_limit_per_user}/user` : 'No user cap'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2]">
            <span className="text-[#6B6258] block">Discount Value</span>
            <span className="font-display font-bold text-base text-[#8A1538] mt-0.5 block">
              {coupon.type === 'FLAT' ? `₹${coupon.value}` : `${coupon.value}%`}
            </span>
            <span className="text-[10px] text-[#6B6258]">Min Order ₹{coupon.min_order_value}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2]">
            <span className="text-[#6B6258] block">Savings Granted</span>
            <span className="font-display font-bold text-base text-[#2E7D4F] mt-0.5 block">
              {formatINR(totalDiscountGranted)}
            </span>
            <span className="text-[10px] text-[#2E7D4F] font-semibold">Verified redemptions</span>
          </div>
        </div>

        {/* Usages List */}
        <div className="space-y-2">
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#1F1B16]">
            Orders Benefiting from {coupon.code}
          </h4>

          {loading ? (
            <p className="text-xs text-[#6B6258] py-4 text-center">Loading audit log...</p>
          ) : usages.length === 0 ? (
            <p className="text-xs text-[#6B6258] italic py-6 text-center bg-[#FBF7F1] rounded-xl border border-[#E8DFD2]">
              No customer orders have redeemed this coupon code yet.
            </p>
          ) : (
            <div className="divide-y divide-[#E8DFD2] max-h-60 overflow-y-auto pr-1">
              {usages.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-[#1F1B16]">
                      Order #{u.order_id}
                    </div>
                    <div className="text-[11px] text-[#6B6258]">
                      Phone: {u.phone || 'Anonymous guest'} • {new Date(u.created_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <span className="font-bold text-[#2E7D4F] tabular-nums">
                    - {formatINR(u.discount_amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-[#E8DFD2] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
