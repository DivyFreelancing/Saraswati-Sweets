import React, { useState, useEffect } from 'react';
import { Truck, Store, AlertCircle, CheckCircle2, Clock, RefreshCw, Power } from 'lucide-react';

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
    if (!canEdit) return;

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
        message: `${type === 'DELIVERY' ? 'Home Delivery' : 'Store Pickup / Takeaway'} is now ${nextVal ? 'ON (Active)' : 'OFF (Paused)'}. Saved to database.`,
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
  const handleExplicitSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

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
        message: 'Store operations settings & customer notice updated successfully!',
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

  const isStoreFullyClosed = !deliveryEnabled && !takeawayEnabled;

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8DFD2] p-5 sm:p-6 shadow-sm space-y-5">
      {/* 1. Header with Live Status Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DFD2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#8A1538] text-white flex items-center justify-center shadow-xs">
              <Power className="w-4 h-4 text-[#F6E08B]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#1F1B16] flex items-center gap-2">
                Store Operations • Delivery & Takeaway Availability
              </h3>
              <p className="text-xs text-[#6B6258] mt-0.5">
                Temporarily pause doorstep delivery or counter takeaway during festival rushes without redeploying code.
              </p>
            </div>
          </div>
        </div>

        {/* Global Operational Status Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          {isStoreFullyClosed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Store Paused (All Services OFF)
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  deliveryEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    deliveryEnabled ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                Delivery: {deliveryEnabled ? 'ON' : 'OFF'}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  takeawayEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    takeawayEnabled ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                Takeaway: {takeawayEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Toggles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* HOME DELIVERY TOGGLE CARD */}
        <div
          className={`p-4 rounded-xl border-2 transition-all ${
            deliveryEnabled
              ? 'bg-emerald-50/40 border-emerald-300/80'
              : 'bg-stone-50 border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  deliveryEnabled
                    ? 'bg-[#8A1538] text-white shadow-xs'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#1F1B16]">Home Delivery</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      deliveryEnabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {deliveryEnabled ? 'ACCEPTING ORDERS' : 'PAUSED'}
                  </span>
                </div>
                <p className="text-xs text-[#6B6258] mt-1 leading-relaxed">
                  {deliveryEnabled
                    ? 'Customers can order for doorstep delivery across Barabanki (Flat ₹50 delivery fee).'
                    : 'Doorstep delivery is temporarily blocked at checkout. Customers are guided to counter pickup.'}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
              <input
                type="checkbox"
                disabled={!canEdit || isSaving}
                checked={deliveryEnabled}
                onChange={(e) => handleToggle('DELIVERY', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-[#2E7D4F] peer-disabled:opacity-60"></div>
            </label>
          </div>
        </div>

        {/* STORE PICKUP / TAKEAWAY TOGGLE CARD */}
        <div
          className={`p-4 rounded-xl border-2 transition-all ${
            takeawayEnabled
              ? 'bg-emerald-50/40 border-emerald-300/80'
              : 'bg-stone-50 border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  takeawayEnabled
                    ? 'bg-[#2E7D4F] text-white shadow-xs'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#1F1B16]">Store Pickup (Takeaway)</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      takeawayEnabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {takeawayEnabled ? 'ACCEPTING SLOTS' : 'PAUSED'}
                  </span>
                </div>
                <p className="text-xs text-[#6B6258] mt-1 leading-relaxed">
                  {takeawayEnabled
                    ? 'Customers can reserve pickup time slots at the Barabanki sweet shop counter (FREE / ₹0 pickup fee, Online Prepaid).'
                    : 'Counter pickup reservations are temporarily paused.'}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
              <input
                type="checkbox"
                disabled={!canEdit || isSaving}
                checked={takeawayEnabled}
                onChange={(e) => handleToggle('TAKEAWAY', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-[#2E7D4F] peer-disabled:opacity-60"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Customer Announcement Message & Timer Configuration */}
      <form onSubmit={handleExplicitSave} className="space-y-4 pt-2 border-t border-[#E8DFD2]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Customer Closure Notice */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
              Customer Notice / Closure Announcement (Shown to customers when service is paused)
            </label>
            <input
              type="text"
              disabled={!canEdit || isSaving}
              value={closureMessage}
              placeholder="e.g. Due to festival rush, doorstep delivery is temporarily paused today. Store counter pickup is open!"
              onChange={(e) => setClosureMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-xs font-medium focus:outline-none focus:border-[#8A1538] disabled:opacity-60"
            />
            <p className="text-[11px] text-[#6B6258] mt-1">
              Displayed prominently on the checkout page when doorstep delivery or store pickup is paused.
            </p>
          </div>

          {/* Auto-Reopen Timer */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
              Auto-Reopen Time (Optional)
            </label>
            <input
              type="datetime-local"
              disabled={!canEdit || isSaving}
              value={autoReopenAt}
              onChange={(e) => setAutoReopenAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-xs font-medium focus:outline-none focus:border-[#8A1538] disabled:opacity-60"
            />
            {/* Quick Timer presets */}
            {canEdit && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] text-[#6B6258]">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleQuickTimer(1)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-[#1F1B16]"
                >
                  +1 hr
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTimer(2)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-[#1F1B16]"
                >
                  +2 hrs
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTimer(4)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-[#1F1B16]"
                >
                  +4 hrs
                </button>
                {autoReopenAt && (
                  <button
                    type="button"
                    onClick={() => handleQuickTimer(null)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded text-rose-700 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Action Button & Live Feedback */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            {feedback && (
              <div
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {canEdit ? (
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-[#8A1538] hover:bg-[#701029] disabled:opacity-60 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F6E08B]" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5 text-[#F6E08B]" />
                    <span>Update Operations Settings</span>
                  </>
                )}
              </button>
            ) : (
              <p className="text-xs text-[#6B6258] italic">
                * Store Manager or Admin credentials required to modify operations.
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
