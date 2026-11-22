import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase';
import { createSupabaseRouteClient } from '@/lib/supabase-ssr';
import { optimizeCart } from '@/lib/cartHacking';
import type {
  MenuItem,
  OptimizationResult,
  OptimizeRequest,
  Promo,
  Restaurant,
} from '@/lib/types';

const DAILY_FREE_QUOTA = 2;

function isMissingTableError(message?: string, code?: string) {
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    Boolean(message && message.toLowerCase().includes('schema cache'))
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<OptimizeRequest> & {
      consumeQuota?: boolean;
    };
    const craving = (body.craving ?? '').trim().toLowerCase();
    const maxBudget = Number(body.maxBudget ?? 45000);
    const maxCalories =
      body.maxCalories === null || body.maxCalories === undefined
        ? null
        : Number(body.maxCalories);
    const wallets = Array.isArray(body.wallets) ? body.wallets : [];
    const shouldConsumeQuota = body.consumeQuota === true;

    if (wallets.length === 0) {
      return NextResponse.json(
        { error: 'Pilih minimal 1 metode pembayaran agar promo bisa dihitung.' },
        { status: 400 }
      );
    }

    // Server-side quota enforcement untuk pengguna yang sudah login
    let serverQuotaRemaining: number | undefined;
    if (shouldConsumeQuota) {
      try {
        const authSupabase = await createSupabaseRouteClient();
        const {
          data: { user },
        } = await authSupabase.auth.getUser();

        if (user) {
          const dbWrite = createSupabaseAdminClient() ?? authSupabase;
          const today = new Date().toISOString().slice(0, 10);
          let { data: profile } = await dbWrite
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (!profile) {
            const { data: created } = await dbWrite
              .from('user_profiles')
              .insert({ id: user.id, email: user.email ?? null })
              .select('*')
              .single();
            profile = created;
          }

          if (profile) {
            const isProActive = Boolean(
              profile.is_pro &&
                profile.pro_expires_at &&
                new Date(profile.pro_expires_at).getTime() > Date.now()
            );

            if (!isProActive) {
              const usedToday =
                profile.last_search_date === today ? Number(profile.daily_search_count ?? 0) : 0;

              if (usedToday >= DAILY_FREE_QUOTA) {
                return NextResponse.json(
                  {
                    error: 'Kuota pencarian gratis 2x/hari sudah habis.',
                    code: 'QUOTA_EXCEEDED',
                  },
                  { status: 429 }
                );
              }

              const nextUsed = usedToday + 1;
              await dbWrite
                .from('user_profiles')
                .update({ daily_search_count: nextUsed, last_search_date: today })
                .eq('id', user.id);

              serverQuotaRemaining = Math.max(0, DAILY_FREE_QUOTA - nextUsed);
            } else {
              serverQuotaRemaining = DAILY_FREE_QUOTA;
            }
          }
        }
      } catch {
        // Fallback aman jika sesi cookie belum tersedia
      }
    }

    const supabase = createSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const [restaurantsRes, menuRes, promosRes] = await Promise.all([
      supabase.from('restaurants').select('*'),
      supabase.from('menu_items').select('*'),
      supabase
        .from('promos')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', nowIso),
    ]);

    const firstError = restaurantsRes.error || menuRes.error || promosRes.error;
    if (firstError) {
      if (isMissingTableError(firstError.message, firstError.code)) {
        return NextResponse.json(
          {
            error:
              'Tabel database belum dibuat di Supabase. Jalankan file supabase/schema_and_seed.sql di Supabase SQL Editor terlebih dahulu.',
            code: 'TABLES_NOT_READY',
          },
          { status: 503 }
        );
      }
      if (
        firstError.code === '42501' ||
        firstError.message.toLowerCase().includes('permission denied')
      ) {
        return NextResponse.json(
          {
            error:
              'Izin akses tabel Supabase ditolak (permission denied). Jalankan perintah GRANT SELECT ON public.restaurants, public.menu_items, public.promos TO anon, authenticated; di Supabase SQL Editor.',
            code: 'PERMISSION_DENIED',
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `Gagal memuat data dari Supabase: ${firstError.message}` },
        { status: 500 }
      );
    }

    const restaurants = (restaurantsRes.data ?? []) as Restaurant[];
    const menuItems = (menuRes.data ?? []) as MenuItem[];
    const promos = (promosRes.data ?? []) as Promo[];

    const menuByResto = new Map<string, MenuItem[]>();
    for (const item of menuItems) {
      const list = menuByResto.get(item.restaurant_id) ?? [];
      list.push(item);
      menuByResto.set(item.restaurant_id, list);
    }

    const candidates: OptimizationResult[] = [];

    for (const resto of restaurants) {
      const items = menuByResto.get(resto.id) ?? [];
      const mainDishes = items.filter((m) => !m.is_addon);
      const addons = items.filter((m) => m.is_addon);

      const matchingPromos = promos.filter(
        (p) =>
          p.platform === resto.platform &&
          (p.payment_method === 'ALL' || wallets.includes(p.payment_method))
      );

      for (const dish of mainDishes) {
        if (craving) {
          const haystack = `${resto.name} ${resto.category} ${dish.name}`.toLowerCase();
          if (!haystack.includes(craving)) continue;
        }
        if (maxCalories !== null && dish.calories > maxCalories) continue;

        candidates.push(optimizeCart(resto, dish, addons, matchingPromos, maxCalories));
      }
    }

    candidates.sort((a, b) => a.finalPrice - b.finalPrice);

    const results = candidates.filter((c) => c.finalPrice <= maxBudget).slice(0, 10);
    const nearest = candidates.length > 0 ? candidates[0] : null;

    return NextResponse.json({
      results,
      nearest,
      totalCandidates: candidates.length,
      quotaRemaining: serverQuotaRemaining,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Terjadi kesalahan saat menghitung kombinasi.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
