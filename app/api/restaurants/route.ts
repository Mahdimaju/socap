import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { createSupabaseRouteClient } from '@/lib/supabase-ssr';
import { isAdminEmail } from '@/lib/admin';
import type { Platform } from '@/lib/types';

const VALID_PLATFORMS: Platform[] = ['GoFood', 'GrabFood', 'ShopeeFood'];

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const [restosRes, menusRes] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }),
      supabase.from('menu_items').select('id, restaurant_id, name, price, calories, is_addon'),
    ]);

    if (restosRes.error) {
      return NextResponse.json({ error: restosRes.error.message }, { status: 500 });
    }

    const menus = menusRes.data ?? [];
    const restaurants = (restosRes.data ?? []).map((r) => ({
      ...r,
      menuCount: menus.filter((m) => m.restaurant_id === r.id).length,
    }));

    return NextResponse.json({ restaurants });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memuat daftar penjual.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Silakan masuk ke akun admin terlebih dahulu.' },
        { status: 401 }
      );
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya akun admin yang dapat menambahkan penjual.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const platform = body.platform as Platform;
    const category = String(body.category ?? '').trim() || 'Lainnya';
    const city = String(body.city ?? 'Banjarmasin').trim() || 'Banjarmasin';
    const baseDeliveryFee = Math.max(0, Math.round(Number(body.base_delivery_fee) || 0));
    const serviceFee = Math.max(0, Math.round(Number(body.service_fee) || 0));
    const deepLinkUrl = String(body.deep_link_url ?? '').trim() || null;

    const rawMenus = Array.isArray(body.menus) ? body.menus : [];
    const menus = rawMenus
      .map((m: Record<string, unknown>) => ({
        name: String(m.name ?? '').trim(),
        price: Math.round(Number(m.price) || 0),
        calories: Math.max(0, Math.round(Number(m.calories) || 0)),
        is_addon: Boolean(m.is_addon),
      }))
      .filter((m: { name: string; price: number }) => m.name.length > 0 && m.price > 0);

    if (!name) {
      return NextResponse.json({ error: 'Nama penjual wajib diisi.' }, { status: 400 });
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: 'Platform harus GoFood, GrabFood, atau ShopeeFood.' },
        { status: 400 }
      );
    }
    if (menus.length === 0) {
      return NextResponse.json(
        { error: 'Tambahkan minimal 1 menu dengan nama dan harga valid.' },
        { status: 400 }
      );
    }

    const { data: restaurant, error: restoErr } = await authSupabase
      .from('restaurants')
      .insert({
        name,
        platform,
        category,
        city,
        base_delivery_fee: baseDeliveryFee,
        service_fee: serviceFee,
        deep_link_url: deepLinkUrl,
      })
      .select()
      .single();

    if (restoErr || !restaurant) {
      return NextResponse.json(
        {
          error:
            restoErr?.code === '42501'
              ? 'Izin tambah penjual ditolak RLS Supabase. Jalankan ulang bagian GRANT & POLICY restaurants/menu_items di supabase/saas_migration.sql.'
              : `Gagal menyimpan penjual: ${restoErr?.message ?? 'Unknown error'}`,
        },
        { status: 500 }
      );
    }

    const menuRows = menus.map((m: { name: string; price: number; calories: number; is_addon: boolean }) => ({
      restaurant_id: restaurant.id,
      name: m.name,
      price: m.price,
      calories: m.calories,
      is_addon: m.is_addon,
    }));

    const { error: menuErr } = await authSupabase.from('menu_items').insert(menuRows);

    if (menuErr) {
      return NextResponse.json(
        { error: `Penjual tersimpan, tetapi gagal menyimpan menu: ${menuErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { restaurant, insertedMenus: menuRows.length },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menambahkan penjual.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
