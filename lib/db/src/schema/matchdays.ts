import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";
import { setPiecesTable } from "./setPieces";

export type MatchdaySquad = {
  starters: string[];
  bench: string[];
};

export const matchdaysTable = pgTable("matchdays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  date: timestamp("date", { withTimezone: true }),
  opponent: varchar("opponent", { length: 255 }),
  notes: text("notes"),
  squad: jsonb("squad").$type<MatchdaySquad>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const matchdaySetPiecesTable = pgTable("matchday_set_pieces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchdayId: varchar("matchday_id").notNull().references(() => matchdaysTable.id, { onDelete: "cascade" }),
  setPieceId: varchar("set_piece_id").notNull().references(() => setPiecesTable.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMatchdaySchema = createInsertSchema(matchdaysTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMatchday = z.infer<typeof insertMatchdaySchema>;
export type Matchday = typeof matchdaysTable.$inferSelect;

export const insertMatchdaySetPieceSchema = createInsertSchema(matchdaySetPiecesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMatchdaySetPiece = z.infer<typeof insertMatchdaySetPieceSchema>;
export type MatchdaySetPiece = typeof matchdaySetPiecesTable.$inferSelect;
