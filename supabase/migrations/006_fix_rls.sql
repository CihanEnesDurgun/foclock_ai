-- RLS infinite recursion düzeltmesi: rooms <-> room_members döngüsünü kır
-- Supabase SQL Editor'da çalıştırın.

-- SECURITY DEFINER fonksiyonları (RLS bypass - recursion önler)
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

-- room_members politikasını güncelle (rooms'a direkt referans yerine is_room_host kullan)
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

-- rooms "Members can read room" politikasını güncelle (room_members'a direkt referans yerine is_room_member kullan)
DROP POLICY IF EXISTS "Members can read room" ON rooms;
CREATE POLICY "Members can read room" ON rooms FOR SELECT USING (
  auth.uid() = host_id OR is_room_member(id, auth.uid())
);
