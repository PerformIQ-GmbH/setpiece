import { eq } from "drizzle-orm";
import { db, teamsTable } from "@workspace/db";
import { getStripeSync } from './stripeClient';
import { logger } from './logger';

interface StripeEventObject {
  metadata?: Record<string, string>;
  subscription?: string;
  customer?: string;
  status?: string;
}

interface StripeEvent {
  type: string;
  data?: {
    object?: StripeEventObject;
  };
}

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
      const event: StripeEvent = JSON.parse(payload.toString());
      await WebhookHandlers.handleEvent(event);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message }, "Stripe event handling (non-fatal)");
    }
  }

  static async handleEvent(event: StripeEvent): Promise<void> {
    const obj = event.data?.object;
    if (!obj) return;

    switch (event.type) {
      case "checkout.session.completed": {
        const teamId = obj.metadata?.teamId;
        const tierId = obj.metadata?.tierId;
        const subscriptionId = obj.subscription;

        if (teamId && tierId && subscriptionId) {
          await db
            .update(teamsTable)
            .set({
              tier: tierId,
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: obj.customer ?? undefined,
            })
            .where(eq(teamsTable.id, teamId));
          logger.info({ teamId, tierId, subscriptionId }, "Team upgraded via checkout");
        }
        break;
      }

      case "invoice.paid": {
        const teamId = obj.metadata?.teamId;
        if (teamId) {
          logger.info({ teamId }, "Invoice paid — subscription active");
        }
        break;
      }

      case "invoice.payment_failed": {
        const teamId = obj.metadata?.teamId;
        if (teamId) {
          logger.warn({ teamId }, "Invoice payment failed — subscription at risk");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const teamId = obj.metadata?.teamId;

        if (teamId) {
          await db
            .update(teamsTable)
            .set({ tier: "free", stripeSubscriptionId: null })
            .where(eq(teamsTable.id, teamId));
          logger.info({ teamId }, "Team downgraded to free (subscription deleted)");
        }
        break;
      }

      case "customer.subscription.updated": {
        const teamId = obj.metadata?.teamId;
        if (teamId && obj.status === "past_due") {
          logger.warn({ teamId }, "Subscription past due — payment retry pending");
        }
        break;
      }
    }
  }
}
