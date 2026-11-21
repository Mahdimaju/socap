'use client';

import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useApp } from './AppContext';

const SESSION_KEY = 'laperhemat_splash_seen';

export function SplashScreen() {
  const { authLoaded } = useApp();
  const [phase, setPhase] = useState<'visible' | 'exiting' | 'gone'>('visible');
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === '1') {
        setPhase('gone');
        return;
      }
    } catch {
      // Ignore storage errors
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minTimer = setTimeout(() => setMinElapsed(true), reducedMotion ? 150 : 750);
    // Hard cap agar splash tidak pernah menahan user saat jaringan sangat lambat
    const maxTimer = setTimeout(() => setMinElapsed(true), 1800);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'visible') return;
    if (!minElapsed) return;
    if (!authLoaded) {
      // Tunggu auth maksimal 600ms lagi setelah durasi minimal
      const fallback = setTimeout(() => {
        try {
          window.sessionStorage.setItem(SESSION_KEY, '1');
        } catch {
          // Ignore
        }
        setPhase('exiting');
      }, 600);
      return () => clearTimeout(fallback);
    }

    try {
      window.sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Ignore
    }
    setPhase('exiting');
  }, [authLoaded, minElapsed, phase]);

  useEffect(() => {
    if (phase !== 'exiting') return;
    const doneTimer = setTimeout(() => setPhase('gone'), 320);
    return () => clearTimeout(doneTimer);
  }, [phase]);

  if (phase === 'gone') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat aplikasi LaperHemat"
      className={`fixed inset-0 z-[70] flex justify-center bg-slate-200 max-[430px]:bg-white transition-opacity duration-300 ${
        phase === 'exiting' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-[430px] min-h-dvh bg-white flex flex-col items-center justify-center px-8 text-center shadow-2xl max-[430px]:shadow-none">
        <div className="lh-splash-mark flex flex-col items-center gap-3">
          <span
            className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 inline-flex items-center justify-center shadow-sm"
            aria-hidden="true"
          >
            <Flame className="w-9 h-9" strokeWidth={2.2} />
          </span>

          <div>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900">
              LaperHemat
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Menyiapkan promo hemat Banjarmasin...
            </p>
          </div>

          <div
            className="mt-2 w-40 h-1.5 rounded-full bg-slate-100 overflow-hidden"
            aria-hidden="true"
          >
            <div className="lh-splash-bar h-full rounded-full bg-orange-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
