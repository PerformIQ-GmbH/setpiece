import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.get("/pricing", async (_req, res): Promise<void> => {
  let soloPriceId: string | null = null;
  let teamPriceId: string | null = null;

  try {
    const result = await db.execute(sql`
      SELECT pr.id as price_id, p.metadata
      FROM stripe.prices pr
      JOIN stripe.products p ON pr.product = p.id
      WHERE p.active = true AND pr.active = true
      AND pr.recurring IS NOT NULL
      ORDER BY pr.unit_amount ASC
    `);

    interface StripePriceRow {
      price_id: string;
      metadata: string | Record<string, string>;
    }

    for (const row of result.rows as StripePriceRow[]) {
      const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      if (metadata?.tierId === 'solo_coach') soloPriceId = row.price_id;
      if (metadata?.tierId === 'team') teamPriceId = row.price_id;
    }
  } catch {
    // Stripe tables may not exist yet
  }

  res.json({
    tiers: [
      {
        id: "free",
        name: "Free",
        price: 0,
        currency: "CHF",
        interval: "month",
        stripePriceId: null,
        features: [
          "1 team",
          "Up to 15 players",
          "3 set pieces",
          "2 matchdays",
          "Basic templates",
          "QR sharing (3 links)",
        ],
        limits: { maxPlayers: 15, maxSetPieces: 3, maxMatchdays: 2, maxShareLinks: 3 },
        highlighted: false,
        cta: "Get Started",
      },
      {
        id: "solo_coach",
        name: "Solo Coach",
        price: 8,
        currency: "CHF",
        interval: "month",
        stripePriceId: soloPriceId,
        features: [
          "1 team",
          "Up to 30 players",
          "20 set pieces",
          "20 matchdays",
          "All templates",
          "QR sharing (20 links)",
          "Player quiz",
          "Readiness dashboard",
          "Ghost mode",
          "Match pack PDF export",
          "Matchday management",
          "Priority support",
        ],
        limits: { maxPlayers: 30, maxSetPieces: 20, maxMatchdays: 20, maxShareLinks: 20 },
        highlighted: true,
        cta: "Upgrade",
      },
      {
        id: "team",
        name: "Team",
        price: 19,
        currency: "CHF",
        interval: "month",
        stripePriceId: teamPriceId,
        features: [
          "Multiple teams",
          "Up to 100 players",
          "100 set pieces",
          "100 matchdays",
          "All templates",
          "QR sharing (100 links)",
          "Player quiz",
          "Readiness dashboard",
          "Ghost mode",
          "Match pack PDF export",
          "Matchday management",
          "Assistant coach access",
          "Team branding",
          "Priority support",
          "Audit trail",
        ],
        limits: { maxPlayers: 100, maxSetPieces: 100, maxMatchdays: 100, maxShareLinks: 100 },
        highlighted: false,
        cta: "Upgrade",
      },
    ],
  });
});

export default router;
