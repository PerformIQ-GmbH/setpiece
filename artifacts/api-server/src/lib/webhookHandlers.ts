import { and, eq, isNull, sql } from "drizzle-orm";
import { db, teamsTable } from "@workspace/db";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { logger } from "./logger";

interface StripeEventObject {
  id?: string;
  mode?: string;
  metadata?: Record<string, string>;
  subscription?: string | { id: string } | null;
  parent?: {
    subscription_details?: {
      subscription?: string | { id: string } | null;
    } | null;
  } | null;
}

interface StripeEvent {
  type: string;
  data?: { object?: StripeEventObject };
}

function objectId(
  value: string | { id: string } | null | undefined,
): string | undefined {
  return typeof value === "string" ? value : value?.id;
}

export class WebhookHandlers {
  static async processWebhook(
    payload: Buffer,
    signature: string,
  ): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error("Webhook payload must be a raw Buffer");
    }

    const sync = await getStripeSync();
    // The sync library verifies the signature before any application updates.
    await sync.processWebhook(payload, signature);
    await WebhookHandlers.handleEvent(
      JSON.parse(payload.toString()) as StripeEvent,
    );
  }

  static async handleEvent(event: StripeEvent): Promise<void> {
    const obj = event.data?.object;
    if (!obj) return;

    let subscriptionId: string | undefined;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        if (obj.mode !== "subscription") return;
        subscriptionId = objectId(obj.subscription);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
        // Basil moved this reference; accept older configured webhook versions too.
        subscriptionId = objectId(
          obj.parent?.subscription_details?.subscription ?? obj.subscription,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        subscriptionId = obj.id;
        break;
      default:
        return;
    }
    if (!subscriptionId) return;

    // First resolve the team; reconciliation reads Stripe again under its lock.
    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    let [team] = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.stripeSubscriptionId, subscription.id));

    if (!team && subscription.metadata.teamId) {
      [team] = await db
        .select()
        .from(teamsTable)
        .where(eq(teamsTable.id, subscription.metadata.teamId));
    }
    if (!team) return;

    const teamId = team.id;
    await db.transaction(async (tx) => {
      // Share the checkout lock across server instances. An earlier API response
      // must not overwrite a cancellation processed by a parallel delivery.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`billing:${teamId}`}))`,
      );
      const [team] = await tx
        .select()
        .from(teamsTable)
        .where(eq(teamsTable.id, teamId));
      if (!team) return;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price.product"],
      });

      if (
        team.stripeSubscriptionId &&
        team.stripeSubscriptionId !== subscription.id
      ) {
        const existing = await stripe.subscriptions.retrieve(
          team.stripeSubscriptionId,
        );
        // A delayed event for an old subscription must not replace a newer live one.
        if (
          existing.status !== "canceled" &&
          existing.status !== "incomplete_expired"
        )
          return;
        if (
          subscription.status === "canceled" ||
          subscription.status === "incomplete_expired"
        )
          return;
      }

      const customerId = objectId(subscription.customer);
      if (team.stripeCustomerId && team.stripeCustomerId !== customerId) {
        throw new Error("Stripe subscription customer does not match its team");
      }

      let tier = "free";
      if (["active", "trialing", "past_due"].includes(subscription.status)) {
        const product = subscription.items.data[0]?.price.product;
        const tierId =
          product && typeof product !== "string" && !product.deleted
            ? product.metadata.tierId
            : subscription.metadata.tierId;
        if (tierId !== "solo_coach" && tierId !== "team") {
          throw new Error("Stripe subscription has no supported product tier");
        }
        tier = tierId;
      }

      const updated = await tx
        .update(teamsTable)
        .set({
          tier,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customerId,
          stripeSubscriptionStatus: subscription.status,
        })
        .where(
          and(
            eq(teamsTable.id, team.id),
            team.stripeSubscriptionId
              ? eq(teamsTable.stripeSubscriptionId, team.stripeSubscriptionId)
              : isNull(teamsTable.stripeSubscriptionId),
          ),
        )
        .returning({ id: teamsTable.id });
      if (updated.length === 0) {
        throw new Error(
          "Team billing changed during webhook processing; retry required",
        );
      }
      logger.info(
        {
          teamId: team.id,
          subscriptionId: subscription.id,
          status: subscription.status,
          tier,
        },
        "Team subscription reconciled",
      );
    });
  }
}
