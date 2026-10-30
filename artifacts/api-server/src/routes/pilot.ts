import { Router, type IRouter } from "express";
import { requireHeadCoachAccess } from "../lib/authorization";
import { pilotEnabled, redeemPilot } from "../lib/pilot";
import { z } from "zod/v4";

const router: IRouter = Router();
const codeSchema = z.object({ code: z.string().trim().regex(/^[a-fA-F0-9]{32}$/) });

router.post("/teams/:teamId/pilot", async (req, res): Promise<void> => {
  if (!pilotEnabled()) { res.sendStatus(404); return; }
  const teamId = await requireHeadCoachAccess(req, res);
  if (!teamId) return;
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid pilot code" }); return; }
  const result = await redeemPilot(teamId, req.user!.id, parsed.data.code);
  if ("error" in result) {
    res.status(result.error === "ineligible" ? 403 : 409).json({
      error: result.error === "ineligible"
        ? "Only the owner of a free team can activate the pilot"
        : "Pilot code unavailable or an account/team pilot has already been used",
    });
    return;
  }
  res.json({ expiresAt: result.expiresAt });
});

export default router;
