import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";
import { setPiecesTable } from "./setPieces";
import { setPieceRolesTable } from "./setPieceRoles";

export const quizAttemptsTable = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  setPieceId: varchar("set_piece_id").notNull().references(() => setPiecesTable.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").references(() => setPieceRolesTable.id),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  passed: boolean("passed"),
  score: integer("score"),
  answers: jsonb("answers").$type<Array<{ questionId: string; answer: unknown; correct: boolean }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttemptsTable).omit({ id: true, createdAt: true });
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttemptsTable.$inferSelect;
