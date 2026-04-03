-- FoClock AI: Son görülme / Aktif (bağlı) durumu
-- Supabase SQL Editor'da çalıştır. schema.sql'den sonra.
-- Aktiflik = sisteme bağlı olmak (oturum açık olmasa da). last_seen_at ile takip.

-- 1. profiles'a son görülme zamanı
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- 2. RPC: Kullanıcı kendi last_seen_at günceller (heartbeat)
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION update_last_seen() TO authenticated;

-- 3. get_friends: dönüş tipi değiştiği için önce sil, sonra yeniden oluştur
DROP FUNCTION IF EXISTS get_friends();
CREATE OR REPLACE FUNCTION get_friends()
RETURNS TABLE(id uuid, username text, name text, last_seen_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH friend_ids AS (
    SELECT DISTINCT CASE
      WHEN from_user_id = auth.uid() THEN to_user_id
      WHEN to_user_id = auth.uid() THEN from_user_id
    END AS friend_id
    FROM friend_requests
    WHERE status = 'accepted' AND (from_user_id = auth.uid() OR to_user_id = auth.uid())
  )
  SELECT p.id, p.username, p.name, p.last_seen_at
  FROM profiles p
  INNER JOIN friend_ids f ON p.id = f.friend_id
  WHERE p.id IS NOT NULL
  ORDER BY p.name;
$$;
GRANT EXECUTE ON FUNCTION get_friends() TO authenticated;
