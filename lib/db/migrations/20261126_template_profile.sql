-- Additive: Einschätzung je Vorlage (Niveau, Passt gegen, Vor-/Nachteile, Quellen) für Filter und Erklärung.
-- Rollback: ALTER TABLE set_piece_templates DROP COLUMN profile;
ALTER TABLE set_piece_templates ADD COLUMN IF NOT EXISTS profile jsonb;
