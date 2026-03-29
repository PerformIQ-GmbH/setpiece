import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, membershipsTable, usersTable } from "@workspace/db";
import { requireHeadCoachAccess, requireTeamAccess, parseParam } from "../lib/authorization";
import { z } from "zod/v4";

const router: IRouter = Router();

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["head_coach", "assistant_coach", "player"]),
});

const updateMemberSchema = z.object({
  role: z.enum(["head_coach", "assistant_coach", "player"]),
});

router.get("/teams/:teamId/members", async (req, res): Promise<void> => {
  const teamId = await requireTeamAccess(req, res);
  if (!teamId) return;

  const members = await db
    .select({
      id: membershipsTable.id,
      userId: membershipsTable.userId,
      teamId: membershipsTable.teamId,
      role: membershipsTable.role,
      createdAt: membershipsTable.createdAt,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(membershipsTable)
    .leftJoin(usersTable, eq(membershipsTable.userId, usersTable.id))
    .where(eq(membershipsTable.teamId, teamId));

  res.json(members);
});

router.post("/teams/:teamId/members", async (req, res): Promise<void> => {
  const teamId = await requireHeadCoachAccess(req, res);
  if (!teamId) return;

  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const { userId, role } = parsed.data;

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!existingUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(membershipsTable)
    .where(and(eq(membershipsTable.userId, userId), eq(membershipsTable.teamId, teamId)));

  if (existing) {
    res.status(409).json({ error: "User is already a member of this team" });
    return;
  }

  const [membership] = await db
    .insert(membershipsTable)
    .values({ userId, teamId, role })
    .returning();

  res.status(201).json(membership);
});

router.patch("/teams/:teamId/members/:membershipId", async (req, res): Promise<void> => {
  const teamId = await requireHeadCoachAccess(req, res);
  if (!teamId) return;

  const parsed = updateMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const membershipId = parseParam(req.params.membershipId);
  const [membership] = await db
    .update(membershipsTable)
    .set({ role: parsed.data.role })
    .where(and(eq(membershipsTable.id, membershipId), eq(membershipsTable.teamId, teamId)))
    .returning();

  if (!membership) {
    res.status(404).json({ error: "Membership not found" });
    return;
  }
  res.json(membership);
});

router.delete("/teams/:teamId/members/:membershipId", async (req, res): Promise<void> => {
  const teamId = await requireHeadCoachAccess(req, res);
  if (!teamId) return;

  const membershipId = parseParam(req.params.membershipId);
  const [deleted] = await db
    .delete(membershipsTable)
    .where(and(eq(membershipsTable.id, membershipId), eq(membershipsTable.teamId, teamId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Membership not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
