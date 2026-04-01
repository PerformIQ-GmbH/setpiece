import { Router, type IRouter } from "express";
import { eq, and, isNull, sql, gt, or } from "drizzle-orm";
import crypto from "crypto";
import { db, teamInvitesTable, teamsTable, playersTable } from "@workspace/db";
import { requireCoachAccess, parseParam } from "../lib/authorization";
import { getTierLimits } from "../lib/entitlements";
import { z } from "zod/v4";

const router: IRouter = Router();

const createInviteSchema = z.object({
  expiresInHours: z.number().int().min(1).max(720).optional(),
  maxUses: z.number().int().min(1).max(500).optional(),
});

const joinPlayerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  shirtNumber: z.number().int().min(1).max(99).optional(),
  dominantFoot: z.enum(["left", "right", "both"]).optional(),
});

router.post("/teams/:teamId/invites", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const parsed = createInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = parsed.data.expiresInHours
    ? new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000)
    : null;

  const [invite] = await db
    .insert(teamInvitesTable)
    .values({
      teamId,
      token,
      maxUses: parsed.data.maxUses ?? null,
      expiresAt,
    })
    .returning();

  res.status(201).json(invite);
});

router.get("/teams/:teamId/invites", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const invites = await db
    .select()
    .from(teamInvitesTable)
    .where(
      and(
        eq(teamInvitesTable.teamId, teamId),
        isNull(teamInvitesTable.revokedAt),
        or(
          isNull(teamInvitesTable.expiresAt),
          gt(teamInvitesTable.expiresAt, new Date())
        ),
        or(
          isNull(teamInvitesTable.maxUses),
          sql`${teamInvitesTable.useCount} < ${teamInvitesTable.maxUses}`
        )
      )
    );

  res.json(invites);
});

router.delete("/teams/:teamId/invites/:inviteId", async (req, res): Promise<void> => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;

  const inviteId = parseParam(req.params.inviteId);
  const [revoked] = await db
    .update(teamInvitesTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(teamInvitesTable.id, inviteId), eq(teamInvitesTable.teamId, teamId)))
    .returning();

  if (!revoked) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }
  res.json(revoked);
});

router.get("/join/:token", async (req, res): Promise<void> => {
  const token = parseParam(req.params.token);

  const [invite] = await db
    .select({
      id: teamInvitesTable.id,
      teamId: teamInvitesTable.teamId,
      expiresAt: teamInvitesTable.expiresAt,
      revokedAt: teamInvitesTable.revokedAt,
      maxUses: teamInvitesTable.maxUses,
      useCount: teamInvitesTable.useCount,
    })
    .from(teamInvitesTable)
    .where(eq(teamInvitesTable.token, token));

  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }
  if (invite.revokedAt) {
    res.status(410).json({ error: "Invite has been revoked" });
    return;
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    res.status(410).json({ error: "Invite has expired" });
    return;
  }
  if (invite.maxUses && invite.useCount >= invite.maxUses) {
    res.status(410).json({ error: "Invite usage limit reached" });
    return;
  }

  const [team] = await db
    .select({ name: teamsTable.name, clubName: teamsTable.clubName, logoUrl: teamsTable.logoUrl })
    .from(teamsTable)
    .where(eq(teamsTable.id, invite.teamId));

  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }

  res.json({ teamName: team.name, clubName: team.clubName, logoUrl: team.logoUrl });
});

router.post("/join/:token", async (req, res): Promise<void> => {
  const token = parseParam(req.params.token);

  const parsed = joinPlayerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const consumed = await tx
      .update(teamInvitesTable)
      .set({ useCount: sql`${teamInvitesTable.useCount} + 1` })
      .where(
        and(
          eq(teamInvitesTable.token, token),
          isNull(teamInvitesTable.revokedAt),
          or(
            isNull(teamInvitesTable.expiresAt),
            gt(teamInvitesTable.expiresAt, new Date())
          ),
          or(
            isNull(teamInvitesTable.maxUses),
            sql`${teamInvitesTable.useCount} < ${teamInvitesTable.maxUses}`
          )
        )
      )
      .returning({ id: teamInvitesTable.id, teamId: teamInvitesTable.teamId });

    if (consumed.length === 0) {
      const [existing] = await tx
        .select({ id: teamInvitesTable.id })
        .from(teamInvitesTable)
        .where(eq(teamInvitesTable.token, token));
      return { error: existing ? "gone" as const : "not_found" as const };
    }

    const { teamId: inviteTeamId } = consumed[0];

    const [team] = await tx
      .select({ tier: teamsTable.tier })
      .from(teamsTable)
      .where(eq(teamsTable.id, inviteTeamId));

    if (!team) {
      return { error: "not_found" as const };
    }

    const playerCount = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(playersTable)
      .where(eq(playersTable.teamId, inviteTeamId));

    const count = playerCount[0]?.count ?? 0;
    const limits = getTierLimits(team.tier);
    if (count >= limits.maxPlayers) {
      await tx
        .update(teamInvitesTable)
        .set({ useCount: sql`${teamInvitesTable.useCount} - 1` })
        .where(eq(teamInvitesTable.id, consumed[0].id));
      return { error: "limit" as const };
    }

    const data = parsed.data;
    const [player] = await tx
      .insert(playersTable)
      .values({
        teamId: inviteTeamId,
        firstName: data.firstName,
        lastName: data.lastName,
        shirtNumber: data.shirtNumber ?? null,
        dominantFoot: data.dominantFoot ?? null,
        status: "active",
      })
      .returning();

    return { player };
  });

  if ("error" in result) {
    if (result.error === "not_found") {
      res.status(404).json({ error: "Invite not found" });
    } else if (result.error === "limit") {
      res.status(403).json({ error: "Team player limit reached" });
    } else {
      res.status(410).json({ error: "Invite is no longer valid" });
    }
    return;
  }

  res.status(201).json(result.player);
});

export default router;
