# ARCH.md — FoClock AI Mimari Yapısı

---

## 1. Genel Mimari

```
┌─────────────────────────────────────────────────┐
│                    TARAYICI                      │
│  ┌───────────────────────────────────────────┐  │
│  │         React + TypeScript (Vite)         │  │
│  │  App.tsx — tek sayfa, routing yok         │  │
│  │  Tailwind CSS — utility-first stil        │  │
│  └────────────┬──────────────┬───────────────┘  │
│               │              │                   │
│        services/          services/              │
│        supabase.ts        geminiService.ts        │
└───────────────┼──────────────┼───────────────────┘
                │              │
    ┌───────────▼──┐    ┌──────▼─────────────────┐
    │   Supabase   │    │  /api/gemini (Vercel)  │
    │  PostgreSQL  │    │  JWT · allowlist · RL  │
    │  Auth        │    └──────┬─────────────────┘
    │  Realtime    │           │ GEMINI_API_KEY
    └──────────────┘    ┌──────▼─────────────────┐
                        │   Google Gemini API    │
                        └────────────────────────┘
```

---

## 2. Frontend Yapısı

### 2.1 Teknoloji Stack
| Katman | Teknoloji |
|--------|-----------|
| Build | Vite 6.x |
| UI Kütüphanesi | React 19 |
| Dil | TypeScript (strict) |
| Stil | Tailwind CSS (Vite plugin) |
| State | React `useState` / `useEffect` — harici state kütüphanesi yok |
| Path Alias | `@` → `src/` |

### 2.2 Dizin Yapısı
```
src/
├── App.tsx                    — Uygulama kökü; auth state, panel yönetimi
├── index.tsx                  — React render giriş noktası
├── version.ts                 — Merkezi sürüm objesi (VERSION)
├── types/
│   └── index.ts               — Tüm interface ve enum tanımları
├── locales/
│   └── index.ts               — tr/en çeviri stringleri
├── quotes/
│   └── index.ts               — Motivasyon alıntıları listesi
└── services/                  — Tüm dış sistem erişimleri burada
    ├── supabase.ts
    ├── authService.ts
    ├── geminiService.ts
    ├── chatService.ts
    ├── friendService.ts
    ├── friendActivityService.ts
    ├── presenceService.ts
    ├── pairService.ts
    ├── roomService.ts
    ├── userMemoryService.ts
    └── calendarService.ts
```

### 2.3 Vite Konfigürasyonu (`vite.config.ts`)

Config'te `define` bloğu **bilinçli olarak yoktur**. Gemini anahtarı istemci
paketine hiçbir şekilde girmez; tüm yapay zekâ çağrıları `/api/gemini`
serverless proxy'sinden geçer.

```typescript
export default defineConfig(({ mode }) => {
  loadEnv(mode, '.', '');
  return {
    server: { port: 3000, host: '0.0.0.0' },
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } }
  };
});
```

> **Kritik kural:** Vite, `VITE_` önekli `process.env` değişkenlerini `define`
> bloğu olmasa bile pakete gömer. Bu yüzden hiçbir gizli değer `VITE_` önekiyle
> tanımlanmaz ve CI her build'de `dist/` içinde anahtar deseni arar.

`@tailwindcss/vite` plugin olarak kullanılıyor — ayrı PostCSS config yok.

---

## 3. Supabase Veritabanı Şeması

### 3.1 Tablo Bağımlılık Grafiği

```
auth.users (Supabase dahili)
    └── profiles (id = auth.uid())
            ├── friend_requests (from_user_id, to_user_id → profiles)
            ├── active_sessions (user_id → profiles)
            │       └── paired_with_user_id → profiles
            ├── sessions (user_id → profiles)
            ├── co_work_pairs (user_a, user_b → profiles, user_a < user_b)
            ├── pair_invites (from_user_id, to_user_id → profiles)
            ├── rooms (host_id → profiles)
            │       ├── room_members (room_id, user_id → profiles)
            │       └── room_sessions (room_id → rooms)
            ├── ai_conversations (user_id → profiles)
            │       └── ai_messages (conversation_id → ai_conversations)
            └── user_ai_memory (user_id → profiles)
```

### 3.2 Kritik Tablolar

#### `profiles`
```sql
id              uuid PRIMARY KEY  -- auth.uid() ile eşleşir
email           text
name            text
username        text
username_lower  text              -- UNIQUE INDEX; arama için normalize
field           text              -- Gemini context'ine beslenir
preferences     jsonb
project_tags    jsonb
```

