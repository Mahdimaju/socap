import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import {
  getMidtransConfig,
  PRO_PLAN_DURATION_DAYS,
  verifyMidtransSignature,
} from '@/lib/midtrans';

export async function POST(request: Request) {
  try {
    const { serverKey } = getMidtransConfig();
    if (!serverKey) {
      return NextResponse.json({ error: 'MIDTRANS_SERVER_KEY belum diatur.' }, { status: 503 });
    }

    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY diperlukan untuk memproses webhook Midtrans.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const orderId = String(body.order_id ?? '');
    const statusCode = String(body.status_code ?? '');
    const grossAmount = String(body.gross_amount ?? '');
    const signatureKey = String(body.signature_key ?? '');
    const txStatus = String(body.transaction_status ?? 'pending');
    const paymentType = body.payment_type ? String(body.payment_type) : null;

    const validSignature = verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey,
      serverKey,
    });

    if (!validSignature) {
      return NextResponse.json({ error: 'Signature Midtrans tidak valid.' }, { status: 403 });
    }

    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, user_id, status')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
    }

    const isPaid = txStatus === 'settlement' || txStatus === 'capture';
    const allowedStatuses = new Set(['pending', 'settlement', 'capture', 'expire', 'cancel', 'deny']);
    const normalizedStatus = allowedStatuses.has(txStatus) ? txStatus : 'pending';

    await admin
      .from('subscriptions')
      .update({
        status: normalizedStatus,
        payment_type: paymentType,
        paid_at: isPaid ? new Date().toISOString() : null,
      })
      .eq('order_id', orderId);

    if (isPaid && sub.status !== 'settlement' && sub.status !== 'capture') {
      const { data: profile } = await admin
        .from('user_profiles')
        .select('pro_expires_at')
        .eq('id', sub.user_id)
        .maybeSingle();

      const baseTime =
        profile?.pro_expires_at && new Date(profile.pro_expires_at).getTime() > Date.now()
          ? new Date(profile.pro_expires_at).getTime()
          : Date.now();
      const nextExpiry = new Date(
        baseTime + PRO_PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

      await admin
        .from('user_profiles')
        .update({ is_pro: true, pro_expires_at: nextExpiry })
        .eq('id', sub.user_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook gagal diproses.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
