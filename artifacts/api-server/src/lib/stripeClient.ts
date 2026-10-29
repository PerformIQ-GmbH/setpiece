import Stripe from 'stripe';
import type { StripeSync as StripeSyncClient } from 'stripe-replit-sync';

// Keep requests aligned with the types shipped by our pinned Stripe 20 SDK.
const STRIPE_API_VERSION = '2025-11-17.clover' satisfies Stripe.LatestApiVersion;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X-Replit-Token': xReplitToken
    }
  });

  if (!response.ok) {
    throw new Error(`Stripe connector request failed (${response.status})`);
  }

  const data: unknown = await response.json();
  const connection = isRecord(data) && Array.isArray(data.items) ? data.items[0] : undefined;
  const settings = isRecord(connection) && isRecord(connection.settings) ? connection.settings : undefined;
  if (!settings || typeof settings.publishable !== 'string' || !settings.publishable
    || typeof settings.secret !== 'string' || !settings.secret) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return {
    publishableKey: settings.publishable,
    secretKey: settings.secret,
  };
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: StripeSyncClient | null = null;

export async function getStripeSync(): Promise<StripeSyncClient> {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
      stripeApiVersion: STRIPE_API_VERSION,
    });
  }
  return stripeSync;
}
