-- FoClock AI: Veri temizliği (sıfırdan test öncesi)
-- Sıra önemli. Supabase SQL Editor'da çalıştır.
-- auth.users için Authentication → Users üzerinden silme yapıyorsan 4. satırı atla.

DELETE FROM friend_requests;
DELETE FROM sessions;   -- sessions yoksa bu satırı atla
DELETE FROM profiles;
DELETE FROM auth.users; -- kullanıcıları Dashboard'dan siliyorsan bu satırı atla
