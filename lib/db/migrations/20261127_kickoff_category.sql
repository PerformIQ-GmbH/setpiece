-- Additive: neue Kategorie «kickoff» (Anstoss) im Enum set_piece_category. Bestehende Zeilen bleiben unberührt.
-- Reihenfolge beim Deploy: Backup -> diese Migration -> App-Deploy -> Bibliotheksskript
-- (pnpm --filter @workspace/scripts template-library -- --apply stellt die zwei Anstoss-Vorlagen von attacking_throw_in auf kickoff um).
-- Der neue Wert darf in derselben Transaktion nicht verwendet werden; diese Datei enthält deshalb keine Daten-Updates.
-- Rollback: PostgreSQL kennt kein DROP VALUE. Zeilen zurücksetzen mit
--   UPDATE set_piece_templates SET category = 'attacking_throw_in' WHERE category = 'kickoff';
--   UPDATE set_pieces SET category = 'attacking_throw_in' WHERE category = 'kickoff';
-- Der ungenutzte Enumwert darf bleiben (harmlos); entfernen nur über Neuanlage des Typs, nicht im laufenden Betrieb.
ALTER TYPE set_piece_category ADD VALUE IF NOT EXISTS 'kickoff';
