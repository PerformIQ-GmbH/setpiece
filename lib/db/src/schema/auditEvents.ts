import { sql } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";
import { usersTable } from "./auth";

export const auditEventTypeEnum = pgEnum("audit_event_type", [
  "set_piece_created",
  "set_piece_updated",
  "assignment_changed",
  "share_link_generated",
  "quiz_submitted",
  "readiness_changed",
  "matchday_created",
  "player_added",
  "player_removed",
]);

export const auditEventsTable = pgTable("audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => usersTable.id),
  eventType: auditEventTypeEnum("event_type").notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [index("idx_audit_events_team").on(table.teamId)]);

export const insertAuditEventSchema = createInsertSchema(auditEventsTable).omit({ id: true, createdAt: true });
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEventsTable.$inferSelect;
