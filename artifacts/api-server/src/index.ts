import { runMigrations } from "stripe-replit-sync";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import app from "./app";
import { logger } from "./lib/logger";
import { seedTemplates } from "./lib/seedTemplates";
import { getStripeSync } from "./lib/stripeClient";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set, skipping Stripe init");
    return;
  }

  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const webhookResult = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/billing/webhook`,
    );
    logger.info({ url: webhookResult?.webhook?.url }, "Stripe webhook configured");

    stripeSync
      .syncBackfill()
      .then(() => logger.info("Stripe data synced"))
      .catch((err: Error) => logger.error({ err }, "Error syncing Stripe data"));
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize Stripe");
  }
}

await initStripe();

async function runEnumMigrations() {
  const newValues = [
    "direct_free_kick_left",
    "direct_free_kick_right",
    "indirect_free_kick_left",
    "indirect_free_kick_right",
  ];
  for (const val of newValues) {
    try {
      await db.execute(sql.raw(
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '${val}' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'set_piece_category')) THEN ALTER TYPE set_piece_category ADD VALUE '${val}'; END IF; END $$;`
      ));
    } catch {
    }
  }
  logger.info("Enum migrations complete");
}

await runEnumMigrations();

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await seedTemplates();
});
