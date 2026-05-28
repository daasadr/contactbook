CREATE TABLE IF NOT EXISTS contact_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_a_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  contact_b_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_relationship CHECK (contact_a_id != contact_b_id),
  CONSTRAINT ordered_pair CHECK (contact_a_id::text < contact_b_id::text),
  UNIQUE(contact_a_id, contact_b_id)
);
CREATE INDEX IF NOT EXISTS idx_cr_a ON contact_relationships(contact_a_id);
CREATE INDEX IF NOT EXISTS idx_cr_b ON contact_relationships(contact_b_id);
CREATE INDEX IF NOT EXISTS idx_cr_user ON contact_relationships(user_id);
