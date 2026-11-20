import { NextResponse } from 'next/server';

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const SYSTEM_PROMPT = `Anda adalah sistem ekstraksi data voucher pesan-antar makanan Indonesia (GoFood, GrabFood, ShopeeFood).
Analisis gambar screenshot voucher yang diberikan dan kembalikan HANYA objek JSON valid tanpa markdown fence dengan struktur berikut:
{
  "platform": "GoFood" | "GrabFood" | "ShopeeFood",
  "promo_code": "string (jika tidak ada kode, tulis AUTO)",
  "title": "string ringkas nama promo",
  "min_spend": number (dalam Rupiah, integer tanpa titik),
  "discount_percent": number (integer 1-100),
  "max_discount": number (dalam Rupiah, integer tanpa titik),
  "payment_method": "GoPay" | "OVO" | "ShopeePay" | "QRIS" | "ALL",
  "expires_at": "ISO-8601 date string (jika tidak tertera, set 7 hari dari hari ini)"
}
Jika gambar bukan merupakan voucher makanan yang valid, kembalikan {"error": "Bukan gambar voucher yang valid"}.`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'File gambar voucher tidak ditemukan.', fallbackToManual: true },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Format gambar harus JPG, PNG, atau WebP.', fallbackToManual: true },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Ukuran gambar maksimal 4MB.', fallbackToManual: true },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY belum diisi di .env.local. Silakan isi detail promo secara manual di bawah ini agar langsung tersimpan ke Supabase.',
          fallbackToManual: true,
        },
        { status: 503 }
      );
    }

    // Proses langsung di memori (tanpa menyimpan file ke disk demi privasi)
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SYSTEM_PROMPT },
                {
                  inline_data: {
                    mime_type: file.type,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      return NextResponse.json(
        {
          error: 'Gagal menghubungi layanan AI OCR. Silakan lengkapi detail promo secara manual.',
          fallbackToManual: true,
        },
        { status: 502 }
      );
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json(
        {
          error: 'AI tidak dapat membaca teks pada gambar. Silakan isi secara manual.',
          fallbackToManual: true,
        },
        { status: 422 }
      );
    }

    const parsed = JSON.parse(rawText);
    if (parsed.error) {
      return NextResponse.json(
        { error: parsed.error, fallbackToManual: true },
        { status: 422 }
      );
    }

    return NextResponse.json({ extracted: parsed });
  } catch {
    return NextResponse.json(
      {
        error: 'Gambar terlalu buram atau gagal diproses. Silakan isi detail promo secara manual.',
        fallbackToManual: true,
      },
      { status: 500 }
    );
  }
}
