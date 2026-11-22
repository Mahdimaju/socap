import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { createSupabaseRouteClient } from '@/lib/supabase-ssr';
import {
  getMidtransAuthHeader,
  getMidtransConfig,
  PRO_PLAN_PRICE,
} from '@/lib/midtrans';

export async function POST() {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Silakan masuk terlebih dahulu untuk berlangganan Pro.' },
        { status: 401 }
      );
    }

    const { serverKey, clientKey, snapApiBase, snapScriptUrl } = getMidtransConfig();
    if (!serverKey || !clientKey) {
      return NextResponse.json(
        {
          error:
            'Kredensial Midtrans belum diisi. Tambahkan MIDTRANS_SERVER_KEY dan NEXT_PUBLIC_MIDTRANS_CLIENT_KEY (Sandbox) ke .env.local lalu restart server.',
          code: 'MIDTRANS_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    const dbWrite = createSupabaseAdminClient() ?? supabase;

    // Pastikan profil user ada sebelum foreign key subscriptions
    await dbWrite
      .from('user_profiles')
      .upsert({ id: user.id, email: user.email ?? null }, { onConflict: 'id' });

    const shortId = user.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    const orderId = `LH-PRO-${Date.now()}-${shortId}`;

    const midtransRes = await fetch(`${snapApiBase}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: getMidtransAuthHeader(serverKey),
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: PRO_PLAN_PRICE,
        },
        item_details: [
          {
            id: 'LAPERHEMAT-PRO-30D',
            price: PRO_PLAN_PRICE,
            quantity: 1,
            name: 'LaperHemat Pro (30 Hari Unlimited)',
          },
        ],
        customer_details: {
          email: user.email ?? 'pengguna@laperhemat.app',
        },
      }),
    });

    const midtransData = await midtransRes.json();

    if (!midtransRes.ok || !midtransData.token) {
      const detail = Array.isArray(midtransData.error_messages)
        ? midtransData.error_messages.join(', ')
        : 'Gagal membuat transaksi Midtrans Snap.';
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const { error: insertErr } = await dbWrite.from('subscriptions').insert({
      user_id: user.id,
      order_id: orderId,
      amount: PRO_PLAN_PRICE,
      status: 'pending',
      snap_token: midtransData.token,
    });

    if (insertErr) {
      return NextResponse.json(
        {
          error:
            insertErr.code === '42P01' || insertErr.message.includes('schema cache')
              ? 'Tabel subscriptions belum dibuat. Jalankan supabase/saas_migration.sql di Supabase SQL Editor.'
              : `Gagal mencatat transaksi: ${insertErr.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId,
      snapToken: midtransData.token,
      redirectUrl: midtransData.redirect_url,
      clientKey,
      snapScriptUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memulai pembayaran Pro.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
