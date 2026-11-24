// Einmalige, geprüfte Stripe-Einrichtung je Modus (Entscheid Vince 24.11.2026), nicht beim App-Start.
// Aufruf und Ablauf: docs/DEPLOYMENT.md, Abschnitt «Stripe-Einrichtung per Skript».
import { pathToFileURL } from 'node:url';
import type Stripe from 'stripe';
import type { StripeSync } from 'stripe-replit-sync';

type Mode = 'test' | 'live';
export type Options = { domain: string; mode: Mode; dryRun: boolean; promoCode?: string; replaceOldWebhooks: boolean };
export type Deps = {
  stripe: Stripe;
  secretKey: string;
  migrate: () => Promise<void>;
  sync: () => Promise<Pick<StripeSync, 'findOrCreateManagedWebhook' | 'syncProducts' | 'syncPrices'>>;
  log: (line: string) => void;
};

export const WEBHOOK_PATH = '/api/billing/webhook';
export const LAUNCH_COUPON_ID = 'setpiece-launch-first-month-free';
// Europe/Zurich ist im Januar MEZ (UTC+1): 31.01.2027 23:59:59 Ortszeit.
export const PROMO_EXPIRES_AT = Date.parse('2027-01-31T23:59:59+01:00') / 1000;
const PRODUCTS = [
  { tierId: 'solo_coach', name: 'Solo Coach', unitAmount: 800, description: 'For individual coaches managing one team with advanced features' },
  { tierId: 'team', name: 'Team', unitAmount: 1900, description: 'For coaching staff managing multiple teams with full platform access' },
];

export function parseArgs(argv: string[]): Options {
  const args = argv.filter(arg => arg !== '--');
  const value = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const domain = value('--domain');
  const mode = value('--mode');
  const promoCode = value('--promo-code');
  if (!domain || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain)) {
    throw new Error('--domain <host> fehlt oder ist ungültig (nur Hostname, z. B. setpiece.performiq.ch)');
  }
  if (mode !== 'test' && mode !== 'live') throw new Error('--mode test|live fehlt');
  if (args.includes('--promo-code') && !/^[A-Za-z0-9_-]{3,40}$/.test(promoCode ?? '')) {
    throw new Error('--promo-code <CODE> ist ungültig (3–40 Zeichen A–Z, 0–9, _ oder -)');
  }
  return { domain, mode, promoCode, dryRun: args.includes('--dry-run'), replaceOldWebhooks: args.includes('--replace-old-webhooks') };
}

export function keyMode(secretKey: string): Mode {
  const match = /^(?:sk|rk)_(test|live)_/.exec(secretKey);
  if (!match) throw new Error('Stripe-Schlüssel hat kein erkennbares Test-/Live-Präfix');
  return match[1] as Mode;
}

const managedBySync = (endpoint: Stripe.WebhookEndpoint) =>
  endpoint.metadata?.managed_by?.toLowerCase().replace(/[\s-]+/g, '') === 'stripesync'
  || (endpoint.description ?? '').toLowerCase().replace(/[\s-]+/g, '').includes('stripesync');

export async function setupStripe(options: Options, { stripe, secretKey, migrate, sync, log }: Deps) {
  const mode = keyMode(secretKey);
  if (mode !== options.mode) {
    throw new Error(`Stripe-Schlüssel ist im Modus ${mode}, erwartet ${options.mode}. Abbruch ohne Änderungen.`);
  }
  const account = await stripe.accounts.retrieve();
  log(`Stripe-Konto ${account.id} (${account.settings?.dashboard?.display_name ?? 'ohne Anzeigename'}) · Modus ${mode}`);
  log(options.dryRun ? 'Trockenlauf: es wird nichts geschrieben.' : 'Schreiblauf.');

  const webhookUrl = `https://${options.domain}${WEBHOOK_PATH}`;
  const endpoints = (await stripe.webhookEndpoints.list({ limit: 100 })).data;
  // stripe-replit-sync löscht andere von ihm verwaltete Endpunkte im Konto; das darf nicht unbemerkt passieren.
  const replaced = endpoints.filter(endpoint => managedBySync(endpoint) && endpoint.url !== webhookUrl);
  for (const endpoint of replaced) log(`Verwalteter Webhook würde ersetzt/gelöscht: ${endpoint.id} ${endpoint.url}`);
  if (replaced.length && !options.dryRun && !options.replaceOldWebhooks) {
    throw new Error('Andere verwaltete Webhooks im Konto. Zuordnung prüfen, dann mit --replace-old-webhooks wiederholen.');
  }
  const current = endpoints.find(endpoint => endpoint.url === webhookUrl);
  log(`Webhook ${webhookUrl}: ${current ? `vorhanden (${current.id}, ${current.status})` : 'wird angelegt'}`);

  const active: Stripe.Product[] = [];
  for await (const product of stripe.products.list({ active: true, limit: 100 })) active.push(product);
  const productIds: string[] = [];
  const pending: Array<() => Promise<void>> = [];
  for (const tier of PRODUCTS) {
    const matches = active.filter(product => product.metadata?.tierId === tier.tierId);
    if (matches.length > 1) throw new Error(`Mehrere aktive Produkte mit tierId ${tier.tierId}; bitte im Dashboard bereinigen.`);
    const product = matches[0];
    if (!product) {
      log(`Produkt ${tier.name} (${tier.unitAmount / 100} CHF/Monat): wird angelegt`);
      pending.push(async () => {
        const created = await stripe.products.create({
          name: tier.name,
          description: tier.description,
          metadata: { tierId: tier.tierId },
          default_price_data: { currency: 'chf', unit_amount: tier.unitAmount, recurring: { interval: 'month' }, metadata: { tierId: tier.tierId } },
        }, { idempotencyKey: `setpiece-product:${tier.tierId}:v1` });
        productIds.push(created.id);
        log(`Produkt ${tier.name} angelegt: ${created.id}`);
      });
      continue;
    }
    productIds.push(product.id);
    const prices = (await stripe.prices.list({ product: product.id, active: true, type: 'recurring', limit: 100 })).data;
    const priceOk = prices.some(price => price.currency === 'chf' && price.unit_amount === tier.unitAmount && price.recurring?.interval === 'month');
    log(`Produkt ${tier.name}: vorhanden (${product.id}), Preis ${priceOk ? 'vorhanden' : 'wird angelegt'}`);
    if (!priceOk) pending.push(async () => {
      const price = await stripe.prices.create({
        product: product.id, currency: 'chf', unit_amount: tier.unitAmount, recurring: { interval: 'month' }, metadata: { tierId: tier.tierId },
      }, { idempotencyKey: `setpiece-price:${product.id}:${tier.unitAmount}:v1` });
      log(`Preis ${tier.name} angelegt: ${price.id}`);
    });
  }

  if (!options.dryRun) {
    await migrate();
    log('stripe-Schema bereit.');
    for (const step of pending) await step();
    const stripeSync = await sync();
    const webhook = await stripeSync.findOrCreateManagedWebhook(webhookUrl);
    log(`Webhook bereit: ${webhook.id} ${webhook.url} (${webhook.status})`);
    const products = await stripeSync.syncProducts();
    const prices = await stripeSync.syncPrices();
    log(`In Datenbank synchronisiert: ${products.synced} Produkte, ${prices.synced} Preise.`);
  }

  if (options.promoCode) await setupPromotion(options.promoCode, productIds, options.dryRun, stripe, log);
}

