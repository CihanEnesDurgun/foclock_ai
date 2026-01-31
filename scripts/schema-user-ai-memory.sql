-- FoClock AI: Kullanıcı AI Bellek şeması
-- Kullanıcının çalışma alışkanlıklarını öğrenip planlamada kullanmak için.
-- Supabase SQL Editor'da çalıştır. schema-ai-chats.sql'den sonra çalıştırın.
-- Tekrarda idempotent.

-- user_ai_memory: extractNewInsights çıktıları
CREATE TABLE IF NOT EXISTS user_ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight text NOT NULL,
  source text NOT NULL DEFAULT 'conversation' CHECK (source IN ('conversation', 'session', 'manual')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_ai_memory_user_id ON user_ai_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_memory_created_at ON user_ai_memory(created_at DESC);

ALTER TABLE user_ai_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own ai memory" ON user_ai_memory;
CREATE POLICY "Users can manage own ai memory" ON user_ai_memory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
