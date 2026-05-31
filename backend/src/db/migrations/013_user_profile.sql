-- Profil uživatele pro AI asistenta (hodnoty, cíle, styl, zájmy...)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}';
