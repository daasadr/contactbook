-- ContactBook - Počáteční migrace
-- Spouští se pouze jednou; používá IF NOT EXISTS pro bezpečné opakování

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Uživatelé
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login  TIMESTAMPTZ
);

-- Refresh tokeny (httpOnly cookie auth)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Seznamy kontaktů
CREATE TABLE IF NOT EXISTS contact_lists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  template_type VARCHAR(50) NOT NULL DEFAULT 'custom',
  icon          VARCHAR(50) NOT NULL DEFAULT 'users',
  color         VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_lists_user_id ON contact_lists(user_id);

-- Definice polí (per seznam)
CREATE TABLE IF NOT EXISTS field_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id     UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  label       VARCHAR(255) NOT NULL,
  field_type  VARCHAR(50) NOT NULL,
  options     JSONB,
  placeholder TEXT,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_built_in BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  section     VARCHAR(100) NOT NULL DEFAULT 'general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_field_definitions_list_id ON field_definitions(list_id);

-- Kontakty
CREATE TABLE IF NOT EXISTS contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id     UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  first_name  VARCHAR(255) NOT NULL,
  last_name   VARCHAR(255),
  avatar_url  TEXT,
  custom_data JSONB NOT NULL DEFAULT '{}',
  is_starred  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_list_id ON contacts(list_id);
CREATE INDEX IF NOT EXISTS idx_contacts_custom_data ON contacts USING gin(custom_data);

-- Záznamy deníku ke kontaktu (Fáze 2)
CREATE TABLE IF NOT EXISTS contact_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title       VARCHAR(255),
  content     TEXT NOT NULL,
  event_date  DATE,
  tags        TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_events_contact_id ON contact_events(contact_id);

-- Úkoly a připomínky (Fáze 2)
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  due_date        TIMESTAMPTZ NOT NULL,
  notify_before   INTEGER[] DEFAULT '{30,1440}',
  is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE NOT is_completed;

-- Automatická aktualizace updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at') THEN
    CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'contact_lists_updated_at') THEN
    CREATE TRIGGER contact_lists_updated_at BEFORE UPDATE ON contact_lists
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'contacts_updated_at') THEN
    CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
