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
  quizAttemptsTable,
  playersTable,
  auditEventsTable,
  matchdaySetPiecesTable,
} from "@workspace/db";
import { requireCoachAccess, requireHeadCoachAccess, requireShareToken, isSetPieceInShareScope, parseParam } from "../lib/authorization";
import { checkEntitlement } from "../lib/entitlements";
import { z } from "zod/v4";
import { playerContent, variantTask, taskScopeAnswer, taskReadiness, aggregateTaskStatus, isVariantBoard } from "../lib/variantContent";

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
  variantId: z.string().min(1).optional(),
  contentVersion: z.string().min(1).optional(),
  status: z.enum(["ready", "needs_review"]).optional(),
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

  const teamPlayers = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.teamId, link.teamId));

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

    const allAssignments: Array<typeof roleAssignmentsTable.$inferSelect> = [];
    for (const role of roles) {
      const assigns = await db
        .select()
        .from(roleAssignmentsTable)
        .where(eq(roleAssignmentsTable.roleId, role.id));
      allAssignments.push(...assigns);
    }

    const content = playerContent(sp, roles);
    if (!content) continue;
    const defaultTask = content.roles[0] ? variantTask(content.piece, content.roles[0]) : null;
    setPiecesResult.push({
      id: sp.id,
      title: content.piece.title,
      category: sp.category,
      status: sp.status,
      previewImageUrl: sp.previewImageUrl,
      boardData: defaultTask?.boardData ?? content.piece.boardData,
      publishedVersion: content.publication?.version,
      requiredVariantIds: content.publication?.requiredVariantIds,
      coachingNotes: content.piece.coachingNotes,
      roles: content.roles,
      assignments: allAssignments,
    });
  }

  const eligiblePlayers = link.playerScope && link.playerScope.length > 0
    ? teamPlayers.filter((p) => link.playerScope!.includes(p.id))
    : teamPlayers;

  res.json({
    team: {
      id: team.id,
      name: team.name,
      clubName: team.clubName,
      logoUrl: team.logoUrl,
      teamColors: team.teamColors,
    },
    players: eligiblePlayers.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      shirtNumber: p.shirtNumber,
    })),
    setPieces: setPiecesResult,
    shareScope: link.playerScope && link.playerScope.length > 0 ? "selected" : "all",
  });
});

