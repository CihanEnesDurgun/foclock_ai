# Changelog

## [1.2.0] – Username & Friends (2025-01-24)

### Username & Registration

- **Username at signup:** Required, unique, 3–30 chars (letters, numbers, underscore). Stored in `profiles` as `username` / `username_lower`.
- **Availability check:** Debounced (400ms) check before submit; real-time feedback (✓ / taken / invalid).
- **SQL migration:** `scripts/username-and-friends.sql` – run in Supabase SQL Editor before testing.

### Friends & Account

- **Account (HESAP) menu:** New right-sidebar module. Search users by username, send friend requests, view incoming requests, accept/reject.
- **Friend requests:** `friend_requests` table, RLS, RPCs `check_username_available`, `search_users_by_username`, `get_incoming_friend_requests`.
- **Auth:** Register includes username; login/session load `user.friends` via `getFriendIds`. Shared Supabase client in `services/supabase.ts`.

### Files Added

- `scripts/username-and-friends.sql`, `services/supabase.ts`, `services/friendService.ts`, `services/friendActivityService.ts` (mock).

---

## [1.1.0] – V1.1 B (2025-01-24)

### Visual & UX

- **Timer group:** Timer moved toward center; 25:00 aligned to the exact center of the ring.
- **Ready (HAZIR) bar:** Moved down to avoid overlap with the timer (`top` adjustment).
- **System Ready (SİSTEM HAZIR):** Moved directly below the watermark (FUFIT NEURAL ENGINE).
- **Watermark:** Opacity increased from 0.05 to 0.14 for better readability.
- **Bottom-left technical text:** Removed "BETA ACCESS: AUTHORIZED // NETWORK: STABLE // ENCRYPTION: 256-BIT AES".

### Brand & Localization

- **Fufu AI → Fufit AI:** All UI, locales, and AI service updated to Fufit AI.
- **Top-left header:** "FUFIT ARCHITECT" / "FUFIT MİMAR" removed; now **FUFİT AI** (TR) / **FUFIT AI** (EN) based on language.
- **Turkish İ/i:** Correct Turkish capitalization (İ, I) in motivation text and related strings.
- **Localization:** Architect title, welcome quote, and analyzing placeholder driven by `locales` (e.g. "Nöral analiz yapılıyor..." / "Neural analysis in progress...").

### Quotes

- **Rotating quotes:** Added a quote list below the timer (previously empty `""`), rotating every 20 seconds.
- **`quotes.ts`:** TR/EN lists, `getQuote(lang, index)`, `ROTATION_INTERVAL_MS`.
- **10 Turkish quotes:** Farabi, İbn Sina, Gazali, Hasan-ı Basri, Mevlana, İmam Şafii, İbn Haldun, Yunus Emre (English translations placeholder for now).
- **Chatbot area:** Left sidebar Fufit AI section unchanged (welcome quote + input). Rotating quotes only below the timer.

### GitHub Integration & Release

- **Version:** All version references updated to **V1.1 B** (v1.1.b):
  - Watermark: `FUFIT NEURAL ENGINE v1.1.b`
  - Neural Link: `v1.1 Beta`
  - Beta labels: `Beta v1.1`
  - Right panel: `Version: FoClock AI Neural Beta 1.1`
  - `package.json` → `"version": "1.1.0"`
- **Publishing:** This release is pushed to the `main` branch on GitHub. If Vercel is connected, deploys trigger automatically.
- **Release suggestion:** GitHub → Releases → "Draft a new release" → Tag `v1.1.0`, title `FoClock AI Neural Beta 1.1 (V1.1 B)`; use this CHANGELOG section as the release notes.

---

## [1.0.0] – V1.0 B

- Initial Neural Beta: Pomodoro timer, Fufit AI chatbot, queue, analytics, settings, Supabase auth, Gemini integration.
