CREATE TABLE IF NOT EXISTS saved_ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  messages JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sac_contact ON saved_ai_chats(contact_id);
CREATE INDEX IF NOT EXISTS idx_sac_user ON saved_ai_chats(user_id);
