<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

<div align="center">

# FoClock AI — Nöral Odak Motoru

**Neural Beta 1.5.D** · Bilimsel temellere dayalı, AI destekli odak yönetimi sistemi

[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google)](https://ai.google.dev)

</div>

---

## Nedir?

FoClock AI, Pomodoro tekniğini nörobilim temelleriyle birleştiren bir odak yönetimi uygulamasıdır. Ultradian ritimler (90 dk odak / 20 dk reset), Flow State protokolü ve Google Gemini tabanlı AI planlama katmanı ile kullanıcının bilişsel kapasitesini koruyarak üretkenliği artırmayı hedefler.

---

## Özellikler

### AI Planlama
Google Gemini entegrasyonu ile doğal dil girdisinden görev planı oluşturur. Kullanıcının alanına ve geçmiş oturumlarına göre özelleştirilmiş süre önerileri sunar.

### Akıllı Zaman Yönetimi
| Mod | Süre | Açıklama |
|-----|------|----------|
| Ultradian Ritim | 90 dk + 20 dk | Beynin doğal çalışma döngüsüne uyumlu |
| Flow State | Değişken | Bilişsel yük teorisine dayalı, prefrontal korteks koruması |
| Esnek Pomodoro | Özelleştirilebilir | Göreve göre ayarlanabilir bloklar |

### Sosyal Katman
- **Arkadaş Sistemi** — Kullanıcı adıyla arama, istek gönderme/kabul etme
- **Gerçek Zamanlı Takip** — Arkadaşların aktif oturumlarını canlı izleme
- **Birlikte Çalış (Pair Mode)** — 2 kişi, birbirinden bağımsız timer, eş zamanlı oturum
- **Odalar** — 6 karakterli kod ile katılınan, max 15 üyeli paylaşımlı timer odaları

### Analitik
- Oturum geçmişi ve toplam odak süresi
- Görev bazlı performans istatistikleri
- Tamamlanan blok özetleri

### Arayüz
- Koyu / Açık tema (varsayılan: Açık)
- Türkçe / İngilizce dil desteği
- Test modu (1 dakika = 1 saniye)

---

## Kurulum

### Gereksinimler
- Node.js v18+
- Gemini API anahtarı
- Supabase projesi

### Yerel Geliştirme

```bash
npm install

# .env.local dosyasını oluştur
cp .env.local.example .env.local
# GEMINI_API_KEY= satırını doldurun
# VITE_SUPABASE_URL= ve VITE_SUPABASE_ANON_KEY= satırlarını doldurun

npm run dev
# http://localhost:3000
```

### Veritabanı Kurulumu

Supabase SQL Editor'da sırasıyla çalıştırın:

```
supabase/migrations/001_initial_schema.sql   — profiles, friend_requests, active_sessions
supabase/migrations/002_schema_cowork_rooms.sql — sessions, rooms, co_work_pairs, pair_invites
supabase/migrations/003_schema_presence.sql  — presence
supabase/migrations/004_schema_ai_chats.sql  — ai_conversations, ai_messages
supabase/migrations/005_schema_user_ai_memory.sql — user_ai_memory
supabase/migrations/006_fix_rls.sql          — RLS düzeltmeleri
supabase/migrations/007_cleanup_data.sql     — veri temizleme
```

### Vercel Deploy

```bash
git push origin main
# Vercel'de: Import repo → Environment Variables → GEMINI_API_KEY ekle → Deploy
```

---

## Sık Karşılaşılan Hatalar

**`new row violates row-level security policy for table profiles`**
`supabase/migrations/006_fix_rls.sql` dosyasını Supabase SQL Editor'da yeniden çalıştırın.

**`Email not confirmed`**
Supabase → Authentication → Providers → Email → "Confirm email" kapalı olmalı (development için) veya gelen doğrulama e-postasındaki link tıklanmalı.

---

## Demo Modu
Giriş ekranında **"Demo Dene"** butonuyla hesap olmadan tüm özellikler test edilebilir. Veriler kaydedilmez.

---

## Sürüm

Mevcut: **Neural Beta 1.5.D** (`src/version.ts` → `VERSION.full`)  
Sürüm notları için `CONTEXT.md` dosyasına bakın.
