-- FoClock AI: Username (unique) + Friend requests
-- Run in Supabase Dashboard → SQL Editor.
-- Idempotent where possible.

-- 1. Profiles: add username, username_lower
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_lower text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (username_lower) WHERE username_lower IS NOT NULL;

-- 2. Allow authenticated users to read id, username, name of other profiles (for search)
-- RLS: keep existing. We use RPC for search to limit columns.

-- 3. Friend requests table
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
CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can read own requests" ON friend_requests;
CREATE POLICY "Users can read own requests"
  ON friend_requests FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "To user can update request" ON friend_requests;
CREATE POLICY "To user can update request"
  ON friend_requests FOR UPDATE
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- 4. RPC: check username availability (anon callable for signup)
CREATE OR REPLACE FUNCTION check_username_available(u text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF u IS NULL OR length(trim(u)) < 3 THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE username_lower = lower(trim(u))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_username_available(text) TO anon;
GRANT EXECUTE ON FUNCTION check_username_available(text) TO authenticated;

-- 5. RPC: search users by username prefix (authenticated only)
CREATE OR REPLACE FUNCTION search_users_by_username(query text)
RETURNS TABLE(id uuid, username text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR length(trim(query)) < 2 THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.name
  FROM profiles p
  WHERE p.username_lower LIKE lower(trim(query)) || '%'
    AND p.id != auth.uid()
    AND p.username IS NOT NULL
  ORDER BY p.username_lower
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION search_users_by_username(text) TO authenticated;

-- 6. RPC: get incoming friend requests with from_user info
CREATE OR REPLACE FUNCTION get_incoming_friend_requests()
RETURNS TABLE(
  id uuid,
  from_user_id uuid,
  to_user_id uuid,
  status text,
  created_at timestamptz,
  from_username text,
  from_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.created_at,
         p.username AS from_username, p.name AS from_name
  FROM friend_requests fr
  JOIN profiles p ON p.id = fr.from_user_id
  WHERE fr.to_user_id = auth.uid() AND fr.status = 'pending'
  ORDER BY fr.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_incoming_friend_requests() TO authenticated;

-- 7. Update trigger: include username from metadata (optional)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, field, preferences, project_tags, username, username_lower)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'field', 'General'),
    '{"theme": "dark", "language": "tr", "notifications": true}'::jsonb,
    '[]'::jsonb,
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(lower(trim(NEW.raw_user_meta_data->>'username')), '')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- username taken (race) – insert without username; app can show error
    INSERT INTO public.profiles (id, name, field, preferences, project_tags, username, username_lower)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
      COALESCE(NEW.raw_user_meta_data->>'field', 'General'),
      '{"theme": "dark", "language": "tr", "notifications": true}'::jsonb,
      '[]'::jsonb,
      NULL,
      NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
