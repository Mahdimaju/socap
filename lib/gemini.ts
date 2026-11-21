const DEFAULT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
];

export async function generateGeminiJson(
  apiKey: string,
  parts: Array<Record<string, unknown>>
): Promise<{ ok: true; text: string; model: string } | { ok: false; status: number; detail: string }> {
  const custom = process.env.GEMINI_MODEL?.trim();
  const candidates = custom ? [custom, ...DEFAULT_MODELS.filter((m) => m !== custom)] : DEFAULT_MODELS;

  let lastStatus = 502;
  let lastDetail = '';

  for (const model of candidates) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (res.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { ok: true, text, model };
      }
      lastStatus = 422;
      lastDetail = 'Model tidak mengembalikan teks JSON.';
      continue;
    }

    lastStatus = res.status;
    lastDetail = (await res.text()).slice(0, 240);

    // Retry with next fallback model on temporary overload, rate limit, or deprecated model
    if (res.status === 503 || res.status === 429 || res.status === 404) {
      continue;
    }
    break;
  }

  return { ok: false, status: lastStatus, detail: lastDetail };
}
