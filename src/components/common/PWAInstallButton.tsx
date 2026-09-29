import React, { useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'footer';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed as standalone PWA, hide prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If neither Chromium installable nor iOS, keep subtle test trigger in dev mode
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#8A1538]/10 text-[#8A1538] hover:bg-[#8A1538] hover:text-white transition-colors duration-150 border border-[#8A1538]/20 ${className}`}
          title="Install Saraswati Sweets App on your phone"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'banner' && (
        <div className="bg-[#8A1538] text-white px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#F6E08B]" />
            <span>Install Saraswati Sweets app for 1-tap ordering & faster delivery</span>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1 bg-white text-[#8A1538] font-bold rounded-md hover:bg-[#F3EBE0] transition-colors"
          >
            Install
          </button>
        </div>
      )}

      {variant === 'footer' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#1F1B16] border border-[#E8DFD2] text-xs font-semibold hover:border-[#8A1538]"
        >
          <Download className="w-4 h-4 text-[#8A1538]" />
          <span>Install Mobile App (PWA)</span>
        </button>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-[#E8DFD2] relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 text-[#6B6258] hover:text-[#1F1B16] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-[#F7E9EE] text-[#8A1538] flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="font-display text-lg font-bold text-[#1F1B16]">
              Install on iPhone or iPad
            </h3>

            <p className="mt-2 text-sm text-[#6B6258] leading-relaxed">
              To install Saraswati Sweets on your home screen for quick offline access:
            </p>

            <ol className="mt-4 space-y-3 text-sm text-[#1F1B16]">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#8A1538] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Tap the <strong className="inline-flex items-center gap-1 font-semibold text-[#8A1538]"><Share2 className="w-3.5 h-3.5" /> Share</strong> icon in your Safari bottom bar.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#8A1538] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Scroll down and select <strong>"Add to Home Screen"</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#8A1538] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Tap <strong>Add</strong> at the top right to complete.</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-[#8A1538] text-white text-sm font-semibold hover:bg-[#701029] transition-colors"
            >
              Got it, thank you!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
