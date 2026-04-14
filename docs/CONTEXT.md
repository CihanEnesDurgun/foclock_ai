# CONTEXT.md — FoClock AI Proje Hafızası

Bu dosya, bir AI asistanın projeye hızla bağlam kazanması için tasarlanmıştır.
Geçmiş kararları, mevcut teknik borcu ve öncelikleri özetler.

---

## Proje Kimliği

| Alan | Değer |
|------|-------|
| Ürün adı | FoClock AI |
| Motor adı | Fufit Neural Engine |
| Mevcut sürüm | Neural Beta 1.5.D |
| `package.json` versiyonu | 1.5.1 |
| Sürüm dosyası | `src/version.ts` → `VERSION` objesi |
| Geliştirici | Cihan |
| Platform | Web (Vite + React + TypeScript) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| AI Katmanı | Google Gemini API |
| Deploy | Vercel |

---

## Sürüm Geçmişi (Özet)

| Sürüm | Önemli Değişiklik |
|-------|-------------------|
| 1.5.A | İlk sosyal katman: arkadaş sistemi, aktif oturum takibi |
| 1.5.B | Oda sistemi (rooms), Birlikte Çalış (pair mode), presence |
| 1.5.C | `src/` layout yeniden düzenleme, `docs/` klasörü, Supabase migration sistemi |
| 1.5.D | Adaptive AI Core (Fufit AI v2) — kullanıcı hafızası, AI konuşma geçmişi |

---

## Mevcut Mimari Özeti

```
src/
├── App.tsx                  — Ana uygulama, routing yok; tek sayfa
├── index.tsx                — Giriş noktası
├── version.ts               — Merkezi sürüm bilgisi
├── types/index.ts           — Tüm TypeScript arayüzleri
├── locales/index.ts         — Türkçe / İngilizce çeviri stringleri
├── quotes/index.ts          — Motivasyon alıntıları
└── services/
    ├── supabase.ts          — Supabase client başlatma
    ├── authService.ts       — Kayıt, giriş, profil oluşturma
    ├── geminiService.ts     — Gemini API istek katmanı
    ├── chatService.ts       — AI konuşma CRUD (Supabase)
    ├── friendService.ts     — Arkadaş istekleri, arama
    ├── friendActivityService.ts — Arkadaşların aktif oturumlarını çekme
    ├── presenceService.ts   — Realtime presence kanalı
    ├── pairService.ts       — Birlikte Çalış (pair) daveti ve oturum yönetimi
    ├── roomService.ts       — Oda oluşturma, katılma, timer senkronizasyonu
    ├── userMemoryService.ts — Kullanıcı AI hafıza kayıtları (1.5.D)
    └── calendarService.ts   — Oturum → takvim entegrasyonu (taslak)
```

---

## Supabase Tablo Listesi

| Tablo | Açıklama |
|-------|----------|
| `profiles` | Kullanıcı profilleri; `username_lower` unique index |
| `friend_requests` | Arkadaşlık istekleri; `status`: pending/accepted/rejected |
| `active_sessions` | Anlık aktif oturumlar; arkadaşlar RLS ile okuyabilir |
| `sessions` | Tamamlanan oturumlar arşivi |
| `co_work_pairs` | 2 kişilik birlikte çalış çiftleri |
| `pair_invites` | Birlikte çalış davetleri |
| `rooms` | Çok kullanıcılı odalar (max 15 üye) |
| `room_members` | Oda üyeliği |
| `room_sessions` | Odanın anlık timer durumu |
| `ai_conversations` | Gemini sohbet başlıkları (004) |
| `ai_messages` | Sohbet mesajları (004) |
| `user_ai_memory` | Kullanıcıya özel AI hafıza kayıtları (005) |

---

## Bilinen Teknik Borç

### 1. Supabase Credentials Hardcoded
- **Durum:** `src/services/supabase.ts` içinde `supabaseUrl` ve `supabaseAnonKey` doğrudan kodda tanımlı.
- **Risk:** Kaynak kodu paylaşıldığında sızar.
- **Çözüm:** `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` env değişkenlerine taşı.

### 2. RLS Politika Tutarsızlıkları
- **Durum:** `006_fix_rls.sql` bu sorunları kısmen giderir; ancak yeni tablolar eklendiğinde tekrarlıyor.
- **Semptom:** Kayıt sırasında `profiles` için `violates row-level security` hatası.
- **Çözüm:** `create_user_profile` RPC'si `SECURITY DEFINER` olarak çalışıyor — migration sırasıyla uygulanmadığında bozulur. Her deploy sonrası 001 → 007 sırasıyla yeniden çalıştırılmalı.

### 3. `calendarService.ts` Tamamlanmamış
- Takvim senkronizasyonu iskelet seviyesinde. `PomodoroSession.syncedToCalendar` alanı var ama backend yok.

### 4. `focusScore` Hesaplaması Eksik
- `PomodoroSession.focusScore` alanı type'ta tanımlı, hesaplama mantığı implement edilmemiş.

### 5. Demo Modu İzolasyonu
- Demo modu gerçek Supabase çağrılarını atlamıyor, sadece kaydetmiyor. RLS hatası alabilir.

---

## Geliştirme Öncelikleri (Sıralı)

1. **Supabase credentials → env vars** (güvenlik)
2. **RLS migration tekrarlanabilirliği** — tek script ya da Supabase CLI workflow
3. **`focusScore` algoritması** — oturum kalitesi skoru
4. **`calendarService` tamamlama** — Google Calendar / iCal export
5. **Demo modu Supabase izolasyonu** — gerçek DB çağrısı yapmamalı
6. **Mobil responsive iyileştirme** — geniş ekran varsayımlı layout'lar

---

## Önemli Kararlar ve Gerekçeler

| Karar | Gerekçe |
|-------|---------|
| Trigger yok, profil client'tan oluşturuluyor | Email confirmation açık olduğunda trigger tetiklenmiyor; `create_user_profile` RPC ile bypass edildi |
| `SECURITY DEFINER` RPC'ler | RLS recursive döngüsünü önlemek için; `is_room_member`, `is_room_host`, `get_friends` bu şekilde tanımlı |
| `room_code` 6 karakter alfanümerik | Karışıklık yaratan 0/O, 1/I/L karakterleri çıkarılmış |
| `user_a < user_b` kısıtı `co_work_pairs`'de | Aynı çifti iki yönde eklemesini engeller |
