import { eq } from "drizzle-orm";
import { db, teamsTable } from "@workspace/db";
import { getStripeSync } from './stripeClient';
import { logger } from './logger';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const event = JSON.parse(payload.toString());
      await WebhookHandlers.handleEvent(event);
    } catch (err: any) {
      logger.warn({ err: err.message }, "Stripe event handling (non-fatal)");
    }
  }

  static async handleEvent(event: any): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data?.object;
        const teamId = session?.metadata?.teamId;
        const tierId = session?.metadata?.tierId;
        const subscriptionId = session?.subscription;

        if (teamId && tierId && subscriptionId) {
          await db
            .update(teamsTable)
            .set({
              tier: tierId,
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: session.customer,
            })
            .where(eq(teamsTable.id, teamId));
          logger.info({ teamId, tierId, subscriptionId }, "Team upgraded via checkout");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data?.object;
        const teamId = subscription?.metadata?.teamId;

        if (teamId) {
          await db
            .update(teamsTable)
            .set({ tier: "free", stripeSubscriptionId: null })
            .where(eq(teamsTable.id, teamId));
          logger.info({ teamId }, "Team downgraded to free (subscription deleted)");
        }
        break;
      }
    }
  }
}
