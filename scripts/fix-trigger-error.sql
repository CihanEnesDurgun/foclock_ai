-- FoClock AI: Trigger hata düzeltmesi
-- Bu script'i Supabase Dashboard → SQL Editor'da çalıştırın.
-- 500 Internal Server Error hatasını giderir (trigger hatası)

-- Mevcut trigger'ı kaldır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Geliştirilmiş trigger fonksiyonu (hata yönetimi ile)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profil zaten varsa hata verme, sadece RETURN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Profil oluştur (hata olursa sessizce devam et)
  BEGIN
    INSERT INTO public.profiles (id, name, field, preferences, project_tags)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
      COALESCE(NEW.raw_user_meta_data->>'field', 'General'),
      '{"theme": "dark", "language": "tr", "notifications": true}'::jsonb,
      '[]'::jsonb
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Hata olursa log'la ama işlemi durdurma
      RAISE WARNING 'Profil oluşturulamadı: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