#### `active_sessions`
```sql
user_id               uuid PRIMARY KEY
task_title            text
started_at            timestamptz
duration_minutes      integer
time_remaining_seconds integer
status                text   -- 'running' | 'paused'
updated_at            timestamptz
paired_with_user_id   uuid   -- Pair mode için
```

RLS: Kendi kaydını yaz; arkadaşlarının kaydını oku (`friend_requests.status = 'accepted'` koşuluyla).

#### `rooms` + `room_sessions`
Oda host'u `room_sessions`'ı yönetir. Üyeler Supabase Realtime kanalından değişiklikleri alır.

### 3.3 RLS Stratejisi

Recursive RLS sorununu önlemek için kritik okuma işlemleri `SECURITY DEFINER` RPC'lere taşındı:

| RPC | Amaç |
|-----|------|
| `create_user_profile` | Email confirmation aktifken profil oluşturma (RLS bypass) |
| `get_friends` | Kabul edilmiş arkadaş listesi |
| `get_incoming_friend_requests` | Gelen bekleyen istekler |
| `search_users_by_username` | Prefix tabanlı kullanıcı arama |
| `check_username_available` | Kayıt formunda müsaitlik kontrolü (anon erişimi var) |
| `is_room_member` | Oda üyelik kontrolü (room_members RLS'de recursive döngüyü önler) |
| `is_room_host` | Oda host kontrolü |
| `get_room_members_with_profiles` | Oda üye listesi |
| `join_room_by_code` | Kapasite kontrolü ile odaya katılma |
| `generate_room_code` | Çakışma korumalı benzersiz kod üretimi |
| `get_pending_pair_invites` | Bekleyen birlikte çalış davetleri |

---

## 4. Gemini API Entegrasyon Katmanı

### 4.1 İstek Akışı

```
kullanıcı girdisi
    ↓
geminiService.ts
    ├── kullanıcı profil bağlamı eklenir (field, projectTags)
    ├── user_ai_memory kayıtları prompt'a eklenir
    ├── ai_conversations geçmişi yüklenir (varsa)
    ↓
Gemini API (REST)
    ↓
yanıt parse → PlannedTask[] veya ChatMessage
    ↓
Supabase: ai_messages kayıt / active_sessions güncelleme
```

### 4.2 API Key Yönetimi

Anahtar yalnızca sunucu tarafında bulunur, hiçbir aşamada istemciye inmez.

- Geliştirme: `.env.local` → `GEMINI_API_KEY=...` (VITE_ öneki **yok**)
- Vercel: Environment Variables → `GEMINI_API_KEY`, Sensitive olarak işaretli
- İstemci `/api/gemini` proxy'sine `Authorization: Bearer <supabase_jwt>` ile gider
- Proxy JWT'yi Supabase Auth'a doğrulatır, ardından anahtarı `x-goog-api-key`
  header'ında Gemini'ye iletir

Proxy ayrıca model allowlist'i (`gemini-3-flash-preview`, `gemini-3-pro-preview`),
kullanıcı başına rate limit ve payload boyut sınırı uygular. Ayrıntı:
[`SECURITY.md`](SECURITY.md)

### 4.3 Hata Yönetimi
Gemini yanıtı beklenen format dışındaysa parse hatası loglanır, kullanıcıya genel hata mesajı gösterilir. Retry mekanizması yok (tek istek prensibi).

---

## 5. Realtime Katmanı

Supabase Realtime şu tablolar için kullanılıyor:

| Tablo | Amaç |
|-------|------|
| `active_sessions` | Arkadaş aktivite takibi |
| `room_sessions` | Oda timer senkronizasyonu |
| `presence` (channel) | Online/offline durumu |

`presenceService.ts` Supabase Presence kanalını yönetir. Her bağlı kullanıcı kanal üzerinden heartbeat gönderir.

---

## 6. Build ve Deploy

```bash
npm run build  # Vite → dist/
# Output: dist/ (Vercel tarafından serve edilir)
```

`vercel.json` → tüm rotalar `index.html`'e yönlendirilir (SPA rewrite kuralı).

Ortam değişkenleri Vercel panelinden `GEMINI_API_KEY` olarak tanımlanır; `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` henüz env'e taşınmamış (teknik borç).
