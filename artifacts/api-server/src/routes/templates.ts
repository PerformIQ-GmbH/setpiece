import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, setPieceTemplatesTable, usersTable } from "@workspace/db";
import { isAdminUser } from "../lib/platformAdmin";
import { parseParam } from "../lib/authorization";
import { z } from "zod/v4";

const router: IRouter = Router();

const templatesQuerySchema = z.object({
  category: z.string().optional(),
});

// The editor shows the template tools only if this says true; the write route checks again.
router.get("/admin/status", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.json({ isPlatformAdmin: false }); return; }
  const [account] = await db.select({ email: usersTable.email, emailVerified: usersTable.emailVerified }).from(usersTable).where(eq(usersTable.id, req.user.id));
  res.json({ isPlatformAdmin: isAdminUser(account) });
});

router.get("/templates", async (req, res): Promise<void> => {
  const parsed = templatesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.issues });
    return;
  }

  const { category } = parsed.data;
  let templates = await db.select().from(setPieceTemplatesTable);

  if (category) {
    templates = templates.filter((t) => t.category === category);
  }

  res.json(templates);
});

router.get("/templates/:templateId", async (req, res): Promise<void> => {
  const templateId = parseParam(req.params.templateId);
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
