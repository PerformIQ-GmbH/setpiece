import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { requireTeamAccess, parseParam } from "../lib/authorization";

const router: IRouter = Router();

router.get("/teams/:teamId/players", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  let players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.teamId, teamId));

  const statusFilter = req.query.status as string | undefined;
  const searchFilter = req.query.search as string | undefined;
  const tagFilter = req.query.tag as string | undefined;

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
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const { firstName, lastName, shirtNumber, dominantFoot, height, status, tags, headingStrength, speed, notes } = req.body;

  if (!firstName || !lastName) {
    res.status(400).json({ error: "firstName and lastName are required" });
    return;
  }

  const [player] = await db
    .insert(playersTable)
    .values({
      teamId,
      firstName,
      lastName,
      shirtNumber: shirtNumber ?? null,
      dominantFoot: dominantFoot ?? null,
      height: height ?? null,
      status: status ?? "active",
      tags: tags ?? null,
      headingStrength: headingStrength ?? null,
      speed: speed ?? null,
      notes: notes ?? null,
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
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const playerId = parseParam(req.params.playerId);
  const updates: Record<string, unknown> = {};
  const fields = ["firstName", "lastName", "shirtNumber", "dominantFoot", "height", "status", "tags", "headingStrength", "speed", "notes"];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
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
  const teamId = await requireTeamAccess(req, res);
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
