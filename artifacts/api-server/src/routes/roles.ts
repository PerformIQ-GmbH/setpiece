import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, setPiecesTable, setPieceRolesTable, roleAssignmentsTable, playersTable, auditEventsTable } from "@workspace/db";
import { requireCoachAccess, requireTeamAccess, parseParam } from "../lib/authorization";
import { z } from "zod/v4";

const router: IRouter = Router();

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  startPosition: z.object({ x: z.number(), y: z.number() }).optional(),
  movementPath: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  coachingPoint: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const updateRoleSchema = createRoleSchema.partial();

const upsertAssignmentSchema = z.object({
  roleId: z.string().min(1),
  playerId: z.string().min(1),
  backupPlayerId: z.string().optional(),
  notes: z.string().optional(),
});

async function verifySetPieceBelongsToTeam(setPieceId: string, teamId: string): Promise<boolean> {
  const [sp] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)));
  return !!sp;
}

async function verifyPlayerBelongsToTeam(playerId: string, teamId: string): Promise<boolean> {
  const [p] = await db
    .select()
    .from(playersTable)
    .where(and(eq(playersTable.id, playerId), eq(playersTable.teamId, teamId)));
  return !!p;
}

router.get("/teams/:teamId/set-pieces/:setPieceId/roles", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);
  if (!(await verifySetPieceBelongsToTeam(setPieceId, teamId))) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const roles = await db
    .select()
    .from(setPieceRolesTable)
    .where(eq(setPieceRolesTable.setPieceId, setPieceId));
  res.json(roles);
});

router.post("/teams/:teamId/set-pieces/:setPieceId/roles", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const parsed = createRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const setPieceId = parseParam(req.params.setPieceId);
  if (!(await verifySetPieceBelongsToTeam(setPieceId, teamId))) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const data = parsed.data;
  const [role] = await db
    .insert(setPieceRolesTable)
    .values({
      setPieceId,
      name: data.name,
      description: data.description || null,
      startPosition: data.startPosition || null,
      movementPath: data.movementPath || null,
      coachingPoint: data.coachingPoint || null,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning();

  res.status(201).json(role);
});

router.patch("/teams/:teamId/set-pieces/:setPieceId/roles/:roleId", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const setPieceId = parseParam(req.params.setPieceId);
  if (!(await verifySetPieceBelongsToTeam(setPieceId, teamId))) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const roleId = parseParam(req.params.roleId);
  const updates: Record<string, unknown> = {};
  const data = parsed.data;
  const fields = ["name", "description", "startPosition", "movementPath", "coachingPoint", "sortOrder"] as const;
  for (const f of fields) {
    if (data[f] !== undefined) updates[f] = data[f];
  }

  const [role] = await db
    .update(setPieceRolesTable)
    .set(updates)
    .where(and(eq(setPieceRolesTable.id, roleId), eq(setPieceRolesTable.setPieceId, setPieceId)))
    .returning();

  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  res.json(role);
});

router.delete("/teams/:teamId/set-pieces/:setPieceId/roles/:roleId", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);
  if (!(await verifySetPieceBelongsToTeam(setPieceId, teamId))) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const roleId = parseParam(req.params.roleId);
  await db.delete(setPieceRolesTable).where(
    and(eq(setPieceRolesTable.id, roleId), eq(setPieceRolesTable.setPieceId, setPieceId)),
  );
  res.sendStatus(204);
});

router.get("/teams/:teamId/set-pieces/:setPieceId/assignments", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);
  if (!(await verifySetPieceBelongsToTeam(setPieceId, teamId))) {
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

  res.json(allAssignments);
});

router.put("/teams/:teamId/set-pieces/:setPieceId/assignments", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const parsed = upsertAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const setPieceId = parseParam(req.params.setPieceId);
  if (!(await verifySetPieceBelongsToTeam(setPieceId, teamId))) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const { roleId, playerId, backupPlayerId, notes } = parsed.data;

  if (!(await verifyPlayerBelongsToTeam(playerId, teamId))) {
    res.status(400).json({ error: "Player does not belong to this team" });
    return;
  }

  if (backupPlayerId && !(await verifyPlayerBelongsToTeam(backupPlayerId, teamId))) {
    res.status(400).json({ error: "Backup player does not belong to this team" });
    return;
  }

  const [role] = await db
    .select()
    .from(setPieceRolesTable)
    .where(and(eq(setPieceRolesTable.id, roleId), eq(setPieceRolesTable.setPieceId, setPieceId)));
  if (!role) {
    res.status(404).json({ error: "Role not found in this set piece" });
    return;
  }

  const existing = await db
    .select()
    .from(roleAssignmentsTable)
    .where(eq(roleAssignmentsTable.roleId, roleId));

  let assignment;
  if (existing.length > 0) {
    [assignment] = await db
      .update(roleAssignmentsTable)
      .set({
        playerId,
        backupPlayerId: backupPlayerId || null,
        notes: notes || null,
      })
      .where(eq(roleAssignmentsTable.roleId, roleId))
      .returning();
  } else {
    [assignment] = await db
      .insert(roleAssignmentsTable)
      .values({
        roleId,
        playerId,
        backupPlayerId: backupPlayerId || null,
        notes: notes || null,
      })
      .returning();
  }

  await db.insert(auditEventsTable).values({
    teamId,
    userId: req.user!.id,
    eventType: "assignment_changed",
    entityType: "role_assignment",
    entityId: assignment.id,
    metadata: { roleId, playerId },
  });

  res.json(assignment);
});

export default router;
