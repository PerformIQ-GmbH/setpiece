import { sql } from "drizzle-orm";
import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { teamsTable } from "./teams";

export const setPieceCollectionsTable = pgTable("set_piece_collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  // shortcut: deleted pieces are ignored on display and removed on edit; use a join table if immediate cleanup is needed.
  setPieceIds: varchar("set_piece_ids").array().notNull(),
}, table => [index("set_piece_collections_team_idx").on(table.teamId)]);
