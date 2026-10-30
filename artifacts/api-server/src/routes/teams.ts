import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, teamsTable, membershipsTable } from "@workspace/db";
import { parseParam, requireTeamAccess, requireHeadCoachAccess } from "../lib/authorization";
import { z } from "zod/v4";
import pilotRouter from "./pilot";
import { teamPilotAccess } from "../lib/pilot";

const router: IRouter = Router();

const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  clubName: z.string().max(255).optional(),
  coachName: z.string().max(255).optional(),
  logoUrl: z.string().url().optional(),
  teamColors: z.any().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  clubName: z.string().max(255).nullable().optional(),
  coachName: z.string().max(255).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  teamColors: z.any().optional(),
});

router.get("/teams", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const memberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, req.user!.id));

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
    if (team) allTeams.push({ ...team, ...await teamPilotAccess(team.id, team.tier) });
  }

  res.json(allTeams);
});

router.post("/teams", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }
  const { name, clubName, coachName, logoUrl, teamColors } = parsed.data;

  const [team] = await db
    .insert(teamsTable)
    .values({
      name: name.trim(),
      clubName: clubName || null,
      coachName: coachName || null,
      logoUrl: logoUrl || null,
      teamColors: teamColors || null,
      ownerId: req.user!.id,
    })
    .returning();

  await db.insert(membershipsTable).values({
    userId: req.user!.id,
    teamId: team.id,
    role: "head_coach",
  });

  res.status(201).json({ ...team, ...await teamPilotAccess(team.id, team.tier) });
});

router.get("/teams/:teamId", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const [team] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json({ ...team, ...await teamPilotAccess(team.id, team.tier) });
});

router.patch("/teams/:teamId", async (req, res): Promise<void> => {
  const teamId = await requireHeadCoachAccess(req, res);
  if (!teamId) return;

  const parsed = updateTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const updates: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.name !== undefined) updates.name = data.name;
  if (data.clubName !== undefined) updates.clubName = data.clubName;
  if (data.coachName !== undefined) updates.coachName = data.coachName;
  if (data.logoUrl !== undefined) updates.logoUrl = data.logoUrl;
  if (data.teamColors !== undefined) updates.teamColors = data.teamColors;

  const [team] = await db
    .update(teamsTable)
    .set(updates)
    .where(eq(teamsTable.id, teamId))
    .returning();

  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json({ ...team, ...await teamPilotAccess(team.id, team.tier) });
});

router.use(pilotRouter);
export default router;
