import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, matchdaysTable, matchdaySetPiecesTable, setPiecesTable } from "@workspace/db";
import { requireCoachAccess, requireHeadCoachAccess, requireTeamAccess, parseParam } from "../lib/authorization";
import { checkEntitlement } from "../lib/entitlements";
import { z } from "zod/v4";

const router: IRouter = Router();

const createMatchdaySchema = z.object({
  title: z.string().min(1).max(255),
  date: z.string().optional(),
  opponent: z.string().max(255).optional(),
  notes: z.string().optional(),
});

const updateMatchdaySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  date: z.string().nullable().optional(),
  opponent: z.string().max(255).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const addSetPieceSchema = z.object({
  setPieceId: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

const removeSetPieceSchema = z.object({
  setPieceId: z.string().min(1),
});

router.get("/teams/:teamId/matchdays", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const matchdays = await db
    .select()
    .from(matchdaysTable)
    .where(eq(matchdaysTable.teamId, teamId));
  res.json(matchdays);
});

router.post("/teams/:teamId/matchdays", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  if (!(await checkEntitlement(teamId, "matchdays", res))) return;

  const parsed = createMatchdaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }
  const { title, date, opponent, notes } = parsed.data;

  const [matchday] = await db
    .insert(matchdaysTable)
    .values({
      teamId,
      title,
      date: date ? new Date(date) : null,
      opponent: opponent || null,
      notes: notes || null,
    })
    .returning();

  res.status(201).json(matchday);
});

router.get("/teams/:teamId/matchdays/:matchdayId", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const matchdayId = parseParam(req.params.matchdayId);
  const [matchday] = await db
    .select()
    .from(matchdaysTable)
    .where(and(eq(matchdaysTable.id, matchdayId), eq(matchdaysTable.teamId, teamId)));

  if (!matchday) {
    res.status(404).json({ error: "Matchday not found" });
    return;
  }

  const mdSetPieces = await db
    .select()
    .from(matchdaySetPiecesTable)
    .where(eq(matchdaySetPiecesTable.matchdayId, matchdayId));

  const setPieces = [];
  for (const mdsp of mdSetPieces) {
    const [sp] = await db
      .select()
      .from(setPiecesTable)
      .where(eq(setPiecesTable.id, mdsp.setPieceId));
    if (sp) setPieces.push(sp);
  }

  res.json({ ...matchday, setPieces });
});

router.patch("/teams/:teamId/matchdays/:matchdayId", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const parsed = updateMatchdaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const matchdayId = parseParam(req.params.matchdayId);
  const data = parsed.data;
  const updates: Record<string, unknown> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.date !== undefined) updates.date = data.date ? new Date(data.date) : null;
  if (data.opponent !== undefined) updates.opponent = data.opponent;
  if (data.notes !== undefined) updates.notes = data.notes;

  const [matchday] = await db
    .update(matchdaysTable)
    .set(updates)
    .where(and(eq(matchdaysTable.id, matchdayId), eq(matchdaysTable.teamId, teamId)))
    .returning();

  if (!matchday) {
    res.status(404).json({ error: "Matchday not found" });
    return;
  }
  res.json(matchday);
});

router.delete("/teams/:teamId/matchdays/:matchdayId", async (req, res): Promise<void> => {
  const teamId = await requireHeadCoachAccess(req, res);
  if (!teamId) return;

  const matchdayId = parseParam(req.params.matchdayId);
  const [deleted] = await db
    .delete(matchdaysTable)
    .where(and(eq(matchdaysTable.id, matchdayId), eq(matchdaysTable.teamId, teamId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Matchday not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/teams/:teamId/matchdays/:matchdayId/set-pieces", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const parsed = addSetPieceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const matchdayId = parseParam(req.params.matchdayId);
  const { setPieceId, sortOrder } = parsed.data;

  const [matchday] = await db
    .select()
    .from(matchdaysTable)
    .where(and(eq(matchdaysTable.id, matchdayId), eq(matchdaysTable.teamId, teamId)));
  if (!matchday) {
    res.status(404).json({ error: "Matchday not found" });
    return;
  }

  const [sp] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)));
  if (!sp) {
    res.status(404).json({ error: "Set piece not found in this team" });
    return;
  }

  const [entry] = await db
    .insert(matchdaySetPiecesTable)
    .values({
      matchdayId,
      setPieceId,
      sortOrder: sortOrder ?? 0,
    })
    .returning();

  res.status(201).json(entry);
});

router.delete("/teams/:teamId/matchdays/:matchdayId/set-pieces", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const parsed = removeSetPieceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const matchdayId = parseParam(req.params.matchdayId);
  const { setPieceId } = parsed.data;

  const [matchday] = await db
    .select()
    .from(matchdaysTable)
    .where(and(eq(matchdaysTable.id, matchdayId), eq(matchdaysTable.teamId, teamId)));
  if (!matchday) {
    res.status(404).json({ error: "Matchday not found" });
    return;
  }

  await db
    .delete(matchdaySetPiecesTable)
    .where(
      and(
        eq(matchdaySetPiecesTable.matchdayId, matchdayId),
        eq(matchdaySetPiecesTable.setPieceId, setPieceId),
      ),
    );

  res.sendStatus(204);
});

export default router;
