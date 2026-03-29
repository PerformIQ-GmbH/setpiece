import { sql } from "drizzle-orm";
import { pgEnum, pgTable, timestamp, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";
import { teamsTable } from "./teams";

export const memberRoleEnum = pgEnum("member_role", ["head_coach", "assistant_coach", "player"]);

export const membershipsTable = pgTable("memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  teamId: varchar("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("head_coach"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [unique("uq_membership").on(table.userId, table.teamId)]);

export const insertMembershipSchema = createInsertSchema(membershipsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Membership = typeof membershipsTable.$inferSelect;
