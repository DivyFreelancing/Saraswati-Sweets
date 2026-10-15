import React, { useState } from 'react';
import {
  Bell,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

interface AdminNotificationsTabProps {
  notifications: NotificationItem[];
  isAdmin: boolean;
  getAuthHeaders: () => Record<string, string>;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ORDER_PLACED: { label: 'New Order', bg: 'bg-[#E3F4EA]', text: 'text-[#17663E]' },
  ORDER_STATUS: { label: 'Status Update', bg: 'bg-[#F3E9DC]', text: 'text-[#7A1129]' },
  PAYMENT_FAILED: { label: 'Payment Alert', bg: 'bg-[#FDE8E8]', text: 'text-[#A8261E]' },
  ENQUIRY_RECEIVED: { label: 'Bulk Enquiry', bg: 'bg-[#FDEFD0]', text: 'text-[#8A4B00]' },
  PROMOTIONAL: { label: 'Promotional', bg: 'bg-[#F3E9DC]', text: 'text-[#7A1129]' },
};

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  notifications,
  isAdmin,
  getAuthHeaders,
  onRefresh,
  showToast,
}) => {
  // Test email state (defaults to admin inbox)
  const [testEmail, setTestEmail] = useState('saraswatisweetsbarabanki@gmail.com');
  const [testSubject, setTestSubject] = useState('Saraswati Sweets Transactional Test');
  const [isPromotional, setIsPromotional] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    try {
      setIsSending(true);
      setTestResult(null);

      const res = await fetch('/api/admin/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          to: testEmail,
          subject: testSubject,
          isPromotional,
        }),
      });

      const data = await res.json();
      setTestResult(data.result);

      if (res.ok && data.success && data.result?.success) {
        showToast(`Email dispatched to ${testEmail} via Zoho ZeptoMail Provider!`, 'success');
      } else {
        const errMsg = data.result?.error || 'Email dispatch failed. Check server logs.';
        showToast(errMsg, 'error');
      }
    } catch {
      showToast('Network error triggering test email', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1129] uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4 text-[#E8C16A]" />
            <span>Storefront Communications & ZeptoMail Delivery</span>
          </div>
          <h2 className="font-extrabold text-xl sm:text-2xl text-[#241C17]">
            Notifications & Transactional Email
          </h2>
          <p className="text-xs sm:text-sm text-[#6B5F55] mt-0.5">
            Automated notifications for order placement, order status transitions, payment alerts, and store owner enquiry alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-[#E3F4EA] text-[#17663E] border border-[#17663E]/20 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#17663E]" />
            <span>ZeptoMail Provider Active</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: In-App Notifications Feed */}
        <div className="lg:col-span-7 bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-3">
            <h3 className="font-extrabold text-base text-[#241C17] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7A1129]" />
              <span>In-App Notification Feed ({notifications.length})</span>
            </h3>
            <span className="text-[11px] text-[#6B5F55]">
              {notifications.filter((n) => !n.is_read).length} unread
            </span>
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-[#6B5F55] italic py-6 text-center">
              No recent notifications logged.
            </p>
          ) : (
            <div className="divide-y divide-[#E9E2D8] max-h-[600px] overflow-y-auto pr-1">
              {notifications.map((notif) => {
                const badge = TYPE_CONFIG[notif.type] || {
                  label: notif.type,
                  bg: 'bg-[#F7F4EF]',
                  text: 'text-[#241C17]',
                };
                return (
                  <div key={notif.id} className="py-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                        <strong className="text-[#241C17]">{notif.title}</strong>
                      </div>
                      <span className="text-[11px] text-[#6B5F55]">
                        {new Date(notif.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-[#6B5F55] leading-relaxed">{notif.message}</p>

                    <div className="text-[10px] text-[#6B5F55]/70 font-mono">
                      Target: {notif.user_id} • ID: {notif.id}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: ZeptoMail Email Test Dispatcher & Policy Card */}
        <div className="lg:col-span-5 space-y-5">
          {/* Policy Card */}
          <div className="p-5 rounded-[14px] bg-[#F7F4EF] border border-[#E9E2D8] space-y-3 text-xs">
            <h4 className="font-extrabold text-sm text-[#241C17] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#7A1129]" />
              <span>Notification Policies & Delivery Rules</span>
            </h4>
            <ul className="space-y-1.5 text-[#6B5F55]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#17663E] shrink-0 mt-0.5" />
                <span><strong>Transactional Emails:</strong> Order placed, status changed, payment failed, and store owner alerts are <strong>never blocked</strong>.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#17663E] shrink-0 mt-0.5" />
                <span><strong>Promotional Opt-out:</strong> Customer opt-out preference is strictly respected before sending marketing offers.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#7A1129] shrink-0 mt-0.5" />
                <span><strong>Mobile Push:</strong> FCM stub provided as specified for web build architecture.</span>
              </li>
            </ul>
          </div>

          {/* ZeptoMail Test Panel */}
          {isAdmin && (
            <div className="p-5 rounded-[14px] bg-white border border-[#E9E2D8] shadow-2xs space-y-4">
              <h4 className="font-extrabold text-sm text-[#241C17] flex items-center gap-2 border-b border-[#E9E2D8] pb-2.5">
                <Mail className="w-4 h-4 text-[#7A1129]" />
                <span>Test Transactional Email Dispatch (ZeptoMail)</span>
              </h4>

              <form onSubmit={handleSendTestEmail} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#241C17] mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="e.g. saraswatisweetsbarabanki@gmail.com"
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#241C17] mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPromotional}
                      onChange={(e) => setIsPromotional(e.target.checked)}
                      className="w-4 h-4 accent-[#7A1129] rounded border-stone-300"
                    />
                    <span className="text-[#241C17]">
                      Mark as Promotional (tests opt-out filter)
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full min-h-[44px] px-4 py-2 rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Dispatching...' : 'Dispatch Test Email'}</span>
                </button>
              </form>

              {testResult && (
                <div className="p-3 rounded-[10px] bg-[#F7F4EF] border border-[#E9E2D8] text-xs font-mono space-y-1">
                  <div className="font-bold text-[#17663E] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dispatched Successfully</span>
                  </div>
                  <pre className="text-[10px] text-[#241C17] whitespace-pre-wrap">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
