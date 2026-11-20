'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Crown, LogOut, RefreshCw } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { formatRp } from '@/lib/cartHacking';
import { useApp } from './AppContext';

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  settlement: { label: 'Lunas', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  capture: { label: 'Lunas', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Menunggu', style: 'bg-amber-50 text-amber-800 border-amber-200' },
  expire: { label: 'Kedaluwarsa', style: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancel: { label: 'Dibatalkan', style: 'bg-rose-50 text-rose-700 border-rose-200' },
  deny: { label: 'Ditolak', style: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function formatDateID(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AccountView() {
  const {
    user,
    profile,
    subscriptions,
    authLoaded,
    isPro,
    quotaRemaining,
    refreshSession,
    startProCheckout,
    checkoutLoading,
    showToast,
  } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [verifyingOrder, setVerifyingOrder] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError(null);
    setAuthInfo(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          setAuthError(error.message);
          return;
        }
        if (!data.session) {
          setAuthInfo(
            'Akun dibuat! Cek kotak masuk email kamu untuk konfirmasi, atau matikan "Confirm email" di Supabase Auth untuk langsung masuk saat demo.'
          );
          return;
        }
        await refreshSession();
        showToast('Akun berhasil dibuat dan langsung masuk!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setAuthError('Email atau password tidak sesuai.');
          return;
        }
        await refreshSession();
        showToast('Berhasil masuk ke akun LaperHemat.');
      }
    } catch {
      setAuthError('Gagal menghubungi layanan autentikasi Supabase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    await refreshSession();
    showToast('Kamu sudah keluar dari akun.');
  };

  const handleCheckoutClick = async () => {
    setCheckoutError(null);
    const res = await startProCheckout();
    if (res.error) setCheckoutError(res.error);
  };

  const handleVerifyOrder = async (orderId: string) => {
    setVerifyingOrder(orderId);
    try {
      const res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Gagal memeriksa status transaksi.');
        return;
      }
      await refreshSession();
      showToast(
        data.paid
          ? 'Pembayaran terkonfirmasi! Paket Pro 30 hari aktif.'
          : `Status transaksi saat ini: ${data.status}`
      );
    } catch {
      showToast('Gagal menghubungi server verifikasi.');
    } finally {
      setVerifyingOrder(null);
    }
  };

  if (!authLoaded) {
    return (
      <section aria-labelledby="heading-account" className="flex flex-col gap-4">
        <h1 id="heading-account" className="text-xl font-extrabold tracking-tight text-slate-900">
          Akun &amp; Langganan
        </h1>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 animate-pulse">
          <div className="h-4 w-2/5 rounded bg-slate-200" />
          <div className="h-10 w-full rounded-xl bg-slate-200" />
          <div className="h-10 w-full rounded-xl bg-slate-200" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section aria-labelledby="heading-account" className="flex flex-col gap-4">
        <div>
          <h1 id="heading-account" className="text-xl font-extrabold tracking-tight text-slate-900">
            Akun &amp; Langganan Pro
          </h1>
          <p className="mt-1 text-[13.5px] leading-snug text-slate-600">
            Simpan poin kontributor (+10 tiap setor promo), sinkronkan kuota, dan aktifkan Pro via
            Midtrans.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 flex flex-col gap-4">
          <div
            role="tablist"
            aria-label="Mode autentikasi"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100"
          >
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'login'}
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
                setAuthInfo(null);
              }}
              className={`min-h-[40px] rounded-lg text-sm font-bold transition-colors ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'register'}
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
                setAuthInfo(null);
              }}
              className={`min-h-[40px] rounded-lg text-sm font-bold transition-colors ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Baru
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="authEmail" className="text-[13.5px] font-semibold text-slate-700">
                Email
              </label>
              <input
                id="authEmail"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="authPassword" className="text-[13.5px] font-semibold text-slate-700">
                Password
              </label>
              <input
                id="authPassword"
                type="password"
                required
                minLength={6}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
              />
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{authError}</span>
              </div>
            )}

            {authInfo && (
              <div
                role="status"
                className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{authInfo}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-orange-700 hover:bg-orange-800 active:scale-[0.985] text-white text-[15px] font-bold transition-all"
            >
              {submitting
                ? 'Memproses...'
                : authMode === 'register'
                  ? 'Buat Akun Gratis'
                  : 'Masuk ke LaperHemat'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="heading-account" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 id="heading-account" className="text-xl font-extrabold tracking-tight text-slate-900">
            Akun &amp; Langganan
          </h1>
          <p className="mt-0.5 text-xs font-medium text-slate-600 truncate">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Status Paket & Poin */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-xs font-semibold text-slate-600">Status Paket</div>
          <div className="mt-1 text-base font-extrabold text-slate-900">
            {isPro ? 'Pro Aktif' : `Gratis (${quotaRemaining}/2)`}
          </div>
          {isPro && profile?.proExpiresAt && (
            <div className="mt-0.5 text-[11px] font-medium text-emerald-700">
              s/d {formatDateID(profile.proExpiresAt)}
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-xs font-semibold text-slate-600">Poin Kontributor</div>
          <div className="mt-1 text-base font-extrabold tabular-nums text-slate-900">
            {profile?.points ?? 0} Poin
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">
            +10 tiap setor promo
          </div>
        </div>
      </div>

      {/* Paket Pro Midtrans */}
      <div className="bg-emerald-50 border-[1.5px] border-emerald-600 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
            <Crown className="w-4 h-4" aria-hidden="true" />
            <span>LaperHemat Pro</span>
          </div>
          <span className="text-lg font-black tabular-nums text-slate-900">
            Rp 19.000<span className="text-xs font-semibold text-slate-600">/30 hari</span>
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-emerald-950">
          Pencarian kalkulator Craving &amp; Cart-Hacking tanpa batas harian tanpa perlu setor
          screenshot. Pembayaran via Midtrans Snap (QRIS, GoPay, Virtual Account).
        </p>

        {checkoutError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{checkoutError}</span>
          </div>
        )}

        <button
          type="button"
          disabled={checkoutLoading}
          onClick={handleCheckoutClick}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.985] text-white text-sm font-bold transition-all"
        >
          {checkoutLoading
            ? 'Menyiapkan Midtrans Snap...'
            : isPro
              ? 'Perpanjang Pro (+30 Hari · Rp19.000)'
              : 'Bayar Rp19.000 via Midtrans'}
        </button>
      </div>

      {/* Riwayat Transaksi */}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Riwayat Transaksi
        </h2>

        {subscriptions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-[13px] text-slate-600">
            Belum ada transaksi langganan. Riwayat pembayaran Midtrans akan tampil di sini.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {subscriptions.map((sub) => {
              const badge = STATUS_LABELS[sub.status] ?? {
                label: sub.status,
                style: 'bg-slate-100 text-slate-700 border-slate-200',
              };
              return (
                <div
                  key={sub.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {sub.order_id}
                    </span>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-bold ${badge.style}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{formatDateID(sub.created_at)}</span>
                    <span className="font-extrabold tabular-nums text-slate-900">
                      {formatRp(sub.amount)}
                    </span>
                  </div>
                  {sub.status === 'pending' && (
                    <button
                      type="button"
                      disabled={verifyingOrder === sub.order_id}
                      onClick={() => void handleVerifyOrder(sub.order_id)}
                      className="min-h-[38px] px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {verifyingOrder === sub.order_id
                          ? 'Memeriksa...'
                          : 'Cek Status Pembayaran'}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
