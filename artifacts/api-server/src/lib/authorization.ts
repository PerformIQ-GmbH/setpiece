import { eq, and } from "drizzle-orm";
import { db, membershipsTable } from "@workspace/db";
import type { Request, Response } from "express";

export async function requireTeamAccess(
  req: Request,
  res: Response,
): Promise<string | null> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const teamId = Array.isArray(req.params.teamId)
    ? req.params.teamId[0]
    : req.params.teamId;

  if (!teamId) {
    res.status(400).json({ error: "teamId is required" });
    return null;
  }

  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.userId, req.user.id),
        eq(membershipsTable.teamId, teamId),
      ),
    );

  if (!membership) {
    res.status(403).json({ error: "You do not have access to this team" });
    return null;
  }

  return teamId;
}

export function parseParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}
