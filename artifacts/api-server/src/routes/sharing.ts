import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import {
  db,
  shareLinksTable,
  teamsTable,
  setPiecesTable,
  setPieceRolesTable,
  roleAssignmentsTable,
  playerReadinessTable,
  playersTable,
  auditEventsTable,
  matchdaySetPiecesTable,
} from "@workspace/db";
import { requireCoachAccess, requireHeadCoachAccess, requireShareToken, isSetPieceInShareScope, parseParam } from "../lib/authorization";
import { checkEntitlement } from "../lib/entitlements";
import { z } from "zod/v4";

const router: IRouter = Router();

const createShareLinkSchema = z.object({
  playerScope: z.array(z.string()).optional(),
  matchdayScope: z.string().optional(),
  allowedSetPieceIds: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
});

const markReadySchema = z.object({
  playerId: z.string().min(1),
  setPieceId: z.string().min(1),
  roleId: z.string().optional(),
});

router.get("/teams/:teamId/share-links", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const links = await db
    .select()
    .from(shareLinksTable)
    .where(eq(shareLinksTable.teamId, teamId));
  res.json(links);
});

router.post("/teams/:teamId/share-links", async (req, res): Promise<void> => {
  const teamId = await requireHeadCoachAccess(req, res);
  if (!teamId) return;

  if (!(await checkEntitlement(teamId, "share_links", res))) return;

  const parsed = createShareLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const { playerScope, matchdayScope, allowedSetPieceIds, expiresAt } = parsed.data;
  const token = crypto.randomBytes(32).toString("hex");

  const [link] = await db
    .insert(shareLinksTable)
    .values({
      teamId,
      token,
      playerScope: playerScope || null,
      matchdayScope: matchdayScope || null,
      allowedSetPieceIds: allowedSetPieceIds || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user!.id,
    })
    .returning();

  await db.insert(auditEventsTable).values({
    teamId,
    userId: req.user!.id,
    eventType: "share_link_generated",
    entityType: "share_link",
    entityId: link.id,
    metadata: { token: link.token.substring(0, 8) + "..." },
  });

  res.status(201).json(link);
});

router.post("/teams/:teamId/share-links/:linkId/revoke", async (req, res): Promise<void> => {
  const teamId = await requireHeadCoachAccess(req, res);
  if (!teamId) return;

  const linkId = parseParam(req.params.linkId);

  const [link] = await db
    .update(shareLinksTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(shareLinksTable.id, linkId), eq(shareLinksTable.teamId, teamId)))
    .returning();

  if (!link) {
    res.status(404).json({ error: "Share link not found" });
    return;
  }
  res.json(link);
});

router.get("/p/:shareToken", async (req, res): Promise<void> => {
  const link = await requireShareToken(req, res);
  if (!link) return;

  const [team] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, link.teamId));

  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }

  let setPieceIds: string[] = [];

  if (link.allowedSetPieceIds && link.allowedSetPieceIds.length > 0) {
    setPieceIds = link.allowedSetPieceIds;
  } else if (link.matchdayScope) {
    const mdSps = await db
      .select()
      .from(matchdaySetPiecesTable)
      .where(eq(matchdaySetPiecesTable.matchdayId, link.matchdayScope));
    setPieceIds = mdSps.map((m) => m.setPieceId);
  } else {
    const allPieces = await db
      .select()
      .from(setPiecesTable)
      .where(eq(setPiecesTable.teamId, link.teamId));
    setPieceIds = allPieces
      .filter((p) => p.status === "ready" || p.status === "active_matchday")
      .map((p) => p.id);
  }

  const setPiecesResult = [];
  for (const spId of setPieceIds) {
    const [sp] = await db
      .select()
      .from(setPiecesTable)
      .where(and(eq(setPiecesTable.id, spId), eq(setPiecesTable.teamId, link.teamId)));
    if (!sp) continue;

    const roles = await db
      .select()
      .from(setPieceRolesTable)
      .where(eq(setPieceRolesTable.setPieceId, spId));

    let playerRole = null;
    if (link.playerScope && link.playerScope.length > 0) {
      for (const role of roles) {
        const [assignment] = await db
          .select()
          .from(roleAssignmentsTable)
          .where(eq(roleAssignmentsTable.roleId, role.id));
        if (assignment && link.playerScope.includes(assignment.playerId)) {
          playerRole = role;
          break;
        }
      }
    }

    let readiness = null;
    if (link.playerScope && link.playerScope.length > 0) {
      const [r] = await db
        .select()
        .from(playerReadinessTable)
        .where(
          and(
            eq(playerReadinessTable.playerId, link.playerScope[0]),
            eq(playerReadinessTable.setPieceId, spId),
          ),
        );
      readiness = r || null;
    }

    setPiecesResult.push({
      id: sp.id,
      title: sp.title,
      category: sp.category,
      status: sp.status,
      previewImageUrl: sp.previewImageUrl,
      boardData: sp.boardData,
      coachingNotes: sp.coachingNotes,
      roles,
      playerRole,
      readiness,
    });
  }

  res.json({
    team: {
      id: team.id,
      name: team.name,
      clubName: team.clubName,
      logoUrl: team.logoUrl,
      teamColors: team.teamColors,
    },
    setPieces: setPiecesResult,
  });
});

router.post("/p/:shareToken/ready", async (req, res): Promise<void> => {
  const link = await requireShareToken(req, res);
  if (!link) return;

  const parsed = markReadySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const { playerId, setPieceId, roleId } = parsed.data;

  if (link.playerScope && link.playerScope.length > 0 && !link.playerScope.includes(playerId)) {
    res.status(403).json({ error: "Player not in scope for this link" });
    return;
  }

  if (!(await isSetPieceInShareScope(link, setPieceId))) {
    res.status(403).json({ error: "Set piece not in scope for this link" });
    return;
  }

  const [player] = await db
    .select()
    .from(playersTable)
    .where(and(eq(playersTable.id, playerId), eq(playersTable.teamId, link.teamId)));
  if (!player) {
    res.status(403).json({ error: "Player does not belong to this team" });
    return;
  }

  const [sp] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, link.teamId)));
  if (!sp) {
    res.status(404).json({ error: "Set piece not found in this team" });
    return;
  }

  const existing = await db
    .select()
    .from(playerReadinessTable)
    .where(
      and(
        eq(playerReadinessTable.playerId, playerId),
        eq(playerReadinessTable.setPieceId, setPieceId),
      ),
    );

  let readiness;
  if (existing.length > 0) {
    [readiness] = await db
      .update(playerReadinessTable)
      .set({
        status: "opened",
        lastOpenedAt: new Date(),
        viewCount: existing[0].viewCount + 1,
        readyAt: new Date(),
        roleId: roleId || existing[0].roleId,
      })
      .where(eq(playerReadinessTable.id, existing[0].id))
      .returning();
  } else {
    [readiness] = await db
      .insert(playerReadinessTable)
      .values({
        playerId,
        setPieceId,
        roleId: roleId || null,
        status: "opened",
        lastOpenedAt: new Date(),
        readyAt: new Date(),
        viewCount: 1,
      })
      .returning();
  }

  await db.insert(auditEventsTable).values({
    teamId: link.teamId,
    eventType: "readiness_changed",
    entityType: "player_readiness",
    entityId: readiness.id,
    metadata: { playerId, setPieceId, status: "opened" },
  });

  res.json(readiness);
});

export default router;
