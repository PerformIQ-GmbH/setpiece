import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, setPiecesTable, setPieceRolesTable, roleAssignmentsTable, playersTable } from "@workspace/db";
import { requireCoachAccess, parseParam } from "../lib/authorization";
import { scorePlayerForRole } from "../lib/roleSuitability";
import { z } from "zod/v4";

const router: IRouter = Router();

const ghostSubSchema = z.object({
  playerOutId: z.string().min(1),
  playerInId: z.string().min(1),
});

router.post("/teams/:teamId/set-pieces/:setPieceId/ghost", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const parsed = ghostSubSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const setPieceId = parseParam(req.params.setPieceId);

  const [sp] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, teamId)));
  if (!sp) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const { playerOutId, playerInId } = parsed.data;

  const [playerOut] = await db.select().from(playersTable).where(and(eq(playersTable.id, playerOutId), eq(playersTable.teamId, teamId)));
  const [playerIn] = await db.select().from(playersTable).where(and(eq(playersTable.id, playerInId), eq(playersTable.teamId, teamId)));

  if (!playerOut || !playerIn) {
    res.status(404).json({ error: "Player not found in this team" });
    return;
  }

  const roles = await db
    .select()
    .from(setPieceRolesTable)
    .where(eq(setPieceRolesTable.setPieceId, setPieceId));

  const beforePositions = [];
  const afterPositions = [];
  const updatedRoleMapping = [];
  const warnings: string[] = [];
  const suitabilityHints: Array<{ roleId: string; roleName: string; hint: string; severity: string }> = [];

  for (const role of roles) {
    const [assignment] = await db
      .select()
      .from(roleAssignmentsTable)
      .where(eq(roleAssignmentsTable.roleId, role.id));

    if (!assignment) continue;

    const [assignedPlayer] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, assignment.playerId));

    if (!assignedPlayer) continue;

    beforePositions.push({
      roleId: role.id,
      roleName: role.name,
      playerId: assignedPlayer.id,
      playerName: `${assignedPlayer.firstName} ${assignedPlayer.lastName}`,
      position: role.startPosition || { x: 0, y: 0 },
    });

    if (assignment.playerId === playerOutId) {
      afterPositions.push({
        roleId: role.id,
        roleName: role.name,
        playerId: playerInId,
        playerName: `${playerIn.firstName} ${playerIn.lastName}`,
        position: role.startPosition || { x: 0, y: 0 },
        isGhost: true,
      });

      updatedRoleMapping.push({
        roleId: role.id,
        roleName: role.name,
        previousPlayerId: playerOutId,
        newPlayerId: playerInId,
      });

      const fit = scorePlayerForRole(playerIn, role);
      for (const caution of fit.cautions) {
        suitabilityHints.push({
          roleId: role.id,
          roleName: role.name,
          hint: `${playerIn.firstName}: ${caution}`,
          severity: fit.badge === "problem" ? "warning" : "info",
        });
      }
    } else {
      afterPositions.push({
        roleId: role.id,
        roleName: role.name,
        playerId: assignedPlayer.id,
        playerName: `${assignedPlayer.firstName} ${assignedPlayer.lastName}`,
        position: role.startPosition || { x: 0, y: 0 },
        isGhost: false,
      });
    }
  }

  if (playerIn.status === "injured") {
    warnings.push(`${playerIn.firstName} ${playerIn.lastName} is currently injured`);
  }
  if (playerIn.status === "suspended") {
    warnings.push(`${playerIn.firstName} ${playerIn.lastName} is currently suspended`);
  }

  res.json({
    beforePositions,
    afterPositions,
    updatedRoleMapping,
    warnings,
    suitabilityHints,
  });
});

export default router;
