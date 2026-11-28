'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useApp } from './AppContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'laperhemat_pwa_install_dismissed';

export function PwaManager() {
  const { showToast } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Daftarkan Service Worker di browser yang mendukung
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Abaikan jika gagal di lingkungan non-HTTPS / dev
      });
    }

    // Sembunyikan banner jika sudah berjalan dalam mode aplikasi ter-install (standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) return;

    try {
      if (window.localStorage.getItem(DISMISS_KEY) !== '1') {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
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
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore storage error
    }
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Pasang aplikasi LaperHemat"
      className="bg-orange-50 border border-orange-200 rounded-2xl p-3 flex items-center justify-between gap-2.5"
    >
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
          onClick={handleDismiss}
          aria-label="Tutup ajakan install aplikasi"
          className="min-w-[36px] min-h-[38px] rounded-xl inline-flex items-center justify-center text-slate-500 hover:bg-orange-100 hover:text-slate-900"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
