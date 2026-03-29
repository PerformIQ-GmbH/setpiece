import { eq, and } from "drizzle-orm";
import { db, membershipsTable, shareLinksTable, matchdaySetPiecesTable } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

type MemberRole = "head_coach" | "assistant_coach" | "player";

export async function requireTeamAccess(
  req: Request,
  res: Response,
  requiredRoles?: MemberRole[],
): Promise<string | null> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const teamId = parseParam(req.params.teamId);

  if (!teamId) {
    res.status(400).json({ error: "teamId is required" });
    return null;
  }

  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.userId, (req.user as any).id),
        eq(membershipsTable.teamId, teamId),
      ),
    );

  if (!membership) {
    res.status(403).json({ error: "You do not have access to this team" });
    return null;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(membership.role as MemberRole)) {
      res.status(403).json({ error: "Insufficient permissions for this action" });
      return null;
    }
  }

  return teamId;
}

export function requireCoachAccess(req: Request, res: Response): Promise<string | null> {
  return requireTeamAccess(req, res, ["head_coach", "assistant_coach"]);
}

export function requireHeadCoachAccess(req: Request, res: Response): Promise<string | null> {
  return requireTeamAccess(req, res, ["head_coach"]);
}

export function parseParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export async function isSetPieceInShareScope(
  link: ValidatedShareLink,
  setPieceId: string,
): Promise<boolean> {
  if (link.allowedSetPieceIds && link.allowedSetPieceIds.length > 0) {
    return link.allowedSetPieceIds.includes(setPieceId);
  }

  if (link.matchdayScope) {
    const mdSps = await db
      .select()
      .from(matchdaySetPiecesTable)
      .where(eq(matchdaySetPiecesTable.matchdayId, link.matchdayScope));
    const allowedIds = mdSps.map((m) => m.setPieceId);
    return allowedIds.includes(setPieceId);
  }

  return true;
}

export interface ValidatedShareLink {
  id: string;
  teamId: string;
  token: string;
  playerScope: string[] | null;
  matchdayScope: string | null;
  allowedSetPieceIds: string[] | null;
}

export async function requireShareToken(
  req: Request,
  res: Response,
): Promise<ValidatedShareLink | null> {
  const shareToken = parseParam(req.params.shareToken);

  if (!shareToken) {
    res.status(400).json({ error: "Share token is required" });
    return null;
  }

  const [link] = await db
    .select()
    .from(shareLinksTable)
    .where(eq(shareLinksTable.token, shareToken));

  if (!link) {
    res.status(404).json({ error: "Invalid share link" });
    return null;
  }

  if (link.revokedAt) {
    res.status(403).json({ error: "This share link has been revoked" });
    return null;
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    res.status(403).json({ error: "This share link has expired" });
    return null;
  }

  await db
    .update(shareLinksTable)
    .set({ lastAccessedAt: new Date() })
    .where(eq(shareLinksTable.id, link.id));

  return link;
}
