-- Digitální vizitka uživatele
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_card JSONB NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_card_button BOOLEAN NOT NULL DEFAULT FALSE;
-- Veřejná URL slug pro sdílení vizitky
ALTER TABLE users ADD COLUMN IF NOT EXISTS card_slug VARCHAR(50) UNIQUE;
