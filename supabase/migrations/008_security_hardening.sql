-- FoClock AI: Güvenlik Sıkılaştırma Migration'ı
-- SECURITY.md bulgularını kapatır: H-1, H-2
-- Supabase SQL Editor'da çalıştırın. 007_cleanup_data.sql'den sonra.

-- ============================================================
-- [H-1] create_user_profile: anon erişimini kaldır, uid doğrula
-- ============================================================

-- Önce anon grant'i geri al
REVOKE EXECUTE ON FUNCTION create_user_profile(uuid, text, text, text, text, text, jsonb, jsonb) FROM anon;

-- Fonksiyonu güvenli versiyonla değiştir
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_field text,
  p_username text,
  p_username_lower text,
  p_preferences jsonb,
  p_project_tags jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Çağıran kişi kendi profilini mi oluşturuyor kontrol et
  -- auth.uid() NULL olabilir (email confirmation bekleyen yeni kayıt)
  -- Bu durumda auth.users tablosunda kaydın var olmasını zorunlu kıl
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Başka kullanıcı adına profil oluşturulamaz';
  END IF;

  -- Verilen user_id gerçekten auth.users tablosunda var mı?
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Geçersiz kullanıcı kimliği';
  END IF;

  INSERT INTO profiles (id, email, name, field, username, username_lower, preferences, project_tags)
  VALUES (p_user_id, p_email, p_name, p_field, p_username, p_username_lower, p_preferences, p_project_tags)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Yalnızca authenticated kullanıcılar çağırabilir
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text, text, text, text, jsonb, jsonb) TO authenticated;

-- ============================================================
-- [H-2] Room code: 6 → 8 karakter (32^8 ≈ 1 trilyon kombinasyon)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
  attempts int := 0;
BEGIN
  LOOP
    result := '';
    -- 8 karakter üret (eski: 6)
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM rooms WHERE room_code = result);
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Benzersiz oda kodu üretilemedi';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION generate_room_code() TO authenticated;
