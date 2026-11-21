import { NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/gemini';

interface EstimateItemInput {
  name: string;
  is_addon?: boolean;
}

const SYSTEM_PROMPT = `Anda adalah ahli gizi kuliner Indonesia.
Diberikan daftar nama makanan/minuman khas Indonesia (termasuk porsi warung/pesan-antar), estimasikan jumlah kalori per porsi dalam angka bulat (kkal).
Kembalikan HANYA objek JSON valid tanpa markdown fence dengan struktur persis berikut:
{
  "estimates": [
    {
      "name": "string (nama persis dari input)",
      "calories": number (integer >= 0, contoh: 650 untuk nasi ayam geprek, 140 untuk es teh manis, 0 untuk air mineral),
      "note": "string ringkas maks 10 kata tentang dasar estimasi porsi"
    }
  ]
}`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY belum diisi di .env.local. Ambil API key gratis di aistudio.google.com/apikey lalu restart server.',
          code: 'GEMINI_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { items?: EstimateItemInput[] };
    const items = (body.items ?? [])
      .map((item) => ({
        name: String(item.name ?? '').trim(),
        is_addon: Boolean(item.is_addon),
      }))
      .filter((item) => item.name.length > 0);

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Isi minimal 1 nama menu terlebih dahulu sebelum estimasi kalori.' },
        { status: 400 }
      );
    }

    const promptList = items
      .map((item, idx) => `${idx + 1}. ${item.name} (${item.is_addon ? 'Add-on / pendamping' : 'Menu utama'})`)
      .join('\n');

    const result = await generateGeminiJson(apiKey, [
      { text: `${SYSTEM_PROMPT}\n\nDaftar menu:\n${promptList}` },
    ]);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Gagal menghubungi Gemini API (${result.status}). Coba lagi sebentar lagi.`,
          detail: result.detail,
        },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(result.text) as {
      estimates?: Array<{ name: string; calories: number; note?: string }>;
    };

    const rawEstimates = parsed.estimates ?? [];
    const sameLength = rawEstimates.length === items.length;
    const estimates = items.map((item, idx) => {
      const cleanInput = item.name.toLowerCase();
      const matched = sameLength
        ? rawEstimates[idx]
        : rawEstimates.find((e) => String(e.name ?? '').trim().toLowerCase() === cleanInput) ??
          rawEstimates[idx];

      return {
        name: item.name,
        calories: Math.max(0, Math.round(Number(matched?.calories) || 0)),
        note: String(matched?.note ?? ''),
      };
    });

    return NextResponse.json({ estimates, model: result.model });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal mengestimasi kalori.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
