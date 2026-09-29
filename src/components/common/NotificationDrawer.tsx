import React, { useEffect, useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  ShoppingBag,
  Truck,
  CreditCard,
  Building2,
  Sparkles,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface CustomerNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToOrder?: (orderNumber: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToOrder,
}) => {
  const { isAuthenticated, getAuthHeaders } = useAuth();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await fetch('/api/notifications', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchNotifications();
    }
  }, [isOpen, isAuthenticated]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  if (!isOpen) return null;

  const getIconForType = (type: string) => {
    switch (type) {
      case 'ORDER_PLACED':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'ORDER_STATUS':
        return <Truck className="w-4 h-4 text-[#8A1538]" />;
      case 'PAYMENT_FAILED':
        return <CreditCard className="w-4 h-4 text-rose-600" />;
      case 'ENQUIRY_RECEIVED':
        return <Building2 className="w-4 h-4 text-indigo-600" />;
      case 'PROMOTIONAL':
        return <Sparkles className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#8A1538]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-[#E8DFD2]">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#E8DFD2] flex items-center justify-between bg-[#FBF7F1]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#8A1538] text-white flex items-center justify-center shadow-xs">
                <Bell className="w-4 h-4 text-[#F6E08B]" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#1F1B16] flex items-center gap-2">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8A1538] text-white">
                      {unreadCount} unread
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-[#6B6258]">
                  Order updates & store announcements
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-[#8A1538] font-semibold hover:underline flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-[#F3EBE0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E8DFD2] p-2 sm:p-3">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6B6258]">
                Loading updates...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#FAF4DE] text-[#C9A227] flex items-center justify-center mx-auto">
                  <Bell className="w-6 h-6 opacity-60" />
                </div>
                <div className="text-sm font-bold text-[#1F1B16]">No notifications yet</div>
                <p className="text-xs text-[#6B6258] max-w-xs mx-auto">
                  When you place an order or your delivery rider is dispatched, updates will appear right here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const orderNumber = notif.metadata?.order_number;
                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                    className={`p-3.5 rounded-xl transition-all cursor-pointer space-y-1.5 ${
                      notif.is_read
                        ? 'bg-white hover:bg-[#FBF7F1]'
                        : 'bg-[#FAF4DE]/50 border-l-4 border-l-[#8A1538] hover:bg-[#FAF4DE]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                          {getIconForType(notif.type)}
                        </div>
                        <span className="text-xs font-bold text-[#1F1B16]">
                          {notif.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-[#6B6258]">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(notif.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#6B6258] leading-relaxed pl-9">
                      {notif.message}
                    </p>

                    {orderNumber && onNavigateToOrder && (
                      <div className="pl-9 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onNavigateToOrder(orderNumber);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8A1538] hover:underline"
                        >
                          <span>Track Order #{orderNumber}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 bg-[#FBF7F1] border-t border-[#E8DFD2] text-center text-[10px] text-[#6B6258]">
            Saraswati Sweets Barabanki • Transactional delivery alerts are always delivered promptly.
          </div>
        </div>
      </div>
    </div>
  );
};
