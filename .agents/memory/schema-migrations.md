---
name: Schema migrations are manual
description: lib/db/migrations SQL files are not auto-applied; prod breaks if dev DB is not migrated before publishing
---
SQL files in lib/db/migrations are NOT applied automatically (post-merge only runs pnpm install). If code referencing new columns is merged and published without applying the migration to the dev DB, Publish has no schema diff to carry to prod and every query on that table fails in production.

**Why:** On 2026-11-25 the signup-attribution columns were missing in dev and prod; production login returned 500 for all users.

**How to apply:** After merging work that adds a migration file, run the (additive) SQL against the dev DB, compare dev/prod information_schema, then have the user republish.
