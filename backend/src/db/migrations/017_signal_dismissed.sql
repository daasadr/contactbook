-- Odložení kontaktu ze Signálu ("přetáhnutím do boku").
-- Nastavením na NOW() se kontakt ze Signálu skryje a odpočet začne znovu:
-- objeví se až po uplynutí radar_days od tohoto data (nebo od posledního zápisku).
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS signal_dismissed_at TIMESTAMPTZ;
