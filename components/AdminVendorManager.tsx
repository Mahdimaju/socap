'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Calculator, Plus, Store, Trash2 } from 'lucide-react';
import type { Platform } from '@/lib/types';
import { useApp } from './AppContext';

interface MenuDraft {
  id: string;
  name: string;
  price: string;
  calories: string;
  is_addon: boolean;
  aiNote?: string;
}

interface SavedRestaurant {
  id: string;
  name: string;
  platform: Platform;
  category: string;
  city: string;
  menuCount: number;
}

let menuSeq = 3;

function createEmptyMenu(isAddon: boolean, fixedId?: string): MenuDraft {
  const id = fixedId ?? `menu-${menuSeq++}`;
  return {
    id,
    name: '',
    price: '',
    calories: '',
    is_addon: isAddon,
  };
}

export function AdminVendorManager() {
  const { user, authLoaded, showToast } = useApp();

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform>('GoFood');
  const [category, setCategory] = useState('Ayam Geprek');
  const [deliveryFee, setDeliveryFee] = useState('9000');
  const [serviceFee, setServiceFee] = useState('4000');
  const [deepLinkUrl, setDeepLinkUrl] = useState('');

  const [menus, setMenus] = useState<MenuDraft[]>([
    createEmptyMenu(false, 'menu-1'),
    createEmptyMenu(true, 'menu-2'),
  ]);

  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedList, setSavedList] = useState<SavedRestaurant[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadRestaurants = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/restaurants', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setSavedList(data.restaurants ?? []);
    } catch {
      // Ignore transient fetch error
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadRestaurants();
  }, [loadRestaurants]);

  const updateMenu = (id: string, patch: Partial<MenuDraft>) => {
    setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMenu = (id: string) => {
    setMenus((prev) => (prev.length > 1 ? prev.filter((m) => m.id !== id) : prev));
  };

  const handleEstimateCalories = async () => {
    const validMenus = menus.filter((m) => m.name.trim().length > 0);
    if (validMenus.length === 0) {
      setErrorMsg('Isi minimal 1 nama menu terlebih dahulu untuk dihitung kalorinya.');
      return;
    }

    setEstimating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/estimate-calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validMenus.map((m) => ({ name: m.name.trim(), is_addon: m.is_addon })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Gagal mengestimasi kalori dengan Gemini AI.');
        return;
      }

      const estimates = (data.estimates ?? []) as Array<{
        name: string;
        calories: number;
        note?: string;
      }>;

      const byRowId = new Map<string, { calories: number; note?: string }>();
      validMenus.forEach((row, idx) => {
        const cleanRowName = row.name.trim().toLowerCase();
        const exactMatch = estimates.find(
          (e) => e.name.trim().toLowerCase() === cleanRowName
        );
        const partialMatch =
          exactMatch ??
          estimates.find((e) => {
            const cleanEst = e.name.trim().toLowerCase();
            return cleanEst.includes(cleanRowName) || cleanRowName.includes(cleanEst);
          });
        const chosen = partialMatch ?? estimates[idx];
        if (chosen) {
          byRowId.set(row.id, { calories: chosen.calories, note: chosen.note });
        }
      });

      setMenus((prev) =>
        prev.map((row) => {
          const match = byRowId.get(row.id);
          if (!match) return row;
          return {
            ...row,
            calories: String(match.calories),
            aiNote: match.note,
          };
        })
      );
      showToast(`Estimasi kalori terisi untuk ${byRowId.size} menu!`);
    } catch {
      setErrorMsg('Gagal menghubungi server estimasi kalori.');
    } finally {
      setEstimating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          platform,
          category,
          city: 'Banjarmasin',
          base_delivery_fee: Number(deliveryFee),
          service_fee: Number(serviceFee),
          deep_link_url: deepLinkUrl,
          menus: menus.map((m) => ({
            name: m.name,
            price: Number(m.price),
            calories: Number(m.calories),
            is_addon: m.is_addon,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Gagal menyimpan penjual ke Supabase.');
        return;
      }

      showToast(`${data.restaurant.name} (+${data.insertedMenus} menu) berhasil ditambahkan!`);
      setName('');
      setDeepLinkUrl('');
      setMenus([createEmptyMenu(false), createEmptyMenu(true)]);
      void loadRestaurants();
    } catch {
      setErrorMsg('Gagal menghubungi server saat menyimpan penjual.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="heading-admin" className="flex flex-col gap-4">
      <div>
        <h1 id="heading-admin" className="text-xl font-extrabold tracking-tight text-slate-900">
          Tambah Penjual &amp; Menu
        </h1>
        <p className="mt-1 text-[13.5px] leading-snug text-slate-600">
          Tambahkan warung sekitar Universitas Sari Mulia (Jl. Pramuka) dengan estimasi kalori
          otomatis dari Gemini AI.
        </p>
      </div>

      {authLoaded && !user && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[13px] font-semibold flex flex-col gap-2"
        >
          <span>Kamu perlu masuk dengan akun admin untuk membuka panel ini.</span>
          <Link
            href="/account"
            className="inline-flex items-center justify-center min-h-[40px] px-3 rounded-xl bg-amber-900 text-white text-xs font-bold"
          >
            Masuk di Halaman Akun
          </Link>
        </div>
      )}

      {authLoaded && user && !user.isAdmin && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[13.5px] font-semibold flex flex-col gap-2.5"
        >
          <span>
            Akses ditolak. Akun <strong>{user.email}</strong> adalah pengguna biasa, bukan admin.
          </span>
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[42px] px-3 rounded-xl border border-rose-300 bg-white text-rose-800 text-xs font-bold"
          >
            Kembali ke Cari Hemat
          </Link>
        </div>
      )}

      {(!authLoaded || !user || user.isAdmin) && (
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 flex flex-col gap-4"
      >
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Info Penjual
        </h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="restoName" className="text-[13.5px] font-semibold text-slate-700">
            Nama Warung / Gerai
          </label>
          <input
            id="restoName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Ayam Geprek Pramuka (Dekat UNISM)"
            className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="restoPlatform" className="text-[13px] font-semibold text-slate-700">
              Platform
            </label>
            <select
              id="restoPlatform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            >
              <option value="GoFood">GoFood</option>
              <option value="GrabFood">GrabFood</option>
              <option value="ShopeeFood">ShopeeFood</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="restoCategory" className="text-[13px] font-semibold text-slate-700">
              Kategori
            </label>
            <input
              id="restoCategory"
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ayam Geprek, Mie, Kopi"
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="restoDelivery" className="text-[13px] font-semibold text-slate-700">
              Ongkir ke UNISM (Rp)
            </label>
            <input
              id="restoDelivery"
              type="number"
              min={0}
              step={500}
              required
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="restoService" className="text-[13px] font-semibold text-slate-700">
              Biaya Layanan (Rp)
            </label>
            <input
              id="restoService"
              type="number"
              min={0}
              step={500}
              required
              value={serviceFee}
              onChange={(e) => setServiceFee(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="restoLink" className="text-[13px] font-semibold text-slate-700">
            Link Outlet (Opsional)
          </label>
          <input
            id="restoLink"
            type="url"
            value={deepLinkUrl}
            onChange={(e) => setDeepLinkUrl(e.target.value)}
            placeholder="https://gofood.co.id/..."
            className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-orange-600 focus:ring-3 focus:ring-orange-600/15 focus:outline-none"
          />
        </div>

        {/* Menu List */}
        <div className="border-t border-slate-200 pt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Daftar Menu &amp; Add-on
            </h2>
            <button
              type="button"
              onClick={() => setMenus((prev) => [...prev, createEmptyMenu(false)])}
              className="min-h-[36px] px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tambah Baris</span>
            </button>
          </div>

          {menus.map((menu, index) => (
            <div
              key={menu.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">
                  Menu #{index + 1} ({menu.is_addon ? 'Add-on Murah' : 'Menu Utama'})
                </span>
                {menus.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMenu(menu.id)}
                    aria-label={`Hapus menu ${index + 1}`}
                    className="min-w-[36px] min-h-[36px] rounded-lg inline-flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <input
                type="text"
                required
                aria-label={`Nama menu ${index + 1}`}
                value={menu.name}
                onChange={(e) => updateMenu(menu.id, { name: e.target.value })}
                placeholder={
                  menu.is_addon
                    ? 'Contoh: Es Teh Manis / Tahu Goreng'
                    : 'Contoh: Nasi Ayam Geprek Sambal Ijo'
                }
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-orange-600 focus:outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  required
                  min={500}
                  step={500}
                  aria-label={`Harga menu ${index + 1}`}
                  value={menu.price}
                  onChange={(e) => updateMenu(menu.id, { price: e.target.value })}
                  placeholder="Harga (Rp)"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:outline-none"
                />
                <input
                  type="number"
                  required
                  min={0}
                  aria-label={`Kalori menu ${index + 1}`}
                  value={menu.calories}
                  onChange={(e) => updateMenu(menu.id, { calories: e.target.value })}
                  placeholder="Kalori (kkal)"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium tabular-nums text-slate-900 focus:border-orange-600 focus:outline-none"
                />
              </div>

              {menu.aiNote && (
                <p className="text-[11.5px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                  Catatan AI: {menu.aiNote}
                </p>
              )}

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 min-h-[36px]">
                <input
                  type="checkbox"
                  checked={menu.is_addon}
                  onChange={(e) => updateMenu(menu.id, { is_addon: e.target.checked })}
                  className="w-4 h-4 accent-orange-600"
                />
                <span>Tandai sebagai Add-on (pendamping untuk Cart-Hack)</span>
              </label>
            </div>
          ))}

          <button
            type="button"
            disabled={estimating}
            onClick={handleEstimateCalories}
            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Calculator className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {estimating
                ? 'Menghitung Kalori dengan Gemini AI...'
                : 'Estimasi Kalori Otomatis (Gemini AI)'}
            </span>
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !user || !user.isAdmin}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-orange-700 hover:bg-orange-800 active:scale-[0.985] text-white text-[15px] font-bold transition-all"
        >
          {saving ? 'Menyimpan ke Supabase...' : 'Simpan Penjual & Menu'}
        </button>
      </form>
      )}

      {/* Daftar Penjual Tersimpan */}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Penjual Tersimpan di Database ({savedList.length})
        </h2>

        {loadingList ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-500">
            Memuat daftar penjual...
          </div>
        ) : savedList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 text-center">
            Belum ada penjual tersimpan.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {savedList.map((resto) => (
              <div
                key={resto.id}
                className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <span
                    className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 inline-flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <Store className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{resto.name}</div>
                    <div className="text-xs text-slate-600">
                      {resto.platform} &middot; {resto.category}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                  {resto.menuCount} menu
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
