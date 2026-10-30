import { sql } from "drizzle-orm";
import { check, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { teamsTable } from "./teams";

export const pilotAccessTable = pgTable("pilot_access", {
  slot: integer("slot").primaryKey(),
  codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
  userId: varchar("user_id").unique().references(() => usersTable.id),
  teamId: varchar("team_id").unique().references(() => teamsTable.id),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (table) => [
  check("pilot_five_slots", sql`${table.slot} BETWEEN 1 AND 5`),
  check("pilot_hash_format", sql`${table.codeHash} ~ '^[a-f0-9]{64}$'`),
  check("pilot_claim_complete", sql`(${table.userId} IS NULL AND ${table.teamId} IS NULL AND ${table.redeemedAt} IS NULL AND ${table.expiresAt} IS NULL) OR (${table.userId} IS NOT NULL AND ${table.teamId} IS NOT NULL AND ${table.redeemedAt} IS NOT NULL AND ${table.expiresAt} IS NOT NULL AND ${table.expiresAt} = ${table.redeemedAt} + interval '720 hours')`),
]);
