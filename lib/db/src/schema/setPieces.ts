import { sql } from "drizzle-orm";
import { integer, jsonb, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";
import { usersTable } from "./auth";
import { setPieceCategoryEnum } from "./setPieceTemplates";

export const setPieceStatusEnum = pgEnum("set_piece_status", ["draft", "ready", "active_matchday", "archived"]);

export const setPiecesTable = pgTable("set_pieces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  category: setPieceCategoryEnum("category").notNull(),
  status: setPieceStatusEnum("status").notNull().default("draft"),
  description: text("description"),
  boardData: jsonb("board_data").$type<Record<string, unknown>>(),
  previewImageUrl: text("preview_image_url"),
  versionNumber: integer("version_number").notNull().default(1),
  lastSavedBoardSnapshot: jsonb("last_saved_board_snapshot").$type<Record<string, unknown>>(),
  coachingNotes: text("coaching_notes"),
  createdBy: varchar("created_by").references(() => usersTable.id),
  updatedBy: varchar("updated_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSetPieceSchema = createInsertSchema(setPiecesTable).omit({ id: true, createdAt: true, updatedAt: true, versionNumber: true });
export type InsertSetPiece = z.infer<typeof insertSetPieceSchema>;
export type SetPiece = typeof setPiecesTable.$inferSelect;
