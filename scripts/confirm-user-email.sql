-- FoClock AI: Tüm kullanıcı email'lerini manuel doğrulama
-- Bu script'i Supabase Dashboard → SQL Editor'da çalıştırın.
-- Tüm mevcut kullanıcıların email'lerini doğrular (geliştirme/test için)

-- Tüm doğrulanmamış kullanıcıların email'lerini doğrula
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;
