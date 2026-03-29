import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { setPieceRolesTable } from "./setPieceRoles";
import { playersTable } from "./players";

export const roleAssignmentsTable = pgTable("role_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").notNull().references(() => setPieceRolesTable.id, { onDelete: "cascade" }),
  playerId: varchar("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  backupPlayerId: varchar("backup_player_id").references(() => playersTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [unique("uq_role_assignment").on(table.roleId)]);

export const insertRoleAssignmentSchema = createInsertSchema(roleAssignmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRoleAssignment = z.infer<typeof insertRoleAssignmentSchema>;
export type RoleAssignment = typeof roleAssignmentsTable.$inferSelect;
