import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, matchdaysTable, matchdaySetPiecesTable, setPiecesTable } from "@workspace/db";
import { requireTeamAccess, parseParam } from "../lib/authorization";

const router: IRouter = Router();

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
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const { title, date, opponent, notes } = req.body;
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

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
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const matchdayId = parseParam(req.params.matchdayId);
  const updates: Record<string, unknown> = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.date !== undefined) updates.date = req.body.date ? new Date(req.body.date) : null;
  if (req.body.opponent !== undefined) updates.opponent = req.body.opponent;
  if (req.body.notes !== undefined) updates.notes = req.body.notes;

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
  const teamId = await requireTeamAccess(req, res);
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
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const matchdayId = parseParam(req.params.matchdayId);
  const { setPieceId, sortOrder } = req.body;

  if (!setPieceId) {
    res.status(400).json({ error: "setPieceId is required" });
    return;
  }

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
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const matchdayId = parseParam(req.params.matchdayId);
  const { setPieceId } = req.body;

  if (!setPieceId) {
    res.status(400).json({ error: "setPieceId is required" });
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
