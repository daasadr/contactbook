-- Fotografie přímo u kontaktu (vizitky, fotky, dokumenty)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]';
