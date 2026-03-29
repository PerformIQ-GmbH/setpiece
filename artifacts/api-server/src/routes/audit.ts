import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, auditEventsTable } from "@workspace/db";
import { requireTeamAccess } from "../lib/authorization";
import { z } from "zod/v4";

const router: IRouter = Router();

const eventTypes = [
  "set_piece_created",
  "set_piece_updated",
  "assignment_changed",
  "share_link_generated",
  "quiz_submitted",
  "readiness_changed",
  "matchday_created",
  "player_added",
  "player_removed",
] as const;

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  eventType: z.enum(eventTypes).optional(),
});

router.get("/teams/:teamId/audit", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const parsed = auditQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.issues });
    return;
  }

  const { limit, eventType } = parsed.data;

  const conditions = [eq(auditEventsTable.teamId, teamId)];
  if (eventType) {
    conditions.push(eq(auditEventsTable.eventType, eventType));
  }

  const events = await db
    .select()
    .from(auditEventsTable)
    .where(and(...conditions))
    .orderBy(desc(auditEventsTable.createdAt))
    .limit(limit);

  res.json(events);
});

export default router;
