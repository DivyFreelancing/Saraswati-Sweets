import React from 'react';
import { RefreshCw, Volume2, VolumeX, Store, ArrowUpRight } from 'lucide-react';

interface AdminDashboardHeaderProps {
  title?: string;
  streamConnected?: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  isAudioSuspended?: boolean;
  onEnableAudio?: () => void;
  onBackToStore: () => void;
}

export const AdminDashboardHeader: React.FC<AdminDashboardHeaderProps> = ({
  title = 'Dashboard',
  streamConnected = false,
  isRefreshing,
  onRefresh,
  isMuted,
  onToggleSound,
  isAudioSuspended = false,
  onEnableAudio,
  onBackToStore,
}) => {
  // Format today's date in Indian locale (e.g. "Thu, 15 Oct 2026")
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E9E2D8]">
      {/* Left: Title + Live Sync Indicator + Date */}
      <div className="space-y-1">
        <h1 className="text-[26px] font-extrabold text-[#241C17] tracking-tight leading-tight">
          {title}
        </h1>

        <div className="flex items-center gap-2 text-xs text-[#6B5F55] font-medium flex-wrap">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#1E7A4B]">
            <span
              className={`w-2 h-2 rounded-full ${
                streamConnected ? 'bg-[#1E7A4B] animate-pulse' : 'bg-[#1E7A4B]'
              }`}
              aria-hidden="true"
            />
            <span>Live store sync</span>
          </span>

          <span className="text-[#E9E2D8]" aria-hidden="true">
            •
          </span>

          <time dateTime={new Date().toISOString().slice(0, 10)} className="text-[#6B5F55]">
            {todayFormatted}
          </time>
        </div>
      </div>

      {/* Right: Controls (Enable Audio, Sound Toggle, Refresh, View Storefront) */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Audio Context Unlock (when browser blocks autoplay audio chime) */}
        {isAudioSuspended && onEnableAudio && (
          <button
            type="button"
            onClick={onEnableAudio}
            aria-label="Enable order sound notification"
            className="min-h-[44px] px-3.5 py-2 rounded-[10px] bg-[#FDEFD0] hover:bg-[#fae7b8] text-[#8A4B00] border border-[#D9B866] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-[0.98] cursor-pointer"
            title="Click to allow incoming order notification chimes"
          >
            <Volume2 className="w-4 h-4 text-[#8A4B00]" strokeWidth={1.8} aria-hidden="true" />
            <span>Enable Audio</span>
          </button>
        )}

        {/* Sound Toggle Button */}
        <button
          type="button"
          onClick={onToggleSound}
          aria-label={isMuted ? 'Unmute order notifications' : 'Mute order notifications'}
          title={isMuted ? 'Notifications muted. Click to turn sound on.' : 'Sound on. Click to mute.'}
          className={`min-h-[44px] px-3.5 py-2 rounded-[10px] text-xs font-bold flex items-center gap-2 transition-all border shadow-2xs cursor-pointer active:scale-[0.98] ${
            isMuted
              ? 'bg-white text-[#6B5F55] border-[#E9E2D8] hover:bg-[#F3E9DC]'
              : 'bg-white text-[#1E7A4B] border-[#1E7A4B]/40 hover:bg-[#E3F4EA]'
          }`}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-[#6B5F55]" strokeWidth={1.8} aria-hidden="true" />
              <span>Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-[#1E7A4B]" strokeWidth={1.8} aria-hidden="true" />
              <span>Sound On</span>
            </>
          )}
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh store data"
          className="min-h-[44px] px-3.5 py-2 rounded-[10px] bg-white hover:bg-[#F3E9DC] text-[#241C17] border border-[#E9E2D8] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-[0.98] cursor-pointer disabled:opacity-60"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-[#6B5F55] ${isRefreshing ? 'animate-spin' : ''}`}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span>Refresh</span>
        </button>

        {/* View Storefront Primary Button */}
        <button
          type="button"
          onClick={onBackToStore}
          aria-label="View public storefront"
          className="min-h-[44px] px-4 py-2 rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98] cursor-pointer"
        >
          <Store className="w-3.5 h-3.5 text-[#E8C16A]" strokeWidth={1.8} aria-hidden="true" />
          <span>View storefront</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-white/80" strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
