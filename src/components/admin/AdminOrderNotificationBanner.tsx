import React, { useEffect, useState } from 'react';
import { ShoppingBag, X, ArrowRight, Volume2, VolumeX, BellRing, Sparkles } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

export interface NewOrderAlertItem {
  id: string;
  order_number: string;
  total_amount: number;
  placed_at: string;
  recipient_name?: string;
  recipient_phone?: string;
  payment_method?: string;
  item_count?: number;
  items_summary?: string;
}

interface AdminOrderNotificationBannerProps {
  alerts: NewOrderAlertItem[];
  onDismiss: (id: string) => void;
  onViewOrder: (orderNumber: string) => void;
  isAudioSuspended: boolean;
  onEnableAudio: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const AdminOrderNotificationBanner: React.FC<AdminOrderNotificationBannerProps> = ({
  alerts,
  onDismiss,
  onViewOrder,
  isAudioSuspended,
  onEnableAudio,
  isMuted,
  onToggleMute,
}) => {
  // Auto-dismiss individual alerts after 10 seconds
  useEffect(() => {
    if (alerts.length === 0) return;
    const newest = alerts[alerts.length - 1];
    const timer = setTimeout(() => {
      onDismiss(newest.id);
    }, 10000);
    return () => clearTimeout(timer);
  }, [alerts, onDismiss]);

  return (
    <>
      {/* 1. Autoplay Suspended Reminder Bar (Shown if browser blocked audio until gesture) */}
      {isAudioSuspended && !isMuted && (
        <div className="fixed bottom-4 left-4 z-50 animate-bounce duration-1000">
          <button
            type="button"
            onClick={onEnableAudio}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#7A1129] text-white border-2 border-[#C79A3D] shadow-xl hover:bg-[#5E0D20] transition-all text-xs sm:text-sm font-semibold active:scale-95 cursor-pointer"
          >
            <BellRing className="w-4 h-4 text-[#C79A3D] animate-spin" />
            <span>Enable Order Alert Sounds</span>
          </button>
        </div>
      )}

      {/* 2. Floating New Order Alerts Stack (Top-Right) */}
      {alerts.length > 0 && (
        <div
          role="region"
          aria-label="New Order Notifications"
          className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
        >
          {alerts.slice(-3).map((alert) => {
            const timeStr = alert.placed_at
              ? new Date(alert.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now';

            return (
              <div
                key={alert.id}
                role="alert"
                aria-live="assertive"
                className="pointer-events-auto bg-gradient-to-r from-[#2A0E14] to-[#4A101C] text-white border border-[#C79A3D]/70 rounded-2xl p-4 shadow-2xl shadow-black/40 backdrop-blur-md transform transition-all duration-300 ease-out animate-in slide-in-from-top-4"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Icon badge */}
                  <div className="w-10 h-10 rounded-full bg-[#C79A3D]/20 border border-[#C79A3D] flex items-center justify-center shrink-0 mt-0.5">
                    <ShoppingBag className="w-5 h-5 text-[#E8C872]" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#E8C872]">
                        <Sparkles className="w-3 h-3" /> New Order Received
                      </span>
                      <span className="text-[11px] text-[#D8C7B5]">· {timeStr}</span>
                    </div>

                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <h4 className="font-display font-bold text-base text-white truncate">
                        #{alert.order_number}
                      </h4>
                      <span className="font-bold text-base text-[#FAF4DE]">
                        {formatINR(alert.total_amount)}
                      </span>
                    </div>

                    {/* Customer & items preview */}
                    <div className="mt-1 text-xs text-[#E8DFD2] flex flex-wrap gap-x-2 gap-y-0.5">
                      {alert.recipient_name && (
                        <span className="font-medium truncate max-w-[160px]">
                          {alert.recipient_name}
                        </span>
                      )}
                      {alert.payment_method && (
                        <span className="px-1.5 py-0.2 rounded bg-black/30 text-[10px] uppercase font-semibold text-[#C79A3D] border border-[#C79A3D]/30">
                          {alert.payment_method}
                        </span>
                      )}
                      {alert.item_count ? (
                        <span className="text-[#D8C7B5]">
                          ({alert.item_count} item{alert.item_count > 1 ? 's' : ''})
                        </span>
                      ) : null}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onViewOrder(alert.order_number);
                          onDismiss(alert.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#C79A3D] hover:bg-[#B3872F] text-[#2A0E14] text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>View Order</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDismiss(alert.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FAF4DE] text-xs font-medium transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => onDismiss(alert.id)}
                    aria-label="Dismiss notification"
                    className="text-white/60 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
