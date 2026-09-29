import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/common/EmptyState';
import { formatINR } from '../utils/formatters';
import {
  Package,
  Clock,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Truck,
  Phone,
} from 'lucide-react';

interface OrderHistoryPageProps {
  onSelectOrder: (orderNumber: string) => void;
  onGoToStore: () => void;
  onGoToCart: () => void;
}

export const OrderHistoryPage: React.FC<OrderHistoryPageProps> = ({
  onSelectOrder,
  onGoToStore,
  onGoToCart,
}) => {
  const { isAuthenticated, openAuthModal, getAuthHeaders } = useAuth();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    async function loadOrders() {
      try {
        setLoading(true);
        const res = await fetch('/api/orders', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [isAuthenticated, getAuthHeaders]);

  const handleReorder = async (order: any, e: React.MouseEvent) => {
    e.stopPropagation();
    for (const item of order.items) {
      await addItem(
        {
          variantId: item.variant_id,
          productName: item.product_name,
          variantLabel: item.variant_label,
        },
        item.quantity
      );
    }
    showToast(`Items from Order #${order.order_number} added to cart`, 'success');
    onGoToCart();
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#F7E9EE] text-[#8A1538] flex items-center justify-center mx-auto shadow-xs">
          <Phone className="w-8 h-8" />
        </div>
        <h1 className="font-display font-bold text-2xl text-[#1F1B16]">
          View Your Order History
        </h1>
        <p className="text-sm text-[#6B6258] leading-relaxed">
          Sign in with your mobile OTP to view past sweet orders, check live delivery status, and reorder favorites.
        </p>
        <button
          type="button"
          onClick={openAuthModal}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#8A1538] text-white text-sm font-semibold hover:bg-[#701029] transition-colors"
        >
          Sign In with Mobile OTP
        </button>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'DELIVERED') return o.status === 'DELIVERED';
    if (statusFilter === 'CANCELLED') return o.status === 'CANCELLED';
    if (statusFilter === 'ACTIVE') return o.status !== 'DELIVERED' && o.status !== 'CANCELLED';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1F1B16] tracking-tight">
          Your Mithai Orders
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[#6B6258]">
          Track live dispatch status or reorder your favorite Awadhi sweets in 1-click.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[#E8DFD2] pb-2 overflow-x-auto">
        {(['ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === tab
                ? 'bg-[#8A1538] text-white'
                : 'text-[#6B6258] hover:text-[#1F1B16] hover:bg-[#F3EBE0]'
            }`}
          >
            {tab === 'ALL'
              ? `All Orders (${orders.length})`
              : tab === 'ACTIVE'
              ? `Active (${orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length})`
              : tab === 'DELIVERED'
              ? `Delivered (${orders.filter((o) => o.status === 'DELIVERED').length})`
              : `Cancelled (${orders.filter((o) => o.status === 'CANCELLED').length})`}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-32 bg-white rounded-2xl border border-[#E8DFD2]" />
          <div className="h-32 bg-white rounded-2xl border border-[#E8DFD2]" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-[#8A1538]" />}
          title="No Orders Found"
          description={
            statusFilter === 'ALL'
              ? 'You have not placed any mithai orders yet. Explore our fresh sweets prepared in 100% cow desi ghee!'
              : `No orders matching status filter '${statusFilter}'.`
          }
          actionLabel="Explore Sweet Catalog"
          onAction={onGoToStore}
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isDelivered = order.status === 'DELIVERED';
            const isCancelled = order.status === 'CANCELLED';

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order.order_number)}
                className="bg-white rounded-2xl border border-[#E8DFD2] p-5 sm:p-6 shadow-xs hover:border-[#8A1538]/50 hover:shadow-sm transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-[#8A1538]">
                      #{order.order_number}
                    </span>

                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isDelivered
                          ? 'bg-emerald-50 text-[#2E7D4F]'
                          : isCancelled
                          ? 'bg-red-50 text-[#B3261E]'
                          : 'bg-[#F7E9EE] text-[#8A1538]'
                      }`}
                    >
                      {order.status}
                    </span>

                    <span className="text-xs text-[#6B6258]">
                      {new Date(order.placed_at || order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="text-xs text-[#1F1B16] font-medium">
                    {order.items?.map((it: any) => `${it.product_name} (${it.variant_label}) × ${it.quantity}`).join(' • ')}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#6B6258] pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#8A1538]" />
                      <span>{order.slot_snapshot?.slot_date} ({order.slot_snapshot?.start_time} - {order.slot_snapshot?.end_time})</span>
                    </span>
                    <span>•</span>
                    <span>Total: <strong className="text-[#1F1B16] tabular-nums">{formatINR(order.total)}</strong> (COD)</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0 pt-2 md:pt-0">
                  <button
                    type="button"
                    onClick={(e) => handleReorder(order, e)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[#E8DFD2] hover:bg-[#F3EBE0] text-xs font-semibold text-[#1F1B16] flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#8A1538]" />
                    <span>Reorder</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectOrder(order.order_number)}
                    className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                  >
                    <span>Track Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
