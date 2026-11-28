'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useApp } from './AppContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaManager() {
  const { showToast } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showManualHint, setShowManualHint] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Ignore registration errors in unsupported environments
      });
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua));
    setVisible(true);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
      setShowManualHint(false);
      showToast('LaperHemat berhasil dipasang di layar utama!');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [showToast]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setVisible(false);
      }
      return;
    }

    // Fallback untuk iOS Safari atau browser HP yang belum memicu beforeinstallprompt
    setShowManualHint((prev) => !prev);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Pasang aplikasi LaperHemat"
      className="bg-orange-50 border border-orange-200 rounded-2xl p-3 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/logo-icon.png"
            width={36}
            height={36}
            alt=""
            className="w-9 h-9 rounded-xl object-contain shrink-0 bg-white border border-orange-200/80"
          />
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-900 truncate">
              Pasang LaperHemat di HP
            </p>
            <p className="text-[11px] font-medium text-slate-600 truncate">
              Akses cepat layar penuh seperti aplikasi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="min-h-[38px] px-3 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Tutup ajakan install aplikasi"
            className="min-w-[36px] min-h-[38px] rounded-xl inline-flex items-center justify-center text-slate-500 hover:bg-orange-100 hover:text-slate-900"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showManualHint && (
        <p className="text-[11.5px] leading-relaxed text-slate-700 bg-white border border-orange-200/80 rounded-xl px-3 py-2">
          {isIos
            ? 'Di Safari iPhone: ketuk ikon Bagikan (Share) di bawah layar, lalu pilih "Tambah ke Layar Utama" (Add to Home Screen).'
            : 'Di browser HP: ketuk menu titik tiga (⋮) di pojok kanan atas, lalu pilih "Install app" atau "Tambahkan ke layar utama".'}
        </p>
      )}
    </div>
  );
}
