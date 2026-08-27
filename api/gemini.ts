// Vercel Serverless Function — Gemini API Proxy
// API key yalnızca server tarafında kalır, client bundle'a gömülmez.
// Client tarafı /api/gemini endpoint'ine POST yapar.
//
// GÜVENLİK:
//  - [K-2] Supabase JWT doğrulaması zorunlu. Anonim çağrı kabul edilmez.
//  - [K-2] `model` allowlist ile sınırlanır (URL path injection önlemi).
//  - [K-2] Kullanıcı başına rate limit + payload boyut sınırı.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// İzin verilen modeller — istek gövdesinden gelen değer doğrudan URL'e gömüldüğü
// için allowlist dışı hiçbir değer kabul edilmez.
const ALLOWED_MODELS = new Set([
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
]);

// Payload sınırları — kota tüketimini ve bellek baskısını sınırlar
const MAX_CONTENTS_CHARS = 24_000;
const MAX_SYSTEM_INSTRUCTION_CHARS = 32_000;

// Kullanıcı başına rate limit (kayan pencere).
// NOT: Serverless instance belleğinde tutulur; instance'lar arası paylaşılmaz.
// Auth zorunluluğu asıl kapıdır, bu ek savunma katmanıdır. Sıkı garanti gerekirse
// Supabase tablosu veya Upstash Redis'e taşınmalıdır.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(userId, recent);
    return true;
  }
  recent.push(now);
  hits.set(userId, recent);
  if (hits.size > 5000) hits.clear(); // kaba bellek koruması
  return false;
}

/** Supabase access token'ı doğrular, geçerliyse kullanıcı id'sini döner. */
async function verifySupabaseToken(token: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return typeof user?.id === 'string' ? user.id : null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Yalnızca POST kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // [K-2] Kimlik doğrulama — anonim erişim kapalı
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
  }
  const userId = await verifySupabaseToken(authHeader.slice(7));
  if (!userId) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum' });
  }

  // [K-2] Kullanıcı başına rate limit
  if (rateLimited(userId)) {
    return res.status(429).json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY sunucuda tanımlı değil' });
  }

  try {
    const { model, contents, config } = req.body ?? {};

    if (!model || !contents) {
      return res.status(400).json({ error: 'model ve contents alanları zorunlu' });
    }

    // [K-2] Model allowlist — path injection önlemi
    if (typeof model !== 'string' || !ALLOWED_MODELS.has(model)) {
      return res.status(400).json({ error: 'Desteklenmeyen model' });
    }

    // [K-2] Payload boyut sınırı
    const contentsSize =
      typeof contents === 'string' ? contents.length : JSON.stringify(contents).length;
    if (contentsSize > MAX_CONTENTS_CHARS) {
      return res.status(413).json({ error: 'İstek gövdesi çok büyük' });
    }
    const systemInstruction = config?.systemInstruction;
    if (
      systemInstruction !== undefined &&
      (typeof systemInstruction !== 'string' ||
        systemInstruction.length > MAX_SYSTEM_INSTRUCTION_CHARS)
    ) {
      return res.status(413).json({ error: 'systemInstruction geçersiz veya çok büyük' });
    }

    // Gemini API'ye server-side istek — key query string yerine header'da gider
    const endpoint = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;

    // Gemini REST API contents formatı: string → parts array'e dönüştür
    const contentsFormatted =
      typeof contents === 'string' ? [{ role: 'user', parts: [{ text: contents }] }] : contents;

    const geminiBody: Record<string, unknown> = { contents: contentsFormatted };

    // systemInstruction → system_instruction olarak gönder
    if (systemInstruction) {
      geminiBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    // JSON schema modu
    if (config?.responseMimeType) {
      geminiBody.generationConfig = {
        responseMimeType: config.responseMimeType,
        ...(config.responseSchema ? { responseSchema: config.responseSchema } : {}),
      };
    }

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[api/gemini] Gemini API hatası:', geminiRes.status, errText);
      return res.status(geminiRes.status).json({ error: 'Gemini API hatası', detail: geminiRes.status });
    }

    const data = await geminiRes.json();

    // Yanıttan text çıkar
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return res.status(200).json({ text });
  } catch (err) {
    console.error('[api/gemini] Sunucu hatası:', err);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
}
