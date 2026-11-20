'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Camera, Flame, User, Users, X } from 'lucide-react';
import { useApp } from './AppContext';

const NAV_ITEMS = [
  { href: '/', label: 'Cari Hemat', icon: Flame },
  { href: '/split-order', label: 'Mode Pesta', icon: Users },
  { href: '/submit-promo', label: 'Setor Promo', icon: Camera },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    quotaRemaining,
    isPro,
    isPaywallOpen,
    openPaywall,
    closePaywall,
    startProCheckout,
    checkoutLoading,
    toastMessage,
  } = useApp();

  const paywallPrimaryRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isPaywallOpen) return;
    paywallPrimaryRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePaywall();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closePaywall, isPaywallOpen]);

  return (
    <div className="min-h-dvh flex justify-center bg-slate-200 max-[430px]:bg-slate-50">
      <div className="w-full max-w-[430px] min-h-dvh bg-slate-50 relative flex flex-col shadow-2xl max-[430px]:shadow-none">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 h-14 px-4 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[17px] font-extrabold tracking-tight text-slate-900"
            >
              <span
                className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 inline-flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Flame className="w-[17px] h-[17px]" strokeWidth={2.2} />
              </span>
              <span>LaperHemat</span>
            </Link>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold whitespace-nowrap max-[360px]:hidden">
              Banjarmasin
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openPaywall}
              aria-label="Status kuota pencarian harian"
              className={`min-h-[36px] px-2.5 py-1 rounded-full border text-xs font-bold tabular-nums whitespace-nowrap transition-colors active:scale-[0.97] ${
                isPro
                  ? 'bg-amber-100 border-amber-500 text-amber-900 hover:bg-amber-200/70'
                  : quotaRemaining <= 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                    : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-100'
              }`}
            >
              {isPro
                ? 'PRO'
                : quotaRemaining <= 0
                  ? '0/2 Habis'
                  : `${quotaRemaining}/2 Gratis`}
            </button>

            <Link
              href="/account"
              aria-label={user ? `Akun ${user.email}` : 'Masuk atau daftar akun'}
              aria-current={pathname === '/account' ? 'page' : undefined}
              className={`min-w-[38px] min-h-[38px] rounded-full border inline-flex items-center justify-center transition-colors ${
                pathname === '/account'
                  ? 'bg-orange-50 border-orange-600 text-orange-700'
                  : user
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <User className="w-[18px] h-[18px]" aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 pt-4 pb-24 flex flex-col gap-4">
          {children}
        </main>

        {/* Fixed Bottom Navigation (glassmorphism element 1 of max 2) */}
        <nav
          aria-label="Navigasi utama"
          className="fixed bottom-0 w-full max-w-[430px] min-h-16 px-3 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] bg-white/90 backdrop-blur-md border-t border-slate-200 z-40 grid grid-cols-3 gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative min-h-[48px] rounded-xl px-1.5 py-1 flex flex-col items-center justify-center gap-0.5 text-[11.5px] transition-colors ${
                  isActive
                    ? 'text-orange-700 font-extrabold'
                    : 'text-slate-600 font-semibold hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <span
                    className="absolute top-0 w-6 h-[3px] rounded-b bg-orange-600"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`w-9 h-[26px] rounded-full inline-flex items-center justify-center transition-colors ${
                    isActive ? 'bg-orange-50 text-orange-600' : ''
                  }`}
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quota Paywall Bottom Sheet Modal (glassmorphism element 2 of max 2) */}
        {isPaywallOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="paywallTitle"
            onClick={(e) => {
              if (e.target === e.currentTarget) closePaywall();
            }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end justify-center"
          >
            <div className="w-full max-w-[430px] bg-white rounded-t-3xl p-5 pb-[calc(24px+env(safe-area-inset-bottom,0px))] flex flex-col gap-3.5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h2 id="paywallTitle" className="text-lg font-extrabold text-slate-900">
                  {isPro ? 'Akses Pro Sedang Aktif' : 'Kuota Gratis Hari Ini Habis!'}
                </h2>
                <button
                  type="button"
                  onClick={closePaywall}
                  aria-label="Tutup jendela kuota"
                  className="min-w-[44px] min-h-[44px] -mt-2 -mr-2 rounded-xl inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                {isPro
                  ? 'Akses pencarian tanpa batas sedang aktif di akun kamu. Lihat masa berlaku atau riwayat pembayaran di halaman Akun.'
                  : 'Pengguna gratis mendapat 2x pencarian kalkulator per hari. Setor 1 screenshot voucher aktif untuk membuka 24 jam gratis, atau langganan Pro 30 hari.'}
              </p>
              <div className="flex flex-col gap-2.5 mt-1">
                <button
                  ref={paywallPrimaryRef}
                  type="button"
                  onClick={() => {
                    closePaywall();
                    router.push('/submit-promo');
                  }}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.985] text-white text-sm font-bold transition-all"
                >
                  Setor 1 Screenshot Promo (Buka 24 Jam Gratis)
                </button>
                <button
                  type="button"
                  disabled={checkoutLoading}
                  onClick={() => void startProCheckout()}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors"
                >
                  {checkoutLoading
                    ? 'Membuka Midtrans...'
                    : user
                      ? 'Langganan Pro · Rp19.000/bulan (Midtrans)'
                      : 'Masuk & Langganan Pro · Rp19.000/bulan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast */}
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 bottom-20 -translate-x-1/2 z-[60] max-w-[calc(min(100vw,430px)-32px)] px-4 py-2.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg transition-all duration-200 pointer-events-none ${
            toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {toastMessage ?? ''}
        </div>
      </div>
    </div>
  );
}
