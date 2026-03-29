import { sql } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const setPieceCategoryEnum = pgEnum("set_piece_category", [
  "offensive_corner_left",
  "offensive_corner_right",
  "defensive_corner_left",
  "defensive_corner_right",
  "direct_free_kick_central",
  "indirect_free_kick_wide",
  "attacking_throw_in",
  "defensive_throw_in",
]);

export const setPieceTemplatesTable = pgTable("set_piece_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  category: setPieceCategoryEnum("category").notNull(),
  description: text("description"),
  boardData: jsonb("board_data").$type<Record<string, unknown>>(),
  previewImageUrl: text("preview_image_url"),
  defaultRoles: jsonb("default_roles").$type<Array<{ name: string; description: string; startPosition: { x: number; y: number }; coachingPoint: string }>>(),
  coachingNote: text("coaching_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSetPieceTemplateSchema = createInsertSchema(setPieceTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSetPieceTemplate = z.infer<typeof insertSetPieceTemplateSchema>;
export type SetPieceTemplate = typeof setPieceTemplatesTable.$inferSelect;