async function setupPromotion(code: string, productIds: string[], dryRun: boolean, stripe: Stripe, log: (line: string) => void) {
  let coupon: Stripe.Coupon | null = null;
  try {
    coupon = await stripe.coupons.retrieve(LAUNCH_COUPON_ID, { expand: ['applies_to'] });
  } catch (error) {
    if ((error as { code?: string }).code !== 'resource_missing') throw error;
  }
  if (coupon) {
    const appliesTo = coupon.applies_to?.products ?? [];
    const covered = productIds.every(id => appliesTo.includes(id));
    if (coupon.percent_off !== 100 || coupon.duration !== 'repeating' || coupon.duration_in_months !== 1 || !covered) {
      throw new Error(`Coupon ${LAUNCH_COUPON_ID} existiert mit abweichenden Bedingungen; nicht überschrieben.`);
    }
    log(`Coupon ${coupon.id}: vorhanden`);
  } else {
    log(`Coupon ${LAUNCH_COUPON_ID} (100 % für 1 Monat, Solo Coach und Team): wird angelegt`);
    if (!dryRun) {
      coupon = await stripe.coupons.create({
        id: LAUNCH_COUPON_ID,
        name: 'Erster Monat gratis',
        percent_off: 100,
        duration: 'repeating',
        duration_in_months: 1,
        applies_to: { products: productIds },
      });
    }
  }

  const expires = new Date(PROMO_EXPIRES_AT * 1000).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' });
  const existing = (await stripe.promotionCodes.list({ code, limit: 10 })).data
    .find(promotion => promotion.code.toLowerCase() === code.toLowerCase());
  if (existing) {
    const couponId = typeof existing.promotion.coupon === 'string' ? existing.promotion.coupon : existing.promotion.coupon?.id;
    if (couponId !== LAUNCH_COUPON_ID || existing.expires_at !== PROMO_EXPIRES_AT
      || !existing.restrictions.first_time_transaction || !existing.active) {
      throw new Error(`Promotion Code ${code} existiert mit abweichenden Bedingungen; nicht überschrieben.`);
    }
    log(`Promotion Code ${code}: vorhanden (${existing.id}), gültig bis ${expires} Europe/Zurich`);
    return;
  }
  log(`Promotion Code ${code}: wird angelegt, nur Erstkunden, gültig bis ${expires} Europe/Zurich`);
  if (dryRun) return;
  const created = await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: LAUNCH_COUPON_ID },
    code,
    expires_at: PROMO_EXPIRES_AT,
    restrictions: { first_time_transaction: true },
  });
  log(`Promotion Code angelegt: ${created.id}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl && !options.dryRun) throw new Error('DATABASE_URL fehlt');
    const { getUncachableStripeClient, getStripeSecretKey } = await import('./stripeClient');
    const secretKey = await getStripeSecretKey();
    const stripe = await getUncachableStripeClient();
    await setupStripe(options, {
      stripe,
      secretKey,
      log: line => console.log(line),
      migrate: async () => (await import('stripe-replit-sync')).runMigrations({ databaseUrl: databaseUrl! }),
      sync: async () => new (await import('stripe-replit-sync')).StripeSync({
        poolConfig: { connectionString: databaseUrl!, max: 2 },
        stripeSecretKey: secretKey,
        stripeApiVersion: '2025-11-17.clover',
      }),
    });
    console.log('Fertig.');
    process.exit(0);
  } catch (error) {
    console.error('Abbruch:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
