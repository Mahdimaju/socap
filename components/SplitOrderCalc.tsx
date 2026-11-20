'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { formatRp, optimizeSplitOrder } from '@/lib/cartHacking';

export function SplitOrderCalc() {
  const [totalFood, setTotalFood] = useState('150000');
  const [feePerOrder, setFeePerOrder] = useState('16000');
  const [minSpend, setMinSpend] = useState('50000');
  const [discountPercent, setDiscountPercent] = useState('50');
  const [maxDiscount, setMaxDiscount] = useState('25000');

  const computed = useMemo(() => {
    const t = Number(totalFood);
    const f = Number(feePerOrder);
    const m = Number(minSpend);
    const p = Number(discountPercent);
    const d = Number(maxDiscount);

    if (!t || t < 10000 || Number.isNaN(f) || f < 0 || Number.isNaN(p) || p <= 0 || p > 100) {
      return {
        error:
          'Pastikan total makanan minimal Rp 10.000, ongkir tidak negatif, dan diskon antara 1% sampai 100%.',
        result: null,
      };
    }

    return {
      error: null,
      result: optimizeSplitOrder(t, f, Math.max(0, m || 0), p, Math.max(0, d || 0)),
    };
  }, [discountPercent, feePerOrder, maxDiscount, minSpend, totalFood]);

  return (
    <section aria-labelledby="heading-pesta" className="flex flex-col gap-4">
      <div>
        <h1 id="heading-pesta" className="text-xl font-extrabold tracking-tight text-slate-900">
          Mode Pesta (Pecah Transaksi)
        </h1>
        <p className="mt-1 text-[13.5px] leading-snug text-slate-600">
          Cek apakah pesanan bareng lebih murah 1x bayar atau dipecah jadi beberapa order.
        </p>
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        noValidate
        className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="splitTotalFood" className="text-[13.5px] font-semibold text-slate-700">
            Total Harga Makanan (Rp)
          </label>
          <input
            id="splitTotalFood"
            type="number"
            min={10000}
            step={5000}
            value={totalFood}
            onChange={(e) => setTotalFood(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="splitFee" className="text-[13px] font-semibold text-slate-700">
              Ongkir + Layanan / Order
            </label>
            <input
              id="splitFee"
              type="number"
              min={0}
              step={1000}
              value={feePerOrder}
              onChange={(e) => setFeePerOrder(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="splitMinSpend" className="text-[13px] font-semibold text-slate-700">
              Min. Belanja Voucher
            </label>
            <input
              id="splitMinSpend"
              type="number"
              min={0}
              step={5000}
              value={minSpend}
              onChange={(e) => setMinSpend(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="splitPercent" className="text-[13px] font-semibold text-slate-700">
              Diskon (%)
            </label>
            <input
              id="splitPercent"
              type="number"
              min={1}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="splitMaxDisc" className="text-[13px] font-semibold text-slate-700">
              Maks. Diskon (Rp)
            </label>
            <input
              id="splitMaxDisc"
              type="number"
              min={0}
              step={1000}
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            />
          </div>
        </div>

        {computed.error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{computed.error}</span>
          </div>
        )}
      </form>

      {computed.result && (
        <div aria-live="polite" className="flex flex-col gap-4">
          <div className="bg-emerald-50 border-[1.5px] border-emerald-600 rounded-2xl p-4 flex flex-col gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
              {computed.result.winner.k === 1
                ? 'Rekomendasi: Pesan Sekaligus (1 Transaksi)'
                : `Rekomendasi: Pecah ${computed.result.winner.k} Transaksi`}
            </span>
            <div className="text-[28px] font-black tracking-tight tabular-nums text-slate-900">
              {formatRp(computed.result.winner.totalPay)}
            </div>
            <p className="text-[13.5px] font-semibold text-emerald-950">
              {computed.result.savingsVsSingle > 0
                ? `Hemat ${formatRp(computed.result.savingsVsSingle)} dibanding pesan sekaligus.`
                : 'Pesan sekaligus sudah menjadi opsi paling hemat untuk syarat voucher ini.'}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Perbandingan Skenario
            </h2>
            <div className="flex flex-col gap-2">
              {computed.result.scenarios.map((scenario) => {
                const isWinner = scenario.k === computed.result!.winner.k;
                return (
                  <div
                    key={scenario.k}
                    className={`px-3.5 py-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isWinner
                        ? 'bg-emerald-50 border-emerald-600'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {scenario.k} Transaksi{isWinner ? ' (Terhemat)' : ''}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {scenario.eligible
                          ? `${scenario.k}x diskon (-${formatRp(scenario.totalDiscount)})`
                          : `Kurang dari min. belanja (${formatRp(scenario.perOrderFood)}/order)`}
                      </div>
                    </div>
                    <div
                      className={`text-[15px] font-extrabold tabular-nums ${
                        isWinner ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {formatRp(scenario.totalPay)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
