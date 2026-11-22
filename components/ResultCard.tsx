'use client';

import React, { useState } from 'react';
import { ChevronDown, Copy, Zap } from 'lucide-react';
import { formatRp, formatRpShort } from '@/lib/cartHacking';
import type { OptimizationResult } from '@/lib/types';
import { useApp } from './AppContext';

interface ResultCardProps {
  item: OptimizationResult;
  isBest: boolean;
  maxCalories: number | null;
}

const PLATFORM_STYLES = {
  GoFood: 'bg-green-100 text-green-800 border-green-200',
  GrabFood: 'bg-emerald-900 text-white border-emerald-900',
  ShopeeFood: 'bg-orange-100 text-orange-800 border-orange-200',
} as const;

export function ResultCard({ item, isBest, maxCalories }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { showToast } = useApp();

  const extraFees = item.restaurant.base_delivery_fee + item.restaurant.service_fee;
  const rawNoPromo = item.mainDish.price + extraFees;
  const strikePrice = item.isCartHacked
    ? item.normalPriceWithoutHack
    : item.discountAmount > 0
      ? rawNoPromo
      : 0;
  const promoCode = item.appliedPromo?.promo_code ?? 'AUTO';

  const caloriePct =
    maxCalories !== null
      ? Math.min(100, Math.round((item.totalCalories / maxCalories) * 100))
      : 0;
  const isCalorieWarn = caloriePct >= 85;

  const handleCopyAndOpen = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(promoCode);
      }
    } catch {
      // Clipboard fallback ignored
    }

    showToast(`Kode promo ${promoCode} berhasil disalin!`);

    if (
      item.restaurant.deep_link_url &&
      item.restaurant.deep_link_url.startsWith('https://')
    ) {
      window.open(item.restaurant.deep_link_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article
      className={`bg-white rounded-2xl p-4 flex flex-col gap-3 transition-colors ${
        isBest
          ? 'border-[1.5px] border-emerald-600 shadow-[0_4px_14px_-4px_rgba(5,150,105,0.16)]'
          : 'border border-slate-200/90 shadow-sm'
      }`}
    >
      {/* Header: Platform badge + Restaurant name */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold border ${PLATFORM_STYLES[item.restaurant.platform]}`}
          >
            {item.restaurant.platform}
          </span>
          <span className="text-[13px] font-semibold text-slate-600 truncate">
            {item.restaurant.name}
          </span>
        </div>
        {isBest && (
          <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-extrabold">
            Termurah
          </span>
        )}
      </div>

      {/* Main Dish Name */}
      <h3 className="text-base font-bold leading-snug text-slate-900">
        {item.mainDish.name}
      </h3>

      {/* Conditional Cart-Hack Dashed Box */}
      {item.isCartHacked && item.addedAddon && item.appliedPromo && (
        <div className="bg-emerald-50 border-[1.5px] border-dashed border-emerald-400 rounded-xl p-3 flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold tracking-wide text-emerald-700">
            <Zap className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} aria-hidden="true" />
            <span>CART HACK AKTIF</span>
          </div>
          <p className="text-[13px] leading-relaxed text-emerald-950">
            Tambah <strong className="font-extrabold">{item.addedAddon.name}</strong> (
            {formatRpShort(item.addedAddon.price)}) agar voucher{' '}
            {item.appliedPromo.discount_percent}% aktif.{' '}
            <strong className="font-extrabold">
              Hemat ekstra {formatRp(item.extraSavings)}
            </strong>
            .
          </p>
        </div>
      )}

      {/* Number-First Price Block */}
      <div className="flex items-baseline flex-wrap gap-2">
        <span className="text-[26px] font-black tracking-tight leading-none tabular-nums text-slate-900">
          {formatRp(item.finalPrice)}
        </span>
        {strikePrice > item.finalPrice && (
          <span className="text-sm font-medium line-through tabular-nums text-slate-500">
            {formatRp(strikePrice)}
          </span>
        )}
        {item.appliedPromo && (
          <span className="ml-auto px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11.5px] font-bold">
            {item.appliedPromo.payment_method}
          </span>
        )}
      </div>

      {/* Calorie Guardrail Bar */}
      {maxCalories !== null && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Estimasi Kalori</span>
            <span className={`tabular-nums ${isCalorieWarn ? 'text-amber-700' : ''}`}>
              {item.totalCalories} / {maxCalories} kkal
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={item.totalCalories}
            aria-valuemin={0}
            aria-valuemax={maxCalories}
            className="w-full h-2 rounded-full bg-slate-100 overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCalorieWarn ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
              style={{ width: `${caloriePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Expandable Price Breakdown Accordion */}
      <div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="w-full min-h-[40px] py-1.5 border-t border-slate-200 flex items-center justify-between text-[13px] font-semibold text-slate-600 hover:text-slate-900"
        >
          <span>Lihat rincian harga &amp; ongkir</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-150 ${
              expanded ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expanded && (
          <table className="w-full text-[13px] mt-1 border-collapse">
            <tbody>
              <tr>
                <td className="py-1 text-slate-700">Menu Utama</td>
                <td className="py-1 text-right font-semibold tabular-nums text-slate-900">
                  {formatRp(item.mainDish.price)}
                </td>
              </tr>
              {item.addedAddon && (
                <tr>
                  <td className="py-1 text-slate-700">Add-on: {item.addedAddon.name}</td>
                  <td className="py-1 text-right font-semibold tabular-nums text-slate-900">
                    {formatRp(item.addedAddon.price)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="py-1 text-slate-700">Ongkir + Biaya Layanan</td>
                <td className="py-1 text-right font-semibold tabular-nums text-slate-900">
                  {formatRp(extraFees)}
                </td>
              </tr>
              <tr className={item.discountAmount > 0 ? 'text-emerald-700 font-bold' : ''}>
                <td className="py-1">
                  {item.discountAmount > 0 ? `Potongan (${promoCode})` : 'Potongan Voucher'}
                </td>
                <td className="py-1 text-right tabular-nums">
                  {item.discountAmount > 0 ? `-${formatRp(item.discountAmount)}` : 'Rp 0'}
                </td>
              </tr>
              <tr className="border-t border-dashed border-slate-300 font-extrabold text-slate-900">
                <td className="pt-2">Total Bayar Akhir</td>
                <td className="pt-2 text-right tabular-nums">{formatRp(item.finalPrice)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Card Execution CTA */}
      <button
        type="button"
        onClick={handleCopyAndOpen}
        className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.985] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-all"
      >
        <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Salin Promo &amp; Buka {item.restaurant.platform}</span>
      </button>
    </article>
  );
}
