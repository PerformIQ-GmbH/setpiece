BEGIN;

CREATE TABLE IF NOT EXISTS complimentary_access (
  team_id varchar PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  tier varchar NOT NULL CONSTRAINT complimentary_access_tier CHECK (tier IN ('solo_coach', 'team')),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS complimentary_access_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id varchar NOT NULL,
  admin_id varchar NOT NULL,
  action varchar NOT NULL,
  tier varchar NOT NULL,
  expires_at timestamptz,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
