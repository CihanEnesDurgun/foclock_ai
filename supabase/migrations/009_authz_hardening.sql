-- FoClock AI: Yetkilendirme Sıkılaştırma Migration'ı
-- Kapatılan bulgular: Y-1 (friend_requests taraf değiştirme), Y-2 (client-side arkadaşlık kontrolü)
-- Supabase SQL Editor'da çalıştırın. 008_security_hardening.sql'den sonra.
-- Tekrarda idempotent.

-- ============================================================
-- Ortak yardımcı: iki kullanıcı gerçekten arkadaş mı?
-- SECURITY DEFINER — RLS bypass, politika içinden çağrılabilir.
-- ============================================================

CREATE OR REPLACE FUNCTION are_friends(p_a uuid, p_b uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'accepted'
      AND ((from_user_id = p_a AND to_user_id = p_b)
        OR (from_user_id = p_b AND to_user_id = p_a))
  );
$$;
GRANT EXECUTE ON FUNCTION are_friends(uuid, uuid) TO authenticated;

-- ============================================================
-- [Y-1] friend_requests: taraflar değiştirilemez, durum geçişleri sınırlı
--
-- Eski politika yalnızca `auth.uid() = to_user_id` kontrol ediyordu.
-- WITH CHECK ifadeleri OLD satırı göremediği için `from_user_id`'nin
-- değiştirilmesini engelleyemiyordu: saldırgan kendisine gelen herhangi bir
-- isteği alıp from_user_id'yi kurbanla değiştirip 'accepted' yaparak
-- rızasız arkadaşlık kurabiliyordu. Değişmezlik trigger ile zorlanır.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_friend_request_integrity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.from_user_id IS DISTINCT FROM OLD.from_user_id
     OR NEW.to_user_id IS DISTINCT FROM OLD.to_user_id THEN
    RAISE EXCEPTION 'Arkadaşlık isteğinin tarafları değiştirilemez';
  END IF;

  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Yalnızca bekleyen istekler güncellenebilir';
  END IF;

  IF NEW.status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Geçersiz istek durumu';
  END IF;

  -- created_at yeniden yazılamaz
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friend_request_integrity ON friend_requests;
CREATE TRIGGER trg_friend_request_integrity
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_friend_request_integrity();

-- Kendine istek gönderimi veritabanı seviyesinde de engellenir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'friend_requests_no_self'
  ) THEN
    ALTER TABLE friend_requests
      ADD CONSTRAINT friend_requests_no_self CHECK (from_user_id <> to_user_id) NOT VALID;
  END IF;
END $$;

-- ============================================================
-- [Y-2] pair_invites: davet yalnızca gönderen tarafından ve yalnızca
-- arkadaş olan kullanıcıya oluşturulabilir.
--
-- Eski politika `FOR ALL ... WITH CHECK (auth.uid() = from_user_id
-- OR auth.uid() = to_user_id)` idi; bu, başkası adına davet uydurmaya
-- izin veriyordu. Arkadaşlık kontrolü yalnızca client'ta yapılıyordu.
-- ============================================================

DROP POLICY IF EXISTS "Users can manage pair_invites" ON pair_invites;

DROP POLICY IF EXISTS "Users can send pair_invites" ON pair_invites;
CREATE POLICY "Users can send pair_invites" ON pair_invites FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
    AND from_user_id <> to_user_id
    AND are_friends(from_user_id, to_user_id)
  );

DROP POLICY IF EXISTS "Users can read own pair_invites" ON pair_invites;
CREATE POLICY "Users can read own pair_invites" ON pair_invites FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Yalnızca alıcı daveti kabul/reddedebilir
DROP POLICY IF EXISTS "Recipient can update pair_invite" ON pair_invites;
CREATE POLICY "Recipient can update pair_invite" ON pair_invites FOR UPDATE
  USING (auth.uid() = to_user_id) WITH CHECK (auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can delete own pair_invites" ON pair_invites;
CREATE POLICY "Users can delete own pair_invites" ON pair_invites FOR DELETE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- pair_invites için de taraf değişmezliği
CREATE OR REPLACE FUNCTION enforce_pair_invite_integrity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.from_user_id IS DISTINCT FROM OLD.from_user_id
     OR NEW.to_user_id IS DISTINCT FROM OLD.to_user_id THEN
    RAISE EXCEPTION 'Davetin tarafları değiştirilemez';
  END IF;
  IF NEW.status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Geçersiz davet durumu';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pair_invite_integrity ON pair_invites;
CREATE TRIGGER trg_pair_invite_integrity
  BEFORE UPDATE ON pair_invites
  FOR EACH ROW EXECUTE FUNCTION enforce_pair_invite_integrity();

-- ============================================================
-- [Y-2] co_work_pairs: eşleşme yalnızca arkadaşlar arasında kurulabilir.
--
-- Eski politika `FOR ALL ... WITH CHECK (auth.uid() = user_a OR
-- auth.uid() = user_b)` idi; taraflardan biri olmak yetiyordu, yani
-- herkes istediği kullanıcıyla zorla eşleşebiliyordu.
-- ============================================================

DROP POLICY IF EXISTS "Users can manage own co_work_pairs" ON co_work_pairs;

DROP POLICY IF EXISTS "Friends can create co_work_pairs" ON co_work_pairs;
CREATE POLICY "Friends can create co_work_pairs" ON co_work_pairs FOR INSERT
  WITH CHECK (
    (auth.uid() = user_a OR auth.uid() = user_b)
    AND are_friends(user_a, user_b)
  );

DROP POLICY IF EXISTS "Users can read own co_work_pairs" ON co_work_pairs;
CREATE POLICY "Users can read own co_work_pairs" ON co_work_pairs FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "Users can update own co_work_pairs" ON co_work_pairs;
CREATE POLICY "Users can update own co_work_pairs" ON co_work_pairs FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (
    (auth.uid() = user_a OR auth.uid() = user_b)
    AND are_friends(user_a, user_b)
  );

DROP POLICY IF EXISTS "Users can delete own co_work_pairs" ON co_work_pairs;
CREATE POLICY "Users can delete own co_work_pairs" ON co_work_pairs FOR DELETE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- ============================================================
-- [D-1] check_username_available: anonim sayım yüzeyini kapat
-- Kayıt formu oturum açmadan çalıştığı için anon erişimi korunur,
-- ancak çok kısa sorgular reddedilerek toplu sayım maliyeti artırılır.
-- Kalıcı çözüm: Supabase Auth rate limit + Captcha (Dashboard ayarı).
-- ============================================================

CREATE OR REPLACE FUNCTION check_username_available(u text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF u IS NULL OR length(trim(u)) < 3 THEN RETURN false; END IF;
  IF trim(u) !~ '^[a-zA-Z0-9_]+$' THEN RETURN false; END IF;
  RETURN NOT EXISTS (SELECT 1 FROM profiles WHERE username_lower = lower(trim(u)));
END;
$$;
