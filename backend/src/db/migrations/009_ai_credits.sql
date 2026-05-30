-- AI kredity pro uživatele (existující uživatelé dostanou 50 startovacích)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_credits INTEGER NOT NULL DEFAULT 50;

-- Historie kreditových transakcí
CREATE TABLE IF NOT EXISTS credit_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(20) NOT NULL, -- 'purchase', 'usage', 'gift', 'donation'
  credits      INTEGER NOT NULL DEFAULT 0, -- kladné = přidáno, záporné = spotřebováno
  amount_cents INTEGER,              -- cena v centech EUR (jen pro nákupy/donace)
  stripe_session_id TEXT,           -- Stripe checkout session ID
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ct_user ON credit_transactions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ct_stripe ON credit_transactions(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
