import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable, playerReadinessTable, matchdaySetPiecesTable } from "@workspace/db";
import { requireTeamAccess } from "../lib/authorization";

const router: IRouter = Router();

router.get("/teams/:teamId/readiness", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const matchdayId = req.query.matchdayId as string | undefined;
  const setPieceIdFilter = req.query.setPieceId as string | undefined;

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.teamId, teamId));

  let setPieceIds: string[] | null = null;
  if (matchdayId) {
    const mdSps = await db
      .select()
      .from(matchdaySetPiecesTable)
      .where(eq(matchdaySetPiecesTable.matchdayId, matchdayId));
    setPieceIds = mdSps.map((m) => m.setPieceId);
  }

  const playersWithReadiness = [];
  let notOpened = 0;
  let opened = 0;
  let passed = 0;
  let needsReview = 0;

  for (const player of players) {
    let readiness = await db
      .select()
      .from(playerReadinessTable)
      .where(eq(playerReadinessTable.playerId, player.id));

    if (setPieceIds) {
      readiness = readiness.filter((r) => setPieceIds!.includes(r.setPieceId));
    }
    if (setPieceIdFilter) {
      readiness = readiness.filter((r) => r.setPieceId === setPieceIdFilter);
    }

    playersWithReadiness.push({ player, readiness });

    if (readiness.length === 0) {
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
