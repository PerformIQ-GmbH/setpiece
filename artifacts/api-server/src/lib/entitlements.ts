import { eq, count } from "drizzle-orm";
import { db, teamsTable, playersTable, setPiecesTable, matchdaysTable, shareLinksTable } from "@workspace/db";
import type { Request, Response } from "express";
import { teamPilotAccess } from "./pilot";

export interface TierLimits {
  maxPlayers: number;
  maxSetPieces: number;
  maxMatchdays: number;
  maxShareLinks: number;
}

const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    maxPlayers: 25,
    maxSetPieces: 5,
    maxMatchdays: 3,
    maxShareLinks: 5,
  },
  solo_coach: {
    maxPlayers: 30,
    maxSetPieces: 20,
    maxMatchdays: 20,
    maxShareLinks: 20,
  },
  team: {
    maxPlayers: 100,
    maxSetPieces: 100,
    maxMatchdays: 100,
    maxShareLinks: 100,
  },
};

export function getTierLimits(tier: string): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

type EntityType = "players" | "set_pieces" | "matchdays" | "share_links";

async function getEntityCount(entityType: EntityType, teamId: string): Promise<number> {
  const table = {
    players: playersTable,
    set_pieces: setPiecesTable,
    matchdays: matchdaysTable,
    share_links: shareLinksTable,
  }[entityType];

  const [result] = await db
    .select({ value: count() })
    .from(table)
    .where(eq((table as typeof playersTable).teamId, teamId));

  return result?.value ?? 0;
}

function getLimitForEntity(limits: TierLimits, entityType: EntityType): number {
  const map: Record<EntityType, keyof TierLimits> = {
    players: "maxPlayers",
    set_pieces: "maxSetPieces",
    matchdays: "maxMatchdays",
    share_links: "maxShareLinks",
  };
  return limits[map[entityType]];
}

export async function checkEntitlement(
  teamId: string,
  entityType: EntityType,
  res: Response,
): Promise<boolean> {
  const [team] = await db
    .select({ tier: teamsTable.tier })
    .from(teamsTable)
    .where(eq(teamsTable.id, teamId));

  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return false;
  }

  const { effectiveTier } = await teamPilotAccess(teamId, team.tier);
  const limits = getTierLimits(effectiveTier);
  const currentCount = await getEntityCount(entityType, teamId);
  const maxAllowed = getLimitForEntity(limits, entityType);

  if (currentCount >= maxAllowed) {
    res.status(403).json({
      error: "Plan limit reached",
      limit: maxAllowed,
      current: currentCount,
      tier: effectiveTier,
      entityType,
    });
    return false;
  }

  return true;
}
