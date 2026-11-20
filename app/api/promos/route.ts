import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { createSupabaseRouteClient } from '@/lib/supabase-ssr';
import type { Platform } from '@/lib/types';

const VALID_PLATFORMS: Platform[] = ['GoFood', 'GrabFood', 'ShopeeFood'];

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('promos')
      .select('*')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ promos: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memuat daftar promo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const platform = body.platform as Platform;
    const promoCode = String(body.promo_code ?? 'AUTO').trim().toUpperCase() || 'AUTO';
    const title = String(body.title ?? '').trim() || `Promo ${platform} ${body.discount_percent}%`;
    const minSpend = Number(body.min_spend);
    const discountPercent = Number(body.discount_percent);
    const maxDiscount = Number(body.max_discount);
    const paymentMethod = String(body.payment_method ?? 'ALL').trim() || 'ALL';
    const expiresAt =
      body.expires_at && !Number.isNaN(Date.parse(body.expires_at))
        ? new Date(body.expires_at).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: 'Platform harus GoFood, GrabFood, atau ShopeeFood.' },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(minSpend) ||
      minSpend < 0 ||
      Number.isNaN(discountPercent) ||
      discountPercent < 1 ||
      discountPercent > 100 ||
      Number.isNaN(maxDiscount) ||
      maxDiscount < 1000
    ) {
      return NextResponse.json(
        { error: 'Periksa kembali minimal belanja, persentase diskon (1-100), dan maks. diskon.' },
        { status: 400 }
      );
    }

    // Cek apakah user sedang login untuk mencatat poin (+10) & unlock Pro 24 jam di DB
    let submittedBy: string | null = null;
    const authSupabase = await createSupabaseRouteClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (user) {
      submittedBy = user.id;
      await authSupabase
        .from('user_profiles')
        .upsert({ id: user.id, email: user.email ?? null }, { onConflict: 'id' });
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('promos')
      .insert({
        platform,
        promo_code: promoCode,
        title,
        min_spend: Math.round(minSpend),
        discount_percent: Math.round(discountPercent),
        max_discount: Math.round(maxDiscount),
        payment_method: paymentMethod,
        expires_at: expiresAt,
        status: 'active',
        submitted_by: submittedBy,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.code === '42501'
              ? 'Izin insert promo ditolak oleh RLS Supabase. Pastikan policy "Public insert community promos" di supabase/schema_and_seed.sql sudah dijalankan.'
              : `Gagal menyimpan promo ke Supabase: ${error.message}`,
        },
        { status: 500 }
      );
    }

    let rewardedPoints = 0;
    if (user) {
      const { data: profile } = await authSupabase
        .from('user_profiles')
        .select('points, pro_expires_at')
        .eq('id', user.id)
        .maybeSingle();

      const nextPoints = Number(profile?.points ?? 0) + 10;
      const baseTime =
        profile?.pro_expires_at && new Date(profile.pro_expires_at).getTime() > Date.now()
          ? new Date(profile.pro_expires_at).getTime()
          : Date.now();
      const nextProExpiry = new Date(baseTime + 24 * 60 * 60 * 1000).toISOString();

      await authSupabase
        .from('user_profiles')
        .update({
          points: nextPoints,
          is_pro: true,
          pro_expires_at: nextProExpiry,
        })
        .eq('id', user.id);

      rewardedPoints = 10;
    }

    return NextResponse.json({ promo: data, rewardedPoints }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan promo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
