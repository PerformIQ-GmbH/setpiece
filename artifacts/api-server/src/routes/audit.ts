import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, auditEventsTable } from "@workspace/db";
import { requireTeamAccess } from "../lib/authorization";

const router: IRouter = Router();

router.get("/teams/:teamId/audit", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const eventTypeFilter = req.query.eventType as string | undefined;

  let events = await db
    .select()
    .from(auditEventsTable)
    .where(eq(auditEventsTable.teamId, teamId))
    .orderBy(desc(auditEventsTable.createdAt))
    .limit(limit);

  if (eventTypeFilter) {
    events = events.filter((e) => e.eventType === eventTypeFilter);
  }

  res.json(events);
});

export default router;
