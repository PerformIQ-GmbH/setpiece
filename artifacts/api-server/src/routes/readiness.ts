import { Router, type IRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db, playersTable, playerReadinessTable, matchdaySetPiecesTable, matchdaysTable, setPiecesTable, setPieceRolesTable, roleAssignmentsTable } from "@workspace/db";
import { requireTeamAccess } from "../lib/authorization";
import { z } from "zod/v4";

const router: IRouter = Router();

const readinessQuerySchema = z.object({
  matchdayId: z.string().optional(),
  setPieceId: z.string().optional(),
});

router.get("/teams/:teamId/readiness", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const parsed = readinessQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.issues });
    return;
  }

  const { matchdayId, setPieceId: setPieceIdFilter } = parsed.data;

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.teamId, teamId));

  const pieceConditions = [eq(setPiecesTable.teamId, teamId)];
  if (setPieceIdFilter) {
    pieceConditions.push(eq(setPiecesTable.id, setPieceIdFilter));
  } else {
    pieceConditions.push(inArray(setPiecesTable.status, ["ready", "active_matchday"]));
  }
  if (matchdayId) {
    const [matchday] = await db.select({ id: matchdaysTable.id }).from(matchdaysTable).where(and(
      eq(matchdaysTable.id, matchdayId), eq(matchdaysTable.teamId, teamId),
    ));
    if (!matchday) {
      res.status(404).json({ error: "Matchday not found in this team" });
      return;
    }
    const mdSps = await db
      .select()
      .from(matchdaySetPiecesTable)
      .where(eq(matchdaySetPiecesTable.matchdayId, matchdayId));
    pieceConditions.push(inArray(setPiecesTable.id, mdSps.map((m) => m.setPieceId)));
  }

  const expectedAssignments = await db.select({
    playerId: roleAssignmentsTable.playerId,
    roleId: setPieceRolesTable.id,
    setPieceId: setPiecesTable.id,
    createdAt: setPieceRolesTable.createdAt,
    updatedAt: setPieceRolesTable.updatedAt,
  }).from(roleAssignmentsTable)
    .innerJoin(setPieceRolesTable, eq(roleAssignmentsTable.roleId, setPieceRolesTable.id))
    .innerJoin(setPiecesTable, eq(setPieceRolesTable.setPieceId, setPiecesTable.id))
    .where(and(...pieceConditions));
  const storedReadiness = players.length === 0 ? [] : await db.select().from(playerReadinessTable)
    .where(inArray(playerReadinessTable.playerId, players.map((player) => player.id)));

  const playersWithReadiness = [];
  let notOpened = 0;
  let opened = 0;
  let passed = 0;
  let needsReview = 0;

  for (const player of players) {
    const tasksBySetPiece = new Map<string, typeof expectedAssignments>();
    for (const assignment of expectedAssignments.filter((a) => a.playerId === player.id)) {
      const assignments = tasksBySetPiece.get(assignment.setPieceId) ?? [];
      assignments.push(assignment);
      tasksBySetPiece.set(assignment.setPieceId, assignments);
    }
    const readiness: Array<typeof playerReadinessTable.$inferSelect> = [...tasksBySetPiece.values()].map((assignments) => {
      const stored = storedReadiness.find((r) => r.playerId === player.id && r.setPieceId === assignments[0].setPieceId);
      if (stored && assignments.some((assignment) => assignment.roleId === stored.roleId)) return stored;
      const task = assignments[0];
      // Missing or previously reassigned work is pending; GET must never create database records.
      return {
        id: `pending:${player.id}:${task.setPieceId}`,
        playerId: player.id,
        setPieceId: task.setPieceId,
        roleId: task.roleId,
        status: "not_opened",
        lastOpenedAt: null,
        readyAt: null,
        quizCompletedAt: null,
        viewCount: 0,
        lastSeenSetPieceId: null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };
    });

    playersWithReadiness.push({ player, readiness });

    if (readiness.length === 0 || readiness.some((r) => r.status === "not_opened")) {
      notOpened++;
    } else {
      const statuses = readiness.map((r) => r.status);
      if (statuses.includes("needs_review")) {
        needsReview++;
      } else if (statuses.every((s) => s === "passed")) {
        passed++;
      } else if (statuses.some((s) => s === "opened" || s === "passed")) {
        opened++;
      } else {
        notOpened++;
      }
    }
  }

  res.json({
    summary: {
      total: players.length,
      notOpened,
      opened,
      passed,
      needsReview,
    },
    players: playersWithReadiness,
  });
});

export default router;
