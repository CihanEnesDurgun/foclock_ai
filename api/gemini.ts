// Vercel Serverless Function — Gemini API Proxy
// API key yalnızca server tarafında kalır, client bundle'a gömülmez.
// Client tarafı /api/gemini endpoint'ine POST yapar.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Yalnızca POST kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY sunucuda tanımlı değil' });
  }

  try {
    const { model, contents, config } = req.body;

    if (!model || !contents) {
      return res.status(400).json({ error: 'model ve contents alanları zorunlu' });
    }

    // Gemini API'ye server-side istek
    const endpoint = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;

    // Gemini REST API contents formatı: string → parts array'e dönüştür
    const contentsFormatted = typeof contents === 'string'
      ? [{ role: 'user', parts: [{ text: contents }] }]
      : contents;

    const geminiBody: Record<string, unknown> = { contents: contentsFormatted };

    // systemInstruction → system_instruction olarak gönder
    if (config?.systemInstruction) {
      geminiBody.systemInstruction = { parts: [{ text: config.systemInstruction }] };
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
      headers: { 'Content-Type': 'application/json' },
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
