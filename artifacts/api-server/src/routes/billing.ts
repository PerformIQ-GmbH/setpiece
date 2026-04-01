import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, teamsTable, membershipsTable } from "@workspace/db";
import { getUncachableStripeClient } from "../lib/stripeClient";
import type { Request, Response } from "express";

const router: IRouter = Router();

async function getUserTeam(userId: string) {
  const [membership] = await db
    .select({ teamId: membershipsTable.teamId })
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, userId));

  if (!membership) return null;

  const [team] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, membership.teamId));

  return team || null;
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
    return (result.rows[0] as any)?.price_id || null;
  } catch {
    return null;
  }
}

const VALID_TIERS = new Set(["solo_coach", "team"]);

router.get("/billing/subscription", async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const team = await getUserTeam(user.id);
  if (!team) {
    res.json({ subscription: null, tier: "free" });
    return;
  }

  if (!team.stripeSubscriptionId) {
    res.json({ subscription: null, tier: team.tier });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(team.stripeSubscriptionId);
    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      tier: team.tier,
    });
  } catch {
    res.json({ subscription: null, tier: team.tier });
  }
});

router.post("/billing/checkout", async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { priceId, tierId } = req.body;
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

  const team = await getUserTeam(user.id);
  if (!team) {
    res.status(404).json({ error: "No team found" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    let customerId = team.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { teamId: team.id, userId: user.id },
      });
      await db
        .update(teamsTable)
        .set({ stripeCustomerId: customer.id })
        .where(eq(teamsTable.id, team.id));
      customerId = customer.id;
    }

    const baseUrl = `https://${req.get("host")}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/setpiece/pricing?success=true`,
      cancel_url: `${baseUrl}/setpiece/pricing?canceled=true`,
      metadata: { teamId: team.id, tierId },
      subscription_data: {
        metadata: { teamId: team.id, tierId },
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create checkout session" });
  }
});

router.post("/billing/portal", async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const team = await getUserTeam(user.id);
  if (!team || !team.stripeCustomerId) {
    res.status(404).json({ error: "No subscription found" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${req.get("host")}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: team.stripeCustomerId,
      return_url: `${baseUrl}/setpiece/settings`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create portal session" });
  }
});

export default router;
