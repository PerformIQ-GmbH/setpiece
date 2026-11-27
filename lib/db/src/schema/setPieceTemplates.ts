import { sql } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Normalized by the API (artifacts/api-server/src/lib/videoClip.ts). */
export type VideoClip = { url: string; provider: "youtube" | "vimeo" | "file"; videoId: string; hash?: string; startSec: number; endSec: number | null; title: string | null };

export const setPieceCategoryEnum = pgEnum("set_piece_category", [
  "offensive_corner_left",
  "offensive_corner_right",
  "defensive_corner_left",
  "defensive_corner_right",
  "direct_free_kick_central",
  "direct_free_kick_left",
  "direct_free_kick_right",
  "indirect_free_kick_wide",
  "indirect_free_kick_left",
  "indirect_free_kick_right",
  "attacking_throw_in",
  "defensive_throw_in",
  // Anstoss (nur Angriff, ganzes Spielfeld); Migration 20261127_kickoff_category.sql
  "kickoff",
]);

/** Einschätzung einer Vorlage für Trainer: Filter (level, against, juniors, needsHeader) und Erklärung (pros, cons, tip). */
export type TemplateProfile = {
  level: "easy" | "medium" | "hard";
  /** Gegen welche Abwehr oder Situation die Variante gedacht ist; leer bei Abwehr-Vorlagen und Einwürfen. */
  against: Array<"zone" | "man" | "hybrid" | "deep" | "high" | "wall" | "unset">;
  juniors: boolean;
  needsHeader: boolean;
  /** Trainingsaufwand in Alltagssprache, z. B. «2 × 15 Min.». */
  effort: string;
  pros: string[];
  cons: string[];
  /** Wichtigster Hinweis oder häufigster Fehler. */
  tip: string;
  /** research = aus Spielanalysen mit Quellen, ai = KI-gestützte Einschätzung aus Videoszene und Trainingslehre. */
  basis: "research" | "ai";
  sources?: Array<{ label: string; url: string }>;
};

export const setPieceTemplatesTable = pgTable("set_piece_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  category: setPieceCategoryEnum("category").notNull(),
  description: text("description"),
  boardData: jsonb("board_data").$type<Record<string, unknown>>(),
  previewImageUrl: text("preview_image_url"),
  defaultRoles: jsonb("default_roles").$type<Array<{ id?: string; name: string; description: string; startPosition: { x: number; y: number }; coachingPoint: string }>>(),
  coachingNote: text("coaching_note"),
  media: jsonb("media").$type<VideoClip[]>(),
  profile: jsonb("profile").$type<TemplateProfile>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [uniqueIndex("set_piece_templates_slug_idx").on(table.slug)]);

export const insertSetPieceTemplateSchema = createInsertSchema(setPieceTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSetPieceTemplate = z.infer<typeof insertSetPieceTemplateSchema>;
export type SetPieceTemplate = typeof setPieceTemplatesTable.$inferSelect;
