import test from "node:test";
import assert from "node:assert/strict";
import { setupStripe, parseArgs, PROMO_EXPIRES_AT, LAUNCH_COUPON_ID } from "../src/stripe-setup.ts";

// In-memory Stripe mit nur den vom Skript genutzten Aufrufen; fiktive IDs, kein Netz.
function fakeStripe() {
  const state = { products: [], prices: [], coupons: new Map(), promotions: [], webhooks: [], writes: [] };
  let seq = 0;
  const id = prefix => `${prefix}_${++seq}`;
  const write = (kind, value) => { state.writes.push(kind); return value; };
  const stripe = {
    accounts: { retrieve: async () => ({ id: "acct_fiktiv", settings: { dashboard: { display_name: "Fiktiv GmbH" } } }) },
    webhookEndpoints: { list: async () => ({ data: state.webhooks }) },
    products: {
      list: () => ({ async *[Symbol.asyncIterator]() { yield* state.products.filter(p => p.active); } }),
      create: async ({ default_price_data, ...data }) => {
        const product = { id: id("prod"), active: true, ...data };
        state.products.push(product);
        state.prices.push({ id: id("price"), product: product.id, active: true, type: "recurring", ...default_price_data });
        return write("product", product);
      },
    },
    prices: {
      list: async ({ product }) => ({ data: state.prices.filter(p => p.product === product && p.active) }),
      create: async data => write("price", state.prices[state.prices.push({ id: id("price"), active: true, ...data }) - 1]),
    },
    coupons: {
      retrieve: async couponId => {
        const coupon = state.coupons.get(couponId);
        if (!coupon) throw Object.assign(new Error("No such coupon"), { code: "resource_missing" });
        return coupon;
      },
      create: async ({ applies_to, ...data }) => {
        const coupon = { ...data, applies_to: { products: applies_to.products } };
        state.coupons.set(data.id, coupon);
        return write("coupon", coupon);
      },
    },
    promotionCodes: {
      list: async ({ code }) => ({ data: state.promotions.filter(p => p.code.toLowerCase() === code.toLowerCase()) }),
      create: async data => {
        const promotion = { id: id("promo"), active: true, ...data };
        state.promotions.push(promotion);
        return write("promotion", promotion);
      },
    },
  };
  const sync = {
    findOrCreateManagedWebhook: async url => {
      let webhook = state.webhooks.find(w => w.url === url);
      if (!webhook) {
        webhook = { id: id("we"), url, status: "enabled", metadata: { managed_by: "stripe-sync" } };
        state.webhooks.push(write("webhook", webhook));
      }
      return webhook;
    },
    syncProducts: async () => ({ synced: state.products.length }),
    syncPrices: async () => ({ synced: state.prices.length }),
  };
  return { state, stripe, sync };
}

const run = (fake, overrides = {}, secretKey = "sk_test_fiktiv") => {
  const log = [];
  let migrations = 0;
  const promise = setupStripe(
    { domain: "setpiece.example.test", mode: "test", dryRun: false, promoCode: "STARTGRATIS", replaceOldWebhooks: false, ...overrides },
    { stripe: fake.stripe, secretKey, migrate: async () => { migrations++; }, sync: async () => fake.sync, log: line => log.push(line) },
  );
  return promise.then(() => ({ log, migrations }));
};

test("Modusprüfung bricht vor jedem Stripe-Aufruf ab", async () => {
  const fake = fakeStripe();
  fake.stripe.accounts.retrieve = async () => assert.fail("kein Aufruf erwartet");
  await assert.rejects(run(fake, { mode: "live" }), /Modus test, erwartet live/);
  await assert.rejects(run(fake, { mode: "test" }, "sk_live_fiktiv"), /Modus live, erwartet test/);
  await assert.rejects(run(fake, {}, "fiktiv-ohne-praefix"), /kein erkennbares/);
  assert.deepEqual(fake.state.writes, []);
});

test("zweiter Lauf legt nichts doppelt an", async () => {
  const fake = fakeStripe();
  const first = await run(fake);
  assert.deepEqual(fake.state.writes.sort(), ["coupon", "product", "product", "promotion", "webhook"]);
  assert.equal(first.migrations, 1);
  assert.match(first.log.join("\n"), /acct_fiktiv.*Modus test/);
  assert.equal(fake.state.webhooks[0].url, "https://setpiece.example.test/api/billing/webhook");
  assert.deepEqual(fake.state.prices.map(p => [p.unit_amount, p.currency, p.recurring.interval]), [[800, "chf", "month"], [1900, "chf", "month"]]);
  const coupon = fake.state.coupons.get(LAUNCH_COUPON_ID);
  assert.deepEqual([coupon.percent_off, coupon.duration, coupon.duration_in_months], [100, "repeating", 1]);
  assert.deepEqual(coupon.applies_to.products, fake.state.products.map(p => p.id));
  assert.equal(fake.state.promotions[0].restrictions.first_time_transaction, true);

  fake.state.writes.length = 0;
  await run(fake);
  assert.deepEqual(fake.state.writes, []);
  assert.equal(fake.state.products.length, 2);
  assert.equal(fake.state.promotions.length, 1);
});

test("Ablaufdatum ist 31.01.2027 23:59 Europe/Zurich", async () => {
  assert.equal(new Date(PROMO_EXPIRES_AT * 1000).toISOString(), "2027-01-31T22:59:59.000Z");
  assert.equal(new Date(PROMO_EXPIRES_AT * 1000).toLocaleString("de-CH", { timeZone: "Europe/Zurich" }), "31.1.2027, 23:59:59");
  const fake = fakeStripe();
  await run(fake);
  assert.equal(fake.state.promotions[0].expires_at, PROMO_EXPIRES_AT);
  assert.deepEqual(fake.state.promotions[0].promotion, { type: "coupon", coupon: LAUNCH_COUPON_ID });
});

test("Trockenlauf schreibt nichts, fremde verwaltete Webhooks stoppen den Schreiblauf", async () => {
  const fake = fakeStripe();
  fake.state.webhooks.push({ id: "we_alt", url: "https://anderes.example.test/hook", status: "enabled", metadata: { managed_by: "stripe-sync" } });
  const dry = await run(fake, { dryRun: true });
  assert.deepEqual(fake.state.writes, []);
  assert.equal(dry.migrations, 0);
  assert.match(dry.log.join("\n"), /we_alt.*anderes\.example\.test/);
  await assert.rejects(run(fake), /--replace-old-webhooks/);
  assert.deepEqual(fake.state.writes, []);
});

test("abweichender vorhandener Promotion Code wird nicht überschrieben", async () => {
  const fake = fakeStripe();
  await run(fake);
  fake.state.promotions[0].expires_at += 86400;
  await assert.rejects(run(fake), /abweichenden Bedingungen/);
});

test("Parameter sind Pflicht und werden geprüft", () => {
  assert.throws(() => parseArgs(["--mode", "test"]), /--domain/);
  assert.throws(() => parseArgs(["--domain", "https://x.test/", "--mode", "test"]), /--domain/);
  assert.throws(() => parseArgs(["--domain", "x.example.test"]), /--mode/);
  assert.throws(() => parseArgs(["--domain", "x.example.test", "--mode", "test", "--promo-code"]), /--promo-code/);
  assert.deepEqual(parseArgs(["--", "--domain", "x.example.test", "--mode", "live", "--dry-run"]),
    { domain: "x.example.test", mode: "live", promoCode: undefined, dryRun: true, replaceOldWebhooks: false });
});
