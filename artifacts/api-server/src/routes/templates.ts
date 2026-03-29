import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, setPieceTemplatesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/templates", async (req, res): Promise<void> => {
  const categoryFilter = req.query.category as string | undefined;
  let templates = await db.select().from(setPieceTemplatesTable);

  if (categoryFilter) {
    templates = templates.filter((t) => t.category === categoryFilter);
  }

  res.json(templates);
});

router.get("/templates/:templateId", async (req, res): Promise<void> => {
  const templateId = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
  const [template] = await db
    .select()
    .from(setPieceTemplatesTable)
    .where(eq(setPieceTemplatesTable.id, templateId));

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(template);
});

export default router;
