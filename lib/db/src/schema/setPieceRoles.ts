import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { setPiecesTable } from "./setPieces";

export const setPieceRolesTable = pgTable("set_piece_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  setPieceId: varchar("set_piece_id").notNull().references(() => setPiecesTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startPosition: jsonb("start_position").$type<{ x: number; y: number }>(),
  movementPath: jsonb("movement_path").$type<Array<{ x: number; y: number }>>(),
  coachingPoint: text("coaching_point"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSetPieceRoleSchema = createInsertSchema(setPieceRolesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSetPieceRole = z.infer<typeof insertSetPieceRoleSchema>;
export type SetPieceRole = typeof setPieceRolesTable.$inferSelect;
