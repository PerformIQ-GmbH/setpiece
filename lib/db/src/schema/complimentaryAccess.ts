import { check, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { teamsTable } from "./teams";

export const complimentaryTiers = ["solo_coach", "team"] as const;

export const complimentaryAccessTable = pgTable("complimentary_access", {
  teamId: varchar("team_id").primaryKey().references(() => teamsTable.id, { onDelete: "cascade" }),
  tier: varchar("tier").$type<(typeof complimentaryTiers)[number]>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (table) => [
  check("complimentary_access_tier", sql`${table.tier} IN ('solo_coach', 'team')`),
]);

export const complimentaryAccessEventsTable = pgTable("complimentary_access_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  adminId: varchar("admin_id").notNull(),
  action: varchar("action").$type<"grant" | "revoke">().notNull(),
  tier: varchar("tier").$type<(typeof complimentaryTiers)[number]>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
