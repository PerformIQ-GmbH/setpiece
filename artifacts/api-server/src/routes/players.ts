import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { requireCoachAccess, requireHeadCoachAccess, requireTeamAccess, parseParam } from "../lib/authorization";
import { checkEntitlement } from "../lib/entitlements";
import { z } from "zod/v4";

const router: IRouter = Router();

const createPlayerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  shirtNumber: z.number().int().min(1).max(99).optional(),
  dominantFoot: z.enum(["left", "right", "both"]).optional(),
  height: z.number().min(100).max(230).optional(),
  status: z.enum(["active", "injured", "suspended", "inactive"]).optional(),
  tags: z.array(z.string()).optional(),
  headingStrength: z.number().int().min(1).max(10).optional(),
  speed: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
});

const updatePlayerSchema = createPlayerSchema.partial();

const listPlayersQuerySchema = z.object({
  status: z.enum(["active", "injured", "suspended", "inactive"]).optional(),
  search: z.string().max(100).optional(),
  tag: z.string().max(50).optional(),
});

router.get("/teams/:teamId/players", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const qParsed = listPlayersQuerySchema.safeParse(req.query);
  if (!qParsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: qParsed.error.issues });
    return;
  }

  let players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.teamId, teamId));

  const statusFilter = qParsed.data.status;
  const searchFilter = qParsed.data.search;
  const tagFilter = qParsed.data.tag;

  if (statusFilter) {
    players = players.filter((p) => p.status === statusFilter);
  }
  if (searchFilter) {
    const s = searchFilter.toLowerCase();
    players = players.filter(
      (p) =>
        p.firstName.toLowerCase().includes(s) ||
        p.lastName.toLowerCase().includes(s),
    );
  }
  if (tagFilter) {
    players = players.filter((p) => p.tags && p.tags.includes(tagFilter));
  }

  res.json(players);
});

router.post("/teams/:teamId/players", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  if (!(await checkEntitlement(teamId, "players", res))) return;

  const parsed = createPlayerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  const [player] = await db
    .insert(playersTable)
    .values({
      teamId,
      firstName: data.firstName,
      lastName: data.lastName,
      shirtNumber: data.shirtNumber ?? null,
      dominantFoot: data.dominantFoot ?? null,
      height: data.height ?? null,
      status: data.status ?? "active",
      tags: data.tags ?? null,
      headingStrength: data.headingStrength ?? null,
      speed: data.speed ?? null,
      notes: data.notes ?? null,
    })
    .returning();

  res.status(201).json(player);
});

router.get("/teams/:teamId/players/:playerId", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const playerId = parseParam(req.params.playerId);
  const [player] = await db
    .select()
    .from(playersTable)
    .where(and(eq(playersTable.id, playerId), eq(playersTable.teamId, teamId)));
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json(player);
});

router.patch("/teams/:teamId/players/:playerId", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const parsed = updatePlayerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const playerId = parseParam(req.params.playerId);
  const updates: Record<string, unknown> = {};
  const data = parsed.data;
  const fields = ["firstName", "lastName", "shirtNumber", "dominantFoot", "height", "status", "tags", "headingStrength", "speed", "notes"] as const;
  for (const f of fields) {
    if (data[f] !== undefined) updates[f] = data[f];
  }

  const [player] = await db
    .update(playersTable)
    .set(updates)
    .where(and(eq(playersTable.id, playerId), eq(playersTable.teamId, teamId)))
    .returning();

  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json(player);
});

router.delete("/teams/:teamId/players/:playerId", async (req, res): Promise<void> => {
  const teamId = await requireHeadCoachAccess(req, res);
  if (!teamId) return;

  const playerId = parseParam(req.params.playerId);
  const [deleted] = await db
    .delete(playersTable)
    .where(and(eq(playersTable.id, playerId), eq(playersTable.teamId, teamId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
