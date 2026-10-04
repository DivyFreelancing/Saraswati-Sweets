import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle, CheckCircle, Ban } from 'lucide-react';

export interface ClientDeliverySlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  cutoff_at: string;
  is_active: boolean;
  isPastCutoff?: boolean;
  isFull?: boolean;
  isAvailable?: boolean;
}

interface DeliverySlotSelectorProps {
  selectedSlotId?: string;
  onSelectSlot: (slot: ClientDeliverySlot) => void;
  slotsOverride?: ClientDeliverySlot[];
}

export const DeliverySlotSelector: React.FC<DeliverySlotSelectorProps> = ({
  selectedSlotId,
  onSelectSlot,
  slotsOverride,
}) => {
  const [slots, setSlots] = useState<ClientDeliverySlot[]>(slotsOverride || []);
  const [loading, setLoading] = useState(!slotsOverride);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (slotsOverride && slotsOverride.length > 0) {
      setSlots(slotsOverride);
      setSelectedDate(slotsOverride[0].slot_date);
      setLoading(false);
      return;
    }

    async function loadSlots() {
      try {
        setLoading(true);
        const res = await fetch('/api/delivery-slots');
        if (res.ok) {
          const data = await res.json();
          if (data.slots && data.slots.length > 0) {
            setSlots(data.slots);
            setSelectedDate(data.slots[0].slot_date);
            // Select first available slot automatically if none selected
            if (!selectedSlotId) {
              const firstAvail = data.slots.find((s: ClientDeliverySlot) => s.isAvailable);
              if (firstAvail) onSelectSlot(firstAvail);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load live delivery slots:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSlots();
  }, [slotsOverride]);

  // Unique sorted dates
  const uniqueDates = Array.from(new Set(slots.map((s) => s.slot_date))).sort();

  const formatSlotDateLabel = (dateStr: string) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStr = formatter.format(nowIST);
    
    const tomorrowIST = new Date(nowIST);
    tomorrowIST.setDate(tomorrowIST.getDate() + 1);
    const tomorrowStr = formatter.format(tomorrowIST);

    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';

    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const filteredSlots = slots.filter((s) => s.slot_date === (selectedDate || uniqueDates[0]));

  const formatTimeLabel = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m < 10 ? '0' + m : m} ${period}`;
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-[#E8DFD2] rounded-lg" />
          <div className="h-10 w-24 bg-[#E8DFD2] rounded-lg" />
          <div className="h-10 w-24 bg-[#E8DFD2] rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-20 bg-[#F3EBE0] rounded-xl" />
          <div className="h-20 bg-[#F3EBE0] rounded-xl" />
          <div className="h-20 bg-[#F3EBE0] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Date Strip */}
      <div className="flex flex-nowrap gap-2 border-b border-[#E8DFD2] pb-3 overflow-x-auto touch-pan-x scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {uniqueDates.map((dateStr) => {
          const isSelected = (selectedDate || uniqueDates[0]) === dateStr;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              className={`shrink-0 min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#8A1538] text-white shadow-xs'
                  : 'bg-white text-[#1F1B16] border border-[#E8DFD2] hover:bg-[#F3EBE0]'
              }`}
            >
              {formatSlotDateLabel(dateStr)}
            </button>
          );
        })}
      </div>

      {/* 2. Time Chips (Full/past-cutoff disabled but visible) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {filteredSlots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          const isFull = slot.isFull || slot.booked_count >= slot.capacity;
          const isPastCutoff = slot.isPastCutoff || false;
          const isDisabled = isFull || isPastCutoff;

          const remainingSlots = Math.max(0, slot.capacity - slot.booked_count);

          return (
            <button
              key={slot.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectSlot(slot)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between relative ${
                isDisabled
                  ? 'opacity-55 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-500'
                  : isSelected
                  ? 'border-[#8A1538] bg-[#F7E9EE] shadow-xs ring-1 ring-[#8A1538]'
                  : 'border-[#E8DFD2] bg-white hover:border-[#8A1538]/60 hover:bg-[#FBF7F1]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 text-[11px] mb-1 font-semibold">
                  <span className={isSelected ? 'text-[#8A1538]' : 'text-[#6B6258]'}>
                    Delivery Window
                  </span>

                  {isFull ? (
                    <span className="text-[#B3261E] bg-red-100/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      Slot Full
                    </span>
                  ) : isPastCutoff ? (
                    <span className="text-stone-500 bg-stone-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      Booking Closed
                    </span>
                  ) : isSelected ? (
                    <span className="text-[#2E7D4F] flex items-center gap-0.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Selected
                    </span>
                  ) : null}
                </div>

                <div className="font-bold text-sm text-[#1F1B16] flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-[#8A1538]' : 'text-[#6B6258]'}`} />
                  <span>
                    {formatTimeLabel(slot.start_time)} – {formatTimeLabel(slot.end_time)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-[#6B6258] mt-2 pt-2 border-t border-black/5 flex items-center justify-between">
                <span>
                  {isDisabled ? (
                    isFull ? '0 capacity left' : 'Cutoff passed'
                  ) : (
                    <span className="text-[#2E7D4F] font-semibold">{remainingSlots} slots open</span>
                  )}
                </span>
                <span className="text-[10px]">Cap: {slot.capacity}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
