-- Radar prahy pro jednotlivé seznamy (kolik dní bez kontaktu = upozornění)
ALTER TABLE contact_lists ADD COLUMN IF NOT EXISTS radar_days INTEGER NOT NULL DEFAULT 30;

-- Datum splnění úkolu je nepovinné
ALTER TABLE tasks ALTER COLUMN due_date DROP NOT NULL;
