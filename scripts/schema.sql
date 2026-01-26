-- FoClock AI: Auth + Profiles + Friends şeması
-- Trigger yok; profil kayıt sonrası client'tan oluşturulur.
-- Supabase SQL Editor'da çalıştır. Tekrarda idempotent.

-- 1. Eski trigger kaldır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. Profiles: email (Table Editor’da görmek için) + username kolonları
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_lower text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (username_lower) WHERE username_lower IS NOT NULL;

-- 3. Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Friend requests tablosu + RLS
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
CREATE POLICY "Users can send friend requests" ON friend_requests FOR INSERT WITH CHECK (auth.uid() = from_user_id);
DROP POLICY IF EXISTS "Users can read own requests" ON friend_requests;
CREATE POLICY "Users can read own requests" ON friend_requests FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
DROP POLICY IF EXISTS "To user can update request" ON friend_requests;
CREATE POLICY "To user can update request" ON friend_requests FOR UPDATE
  USING (auth.uid() = to_user_id) WITH CHECK (auth.uid() = to_user_id);

-- 5. RPC: kullanıcı adı müsait mi (anon)
CREATE OR REPLACE FUNCTION check_username_available(u text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF u IS NULL OR length(trim(u)) < 3 THEN RETURN false; END IF;
  RETURN NOT EXISTS (SELECT 1 FROM profiles WHERE username_lower = lower(trim(u)));
END;
$$;
GRANT EXECUTE ON FUNCTION check_username_available(text) TO anon;
GRANT EXECUTE ON FUNCTION check_username_available(text) TO authenticated;

-- 6. RPC: kullanıcı adıyla ara
CREATE OR REPLACE FUNCTION search_users_by_username(query text)
RETURNS TABLE(id uuid, username text, name text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR length(trim(query)) < 2 THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.name FROM profiles p
  WHERE p.username_lower LIKE lower(trim(query)) || '%' AND p.id != auth.uid() AND p.username IS NOT NULL
  ORDER BY p.username_lower LIMIT 20;
END;
$$;
GRANT EXECUTE ON FUNCTION search_users_by_username(text) TO authenticated;

-- 7. RPC: gelen arkadaşlık istekleri
CREATE OR REPLACE FUNCTION get_incoming_friend_requests()
RETURNS TABLE(id uuid, from_user_id uuid, to_user_id uuid, status text, created_at timestamptz, from_username text, from_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.created_at, p.username AS from_username, p.name AS from_name
  FROM friend_requests fr
  JOIN profiles p ON p.id = fr.from_user_id
  WHERE fr.to_user_id = auth.uid() AND fr.status = 'pending'
  ORDER BY fr.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION get_incoming_friend_requests() TO authenticated;

-- 8. RPC: Email confirmation açıkken profil oluştur (SECURITY DEFINER, RLS bypass)
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
  INSERT INTO profiles (id, email, name, field, username, username_lower, preferences, project_tags)
  VALUES (p_user_id, p_email, p_name, p_field, p_username, p_username_lower, p_preferences, p_project_tags)
  ON CONFLICT (id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text, text, text, text, jsonb, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text, text, text, text, jsonb, jsonb) TO authenticated;

-- 9. RPC: Arkadaşları getir (SECURITY DEFINER, RLS bypass)
CREATE OR REPLACE FUNCTION get_friends()
RETURNS TABLE(id uuid, username text, name text) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH friend_ids AS (
    SELECT DISTINCT CASE 
      WHEN from_user_id = auth.uid() THEN to_user_id
      WHEN to_user_id = auth.uid() THEN from_user_id
    END AS friend_id
    FROM friend_requests
    WHERE status = 'accepted' AND (from_user_id = auth.uid() OR to_user_id = auth.uid())
  )
  SELECT p.id, p.username, p.name
  FROM profiles p
  INNER JOIN friend_ids f ON p.id = f.friend_id
  WHERE p.id IS NOT NULL
  ORDER BY p.name;
$$;
GRANT EXECUTE ON FUNCTION get_friends() TO authenticated;
