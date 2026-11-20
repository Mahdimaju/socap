'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Search, UtensilsCrossed, X, Zap } from 'lucide-react';
import { formatRp } from '@/lib/cartHacking';
import type { OptimizationResult, OptimizeResponse } from '@/lib/types';
import { useApp } from './AppContext';
import { ResultCard } from './ResultCard';

const CRAVING_CHIPS = [
  { label: 'Semua', value: '' },
  { label: 'Ayam Geprek', value: 'Ayam Geprek' },
  { label: 'Burger', value: 'Burger' },
  { label: 'Mie', value: 'Mie' },
  { label: 'Martabak', value: 'Martabak' },
  { label: 'Kopi', value: 'Kopi' },
];

const WALLET_OPTIONS = [
  { label: 'GoPay', value: 'GoPay' },
  { label: 'ShopeePay', value: 'ShopeePay' },
  { label: 'OVO', value: 'OVO' },
  { label: 'Tunai / QRIS', value: 'QRIS' },
];

export function CravingCalculator() {
  const { consumeGuestQuota, syncServerQuota, openPaywall } = useApp();

  const [craving, setCraving] = useState('');
  const [maxBudget, setMaxBudget] = useState(45000);
  const [maxCalories, setMaxCalories] = useState(900);
  const [freeCalorieMode, setFreeCalorieMode] = useState(false);
  const [wallets, setWallets] = useState<string[]>(['GoPay', 'ShopeePay', 'QRIS']);

  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [nearest, setNearest] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [walletError, setWalletError] = useState(false);

  const fetchCombinations = useCallback(
    async (params: {
      craving: string;
      maxBudget: number;
      maxCalories: number | null;
      wallets: string[];
      consumeQuota?: boolean;
    }) => {
      if (params.wallets.length === 0) {
        setWalletError(true);
        return;
      }
      setWalletError(false);
      setLoading(true);
      setErrorMsg(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch('/api/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: controller.signal,
        });
        const data = await res.json();

        if (res.status === 429 && data.code === 'QUOTA_EXCEEDED') {
          syncServerQuota(0);
          openPaywall();
          return;
        }

        if (!res.ok) {
          setErrorMsg(data.error ?? 'Gagal memuat kombinasi promo dari server.');
          setResults([]);
          setNearest(null);
          return;
        }
        const payload = data as OptimizeResponse & { quotaRemaining?: number };
        setResults(payload.results ?? []);
        setNearest(payload.nearest ?? null);
        if (typeof payload.quotaRemaining === 'number') {
          syncServerQuota(payload.quotaRemaining);
        }
      } catch (err) {
        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        setErrorMsg(
          isTimeout
            ? 'Permintaan ke database melebihi batas waktu (10 detik). Klik Coba Muat Ulang.'
            : 'Koneksi ke server gagal. Periksa jaringan atau coba lagi.'
        );
        setResults([]);
        setNearest(null);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [openPaywall, syncServerQuota]
  );

  // Initial load without deducting daily quota
  useEffect(() => {
    void fetchCombinations({
      craving: '',
      maxBudget: 45000,
      maxCalories: 900,
      wallets: ['GoPay', 'ShopeePay', 'QRIS'],
      consumeQuota: false,
    });
  }, [fetchCombinations]);

  const handleToggleWallet = (walletValue: string) => {
    setWallets((prev) =>
      prev.includes(walletValue)
        ? prev.filter((w) => w !== walletValue)
        : [...prev, walletValue]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wallets.length === 0) {
      setWalletError(true);
      return;
    }
    if (!consumeGuestQuota()) return;

    void fetchCombinations({
      craving,
      maxBudget,
      maxCalories: freeCalorieMode ? null : maxCalories,
      wallets,
      consumeQuota: true,
    });
  };

  const handleChipClick = (value: string) => {
    setCraving(value);
    void fetchCombinations({
      craving: value,
      maxBudget,
      maxCalories: freeCalorieMode ? null : maxCalories,
      wallets,
      consumeQuota: false,
    });
  };

  const handleRaiseBudget = (targetBudget: number) => {
    const clamped = Math.min(150000, targetBudget);
    setMaxBudget(clamped);
    void fetchCombinations({
      craving,
      maxBudget: clamped,
      maxCalories: freeCalorieMode ? null : maxCalories,
      wallets,
      consumeQuota: false,
    });
  };

  const handleResetFilters = () => {
    const defaultWallets = ['GoPay', 'ShopeePay', 'QRIS'];
    setCraving('');
    setMaxBudget(45000);
    setMaxCalories(900);
    setFreeCalorieMode(false);
    setWallets(defaultWallets);
    void fetchCombinations({
      craving: '',
      maxBudget: 45000,
      maxCalories: 900,
      wallets: defaultWallets,
      consumeQuota: false,
    });
  };

  const activeCalorieLimit = freeCalorieMode ? null : maxCalories;

  return (
    <section aria-labelledby="heading-cari" className="flex flex-col gap-4">
      <div>
        <h1 id="heading-cari" className="text-xl font-extrabold tracking-tight text-slate-900">
          Lagi pengen makan apa?
        </h1>
        <p className="mt-1 text-[13.5px] leading-snug text-slate-600">
          Bandingkan harga akhir bersih termasuk ongkir dan celah add-on voucher.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 flex flex-col gap-4"
      >
        {/* Search Input + Quick Chips */}
        <div className="flex flex-col gap-2">
          <label htmlFor="cravingInput" className="text-[13.5px] font-semibold text-slate-700">
            Cari menu atau kategori
          </label>
          <div className="relative flex items-center">
            <Search
              className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="cravingInput"
              type="text"
              value={craving}
              onChange={(e) => setCraving(e.target.value)}
              placeholder="Contoh: Ayam Geprek, Burger, Mie..."
              autoComplete="off"
              className="w-full min-h-[44px] pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 hover:border-slate-400 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            />
            {craving.length > 0 && (
              <button
                type="button"
                onClick={() => setCraving('')}
                aria-label="Hapus kata kunci"
                className="absolute right-1 w-9 h-9 rounded-lg inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Pilihan kategori cepat"
            className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {CRAVING_CHIPS.map((chip) => {
              const pressed = craving.trim().toLowerCase() === chip.value.toLowerCase();
              return (
                <button
                  key={chip.label}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => handleChipClick(chip.value)}
                  className={`shrink-0 min-h-[44px] px-3.5 rounded-full border text-[13px] transition-all active:scale-[0.97] ${
                    pressed
                      ? 'bg-orange-50 border-orange-600 text-orange-700 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 font-semibold hover:border-orange-600 hover:text-orange-700'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="budgetSlider" className="text-[13.5px] font-semibold text-slate-700">
              Budget Maksimal
            </label>
            <span className="text-[15px] font-extrabold tabular-nums text-slate-900">
              {formatRp(maxBudget)}
            </span>
          </div>
          <input
            id="budgetSlider"
            type="range"
            min={15000}
            max={150000}
            step={5000}
            value={maxBudget}
            onChange={(e) => setMaxBudget(Number(e.target.value))}
            className="lh-slider"
          />
          <div className="flex justify-between text-[11px] font-medium tabular-nums text-slate-500">
            <span>Rp 15.000</span>
            <span>Rp 150.000</span>
          </div>
        </div>

        {/* Calorie Slider + Mode Bebas */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="calorieSlider" className="text-[13.5px] font-semibold text-slate-700">
              Sisa Kalori:{' '}
              <strong className="font-extrabold tabular-nums text-slate-900">
                {freeCalorieMode ? 'Bebas' : `${maxCalories.toLocaleString('id-ID')} kkal`}
              </strong>
            </label>
            <div className="inline-flex items-center gap-2">
              <span id="freeModeLabel" className="text-xs font-semibold text-slate-600">
                Mode Bebas
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={freeCalorieMode}
                aria-labelledby="freeModeLabel"
                onClick={() => setFreeCalorieMode((prev) => !prev)}
                className={`relative w-11 h-[26px] rounded-full border transition-colors ${
                  freeCalorieMode
                    ? 'bg-orange-600 border-orange-600'
                    : 'bg-slate-100 border-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    freeCalorieMode ? 'translate-x-[20px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>
          </div>
          <input
            id="calorieSlider"
            type="range"
            min={300}
            max={2000}
            step={50}
            value={maxCalories}
            disabled={freeCalorieMode}
            onChange={(e) => setMaxCalories(Number(e.target.value))}
            className="lh-slider"
          />
          <div className="flex justify-between text-[11px] font-medium tabular-nums text-slate-500">
            <span>300 kkal</span>
            <span>2.000 kkal</span>
          </div>
        </div>

        {/* Wallets Multi-select */}
        <div className="flex flex-col gap-2">
          <span id="walletGroupLabel" className="text-[13.5px] font-semibold text-slate-700">
            Dompet Digital Aktif
          </span>
          <div
            role="group"
            aria-labelledby="walletGroupLabel"
            className="grid grid-cols-2 gap-2"
          >
            {WALLET_OPTIONS.map((wallet) => {
              const checked = wallets.includes(wallet.value);
              return (
                <label
                  key={wallet.value}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center gap-2 text-[13px] select-none transition-colors ${
                    checked
                      ? 'bg-orange-50 border-orange-600 text-orange-700 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 font-semibold hover:border-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleWallet(wallet.value)}
                    className="w-4 h-4 accent-orange-600 shrink-0"
                  />
                  <span>{wallet.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {walletError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Pilih minimal 1 metode pembayaran agar promo yang cocok bisa dihitung.</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-orange-700 hover:bg-orange-800 active:scale-[0.985] text-white text-[15px] font-bold inline-flex items-center justify-center gap-2 transition-all"
        >
          <Zap className="w-[18px] h-[18px] shrink-0" strokeWidth={2.2} aria-hidden="true" />
          <span>Cari Kombinasi Termurah</span>
        </button>
      </form>

      {/* Results Area */}
      <section aria-labelledby="resultsHeading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="resultsHeading"
            className="text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Hasil Terhemat
          </h2>
          <span className="text-xs font-semibold tabular-nums text-slate-500">
            {loading
              ? 'Menghitung...'
              : errorMsg
                ? 'Terjadi kendala'
                : `${results.length} ditemukan`}
          </span>
        </div>

        <div aria-live="polite" className="flex flex-col gap-3.5">
          {loading ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="text-[13px] font-semibold text-orange-700 text-center">
                Menghitung ongkir &amp; celah voucher...
              </p>
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2.5 animate-pulse"
                >
                  <div className="h-3.5 w-3/5 rounded bg-slate-200" />
                  <div className="h-3.5 w-4/5 rounded bg-slate-200" />
                  <div className="h-7 w-2/5 rounded bg-slate-200" />
                  <div className="h-11 w-full rounded-xl bg-slate-200" />
                </div>
              ))}
            </div>
          ) : errorMsg ? (
            <div
              role="alert"
              className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col gap-3 text-rose-800"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-700" aria-hidden="true" />
                <div className="text-[13.5px] leading-relaxed font-medium">{errorMsg}</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  void fetchCombinations({
                    craving,
                    maxBudget,
                    maxCalories: activeCalorieLimit,
                    wallets,
                    consumeQuota: false,
                  })
                }
                className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-800 text-sm font-bold"
              >
                Coba Muat Ulang
              </button>
            </div>
          ) : results.length > 0 ? (
            results.map((item, idx) => (
              <ResultCard
                key={`${item.restaurant.id}-${item.mainDish.id}`}
                item={item}
                isBest={idx === 0}
                maxCalories={activeCalorieLimit}
              />
            ))
          ) : nearest ? (
            <>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center flex flex-col items-center gap-2.5">
                <span
                  className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <UtensilsCrossed className="w-6 h-6" />
                </span>
                <p className="text-[15px] font-bold text-slate-900">
                  Belum ada kombinasi di bawah {formatRp(maxBudget)}
                </p>
                <p className="text-[13.5px] leading-relaxed text-slate-600">
                  Ini opsi paling mendekati (+{formatRp(nearest.finalPrice - maxBudget)} dari budget
                  kamu):
                </p>
                <button
                  type="button"
                  onClick={() => handleRaiseBudget(Math.ceil(nearest.finalPrice / 5000) * 5000)}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold"
                >
                  Naikkan Budget ke {formatRp(Math.ceil(nearest.finalPrice / 5000) * 5000)}
                </button>
              </div>
              <ResultCard item={nearest} isBest={true} maxCalories={activeCalorieLimit} />
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center flex flex-col items-center gap-2.5">
              <span
                className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center"
                aria-hidden="true"
              >
                <Search className="w-6 h-6" />
              </span>
              <p className="text-[15px] font-bold text-slate-900">
                Menu tidak cocok dengan filter saat ini
              </p>
              <p className="text-[13.5px] leading-relaxed text-slate-600">
                Coba hapus kata kunci atau aktifkan Mode Bebas Kalori untuk melihat semua kombinasi
                tersedia.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold"
              >
                Reset Filter Pencarian
              </button>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
