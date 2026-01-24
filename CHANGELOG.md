# Changelog

## [1.1.0] – V1.1 B (2025-01-24)

### Görsel ve UX

- **Sayaç grubu:** Sayaç ortaya yaklaştırıldı; 25:00 halkanın tam ortasına hizalandı.
- **HAZIR çubuğu:** Sayaçla çakışmayacak şekilde aşağı alındı (`top` ayarı).
- **SİSTEM HAZIR:** Watermark (FUFIT NEURAL ENGINE) hemen altına taşındı.
- **Watermark:** Opaklık 0.05 → 0.14 yapıldı, daha okunaklı.
- **Sol alt teknik metin:** "BETA ACCESS: AUTHORIZED // NETWORK: STABLE // ENCRYPTION: 256-BIT AES" kaldırıldı.

### Marka ve dil

- **Fufu AI → Fufit AI:** Tüm arayüz, lokaller ve AI servisi Fufit AI olarak güncellendi.
- **Sol üst başlık:** "FUFIT ARCHITECT" / "FUFIT MİMAR" kaldırıldı; dil seçimine göre **FUFİT AI** (TR) / **FUFIT AI** (EN) kullanılıyor.
- **Türkçe İ/i:** Motivasyon cümlesi ve ilgili metinlerde doğru Türkçe büyük harf (İ, I) kullanılıyor.
- **Lokalizasyon:** Architect, welcome quote, analyzing placeholder dile göre; "Nöral analiz yapılıyor..." vb. `locales` üzerinden.

### Alıntılar

- **Dönen alıntılar:** Sayaç altındaki alanda (eskiden boş `""`) 20 sn aralıklarla sırayla gösterilen alıntı listesi eklendi.
- **`quotes.ts`:** TR/EN listeler, `getQuote(lang, index)`, `ROTATION_INTERVAL_MS`.
- **10 Türkçe alıntı:** Farabi, İbn Sina, Gazali, Hasan-ı Basri, Mevlana, İmam Şafii, İbn Haldun, Yunus Emre (İngilizce çeviriler placeholder).
- **Chatbot alanı:** Sol sidebar’daki Fufit AI alanı eskisi gibi; welcome quote + input. Dönen alıntılar sadece sayaç altında.

### GitHub entegrasyonu ve yayınlama

- **Sürüm:** Tüm sürüm referansları **V1.1 B** (v1.1.b) olacak şekilde güncellendi:
  - Watermark: `FUFIT NEURAL ENGINE v1.1.b`
  - Neural Link: `v1.1 Beta`
  - Beta etiketleri: `Beta v1.1`
  - Sağ panel: `Sürüm: FoClock AI Neural Beta 1.1`
  - `package.json` → `"version": "1.1.0"`
- **Yayınlama:** Bu sürüm `main` dalına push edilerek GitHub’a yansıtılır. Vercel bağlıysa otomatik deploy tetiklenir.
- **Release önerisi:** GitHub → Releases → "Draft a new release" → Tag `v1.1.0`, başlık `FoClock AI Neural Beta 1.1 (V1.1 B)`; bu CHANGELOG bölümünü release notu olarak kopyalayabilirsin.

---

## [1.0.0] – V1.0 B

- İlk Neural Beta sürümü: Pomodoro timer, Fufit AI chatbot, kuyruk, analitik, ayarlar, Supabase auth, Gemini entegrasyonu.
