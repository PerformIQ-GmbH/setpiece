import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/pricing", async (_req, res): Promise<void> => {
  res.json({
    tiers: [
      {
        id: "free",
        name: "Free",
        price: 0,
        currency: "CHF",
        interval: "month",
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
        cta: "Start Free Trial",
      },
      {
        id: "team",
        name: "Team",
        price: 19,
        currency: "CHF",
        interval: "month",
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
        cta: "Contact Us",
      },
    ],
  });
});

export default router;
