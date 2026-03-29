import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, teamsTable, membershipsTable } from "@workspace/db";
import { parseParam } from "../lib/authorization";

const router: IRouter = Router();

router.get("/teams", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const memberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, req.user.id));

  if (memberships.length === 0) {
    res.json([]);
    return;
  }

  const allTeams = [];
  for (const m of memberships) {
    const [team] = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.id, m.teamId));
    if (team) allTeams.push(team);
  }

  res.json(allTeams);
});

router.post("/teams", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { name, clubName, coachName, logoUrl, teamColors } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Team name is required" });
    return;
  }

  const [team] = await db
    .insert(teamsTable)
    .values({
      name: name.trim(),
      clubName: clubName || null,
      coachName: coachName || null,
      logoUrl: logoUrl || null,
      teamColors: teamColors || null,
      ownerId: req.user.id,
    })
    .returning();

  await db.insert(membershipsTable).values({
    userId: req.user.id,
    teamId: team.id,
    role: "head_coach",
  });

  res.status(201).json(team);
});

router.get("/teams/:teamId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const teamId = parseParam(req.params.teamId);

  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.userId, req.user.id),
        eq(membershipsTable.teamId, teamId),
      ),
    );
  if (!membership) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [team] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(team);
});

router.patch("/teams/:teamId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const teamId = parseParam(req.params.teamId);

  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.userId, req.user.id),
        eq(membershipsTable.teamId, teamId),
      ),
    );
  if (!membership) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.clubName !== undefined) updates.clubName = req.body.clubName;
  if (req.body.coachName !== undefined) updates.coachName = req.body.coachName;
  if (req.body.logoUrl !== undefined) updates.logoUrl = req.body.logoUrl;
  if (req.body.teamColors !== undefined) updates.teamColors = req.body.teamColors;

  const [team] = await db
    .update(teamsTable)
    .set(updates)
    .where(eq(teamsTable.id, teamId))
    .returning();

  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(team);
});

export default router;
