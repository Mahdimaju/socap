'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Camera } from 'lucide-react';
import type { Platform } from '@/lib/types';
import { useApp } from './AppContext';

export function PromoUploader() {
  const router = useRouter();
  const { unlockPro24h, showToast } = useApp();

  const [scanning, setScanning] = useState(false);
  const [scanFileName, setScanFileName] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formHeading, setFormHeading] = useState('Input Manual Promo');
  const [submitting, setSubmitting] = useState(false);

  const [platform, setPlatform] = useState<Platform>('ShopeeFood');
  const [promoCode, setPromoCode] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setOcrError('Ukuran gambar maksimal 4MB. Silakan pilih file lebih kecil atau isi manual.');
      setShowForm(true);
      return;
    }

    setOcrError(null);
    setShowForm(false);
    setScanning(true);
    setScanFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/ocr-promo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.extracted) {
        setOcrError(
          data.error ??
            'Gambar terlalu buram atau tidak terbaca. Silakan lengkapi detail promo secara manual.'
        );
        setFormHeading('Input Manual Promo');
        setShowForm(true);
        return;
      }

      const ext = data.extracted;
      setPlatform(ext.platform ?? 'ShopeeFood');
      setPromoCode(ext.promo_code ?? 'AUTO');
      setMinSpend(String(ext.min_spend ?? ''));
      setDiscountPercent(String(ext.discount_percent ?? ''));
      setMaxDiscount(String(ext.max_discount ?? ''));
      setPaymentMethod(ext.payment_method ?? 'ALL');
      setFormHeading('Hasil Baca AI (Cek & Konfirmasi)');
      setShowForm(true);
    } catch {
      setOcrError('Gagal memproses gambar. Silakan isi detail promo secara manual di bawah ini.');
      setFormHeading('Input Manual Promo');
      setShowForm(true);
    } finally {
      setScanning(false);
    }
  };

  const handleManualOpen = () => {
    setOcrError(null);
    setFormHeading('Input Manual Promo');
    setShowForm(true);
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setOcrError(null);

    try {
      const res = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          promo_code: promoCode.trim().toUpperCase() || 'AUTO',
          min_spend: Number(minSpend),
          discount_percent: Number(discountPercent),
          max_discount: Number(maxDiscount),
          payment_method: paymentMethod,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOcrError(data.error ?? 'Gagal menyimpan promo ke database.');
        return;
      }

      unlockPro24h();
      const bonusNote = data.rewardedPoints ? ` (+${data.rewardedPoints} Poin)` : '';
      showToast(`Promo ${data.promo.promo_code} tersimpan${bonusNote}! Akses Pro 24 jam aktif.`);
      router.push('/');
    } catch {
      setOcrError('Gagal menghubungi server saat menyimpan promo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="heading-setor" className="flex flex-col gap-4">
      <div>
        <h1 id="heading-setor" className="text-xl font-extrabold tracking-tight text-slate-900">
          Setor Promo, Buka Akses 24 Jam
        </h1>
        <p className="mt-1 text-[13.5px] leading-snug text-slate-600">
          Unggah screenshot voucher aktif untuk membuka pencarian tanpa batas selama 24 jam.
        </p>
      </div>

      <label
        htmlFor="promoFileInput"
        className="border-2 border-dashed border-slate-300 hover:border-orange-600 hover:bg-orange-50/60 rounded-2xl bg-white p-6 text-center flex flex-col items-center gap-2 transition-colors"
      >
        <input
          id="promoFileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="sr-only"
        />
        <span
          className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center"
          aria-hidden="true"
        >
          <Camera className="w-6 h-6" />
        </span>
        <span className="text-[14.5px] font-bold text-slate-900">
          Tap untuk pilih screenshot voucher
        </span>
        <span className="text-xs text-slate-600">
          GoFood, GrabFood, atau ShopeeFood (Maks. 4MB, gambar tidak disimpan)
        </span>
      </label>

      {!showForm && !scanning && (
        <button
          type="button"
          onClick={handleManualOpen}
          className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-[13.5px] font-semibold"
        >
          Atau isi detail voucher secara manual
        </button>
      )}

      {scanning && (
        <div
          role="status"
          aria-live="polite"
          className="relative overflow-hidden rounded-2xl border border-orange-300 bg-white p-5 text-center flex flex-col items-center gap-2"
        >
          <div className="lh-scan-line" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-900">
            AI sedang membaca syarat &amp; ketentuan voucher...
          </p>
          <p className="text-xs text-slate-600">
            {scanFileName ? `Memindai ${scanFileName}...` : 'Mengekstrak detail voucher...'}
          </p>
        </div>
      )}

      {ocrError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{ocrError}</span>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleConfirmSubmit}
          className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 flex flex-col gap-3.5"
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            {formHeading}
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ocrPlatform" className="text-[13.5px] font-semibold text-slate-700">
              Platform
            </label>
            <select
              id="ocrPlatform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            >
              <option value="ShopeeFood">ShopeeFood</option>
              <option value="GoFood">GoFood</option>
              <option value="GrabFood">GrabFood</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ocrCode" className="text-[13.5px] font-semibold text-slate-700">
              Kode Promo
            </label>
            <input
              id="ocrCode"
              type="text"
              required
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Contoh: SHOPEEHEMAT50 atau AUTO"
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ocrMinSpend" className="text-[13.5px] font-semibold text-slate-700">
              Minimal Belanja (Rp)
            </label>
            <input
              id="ocrMinSpend"
              type="number"
              required
              min={0}
              step={1000}
              value={minSpend}
              onChange={(e) => setMinSpend(e.target.value)}
              placeholder="50000"
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ocrPercent" className="text-[13.5px] font-semibold text-slate-700">
                Diskon (%)
              </label>
              <input
                id="ocrPercent"
                type="number"
                required
                min={1}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="50"
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ocrMaxDisc" className="text-[13.5px] font-semibold text-slate-700">
                Maks. Diskon (Rp)
              </label>
              <input
                id="ocrMaxDisc"
                type="number"
                required
                min={1000}
                step={1000}
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                placeholder="25000"
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ocrWallet" className="text-[13.5px] font-semibold text-slate-700">
              Metode Pembayaran
            </label>
            <select
              id="ocrWallet"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            >
              <option value="ALL">Semua Metode</option>
              <option value="GoPay">GoPay</option>
              <option value="ShopeePay">ShopeePay</option>
              <option value="OVO">OVO</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.985] text-white text-sm font-bold transition-all disabled:opacity-60"
          >
            {submitting ? 'Menyimpan ke Database...' : 'Konfirmasi & Klaim 24 Jam Pro'}
          </button>
        </form>
      )}
    </section>
  );
}
