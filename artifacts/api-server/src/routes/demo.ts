import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  teamsTable,
  playersTable,
  setPiecesTable,
  setPieceRolesTable,
  roleAssignmentsTable,
  matchdaysTable,
  matchdaySetPiecesTable,
  playerReadinessTable,
  membershipsTable,
} from "@workspace/db";

const router: IRouter = Router();

const DEMO_USER_ID = "demo-coach-001";

async function getDemoTeamId(): Promise<string | null> {
  const [membership] = await db
    .select({ teamId: membershipsTable.teamId })
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, DEMO_USER_ID))
    .limit(1);
  return membership?.teamId ?? null;
}

router.get("/demo/team", async (_req, res): Promise<void> => {
  const teamId = await getDemoTeamId();
  if (!teamId) {
    res.status(404).json({ error: "Demo team not found. Run seed first." });
    return;
  }

  const [team] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, teamId));

  if (!team) {
    res.status(404).json({ error: "Demo team not found" });
    return;
  }

  res.json(team);
});

router.get("/demo/teams/:teamId/players", async (req, res): Promise<void> => {
  const teamId = await getDemoTeamId();
  if (!teamId || req.params.teamId !== teamId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.teamId, teamId));

  res.json(players);
});

router.get("/demo/teams/:teamId/set-pieces", async (req, res): Promise<void> => {
  const teamId = await getDemoTeamId();
  if (!teamId || req.params.teamId !== teamId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const pieces = await db
    .select()
    .from(setPiecesTable)
    .where(eq(setPiecesTable.teamId, teamId));

  res.json(pieces);
});

router.get("/demo/teams/:teamId/set-pieces/:setPieceId", async (req, res): Promise<void> => {
  const teamId = await getDemoTeamId();
  if (!teamId || req.params.teamId !== teamId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [piece] = await db
    .select()
    .from(setPiecesTable)
    .where(
      and(
        eq(setPiecesTable.id, req.params.setPieceId),
        eq(setPiecesTable.teamId, teamId),
      ),
    );

  if (!piece) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const roles = await db
    .select()
    .from(setPieceRolesTable)
    .where(eq(setPieceRolesTable.setPieceId, piece.id));

  const assignments = await db
    .select()
    .from(roleAssignmentsTable)
    .where(
      eq(
        roleAssignmentsTable.roleId,
        roles[0]?.id ?? "",
      ),
    );

  const allAssignments = [];
  for (const role of roles) {
    const roleAssigns = await db
      .select()
      .from(roleAssignmentsTable)
      .where(eq(roleAssignmentsTable.roleId, role.id));
    allAssignments.push(...roleAssigns);
  }

  res.json({ ...piece, roles, assignments: allAssignments });
});

router.get("/demo/teams/:teamId/matchdays", async (req, res): Promise<void> => {
  const teamId = await getDemoTeamId();
  if (!teamId || req.params.teamId !== teamId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const matchdays = await db
    .select()
    .from(matchdaysTable)
    .where(eq(matchdaysTable.teamId, teamId));

  res.json(matchdays);
});

router.get("/demo/teams/:teamId/matchdays/:matchdayId", async (req, res): Promise<void> => {
  const teamId = await getDemoTeamId();
  if (!teamId || req.params.teamId !== teamId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [matchday] = await db
    .select()
    .from(matchdaysTable)
    .where(
      and(
        eq(matchdaysTable.id, req.params.matchdayId),
        eq(matchdaysTable.teamId, teamId),
      ),
    );

  if (!matchday) {
    res.status(404).json({ error: "Matchday not found" });
    return;
  }

  const setPieceLinks = await db
    .select()
    .from(matchdaySetPiecesTable)
    .where(eq(matchdaySetPiecesTable.matchdayId, matchday.id));

  const setPieceIds = setPieceLinks.map((l) => l.setPieceId);
  const pieces = [];
  for (const spId of setPieceIds) {
    const [sp] = await db
      .select()
      .from(setPiecesTable)
      .where(
        and(
          eq(setPiecesTable.id, spId),
          eq(setPiecesTable.teamId, teamId),
        ),
      );
    if (sp) pieces.push(sp);
  }

  res.json({ ...matchday, setPieces: pieces, matchdaySetPieces: setPieceLinks });
});

router.get("/demo/teams/:teamId/readiness", async (req, res): Promise<void> => {
  const teamId = await getDemoTeamId();
  if (!teamId || req.params.teamId !== teamId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.teamId, teamId));

  const readiness = await db
    .select()
    .from(playerReadinessTable);

  const playerIds = new Set(players.map((p) => p.id));
  const teamReadiness = readiness.filter((r) => playerIds.has(r.playerId));

  const summary = {
    notOpened: teamReadiness.filter((r) => r.status === "not_opened").length,
    opened: teamReadiness.filter((r) => r.status === "opened").length,
    passed: teamReadiness.filter((r) => r.status === "passed").length,
    needsReview: teamReadiness.filter((r) => r.status === "needs_review").length,
  };

  res.json({
    summary,
    details: teamReadiness.map((r) => ({
      ...r,
      player: players.find((p) => p.id === r.playerId),
    })),
  });
});

export default router;
