import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, setPiecesTable, setPieceRolesTable, roleAssignmentsTable, auditEventsTable } from "@workspace/db";
import { requireTeamAccess, parseParam } from "../lib/authorization";

const router: IRouter = Router();

async function verifySetPieceBelongsToTeam(setPieceId: string, teamId: string): Promise<boolean> {
  const [sp] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)));
  return !!sp;
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
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);
  if (!(await verifySetPieceBelongsToTeam(setPieceId, teamId))) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const { name, description, startPosition, movementPath, coachingPoint, sortOrder } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [role] = await db
    .insert(setPieceRolesTable)
    .values({
      setPieceId,
      name,
      description: description || null,
      startPosition: startPosition || null,
      movementPath: movementPath || null,
      coachingPoint: coachingPoint || null,
      sortOrder: sortOrder ?? 0,
    })
    .returning();

  res.status(201).json(role);
});

router.patch("/teams/:teamId/set-pieces/:setPieceId/roles/:roleId", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);
  if (!(await verifySetPieceBelongsToTeam(setPieceId, teamId))) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const roleId = parseParam(req.params.roleId);
  const updates: Record<string, unknown> = {};
  const fields = ["name", "description", "startPosition", "movementPath", "coachingPoint", "sortOrder"];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
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
  const teamId = await requireTeamAccess(req, res);
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
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const setPieceId = parseParam(req.params.setPieceId);
  if (!(await verifySetPieceBelongsToTeam(setPieceId, teamId))) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const { roleId, playerId, backupPlayerId, notes } = req.body;
  if (!roleId || !playerId) {
    res.status(400).json({ error: "roleId and playerId are required" });
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
