import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable, playerReadinessTable, matchdaySetPiecesTable } from "@workspace/db";
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
