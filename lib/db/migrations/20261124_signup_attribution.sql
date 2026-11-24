-- Additive: nullable signup origin on users. Rollback: DROP the four columns.
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_utm_source varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_utm_medium varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_utm_campaign varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_referrer_host varchar(253);
