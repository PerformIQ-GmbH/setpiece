import { sql } from "drizzle-orm";
import { index, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { teamsTable } from "./teams";

export const teamInvitesTable = pgTable("team_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("idx_team_invites_token").on(table.token)]);

export type TeamInvite = typeof teamInvitesTable.$inferSelect;
