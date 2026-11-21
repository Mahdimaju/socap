import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-ssr';
import { isAdminEmail } from '@/lib/admin';

const DAILY_FREE_QUOTA = 2;

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ user: null, profile: null, subscriptions: [] });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Ambil atau buat profil jika trigger belum berjalan untuk akun lama
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      const { data: inserted } = await supabase
        .from('user_profiles')
        .insert({ id: user.id, email: user.email ?? null })
        .select('*')
        .single();
      profile = inserted;
    }

    if (profile && profile.last_search_date !== today) {
      const { data: resetProfile } = await supabase
        .from('user_profiles')
        .update({ daily_search_count: 0, last_search_date: today })
        .eq('id', user.id)
        .select('*')
        .single();
      if (resetProfile) profile = resetProfile;
    }

    const proExpiresAt = profile?.pro_expires_at ? new Date(profile.pro_expires_at) : null;
    const isProActive = Boolean(
      profile?.is_pro && proExpiresAt && proExpiresAt.getTime() > Date.now()
    );
    const usedToday = Number(profile?.daily_search_count ?? 0);
    const quotaRemaining = isProActive
      ? DAILY_FREE_QUOTA
      : Math.max(0, DAILY_FREE_QUOTA - usedToday);

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, order_id, amount, status, payment_type, paid_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email ?? '',
        isAdmin: isAdminEmail(user.email),
      },
      profile: profile
        ? {
            points: profile.points ?? 0,
            isPro: isProActive,
            proExpiresAt: profile.pro_expires_at,
            dailySearchCount: usedToday,
            quotaRemaining,
          }
        : null,
      subscriptions: subscriptions ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memuat profil pengguna.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
