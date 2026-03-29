import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, auditEventsTable } from "@workspace/db";
import { requireTeamAccess } from "../lib/authorization";
import { z } from "zod/v4";

const router: IRouter = Router();

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  eventType: z.string().optional(),
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

  let events = await db
    .select()
    .from(auditEventsTable)
    .where(eq(auditEventsTable.teamId, teamId))
    .orderBy(desc(auditEventsTable.createdAt))
    .limit(limit);

  if (eventType) {
    events = events.filter((e) => e.eventType === eventType);
  }

  res.json(events);
});

export default router;
