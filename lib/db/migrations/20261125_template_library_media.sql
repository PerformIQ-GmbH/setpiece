-- Additive: reference video clips on set pieces and templates, stable template keys for the library sync.
-- Rollback: DROP COLUMN media on both tables, DROP COLUMN slug on set_piece_templates.
ALTER TABLE set_pieces ADD COLUMN IF NOT EXISTS media jsonb;
ALTER TABLE set_piece_templates ADD COLUMN IF NOT EXISTS media jsonb;
ALTER TABLE set_piece_templates ADD COLUMN IF NOT EXISTS slug varchar(100);
CREATE UNIQUE INDEX IF NOT EXISTS set_piece_templates_slug_idx ON set_piece_templates (slug);

-- Key the ten original templates so the library sync updates them instead of adding duplicates.
UPDATE set_piece_templates SET slug = v.slug
FROM (VALUES
  ('Near Post Flick', 'near-post-flick'),
  ('Back Post Bomb', 'back-post-bomb'),
  ('Far Post Overload', 'far-post-overload'),
  ('Zonal Wall', 'zonal-wall'),
  ('Man-Mark Press', 'man-mark-press'),
  ('Wall Buster', 'wall-buster'),
  ('Training Ground Special', 'training-ground-special'),
  ('Quick Wide Play', 'quick-wide-play'),
  ('Long Throw Flick', 'long-throw-flick'),
  ('Safe Outlet', 'safe-outlet')
) AS v(title, slug)
WHERE set_piece_templates.title = v.title AND set_piece_templates.slug IS NULL;
