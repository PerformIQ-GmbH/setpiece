import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db, setPieceCollectionsTable as collections, setPiecesTable } from "@workspace/db";
import { z } from "zod/v4";
import { parseParam, requireCoachAccess } from "../lib/authorization";

const router: IRouter = Router();
const path = "/teams/:teamId/set-piece-collections";
const itemPath = `${path}/:collectionId`;
const bodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  setPieceIds: z.array(z.string().min(1).max(255)).max(100),
});
const scope = (teamId: string, id: string) => and(eq(collections.teamId, teamId), eq(collections.id, id));

router.get(path, async (req, res) => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;
  res.json(await db.select().from(collections).where(eq(collections.teamId, teamId)));
});

async function save(req: Request, res: Response, collectionId?: string) {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid collection" });
    return;
  }
  const setPieceIds = [...new Set(parsed.data.setPieceIds)];
  if (setPieceIds.length > 0) {
    const found = await db.select({ id: setPiecesTable.id }).from(setPiecesTable)
      .where(and(eq(setPiecesTable.teamId, teamId), inArray(setPiecesTable.id, setPieceIds)));
    if (found.length !== setPieceIds.length) {
      res.status(400).json({ error: "One or more set pieces are unavailable in this team" });
      return;
    }
  }

  const data = { name: parsed.data.name, setPieceIds };
  const [collection] = collectionId
    ? await db.update(collections).set(data).where(scope(teamId, collectionId)).returning()
    : await db.insert(collections).values({ teamId, ...data }).returning();
  if (!collection) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }
  res.status(collectionId ? 200 : 201).json(collection);
}

router.post(path, (req, res) => save(req, res));
router.put(itemPath, (req, res) => save(req, res, parseParam(req.params.collectionId)));
router.delete(itemPath, async (req, res) => {
  const teamId = await requireCoachAccess(req, res);
  if (!teamId) return;
  await db.delete(collections).where(scope(teamId, parseParam(req.params.collectionId)));
  res.sendStatus(204);
});

export default router;
