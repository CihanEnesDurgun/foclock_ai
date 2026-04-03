-- FoClock AI: Birlikte Çalış + Odalar şeması
-- Supabase SQL Editor'da çalıştır. schema.sql'den sonra çalıştırın.
-- Tekrarda idempotent.

-- 1. sessions tablosu (yoksa oluştur - tamamlanan oturumlar için)
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_title text NOT NULL,
  duration_minutes integer NOT NULL,
  completed_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON sessions(completed_at);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own sessions" ON sessions;
CREATE POLICY "Users can manage own sessions" ON sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. active_sessions'a paired_with_user_id ekle (Birlikte Çalış için)
ALTER TABLE active_sessions ADD COLUMN IF NOT EXISTS paired_with_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. co_work_pairs tablosu (Birlikte Çalış - 2 kişi, herkes kendi timer'ı)
CREATE TABLE IF NOT EXISTS co_work_pairs (
  user_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);
ALTER TABLE co_work_pairs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own co_work_pairs" ON co_work_pairs;
CREATE POLICY "Users can manage own co_work_pairs" ON co_work_pairs FOR ALL
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- 4. rooms tablosu (max 15 üye, ortak timer)
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  room_code text NOT NULL UNIQUE,
  duration_minutes integer NOT NULL DEFAULT 25,
  max_members integer NOT NULL DEFAULT 15 CHECK (max_members BETWEEN 2 AND 15),
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host can manage own rooms" ON rooms;
CREATE POLICY "Host can manage own rooms" ON rooms FOR ALL USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

-- 5. room_members tablosu
CREATE TABLE IF NOT EXISTS room_members (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'member')),
  PRIMARY KEY (room_id, user_id)
);
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- RLS infinite recursion önleme: SECURITY DEFINER fonksiyonları (RLS bypass)
CREATE OR REPLACE FUNCTION is_room_member(p_room_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM room_members WHERE room_id = p_room_id AND user_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION is_room_host(p_room_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM rooms WHERE id = p_room_id AND host_id = p_user_id);
$$;
GRANT EXECUTE ON FUNCTION is_room_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_host(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can manage room_members" ON room_members;
CREATE POLICY "Users can manage room_members" ON room_members FOR ALL
  USING (
    auth.uid() = user_id
    OR is_room_host(room_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR is_room_host(room_id, auth.uid())
  );

-- rooms tablosuna "Members can read room" politikası (recursion yok - is_room_member RLS bypass)
DROP POLICY IF EXISTS "Members can read room" ON rooms;
CREATE POLICY "Members can read room" ON rooms FOR SELECT USING (
  auth.uid() = host_id OR is_room_member(id, auth.uid())
);

-- 6. room_sessions tablosu (ortak timer, ortak görev)
CREATE TABLE IF NOT EXISTS room_sessions (
  room_id uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  task_title text NOT NULL,
  duration_minutes integer NOT NULL,
  time_remaining_seconds integer NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused')),
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE room_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Room members can read room_sessions" ON room_sessions;
CREATE POLICY "Room members can read room_sessions" ON room_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_sessions.room_id AND rm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Room host can manage room_sessions" ON room_sessions;
CREATE POLICY "Room host can manage room_sessions" ON room_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_sessions.room_id AND r.host_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_sessions.room_id AND r.host_id = auth.uid())
);

-- 7. RPC: Benzersiz oda kodu oluştur
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
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM rooms WHERE room_code = result);
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Could not generate unique room code';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION generate_room_code() TO authenticated;

-- 8. RPC: Oda koduna katıl (oda varsa ve dolu değilse)
CREATE OR REPLACE FUNCTION join_room_by_code(p_room_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_room_id uuid;
  v_member_count int;
  v_max_members int;
BEGIN
  IF auth.uid() IS NULL OR p_room_code IS NULL OR trim(upper(p_room_code)) = '' THEN
    RETURN NULL;
  END IF;
  SELECT r.id, r.max_members INTO v_room_id, v_max_members
  FROM rooms r
  WHERE upper(trim(r.room_code)) = upper(trim(p_room_code));
  IF v_room_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT count(*) INTO v_member_count FROM room_members WHERE room_id = v_room_id;
  IF v_member_count >= v_max_members THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM room_members WHERE room_id = v_room_id AND user_id = auth.uid()) THEN
    RETURN v_room_id;
  END IF;
  INSERT INTO room_members (room_id, user_id, role) VALUES (v_room_id, auth.uid(), 'member')
  ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN v_room_id;
END;
$$;
GRANT EXECUTE ON FUNCTION join_room_by_code(text) TO authenticated;

-- 9. RPC: Oda üyelerini profil bilgileriyle getir
CREATE OR REPLACE FUNCTION get_room_members_with_profiles(p_room_id uuid)
RETURNS TABLE(user_id uuid, name text, username text, role text, joined_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT rm.user_id, p.name, p.username, rm.role, rm.joined_at
  FROM room_members rm
  JOIN profiles p ON p.id = rm.user_id
  WHERE rm.room_id = p_room_id
  AND EXISTS (SELECT 1 FROM room_members r2 WHERE r2.room_id = p_room_id AND r2.user_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION get_room_members_with_profiles(uuid) TO authenticated;

-- 10. pair_invites tablosu (Birlikte Çalış davet akışı)
CREATE TABLE IF NOT EXISTS pair_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);
ALTER TABLE pair_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage pair_invites" ON pair_invites;
CREATE POLICY "Users can manage pair_invites" ON pair_invites FOR ALL
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- 11. RPC: Bekleyen birlikte çalış davetleri (profil bilgisiyle)
CREATE OR REPLACE FUNCTION get_pending_pair_invites()
RETURNS TABLE(id uuid, from_user_id uuid, from_name text, from_username text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pi.id, pi.from_user_id, p.name AS from_name, p.username AS from_username, pi.created_at
  FROM pair_invites pi
  JOIN profiles p ON p.id = pi.from_user_id
  WHERE pi.to_user_id = auth.uid() AND pi.status = 'pending'
  ORDER BY pi.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION get_pending_pair_invites() TO authenticated;
