import { Router, type ErrorRequestHandler, type IRouter } from "express";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db, usersTable, teamsTable, membershipsTable, complimentaryTiers,
  complimentaryAccessTable, complimentaryAccessEventsTable, pilotAccessTable,
} from "@workspace/db";
import { resolveComplimentaryAccess } from "../lib/teamAccess";
import { effectivePilotTier, pilotEnabled } from "../lib/pilot";

const router: IRouter = Router();

router.use("/platform-admin", async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const adminIds = process.env.SETPIECE_PLATFORM_ADMIN_USER_IDS?.split(",").map(id => id.trim()) ?? [];
  if (adminIds.includes(req.user.id)) {
    const [verified] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, req.user.id), eq(usersTable.emailVerified, true)));
    if (verified) {
      next();
      return;
    }
  }
  res.status(403).json({ error: "Platform admin required" });
});

router.get("/platform-admin/access", (_req, res) => {
  res.status(204).end();
});

const pageSize = 20;
const listQuery = z.object({
  q: z.string().trim().max(254).default(""),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

router.get("/platform-admin/users", async (req, res) => {
  const query = listQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid search" });
    return;
  }
  const { q, offset } = query.data;
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const users = await db.select({
    id: usersTable.id, email: usersTable.email, emailVerified: usersTable.emailVerified,
    firstName: usersTable.firstName, lastName: usersTable.lastName,
  }).from(usersTable).where(q ? or(
    sql`${usersTable.email} ILIKE ${pattern}`,
    sql`concat_ws(' ', ${usersTable.firstName}, ${usersTable.lastName}) ILIKE ${pattern}`,
  ) : undefined).orderBy(asc(usersTable.email), asc(usersTable.id)).limit(pageSize + 1).offset(offset);
  const page = users.slice(0, pageSize);
  const memberships = page.length ? await db.select({
    userId: membershipsTable.userId, role: membershipsTable.role,
    teamId: teamsTable.id, teamName: teamsTable.name, billingTier: teamsTable.tier,
    grant: { tier: complimentaryAccessTable.tier, expiresAt: complimentaryAccessTable.expiresAt },
    pilotExpiry: pilotAccessTable.expiresAt,
  }).from(membershipsTable).innerJoin(teamsTable, eq(teamsTable.id, membershipsTable.teamId))
    .leftJoin(complimentaryAccessTable, eq(complimentaryAccessTable.teamId, teamsTable.id))
    .leftJoin(pilotAccessTable, eq(pilotAccessTable.teamId, teamsTable.id))
    .where(inArray(membershipsTable.userId, page.map(user => user.id))).orderBy(asc(teamsTable.name)) : [];

  const now = new Date();
  const showPilot = pilotEnabled();
  res.json({
    users: page.map(user => ({
      ...user,
      teams: memberships.filter(membership => membership.userId === user.id).map(({ userId, pilotExpiry, grant, ...team }) => {
        const pilotExpiresAt = showPilot ? pilotExpiry : null;
        return {
          ...team, pilotExpiresAt,
          ...resolveComplimentaryAccess(effectivePilotTier(team.billingTier, pilotExpiresAt, now), grant ?? undefined, now),
        };
      }),
    })),
    hasMore: users.length > pageSize,
  });
});

const reason = z.string().trim().min(3).max(500);
const changeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant"), reason, tier: z.enum(complimentaryTiers), expiresAt: z.iso.datetime().nullable() }),
  z.object({ action: z.literal("revoke"), reason }),
]);

router.post("/platform-admin/teams/:teamId/complimentary-access", async (req, res) => {
  const change = changeSchema.safeParse(req.body);
  if (!req.is("application/json") || !change.success) {
    res.status(400).json({ error: "Invalid access change" });
    return;
  }
  const { teamId } = req.params;
  const adminId = req.user!.id;
  const input = change.data;
  const expiresAt = input.action === "grant" && input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && expiresAt <= new Date()) {
    res.status(400).json({ error: "Expiry must be in the future" });
    return;
  }

  const found = await db.transaction(async tx => {
    const [team] = await tx.select({ id: teamsTable.id }).from(teamsTable)
      .where(eq(teamsTable.id, teamId)).for("update");
    if (!team) return false;

    const [existing] = await tx.select().from(complimentaryAccessTable)
      .where(eq(complimentaryAccessTable.teamId, teamId));
    if (input.action === "grant") {
      if (existing?.tier === input.tier && existing.expiresAt?.getTime() === expiresAt?.getTime()) return true;
      await tx.insert(complimentaryAccessTable).values({ teamId, tier: input.tier, expiresAt })
        .onConflictDoUpdate({ target: complimentaryAccessTable.teamId, set: { tier: input.tier, expiresAt } });
      await tx.insert(complimentaryAccessEventsTable).values({
        teamId, adminId, action: input.action, tier: input.tier, expiresAt, reason: input.reason,
      });
    } else if (existing) {
      await tx.delete(complimentaryAccessTable).where(eq(complimentaryAccessTable.teamId, teamId));
      await tx.insert(complimentaryAccessEventsTable).values({
        teamId, adminId, action: input.action, tier: existing.tier, expiresAt: existing.expiresAt, reason: input.reason,
      });
    }
    return true;
  });
  if (!found) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.status(204).end();
});

const handleAdminError: ErrorRequestHandler = (_error, req, res, _next) => {
  // Database errors may contain bound names, emails or access reasons.
  req.log?.error("Platform admin operation failed");
  res.status(500).json({ error: "Platform admin operation failed" });
};
router.use("/platform-admin", handleAdminError);

export default router;
