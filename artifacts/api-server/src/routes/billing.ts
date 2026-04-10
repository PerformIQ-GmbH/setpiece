import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, teamsTable, membershipsTable } from "@workspace/db";
import { getUncachableStripeClient } from "../lib/stripeClient";
import type { Request, Response } from "express";

const router: IRouter = Router();

function getBaseUrl(): string {
  const customDomain = process.env.APP_DOMAIN;
  if (customDomain) return `https://${customDomain}`;

  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) return `https://${replitDomains.split(",")[0]}`;

  return "https://setpiece.performiq.ch";
}

const APP_BASE_PATH = process.env.APP_BASE_PATH || "/setpiece";

async function getCoachTeamById(req: Request, res: Response, teamId: string) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }

  const [membership] = await db
    .select({ teamId: membershipsTable.teamId, role: membershipsTable.role })
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

  if (membership.role !== "head_coach" && membership.role !== "assistant_coach") {
    res.status(403).json({ error: "Only coaches can manage billing" });
    return null;
  }

  const [team] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, membership.teamId));

  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return null;
  }

  return { team, user: req.user };
}

interface StripePriceRow {
  price_id: string;
}

async function getValidPriceIdForTier(tierId: string): Promise<string | null> {
  try {
    const result = await db.execute(sql`
      SELECT pr.id as price_id
      FROM stripe.prices pr
      JOIN stripe.products p ON pr.product = p.id
      WHERE p.active = true AND pr.active = true
      AND pr.recurring IS NOT NULL
      AND p.metadata->>'tierId' = ${tierId}
      LIMIT 1
    `);
    const row = result.rows[0] as StripePriceRow | undefined;
    return row?.price_id || null;
  } catch {
    return null;
  }
}

const VALID_TIERS = new Set(["solo_coach", "team"]);

router.get("/billing/subscription/:teamId", async (req: Request, res: Response): Promise<void> => {
  const ctx = await getCoachTeamById(req, res, req.params.teamId);
  if (!ctx) return;

  if (!ctx.team.stripeSubscriptionId) {
    res.json({ subscription: null, tier: ctx.team.tier });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(ctx.team.stripeSubscriptionId);
    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      tier: ctx.team.tier,
    });
  } catch {
    res.json({ subscription: null, tier: ctx.team.tier });
  }
});

router.post("/billing/checkout", async (req: Request, res: Response): Promise<void> => {
  const { priceId, tierId, teamId } = req.body as { priceId?: string; tierId?: string; teamId?: string };

  if (!teamId) {
    res.status(400).json({ error: "teamId is required" });
    return;
  }

  const ctx = await getCoachTeamById(req, res, teamId);
  if (!ctx) return;

  if (!priceId || !tierId) {
    res.status(400).json({ error: "priceId and tierId are required" });
    return;
  }

  if (!VALID_TIERS.has(tierId)) {
    res.status(400).json({ error: "Invalid tierId" });
    return;
  }

  const validPriceId = await getValidPriceIdForTier(tierId);
  if (!validPriceId || validPriceId !== priceId) {
    res.status(400).json({ error: "Price ID does not match the selected tier" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    let customerId = ctx.team.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ctx.user.email,
        metadata: { teamId: ctx.team.id, userId: ctx.user.id },
      });
      await db
        .update(teamsTable)
        .set({ stripeCustomerId: customer.id })
        .where(eq(teamsTable.id, ctx.team.id));
      customerId = customer.id;
    }

    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}${APP_BASE_PATH}/pricing?success=true`,
      cancel_url: `${baseUrl}${APP_BASE_PATH}/pricing?canceled=true`,
      metadata: { teamId: ctx.team.id, tierId },
      subscription_data: {
        metadata: { teamId: ctx.team.id, tierId },
      },
    });

    res.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    res.status(500).json({ error: message });
  }
});

router.post("/billing/portal", async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.body as { teamId?: string };

  if (!teamId) {
    res.status(400).json({ error: "teamId is required" });
    return;
  }

  const ctx = await getCoachTeamById(req, res, teamId);
  if (!ctx) return;

  if (!ctx.team.stripeCustomerId) {
    res.status(404).json({ error: "No subscription found" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = getBaseUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.team.stripeCustomerId,
      return_url: `${baseUrl}${APP_BASE_PATH}/settings`,
    });

    res.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create portal session";
    res.status(500).json({ error: message });
  }
});

router.post("/billing/admin/set-tier", async (req: Request, res: Response): Promise<void> => {
  const adminSecret = process.env.ADMIN_SECRET;
  const provided = req.headers["x-admin-secret"] as string | undefined;

  if (!adminSecret || !provided || provided !== adminSecret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { teamId, tier } = req.body as { teamId?: string; tier?: string };
  const ALL_TIERS = new Set(["free", "solo_coach", "team"]);

  if (!teamId || !tier || !ALL_TIERS.has(tier)) {
    res.status(400).json({ error: "teamId and valid tier (free|solo_coach|team) required" });
    return;
  }

  const [team] = await db
    .select({ id: teamsTable.id, name: teamsTable.name, tier: teamsTable.tier })
    .from(teamsTable)
    .where(eq(teamsTable.id, teamId));

  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }

  await db
    .update(teamsTable)
    .set({ tier })
    .where(eq(teamsTable.id, teamId));

  res.json({ ok: true, team: team.name, previousTier: team.tier, newTier: tier });
});

export default router;
