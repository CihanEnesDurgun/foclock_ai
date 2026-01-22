-- FoClock AI: profiles tablosu RLS düzeltmesi
-- Bu script'i Supabase Dashboard → SQL Editor'da çalıştırın.
-- Kayıt ol (signup) sırasında "new row violates row-level security policy" hatasını giderir.

-- Önce aynı isimli politikalar varsa kaldır (tekrar çalıştırılabilir script)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 1. Yeni kullanıcı kendi profil satırını ekleyebilsin (kayıt anında)
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
  USING (auth.uid() = id);
