-- Additive migration only. Back up and verify restoration before applying.
-- Seed exactly five independently generated code hashes in the same transaction.
CREATE TABLE IF NOT EXISTS pilot_access (
  slot integer PRIMARY KEY CHECK (slot BETWEEN 1 AND 5),
  code_hash varchar(64) NOT NULL UNIQUE CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  user_id varchar UNIQUE REFERENCES users(id),
  team_id varchar UNIQUE REFERENCES teams(id),
  redeemed_at timestamptz,
  expires_at timestamptz,
  CONSTRAINT pilot_claim_complete CHECK (
    (user_id IS NULL AND team_id IS NULL AND redeemed_at IS NULL AND expires_at IS NULL)
    OR
    (user_id IS NOT NULL AND team_id IS NOT NULL AND redeemed_at IS NOT NULL
      AND expires_at IS NOT NULL AND expires_at = redeemed_at + interval '720 hours')
  )
);
