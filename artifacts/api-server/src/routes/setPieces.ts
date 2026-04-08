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
import { requireTeamAccess, requireCoachAccess, requireHeadCoachAccess, parseParam } from "../lib/authorization";
import { checkEntitlement } from "../lib/entitlements";
import { z } from "zod/v4";

const router: IRouter = Router();

const createSetPieceSchema = z.object({
  title: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  description: z.string().optional(),
  boardData: z.any().optional(),
  coachingNotes: z.string().optional(),
  templateId: z.string().optional(),
});

const updateSetPieceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  boardData: z.any().optional(),
  previewImageUrl: z.string().nullable().optional(),
  coachingNotes: z.string().nullable().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["draft", "ready", "active_matchday", "archived"]),
});

const listSetPiecesQuerySchema = z.object({
  status: z.enum(["draft", "ready", "active_matchday", "archived"]).optional(),
});

router.get("/teams/:teamId/set-pieces", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const qParsed = listSetPiecesQuerySchema.safeParse(req.query);
  if (!qParsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: qParsed.error.issues });
    return;
  }

  let pieces = await db
    .select()
    .from(setPiecesTable)
    .where(eq(setPiecesTable.teamId, teamId));

  const statusFilter = qParsed.data.status;
  if (statusFilter) {
    pieces = pieces.filter((p) => p.status === statusFilter);
  }

  res.json(pieces);
});

router.post("/teams/:teamId/set-pieces", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  if (!(await checkEntitlement(teamId, "set_pieces", res))) return;

  const parsed = createSetPieceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }
  const { title, category, description, boardData, coachingNotes, templateId } = parsed.data;

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
      category: category as typeof setPiecesTable.$inferInsert.category,
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
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const parsed = updateSetPieceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const setPieceId = parseParam(req.params.setPieceId);

  const [existing] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)));

  if (!existing) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = {
    updatedBy: req.user!.id,
  };
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.boardData !== undefined) updates.boardData = data.boardData;
  if (data.previewImageUrl !== undefined) updates.previewImageUrl = data.previewImageUrl;
  if (data.coachingNotes !== undefined) updates.coachingNotes = data.coachingNotes;

  if (data.boardData !== undefined) {
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
  const teamId = await requireHeadCoachAccess(req, res);
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
  const teamId = await requireHeadCoachAccess(req, res);
  if (!teamId) return;

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const setPieceId = parseParam(req.params.setPieceId);
  const { status } = parsed.data;

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

router.put("/teams/:teamId/set-pieces/:setPieceId/preview", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);
  const previewSchema = z.object({
    previewImageUrl: z.string().url(),
  });
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const [piece] = await db
    .update(setPiecesTable)
    .set({ previewImageUrl: parsed.data.previewImageUrl, updatedBy: req.user!.id })
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)))
    .returning();

  if (!piece) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }
  res.json({ previewImageUrl: piece.previewImageUrl });
});

router.post("/teams/:teamId/set-pieces/:setPieceId/clone", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  if (!(await checkEntitlement(teamId, "set_pieces", res))) return;

  const setPieceId = parseParam(req.params.setPieceId);

  const [source] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)));

  if (!source) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const suffix = " (Copy)";
  const clonedTitle = source.title.length + suffix.length > 255
    ? source.title.slice(0, 255 - suffix.length) + suffix
    : source.title + suffix;

  const result = await db.transaction(async (tx) => {
    const [cloned] = await tx
      .insert(setPiecesTable)
      .values({
        teamId,
        title: clonedTitle,
        category: source.category,
        description: source.description,
        boardData: source.boardData,
        coachingNotes: source.coachingNotes,
        status: "draft",
        createdBy: req.user!.id,
        updatedBy: req.user!.id,
      })
      .returning();

    const sourceRoles = await tx
      .select()
      .from(setPieceRolesTable)
      .where(eq(setPieceRolesTable.setPieceId, setPieceId));

    const roleIdMap = new Map<string, string>();

    for (const sr of sourceRoles) {
      const [newRole] = await tx
        .insert(setPieceRolesTable)
        .values({
          setPieceId: cloned.id,
          name: sr.name,
          description: sr.description,
          startPosition: sr.startPosition,
          movementPath: sr.movementPath,
          coachingPoint: sr.coachingPoint,
          sortOrder: sr.sortOrder,
        })
        .returning();
      roleIdMap.set(sr.id, newRole.id);
    }

    for (const sr of sourceRoles) {
      const assigns = await tx
        .select()
        .from(roleAssignmentsTable)
        .where(eq(roleAssignmentsTable.roleId, sr.id));
      for (const a of assigns) {
        const newRoleId = roleIdMap.get(sr.id);
        if (newRoleId) {
          await tx.insert(roleAssignmentsTable).values({
            roleId: newRoleId,
            playerId: a.playerId,
            backupPlayerId: a.backupPlayerId,
            notes: a.notes,
          });
        }
      }
    }

    await tx.insert(auditEventsTable).values({
      teamId,
      userId: req.user!.id,
      eventType: "set_piece_created",
      entityType: "set_piece",
      entityId: cloned.id,
      metadata: { title: cloned.title, clonedFrom: setPieceId },
    });

    const newRoles = await tx
      .select()
      .from(setPieceRolesTable)
      .where(eq(setPieceRolesTable.setPieceId, cloned.id));

    const allAssignments = [];
    for (const role of newRoles) {
      const assigns = await tx
        .select()
        .from(roleAssignmentsTable)
        .where(eq(roleAssignmentsTable.roleId, role.id));
      allAssignments.push(...assigns);
    }

    return { ...cloned, roles: newRoles, assignments: allAssignments };
  });

  res.status(201).json(result);
});

router.get("/teams/:teamId/set-pieces/:setPieceId/preview", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);
  const [piece] = await db
    .select({ previewImageUrl: setPiecesTable.previewImageUrl })
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)));

  if (!piece) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }
  res.json({ previewImageUrl: piece.previewImageUrl });
});

export default router;