router.get("/p/:shareToken/player/:playerId", async (req, res): Promise<void> => {
  const link = await requireShareToken(req, res);
  if (!link) return;

  const playerId = req.params.playerId;

  if (link.playerScope && link.playerScope.length > 0 && !link.playerScope.includes(playerId)) {
    res.status(403).json({ error: "Player not in scope for this link" });
    return;
  }

  const [player] = await db
    .select()
    .from(playersTable)
    .where(and(eq(playersTable.id, playerId), eq(playersTable.teamId, link.teamId)));
  if (!player) {
    res.status(404).json({ error: "Player not found in this team" });
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
    for (const role of roles) {
      const [assignment] = await db
        .select()
        .from(roleAssignmentsTable)
        .where(eq(roleAssignmentsTable.roleId, role.id));
      if (assignment && assignment.playerId === playerId) {
        playerRole = role;
        break;
      }
    }

    const [readiness] = await db
      .select()
      .from(playerReadinessTable)
      .where(
        and(
          eq(playerReadinessTable.playerId, playerId),
          eq(playerReadinessTable.setPieceId, spId),
        ),
      );

    const allAssignments: Array<typeof roleAssignmentsTable.$inferSelect> = [];
    for (const role of roles) {
      const assigns = await db
        .select()
        .from(roleAssignmentsTable)
        .where(eq(roleAssignmentsTable.roleId, role.id));
      allAssignments.push(...assigns);
    }

    if (!playerRole) continue;

    const content = playerContent(sp, roles);
    if (!content) continue;
    const assignedRoles = content.roles.filter(role => allAssignments.some(a => a.roleId === role.id && a.playerId === playerId));
    if (!assignedRoles.length) continue;
    const defaultTask = variantTask(content.piece, assignedRoles[0]);
    const attempts = content.publication ? await db.select().from(quizAttemptsTable).where(and(eq(quizAttemptsTable.playerId, playerId), eq(quizAttemptsTable.setPieceId, spId))) : [];
    const tasks = content.publication && isVariantBoard(content.piece.boardData) ? assignedRoles.flatMap(role => (content.publication!.boardData.variants as Array<{ id: string }>).map(variant => {
      const task = variantTask(content.piece, role, variant.id);
      return { ...taskReadiness(task, attempts, playerId, spId), playerRole: task.role, boardData: task.boardData, required: content.publication!.requiredVariantIds.includes(variant.id) };
    })) : undefined;
    const currentReadiness = tasks ? { ...(readiness ?? {}), playerId, setPieceId: spId, roleId: assignedRoles[0].id, status: aggregateTaskStatus(tasks.filter(task => task.required)) } : readiness?.roleId === assignedRoles[0].id ? readiness : null;
    setPiecesResult.push({
      id: sp.id,
      title: content.piece.title,
      category: sp.category,
      status: sp.status,
      previewImageUrl: sp.previewImageUrl,
      boardData: defaultTask?.boardData ?? content.piece.boardData,
      publishedVersion: content.publication?.version,
      requiredVariantIds: content.publication?.requiredVariantIds,
      coachingNotes: content.piece.coachingNotes,
      roles: content.roles,
      assignments: allAssignments,
      playerRole: defaultTask.role,
      tasks,
      readiness: currentReadiness || null,
    });
  }

  res.json({
    player: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      shirtNumber: player.shirtNumber,
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

  const { playerId, setPieceId, roleId, status, variantId, contentVersion } = parsed.data;
  const targetStatus = status === "needs_review" ? "needs_review" : "opened";

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

  const roles = await db.select().from(setPieceRolesTable).where(eq(setPieceRolesTable.setPieceId, setPieceId));
  const content = playerContent(sp, roles);
  if (!content) { res.status(409).json({ error: "Set piece has no published content" }); return; }
  let assignedRole = null;
  for (const role of content.roles.filter(role => !roleId || role.id === roleId)) {
    const [assignment] = await db.select().from(roleAssignmentsTable).where(and(eq(roleAssignmentsTable.roleId, role.id), eq(roleAssignmentsTable.playerId, playerId)));
    if (assignment) { assignedRole = role; break; }
  }
  if (!assignedRole) { res.status(400).json({ error: "No role assignment found for this player" }); return; }
  let task;
  try { task = variantTask(content.piece, assignedRole, variantId); }
  catch { res.status(400).json({ error: "Unknown variant" }); return; }
  if (task.contentVersion) {
    if (!variantId || !roleId || contentVersion !== task.contentVersion) { res.status(409).json({ error: "Task changed; reload the published variant" }); return; }
    const [attempt] = await db.insert(quizAttemptsTable).values({ playerId, setPieceId, roleId: assignedRole.id, completedAt: new Date(), passed: false, answers: [taskScopeAnswer(task, targetStatus, "confirmation")] }).returning();
    res.json(taskReadiness(task, [attempt], playerId, setPieceId));
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

  const isNeedsReview = targetStatus === "needs_review";

  let readiness;
  if (existing.length > 0) {
    [readiness] = await db
      .update(playerReadinessTable)
      .set({
        status: targetStatus,
        lastOpenedAt: new Date(),
        viewCount: existing[0].viewCount + 1,
        readyAt: isNeedsReview ? existing[0].readyAt : new Date(),
        roleId: assignedRole.id,
      })
      .where(eq(playerReadinessTable.id, existing[0].id))
      .returning();
  } else {
    [readiness] = await db
      .insert(playerReadinessTable)
      .values({
        playerId,
        setPieceId,
        roleId: assignedRole.id,
        status: targetStatus,
        lastOpenedAt: new Date(),
        readyAt: isNeedsReview ? null : new Date(),
        viewCount: 1,
      })
      .returning();
  }

  await db.insert(auditEventsTable).values({
    teamId: link.teamId,
    eventType: "readiness_changed",
    entityType: "player_readiness",
    entityId: readiness.id,
    metadata: { playerId, setPieceId, status: targetStatus },
  });

  res.json(readiness);
});

export default router;
