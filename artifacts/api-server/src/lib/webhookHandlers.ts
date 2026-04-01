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
      throw new Error('Webhook payload must be a raw Buffer');
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
              stripeSubscriptionStatus: "active",
            })
            .where(eq(teamsTable.id, teamId));
          logger.info({ teamId, tierId, subscriptionId }, "Team upgraded via checkout");
        }
        break;
      }

      case "invoice.paid": {
        const subId = obj.subscription;
        if (subId) {
          await db
            .update(teamsTable)
            .set({ stripeSubscriptionStatus: "active" })
            .where(eq(teamsTable.stripeSubscriptionId, subId));
          logger.info({ subscriptionId: subId }, "Invoice paid — subscription confirmed active");
        }
        break;
      }

      case "invoice.payment_failed": {
        const subId = obj.subscription;
        if (subId) {
          await db
            .update(teamsTable)
            .set({ stripeSubscriptionStatus: "past_due" })
            .where(eq(teamsTable.stripeSubscriptionId, subId));
          logger.warn({ subscriptionId: subId }, "Invoice payment failed — marked past_due");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const teamId = obj.metadata?.teamId;

        if (teamId) {
          await db
            .update(teamsTable)
            .set({
              tier: "free",
              stripeSubscriptionId: null,
              stripeSubscriptionStatus: "canceled",
            })
            .where(eq(teamsTable.id, teamId));
          logger.info({ teamId }, "Team downgraded to free (subscription deleted)");
        }
        break;
      }

      case "customer.subscription.updated": {
        const teamId = obj.metadata?.teamId;
        const status = obj.status;

        if (teamId && status) {
          if (status === "canceled" || status === "unpaid") {
            await db
              .update(teamsTable)
              .set({
                tier: "free",
                stripeSubscriptionId: null,
                stripeSubscriptionStatus: status,
              })
              .where(eq(teamsTable.id, teamId));
            logger.info({ teamId, status }, "Team downgraded — subscription canceled/unpaid");
          } else if (status === "past_due") {
            await db
              .update(teamsTable)
              .set({ stripeSubscriptionStatus: "past_due" })
              .where(eq(teamsTable.id, teamId));
            logger.warn({ teamId }, "Subscription past due — payment retry pending");
          } else if (status === "active") {
            const tierId = obj.metadata?.tierId;
            if (tierId) {
              await db
                .update(teamsTable)
                .set({ tier: tierId, stripeSubscriptionStatus: "active" })
                .where(eq(teamsTable.id, teamId));
              logger.info({ teamId, tierId }, "Subscription reactivated");
            }
          }
        }
        break;
      }
    }
  }
}
