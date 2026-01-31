-- FoClock AI: AI Sohbet Geçmişi şeması
-- Supabase SQL Editor'da çalıştır. schema.sql ve schema-cowork-rooms.sql'den sonra çalıştırın.
-- Tekrarda idempotent.

-- 1. ai_conversations tablosu
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Yeni sohbet',
  planned_tasks jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own ai_conversations" ON ai_conversations;
CREATE POLICY "Users can manage own ai_conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. ai_messages tablosu
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Sadece kendi sohbetlerinin mesajlarına erişim
DROP POLICY IF EXISTS "Users can manage own ai_messages" ON ai_messages;
CREATE POLICY "Users can manage own ai_messages" ON ai_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_conversations ac
      WHERE ac.id = ai_messages.conversation_id AND ac.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations ac
      WHERE ac.id = ai_messages.conversation_id AND ac.user_id = auth.uid()
    )
  );
