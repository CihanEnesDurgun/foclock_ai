# FoClock AI – Supabase SQL

Dosyalar `supabase/migrations/` altında kronolojik (uygulama sırası) isimlendirilmiştir.

## Dosyalar

| Dosya | Açıklama |
|-------|----------|
| **`007_cleanup_data.sql`** | `friend_requests`, `sessions`, `profiles`, `auth.users` verisini siler. Sıfırdan test öncesi isteğe bağlı çalıştır. |
| **`001_initial_schema.sql`** | Trigger kaldırır; `profiles` (username), `friend_requests`, RLS, RPC’leri kurar. Temel şema. |
| **`002_schema_cowork_rooms.sql`** | Birlikte Çalış + Odalar: `sessions`, `co_work_pairs`, `rooms`, `room_members`, `room_sessions`, RPC'ler. |
| **`003_schema_presence.sql`** | Son görülme / Aktif: `profiles.last_seen_at`, `update_last_seen`, `get_friends` güncellemesi. |
| **`004_schema_ai_chats.sql`** | AI Sohbet Geçmişi: `ai_conversations`, `ai_messages`, RLS. |
| **`005_schema_user_ai_memory.sql`** | Kullanıcı AI Belleği: `user_ai_memory` – çalışma alışkanlıklarını öğrenip planlamada kullanır. |
| **`006_fix_rls.sql`** | Odalar / `room_members` RLS sonsuz özyineleme düzeltmesi (`001` ve `002` sonrası, `002`’deki tablolar gerekir). |

## Sıra (Supabase SQL Editor)

1. İsteğe bağlı: **`007_cleanup_data.sql`** → Veri temizliği (sıfırdan test).
2. **`001_initial_schema.sql`** → Temel şema.
3. **`002_schema_cowork_rooms.sql`** → Birlikte Çalış ve Odalar.
4. **`003_schema_presence.sql`** → Son görülme / aktif.
5. **`004_schema_ai_chats.sql`** → AI sohbet geçmişi.
6. **`005_schema_user_ai_memory.sql`** → Kullanıcı AI belleği.
7. **`006_fix_rls.sql`** → Odalar RLS düzeltmesi (odalar şemasından sonra).
8. Uygulamada **Kayıt Ol** → **Giriş Yap** ile test et.

**Not:** `sessions` tablosu yoksa `007_cleanup_data.sql` içindeki `DELETE FROM sessions;` satırını sil veya yoruma al.

## Kontroller

- **E-posta:** `profiles` tablosunda `email` kolonu vardır; Table Editor'da görebilirsin. Asıl e-posta kaynağı **Authentication → Users** (`auth.users`) içindedir.
- **Yeni kayıt profiles'ta yok:** Authentication → Users'ta 2 kullanıcı, profiles'ta 1 ise profil insert başarısız demektir. Tarayıcı konsolunda `[authService] Profile insert failed:` log'una bak; ardından `001_initial_schema.sql`'i (özellikle `email` + RLS) tekrar çalıştırıp kayıt denemesi yap.
