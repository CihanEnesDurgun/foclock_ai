-- FoClock AI: profiles tablosu RLS düzeltmesi
-- Bu script'i Supabase Dashboard → SQL Editor'da çalıştırın.
-- Kayıt ol (signup) sırasında "new row violates row-level security policy" hatasını giderir.

-- Önce aynı isimli politikalar varsa kaldır (tekrar çalıştırılabilir script)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Önce RLS'nin aktif olduğundan emin ol
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Yeni kullanıcı kendi profil satırını ekleyebilsin (kayıt anında)
-- auth.uid() kontrolü: kullanıcı kendi ID'si ile profil oluşturabilir
-- NOT: signUp() sonrası session otomatik oluşur (email confirmation kapalıysa)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Kullanıcı kendi profilini okuyabilsin
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 3. Kullanıcı kendi profilini güncelleyebilsin (tercihler vb.)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- OPSIYONEL (ÖNERİLEN): Database trigger ile otomatik profil oluşturma
-- Bu trigger, auth.users'a yeni kullanıcı eklendiğinde otomatik olarak profiles tablosuna kayıt ekler
-- Böylece client-side'dan profil oluşturma işlemi gerekmez ve RLS sorunları önlenir

-- Önce mevcut trigger'ı kaldır (varsa)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Trigger fonksiyonu oluştur
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, field, preferences, project_tags)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'field', 'General'),
    '{"theme": "dark", "language": "tr", "notifications": true}'::jsonb,
    '[]'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- NOT: Eğer bu trigger'ı kullanıyorsanız, authService.ts'deki register fonksiyonundan
-- profil insert işlemini kaldırabilirsiniz. Trigger otomatik olarak halledecektir.

-- Kontrol: Politikaların doğru oluşturulduğunu görmek için
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
