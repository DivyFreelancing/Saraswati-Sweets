import React, { useState, useEffect } from 'react';
import { Truck, Store, AlertCircle, CheckCircle2, RefreshCw, Power } from 'lucide-react';

export interface StoreOperationsCardProps {
  storeSettings: any;
  onUpdateSettings: (newSettings: any) => Promise<boolean>;
  canEdit: boolean;
}

export const StoreOperationsCard: React.FC<StoreOperationsCardProps> = ({
  storeSettings,
  onUpdateSettings,
  canEdit,
}) => {
  const [deliveryEnabled, setDeliveryEnabled] = useState<boolean>(true);
  const [takeawayEnabled, setTakeawayEnabled] = useState<boolean>(true);
  const [closureMessage, setClosureMessage] = useState<string>('');
  const [autoReopenAt, setAutoReopenAt] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; timestamp: Date } | null>(null);

  // Sync state when storeSettings changes
  useEffect(() => {
    if (storeSettings) {
      setDeliveryEnabled(storeSettings.delivery_enabled ?? true);
      setTakeawayEnabled(storeSettings.takeaway_enabled ?? true);
      setClosureMessage(storeSettings.closure_message || '');
      setAutoReopenAt(storeSettings.auto_reopen_at ? storeSettings.auto_reopen_at.slice(0, 16) : '');
    }
  }, [storeSettings]);

  // Handle direct 1-click toggle with instant save
  const handleToggle = async (type: 'DELIVERY' | 'TAKEAWAY', nextVal: boolean) => {
    if (!canEdit || isSaving) return;

    const newDelivery = type === 'DELIVERY' ? nextVal : deliveryEnabled;
    const newTakeaway = type === 'TAKEAWAY' ? nextVal : takeawayEnabled;

    if (type === 'DELIVERY') setDeliveryEnabled(nextVal);
    if (type === 'TAKEAWAY') setTakeawayEnabled(nextVal);

    setIsSaving(true);
    setFeedback(null);

    const payload = {
      ...storeSettings,
      delivery_enabled: newDelivery,
      takeaway_enabled: newTakeaway,
      closure_message: closureMessage.trim() || null,
      auto_reopen_at: autoReopenAt ? new Date(autoReopenAt).toISOString() : null,
    };

    const ok = await onUpdateSettings(payload);
    setIsSaving(false);

    if (ok) {
      setFeedback({
        type: 'success',
        message: `${type === 'DELIVERY' ? 'Home Delivery' : 'Store Pickup (Takeaway)'} is now ${nextVal ? 'ON (Active)' : 'OFF (Paused)'}.`,
        timestamp: new Date(),
      });
    } else {
      // Revert on failure
      if (type === 'DELIVERY') setDeliveryEnabled(!nextVal);
      if (type === 'TAKEAWAY') setTakeawayEnabled(!nextVal);
      setFeedback({
        type: 'error',
        message: 'Failed to update store status. Please try again.',
        timestamp: new Date(),
      });
    }
  };

  // Handle explicit form save (notice message, timer, toggles)
  const handleExplicitSave = async (e?: React.FormEvent | React.SyntheticEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canEdit || isSaving) return;

    setIsSaving(true);
    setFeedback(null);

    const payload = {
      ...storeSettings,
      delivery_enabled: deliveryEnabled,
      takeaway_enabled: takeawayEnabled,
      closure_message: closureMessage.trim() || null,
      auto_reopen_at: autoReopenAt ? new Date(autoReopenAt).toISOString() : null,
    };

    const ok = await onUpdateSettings(payload);
    setIsSaving(false);

    if (ok) {
      setFeedback({
        type: 'success',
        message: 'Store operations settings & notice updated successfully!',
        timestamp: new Date(),
      });
    } else {
      setFeedback({
        type: 'error',
        message: 'Failed to save store operations settings.',
        timestamp: new Date(),
      });
    }
  };

  const handleQuickTimer = (hours: number | null) => {
    if (hours === null) {
      setAutoReopenAt('');
    } else {
      const target = new Date(Date.now() + hours * 60 * 60 * 1000);
      setAutoReopenAt(target.toISOString().slice(0, 16));
    }
  };

  return (
    <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-4">
      {/* 1. Header with Title & Operational Summary */}
      <div className="flex items-center justify-between gap-3 border-b border-[#E9E2D8] pb-3.5">
        <div className="flex items-center gap-2">
          <Power className="w-4 h-4 text-[#7A1129]" strokeWidth={1.8} aria-hidden="true" />
          <h2 className="text-[16px] font-extrabold text-[#241C17] tracking-tight">
            Store operations
          </h2>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              deliveryEnabled
                ? 'bg-[#E3F4EA] text-[#17663E]'
                : 'bg-[#FDEFD0] text-[#8A4B00]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                deliveryEnabled ? 'bg-[#17663E]' : 'bg-[#8A4B00]'
              }`}
            />
            Delivery {deliveryEnabled ? 'ON' : 'OFF'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              takeawayEnabled
                ? 'bg-[#E3F4EA] text-[#17663E]'
                : 'bg-[#FDEFD0] text-[#8A4B00]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                takeawayEnabled ? 'bg-[#17663E]' : 'bg-[#8A4B00]'
              }`}
            />
            Pickup {takeawayEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* 2. Interactive Two Switch Rows */}
      <div className="space-y-3">
        {/* ROW 1: HOME DELIVERY */}
        <div className="p-3.5 rounded-[12px] border border-[#E9E2D8] bg-[#F7F4EF] flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-8 h-8 rounded-[8px] bg-white border border-[#E9E2D8] flex items-center justify-center text-[#7A1129] shrink-0 mt-0.5" aria-hidden="true">
              <Truck className="w-4 h-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#241C17]">Home delivery</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    deliveryEnabled
                      ? 'bg-[#E3F4EA] text-[#17663E]'
                      : 'bg-[#FDEFD0] text-[#8A4B00]'
                  }`}
                >
                  {deliveryEnabled ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <p className="text-[11px] text-[#6B5F55] mt-0.5 leading-snug">
                {deliveryEnabled
                  ? 'Doorstep delivery across Barabanki (Flat ₹50 delivery fee).'
                  : 'Doorstep delivery blocked at checkout. Customers guided to pickup.'}
              </p>
            </div>
          </div>

          {/* Switch Button with min 44px tap area */}
          <button
            type="button"
            role="switch"
            aria-checked={deliveryEnabled}
            aria-label="Toggle Home delivery"
            disabled={!canEdit || isSaving}
            onClick={() => handleToggle('DELIVERY', !deliveryEnabled)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#7A1129] disabled:opacity-50 shrink-0"
          >
            <span
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                deliveryEnabled ? 'bg-[#1E7A4B]' : 'bg-[#D1C7BD]'
              }`}
            >
              <span
                className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform duration-200 ${
                  deliveryEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        </div>

        {/* ROW 2: STORE PICKUP */}
        <div className="p-3.5 rounded-[12px] border border-[#E9E2D8] bg-[#F7F4EF] flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-8 h-8 rounded-[8px] bg-white border border-[#E9E2D8] flex items-center justify-center text-[#7A1129] shrink-0 mt-0.5" aria-hidden="true">
              <Store className="w-4 h-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#241C17]">Store pickup (Takeaway)</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    takeawayEnabled
                      ? 'bg-[#E3F4EA] text-[#17663E]'
                      : 'bg-[#FDEFD0] text-[#8A4B00]'
                  }`}
                >
                  {takeawayEnabled ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <p className="text-[11px] text-[#6B5F55] mt-0.5 leading-snug">
                {takeawayEnabled
                  ? 'Counter pickup at Barabanki sweet shop (FREE / ₹0 pickup fee).'
                  : 'Counter pickup reservations are temporarily paused.'}
              </p>
            </div>
          </div>

          {/* Switch Button with min 44px tap area */}
          <button
            type="button"
            role="switch"
            aria-checked={takeawayEnabled}
            aria-label="Toggle Store pickup"
            disabled={!canEdit || isSaving}
            onClick={() => handleToggle('TAKEAWAY', !takeawayEnabled)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#7A1129] disabled:opacity-50 shrink-0"
          >
            <span
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                takeawayEnabled ? 'bg-[#1E7A4B]' : 'bg-[#D1C7BD]'
              }`}
            >
              <span
                className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform duration-200 ${
                  takeawayEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* 3. Customer Announcement Message & Timer Configuration */}
      <div className="space-y-3.5 pt-2 border-t border-[#E9E2D8]">
        {/* Customer Notice Input */}
        <div>
          <label htmlFor="closure-notice-input" className="block text-xs font-bold text-[#241C17] mb-1">
            Customer notice / announcement
          </label>
          <input
            id="closure-notice-input"
            type="text"
            disabled={!canEdit || isSaving}
            value={closureMessage}
            placeholder="e.g. Due to festival rush, doorstep delivery is temporarily paused today."
            onChange={(e) => setClosureMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleExplicitSave();
              }
            }}
            className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-medium text-[#241C17] focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
          />
        </div>

        {/* Auto-Reopen Datetime & Quick Presets */}
        <div>
          <label htmlFor="auto-reopen-datetime" className="block text-xs font-bold text-[#241C17] mb-1">
            Auto-reopen time (optional)
          </label>
          <input
            id="auto-reopen-datetime"
            type="datetime-local"
            disabled={!canEdit || isSaving}
            value={autoReopenAt}
            onChange={(e) => setAutoReopenAt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleExplicitSave();
              }
            }}
            className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-medium text-[#241C17] focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
          />

          {/* Quick Presets */}
          {canEdit && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] text-[#6B5F55] font-semibold">Presets:</span>
              <button
                type="button"
                onClick={() => handleQuickTimer(1)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-[6px] bg-[#F3E9DC] hover:bg-[#E9E2D8] text-[#4A0A1B] cursor-pointer"
              >
                +1 hr
              </button>
              <button
                type="button"
                onClick={() => handleQuickTimer(2)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-[6px] bg-[#F3E9DC] hover:bg-[#E9E2D8] text-[#4A0A1B] cursor-pointer"
              >
                +2 hrs
              </button>
              <button
                type="button"
                onClick={() => handleQuickTimer(4)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-[6px] bg-[#F3E9DC] hover:bg-[#E9E2D8] text-[#4A0A1B] cursor-pointer"
              >
                +4 hrs
              </button>
              {autoReopenAt && (
                <button
                  type="button"
                  onClick={() => handleQuickTimer(null)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-[6px] text-[#A8261E] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            role="status"
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-[10px] border ${
              feedback.type === 'success'
                ? 'bg-[#E3F4EA] text-[#17663E] border-[#1E7A4B]/30'
                : 'bg-[#FDEFD0] text-[#8A4B00] border-[#D9B866]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#17663E] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#8A4B00] shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-1">
          {canEdit ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleExplicitSave()}
              className="w-full min-h-[44px] px-5 py-2.5 rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] disabled:opacity-60 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E8C16A]" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <span>Update settings</span>
              )}
            </button>
          ) : (
            <p className="text-xs text-[#6B5F55] italic text-center">
              * Store Manager or Admin credentials required to modify operations.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
