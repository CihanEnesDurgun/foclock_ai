# FoClock AI – Supabase SQL

## Dosyalar

| Dosya | Açıklama |
|-------|----------|
| **`cleanup-data.sql`** | `friend_requests`, `sessions`, `profiles`, `auth.users` verisini siler. Sıfırdan test öncesi çalıştır. |
| **`schema.sql`** | Trigger kaldırır; `profiles` (username), `friend_requests`, RLS, RPC’leri kurar. Şema için tek script. |

## Sıra

1. **`cleanup-data.sql`** → Veri temizliği (sen Supabase’te query’leri silip bu DELETE’leri de çalıştırıyorsun).
2. **`schema.sql`** → Şemayı kur / güncelle.
3. Uygulamada **Kayıt Ol** → **Giriş Yap** ile test et.

**Not:** `sessions` tablosu yoksa `DELETE FROM sessions;` satırını sil veya yoruma al.

## Kontroller

- **E-posta:** `profiles` tablosunda `email` kolonu vardır; Table Editor'da görebilirsin. Asıl e-posta kaynağı **Authentication → Users** (`auth.users`) içindedir.
- **Yeni kayıt profiles'ta yok:** Authentication → Users'ta 2 kullanıcı, profiles'ta 1 ise profil insert başarısız demektir. Tarayıcı konsolunda `[authService] Profile insert failed:` log'una bak; ardından `schema.sql`'i (özellikle `email` + RLS) tekrar çalıştırıp kayıt denemesi yap.
