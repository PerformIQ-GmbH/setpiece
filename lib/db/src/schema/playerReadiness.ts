import { sql } from "drizzle-orm";
import { integer, pgEnum, pgTable, timestamp, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";
import { setPiecesTable } from "./setPieces";
import { setPieceRolesTable } from "./setPieceRoles";

export const readinessStatusEnum = pgEnum("readiness_status", ["not_opened", "opened", "passed", "needs_review"]);

export const playerReadinessTable = pgTable("player_readiness", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  setPieceId: varchar("set_piece_id").notNull().references(() => setPiecesTable.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").references(() => setPieceRolesTable.id, { onDelete: "set null" }),
  status: readinessStatusEnum("status").notNull().default("not_opened"),
  lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
  readyAt: timestamp("ready_at", { withTimezone: true }),
  quizCompletedAt: timestamp("quiz_completed_at", { withTimezone: true }),
  viewCount: integer("view_count").notNull().default(0),
  lastSeenSetPieceId: varchar("last_seen_set_piece_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [unique("uq_player_readiness").on(table.playerId, table.setPieceId)]);

export const insertPlayerReadinessSchema = createInsertSchema(playerReadinessTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlayerReadiness = z.infer<typeof insertPlayerReadinessSchema>;
export type PlayerReadiness = typeof playerReadinessTable.$inferSelect;
