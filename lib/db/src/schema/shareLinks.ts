import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";
import { usersTable } from "./auth";

export const shareLinksTable = pgTable("share_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  playerScope: text("player_scope").array(),
  matchdayScope: varchar("matchday_scope"),
  allowedSetPieceIds: text("allowed_set_piece_ids").array(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  createdBy: varchar("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [index("idx_share_links_token").on(table.token)]);

export const insertShareLinkSchema = createInsertSchema(shareLinksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShareLink = z.infer<typeof insertShareLinkSchema>;
export type ShareLink = typeof shareLinksTable.$inferSelect;
