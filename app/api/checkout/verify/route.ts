import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-ssr';
import {
  getMidtransAuthHeader,
  getMidtransConfig,
  PRO_PLAN_DURATION_DAYS,
} from '@/lib/midtrans';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
    }

    const { orderId } = (await request.json()) as { orderId?: string };
    if (!orderId) {
      return NextResponse.json({ error: 'orderId wajib diisi.' }, { status: 400 });
    }

    const { serverKey, coreApiBase } = getMidtransConfig();
    if (!serverKey) {
      return NextResponse.json({ error: 'MIDTRANS_SERVER_KEY belum diatur.' }, { status: 503 });
    }

    // Pastikan order milik user yang sedang login
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    const statusRes = await fetch(`${coreApiBase}/${encodeURIComponent(orderId)}/status`, {
      headers: {
        Accept: 'application/json',
        Authorization: getMidtransAuthHeader(serverKey),
      },
    });
    const statusData = await statusRes.json();

    const txStatus = String(statusData.transaction_status ?? 'pending');
    const paymentType = statusData.payment_type ? String(statusData.payment_type) : null;
    const isPaid = txStatus === 'settlement' || txStatus === 'capture';

    const allowedStatuses = new Set(['pending', 'settlement', 'capture', 'expire', 'cancel', 'deny']);
    const normalizedStatus = allowedStatuses.has(txStatus) ? txStatus : 'pending';

    await supabase
      .from('subscriptions')
      .update({
        status: normalizedStatus,
        payment_type: paymentType,
        paid_at: isPaid ? new Date().toISOString() : null,
      })
      .eq('order_id', orderId)
      .eq('user_id', user.id);

    if (isPaid) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('pro_expires_at')
        .eq('id', user.id)
        .maybeSingle();

      const baseTime =
        profile?.pro_expires_at && new Date(profile.pro_expires_at).getTime() > Date.now()
          ? new Date(profile.pro_expires_at).getTime()
          : Date.now();
      const nextExpiry = new Date(
        baseTime + PRO_PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

      await supabase
        .from('user_profiles')
        .update({ is_pro: true, pro_expires_at: nextExpiry })
        .eq('id', user.id);

      return NextResponse.json({
        paid: true,
        status: normalizedStatus,
        proExpiresAt: nextExpiry,
      });
    }

    return NextResponse.json({ paid: false, status: normalizedStatus });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memverifikasi pembayaran.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
