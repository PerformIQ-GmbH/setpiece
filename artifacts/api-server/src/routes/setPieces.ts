import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  setPiecesTable,
  setPieceRolesTable,
  roleAssignmentsTable,
  playersTable,
  teamsTable,
  setPieceTemplatesTable,
  auditEventsTable,
} from "@workspace/db";
import { requireTeamAccess, parseParam } from "../lib/authorization";

const router: IRouter = Router();

router.get("/teams/:teamId/set-pieces", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  let pieces = await db
    .select()
    .from(setPiecesTable)
    .where(eq(setPiecesTable.teamId, teamId));

  const statusFilter = req.query.status as string | undefined;
  if (statusFilter) {
    pieces = pieces.filter((p) => p.status === statusFilter);
  }

  res.json(pieces);
});

router.post("/teams/:teamId/set-pieces", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const { title, category, description, boardData, coachingNotes, templateId } = req.body;

  if (!title || !category) {
    res.status(400).json({ error: "title and category are required" });
    return;
  }

  let finalBoardData = boardData;
  let finalRoles: Array<{
    name: string;
    description?: string;
    startPosition?: { x: number; y: number };
    coachingPoint?: string;
  }> = [];

  if (templateId) {
    const [template] = await db
      .select()
      .from(setPieceTemplatesTable)
      .where(eq(setPieceTemplatesTable.id, templateId));
    if (template) {
      if (!finalBoardData && template.boardData) finalBoardData = template.boardData;
      if (template.defaultRoles) finalRoles = template.defaultRoles;
    }
  }

  const [piece] = await db
    .insert(setPiecesTable)
    .values({
      teamId,
      title,
      category,
      description: description || null,
      boardData: finalBoardData || null,
      coachingNotes: coachingNotes || null,
      createdBy: req.user!.id,
      updatedBy: req.user!.id,
    })
    .returning();

  if (finalRoles.length > 0) {
    for (let i = 0; i < finalRoles.length; i++) {
      const role = finalRoles[i];
      await db.insert(setPieceRolesTable).values({
        setPieceId: piece.id,
        name: role.name,
        description: role.description || null,
        startPosition: role.startPosition || null,
        coachingPoint: role.coachingPoint || null,
        sortOrder: i,
      });
    }
  }

  await db.insert(auditEventsTable).values({
    teamId,
    userId: req.user!.id,
    eventType: "set_piece_created",
    entityType: "set_piece",
    entityId: piece.id,
    metadata: { title },
  });

  res.status(201).json(piece);
});

router.get("/teams/:teamId/set-pieces/:setPieceId", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);

  const [piece] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)));

  if (!piece) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const roles = await db
    .select()
    .from(setPieceRolesTable)
    .where(eq(setPieceRolesTable.setPieceId, setPieceId));

  const allAssignments = [];
  for (const role of roles) {
    const assigns = await db
      .select()
      .from(roleAssignmentsTable)
      .where(eq(roleAssignmentsTable.roleId, role.id));
    allAssignments.push(...assigns);
  }

  res.json({
    ...piece,
    roles,
    assignments: allAssignments,
  });
});

router.patch("/teams/:teamId/set-pieces/:setPieceId", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);

  const [existing] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)));

  if (!existing) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const updates: Record<string, unknown> = {
    updatedBy: req.user!.id,
  };
  const fields = ["title", "description", "boardData", "previewImageUrl", "coachingNotes"];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  if (req.body.boardData !== undefined) {
    updates.lastSavedBoardSnapshot = existing.boardData;
    updates.versionNumber = existing.versionNumber + 1;
  }

  const [piece] = await db
    .update(setPiecesTable)
    .set(updates)
    .where(eq(setPiecesTable.id, setPieceId))
    .returning();

  res.json(piece);
});

router.delete("/teams/:teamId/set-pieces/:setPieceId", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);
  const [deleted] = await db
    .delete(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }
  res.sendStatus(204);
});

router.patch("/teams/:teamId/set-pieces/:setPieceId/status", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);
  const { status } = req.body;

  if (!["draft", "ready", "active_matchday", "archived"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [piece] = await db
    .update(setPiecesTable)
    .set({ status, updatedBy: req.user!.id })
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)))
    .returning();

  if (!piece) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }
  res.json(piece);
});

router.get("/teams/:teamId/set-pieces/:setPieceId/match-pack", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  const [setPiece] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)));

  if (!team || !setPiece) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const roles = await db.select().from(setPieceRolesTable).where(eq(setPieceRolesTable.setPieceId, setPieceId));
  const assignmentsResult = [];

  for (const role of roles) {
    const [assignment] = await db.select().from(roleAssignmentsTable).where(eq(roleAssignmentsTable.roleId, role.id));
    if (assignment) {
      const [player] = await db.select().from(playersTable).where(eq(playersTable.id, assignment.playerId));
      let backupPlayer = null;
      if (assignment.backupPlayerId) {
        const [bp] = await db.select().from(playersTable).where(eq(playersTable.id, assignment.backupPlayerId));
        backupPlayer = bp || null;
      }
      assignmentsResult.push({ role, player, backupPlayer });
    } else {
      assignmentsResult.push({ role, player: null, backupPlayer: null });
    }
  }

  res.json({
    team,
    setPiece,
    roles,
    assignments: assignmentsResult,
  });
});

export default router;
