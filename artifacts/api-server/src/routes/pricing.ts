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
          "Up to 5 players",
          "3 set pieces",
          "Basic templates",
          "QR sharing",
        ],
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
          "Unlimited players",
          "Unlimited set pieces",
          "All templates",
          "QR sharing",
          "Player quiz",
          "Readiness dashboard",
          "Ghost mode",
          "Match pack PDF export",
          "Matchday management",
          "Priority support",
        ],
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
          "Unlimited players",
          "Unlimited set pieces",
          "All templates",
          "QR sharing",
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
        highlighted: false,
        cta: "Contact Us",
      },
    ],
  });
});

export default router;
