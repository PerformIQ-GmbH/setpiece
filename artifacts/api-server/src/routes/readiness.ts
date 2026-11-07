import { Router, type IRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db, playersTable, playerReadinessTable, matchdaySetPiecesTable, matchdaysTable, setPiecesTable, setPieceRolesTable, roleAssignmentsTable, quizAttemptsTable } from "@workspace/db";
import { requireTeamAccess } from "../lib/authorization";
import { z } from "zod/v4";
import { playerContent, variantTask, taskReadiness, isVariantBoard } from "../lib/variantContent";

const router: IRouter = Router();
type ReadinessRow = { id: string; playerId: string; setPieceId: string; roleId: string | null; status: string; [key: string]: unknown };

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

  const pieces = await db.select().from(setPiecesTable).where(and(...pieceConditions));
  const currentRoles = pieces.length ? await db.select().from(setPieceRolesTable).where(inArray(setPieceRolesTable.setPieceId, pieces.map(piece => piece.id))) : [];
  const attempts = players.length && pieces.some(piece => piece.boardData?.publishedContent) ? await db.select().from(quizAttemptsTable).where(inArray(quizAttemptsTable.playerId, players.map(player => player.id))) : [];
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
    const readiness = [...tasksBySetPiece.values()].flatMap<ReadinessRow>((assignments) => {
      const stored = storedReadiness.find((r) => r.playerId === player.id && r.setPieceId === assignments[0].setPieceId);
      const piece = pieces.find(piece => piece.id === assignments[0].setPieceId);
      if (piece && (isVariantBoard(piece.boardData) || piece.boardData?.publishedContent)) {
        const content = playerContent(piece, currentRoles.filter(role => role.setPieceId === piece.id));
        if (!content?.publication) return [{ id: `pending:${player.id}:${piece.id}`, playerId: player.id, setPieceId: piece.id, roleId: assignments[0].roleId, status: "not_opened" }];
        if (isVariantBoard(content.piece.boardData)) return assignments.flatMap<ReadinessRow>(assignment => {
          const role = content.roles.find(role => role.id === assignment.roleId);
          if (!role) return [{ id: `pending:${player.id}:${piece.id}:${assignment.roleId}`, playerId: player.id, setPieceId: piece.id, roleId: assignment.roleId, status: "not_opened" }];
          return content.publication!.requiredVariantIds.map(id => taskReadiness(variantTask(content.piece, role, id), attempts, player.id, piece.id));
        });
      }
      if (stored && assignments.some((assignment) => assignment.roleId === stored.roleId)) return [stored];
      const task = assignments[0];
      // Missing or previously reassigned work is pending; GET must never create database records.
      return [{
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
      }];
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
