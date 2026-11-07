CREATE TABLE IF NOT EXISTS set_piece_collections (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id varchar NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  set_piece_ids varchar[] NOT NULL
);

CREATE INDEX IF NOT EXISTS set_piece_collections_team_idx ON set_piece_collections (team_id);
