import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import express from 'express';

const require = createRequire(import.meta.url);
const state = {};
const teamsTable = Object.fromEntries(['id', 'tier', 'stripeCustomerId', 'stripeSubscriptionId', 'stripeSubscriptionStatus']
  .map(key => [key, `teams.${key}`]));
const membershipsTable = Object.fromEntries(['teamId', 'role', 'userId'].map(key => [key, `memberships.${key}`]));
const matches = (row, condition) => !condition || (condition.and
  ? condition.and.every(part => matches(row, part))
  : row[condition.field.split('.').at(-1)] === condition.value);
const orm = {
  eq: (field, value) => ({ field, value }),
  isNull: field => ({ field, value: null }),
  and: (...and) => ({ and }),
  sql: (strings, ...values) => ({ text: strings.join('?'), values }),
};
const db = {
  select: () => ({ from: table => ({ where: async condition => {
    const rows = table === membershipsTable ? state.memberships : state.teams;
    return rows.filter(row => matches(row, condition)).map(row => ({ ...row }));
  } }) }),
  update: () => ({ set: values => ({ where: condition => {
    let result;
    const execute = () => result ??= Promise.resolve().then(() => {
      if (state.failUpdate) { state.failUpdate = false; throw new Error('synthetic database failure'); }
      const rows = state.teams.filter(row => matches(row, condition));
      rows.forEach(row => Object.assign(row, values));
      state.updates++;
      return rows.map(row => ({ id: row.id }));
    });
    return { then: (...args) => execute().then(...args), returning: execute };
  } }) }),
  execute: async statement => {
    state.sql.push(statement);
    return { rows: statement.text.includes('stripe.prices') ? [{ price_id: 'price_solo' }] : [] };
  },
  transaction: async callback => {
    const previous = state.lock;
    let unlock;
    state.lock = new Promise(resolve => { unlock = resolve; });
    await previous;
    try { return await callback(db); } finally { unlock(); }
  },
};
const stripe = {
  subscriptions: {
    retrieve: async id => {
      state.retrieved.push(id);
      if (state.stripeUnavailable) throw new Error('synthetic Stripe outage');
      const subscription = state.subscriptions.get(id);
      if (!subscription) throw new Error(`unknown synthetic subscription ${id}`);
      const snapshot = structuredClone(subscription);
      await state.beforeRetrieve?.(id, snapshot);
      return snapshot;
    },
    list: () => ({ async *[Symbol.asyncIterator]() { yield* state.listedSubscriptions; } }),
  },
  customers: { create: async (_data, options) => {
    state.customerCreates++;
    assert.match(options.idempotencyKey, /^setpiece-customer:/);
    return { id: 'cus_team' };
  } },
  checkout: { sessions: {
    list: async ({ status, limit }) => ({ data: structuredClone(state.sessions.filter(session => !status || session.status === status).slice(0, limit)) }),
    create: async (data, options) => {
      state.checkoutCreates++;
      state.checkoutData = data;
      assert.match(options.idempotencyKey, /^setpiece-checkout:/);
      const session = { id: 'cs_one', status: 'open', mode: 'subscription', metadata: data.metadata, url: 'https://checkout.stripe.test/one' };
      state.sessions.unshift(session);
      return session;
    },
  } },
  billingPortal: { sessions: { create: async () => ({ url: 'https://billing.stripe.test/portal' }) } },
};
const stripeClient = {
  getUncachableStripeClient: async () => stripe,
  getStripeSync: async () => ({ processWebhook: async (_payload, signature) => {
    if (signature !== 'synthetic-valid-signature') {
      const error = new Error('invalid synthetic signature');
      error.name = 'StripeSignatureVerificationError';
      throw error;
    }
  } }),
};
globalThis.__setpieceBillingTest = {
  db, teamsTable, membershipsTable, orm, stripeClient,
  emptyRouter: express.Router(),
  logger: { info() {}, warn() {}, error() {} },
};
const compiled = await build({
  stdin: {
    contents: `export { default as billingRouter } from './src/routes/billing.ts';
      export { default as app } from './src/app.ts';
      export { WebhookHandlers } from './src/lib/webhookHandlers.ts';`,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  plugins: [{ name: 'synthetic-io', setup(build) {
    build.onResolve({ filter: /^@workspace\/db$|^drizzle-orm$|^pino-http$|stripeClient$|logger$|authMiddleware$|^\.\/routes$/ }, args => {
      if (args.path === './routes' && !args.importer.endsWith('app.ts')) return;
      return { path: args.path, namespace: 'synthetic' };
    });
    build.onLoad({ filter: /.*/, namespace: 'synthetic' }, ({ path }) => ({ contents:
      path === '@workspace/db' ? 'module.exports = globalThis.__setpieceBillingTest;' :
      path === 'drizzle-orm' ? 'module.exports = globalThis.__setpieceBillingTest.orm;' :
      path === 'pino-http' ? 'module.exports = () => (_req, _res, next) => next();' :
      path.endsWith('stripeClient') ? 'module.exports = globalThis.__setpieceBillingTest.stripeClient;' :
      path.endsWith('logger') ? 'exports.logger = globalThis.__setpieceBillingTest.logger;' :
      path.endsWith('authMiddleware') ? 'exports.authMiddleware = (_req, _res, next) => next();' :
      'module.exports = globalThis.__setpieceBillingTest.emptyRouter;', loader: 'js' }));
  } }],
});
const compiledModule = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, compiledModule, compiledModule.exports);
const { billingRouter, app, WebhookHandlers } = compiledModule.exports;

const makeSubscription = (id, overrides = {}) => ({
  id, status: 'active', customer: 'cus_team', metadata: { teamId: 'team_one', tierId: 'solo_coach' },
  items: { data: [{ current_period_end: 1800000000, price: { product: { id: 'prod_solo', metadata: { tierId: 'solo_coach' } } } }] },
  cancel_at_period_end: false, ...overrides,
});
beforeEach(() => Object.assign(state, {
  teams: [{ id: 'team_one', tier: 'free', stripeCustomerId: 'cus_team', stripeSubscriptionId: null, stripeSubscriptionStatus: null }],
  memberships: [{ teamId: 'team_one', userId: 'coach_one', role: 'head_coach' }],
  subscriptions: new Map(), listedSubscriptions: [], sessions: [], retrieved: [], sql: [],
  updates: 0, checkoutCreates: 0, customerCreates: 0, failUpdate: false,
  stripeUnavailable: false, beforeRetrieve: undefined, lock: Promise.resolve(),
}));

async function request(target, path, { body, signature, method = 'POST' } = {}) {
  const server = target.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method, headers: { 'content-type': 'application/json', ...(signature ? { 'stripe-signature': signature } : {}) },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, body: text.startsWith('{') ? JSON.parse(text) : text };
  } finally { await new Promise(resolve => server.close(resolve)); }
}
function coachApp() {
  const target = express();
  target.use(express.json());
  target.use((req, _res, next) => {
    req.isAuthenticated = () => true;
    req.user = { id: 'coach_one', email: 'coach@example.test' };
    next();
  });
  target.use('/api', billingRouter);
  return target;
}
const checkoutBody = { teamId: 'team_one', tierId: 'solo_coach', priceId: 'price_solo' };
test('free pilot never opens paid checkout or creates Stripe records', async () => {
  const old = process.env.SETPIECE_PILOT_ENABLED;
  process.env.SETPIECE_PILOT_ENABLED = 'true';
  try {
    const result = await request(coachApp(), '/api/billing/checkout', { body: checkoutBody });
    assert.equal(result.status, 503);
    assert.equal(state.checkoutCreates, 0);
    assert.equal(state.customerCreates, 0);
  } finally {
    if (old === undefined) delete process.env.SETPIECE_PILOT_ENABLED;
    else process.env.SETPIECE_PILOT_ENABLED = old;
  }
});
const subscriptionEvent = (id, type = 'customer.subscription.updated', metadata = { teamId: 'team_one' }) =>
  ({ type, data: { object: { id, metadata } } });

test('removed admin tier endpoint never modifies a team', async () => {
  const result = await request(coachApp(), '/api/billing/admin/set-tier', { body: { teamId: 'team_one', tier: 'team' } });
  assert.equal(result.status, 404);
  assert.equal(state.updates, 0);
});

test('existing live subscription blocks another checkout', async () => {
  state.teams[0].stripeSubscriptionId = 'sub_existing';
  state.subscriptions.set('sub_existing', makeSubscription('sub_existing', { status: 'past_due' }));
  const result = await request(coachApp(), '/api/billing/checkout', { body: checkoutBody });
  assert.equal(result.status, 409);
  assert.equal(state.checkoutCreates, 0);
});

test('Stripe subscription blocks checkout even before the first webhook arrives', async () => {
  state.listedSubscriptions.push(makeSubscription('sub_not_yet_linked'));
  const result = await request(coachApp(), '/api/billing/checkout', { body: checkoutBody });
  assert.equal(result.status, 409);
  assert.equal(state.checkoutCreates, 0);
});

test('parallel checkout requests reuse one open Stripe session', async () => {
  const results = await Promise.all([1, 2].map(() => request(coachApp(), '/api/billing/checkout', { body: checkoutBody })));
  assert.deepEqual(results.map(result => result.status), [200, 200]);
  assert.equal(results[0].body.url, results[1].body.url);
  assert.equal(state.checkoutCreates, 1);
  assert.equal(state.sql.filter(query => query.text.includes('pg_advisory_xact_lock')).length, 2);
  assert.match(state.checkoutData.success_url, /\/pricing\?success=true$/);
  assert.doesNotMatch(state.checkoutData.success_url, /\/setpiece\/pricing/);
});

test('a different open checkout cannot create a second subscription checkout', async () => {
  state.sessions.push({ id: 'cs_other', status: 'open', mode: 'subscription', metadata: { tierId: 'team' }, url: 'https://checkout.stripe.test/other' });
  const result = await request(coachApp(), '/api/billing/checkout', { body: checkoutBody });
  assert.equal(result.status, 409);
  assert.equal(state.checkoutCreates, 0);
});

test('an open subscription checkout beyond one page of completed sessions is reused', async () => {
  state.sessions = Array.from({ length: 101 }, (_, index) => ({ id: `cs_complete_${index}`, status: 'complete', mode: 'subscription' }));
  state.sessions.push({ id: 'cs_open_older', status: 'open', mode: 'subscription', metadata: { tierId: 'solo_coach' }, url: 'https://checkout.stripe.test/existing' });
  const result = await request(coachApp(), '/api/billing/checkout', { body: checkoutBody });
  assert.equal(result.status, 200);
  assert.equal(result.body.url, 'https://checkout.stripe.test/existing');
  assert.equal(state.checkoutCreates, 0);
});

test('foreign team IDs and player memberships cannot view or manage billing', async () => {
  for (const teamId of ['foreign-team', 'team_one']) {
    if (teamId === 'team_one') state.memberships[0].role = 'player';
    assert.equal((await request(coachApp(), `/api/billing/subscription/${teamId}`, { method: 'GET' })).status, 403);
    assert.equal((await request(coachApp(), '/api/billing/checkout', { body: { ...checkoutBody, teamId } })).status, 403);
    assert.equal((await request(coachApp(), '/api/billing/portal', { body: { teamId } })).status, 403);
  }
  assert.equal(state.retrieved.length, 0);
  assert.equal(state.checkoutCreates, 0);
  assert.equal(state.updates, 0);
});

test('subscription endpoint uses item billing periods and reports Stripe outages', async () => {
  state.teams[0].stripeSubscriptionId = 'sub_one';
  state.subscriptions.set('sub_one', makeSubscription('sub_one'));
  const result = await request(coachApp(), '/api/billing/subscription/team_one', { method: 'GET' });
  assert.equal(result.body.subscription.currentPeriodEnd, 1800000000);
  state.stripeUnavailable = true;
  assert.equal((await request(coachApp(), '/api/billing/subscription/team_one', { method: 'GET' })).status, 502);
});

test('application webhook failure returns 500 and the same delivery can be retried idempotently', async () => {
  state.subscriptions.set('sub_one', makeSubscription('sub_one'));
  state.failUpdate = true;
  const options = { body: subscriptionEvent('sub_one'), signature: 'synthetic-valid-signature' };
  assert.equal((await request(app, '/api/billing/webhook', options)).status, 500);
  assert.equal(state.teams[0].tier, 'free');
  assert.equal((await request(app, '/api/billing/webhook', options)).status, 200);
  const afterRetry = { ...state.teams[0] };
  assert.equal((await request(app, '/api/billing/webhook', options)).status, 200);
  assert.deepEqual(state.teams[0], afterRetry);
  assert.equal(state.teams[0].stripeSubscriptionId, 'sub_one');
});

test('cancellation without metadata downgrades by stored subscription ID', async () => {
  Object.assign(state.teams[0], { tier: 'team', stripeSubscriptionId: 'sub_canceled' });
  state.subscriptions.set('sub_canceled', makeSubscription('sub_canceled', { status: 'canceled', metadata: {} }));
  await WebhookHandlers.handleEvent(subscriptionEvent('sub_canceled', 'customer.subscription.deleted', {}));
  assert.equal(state.teams[0].tier, 'free');
  assert.equal(state.teams[0].stripeSubscriptionStatus, 'canceled');
  assert.equal(state.teams[0].stripeSubscriptionId, 'sub_canceled');
});

test('delayed old cancellation cannot downgrade a newer live subscription', async () => {
  Object.assign(state.teams[0], { tier: 'team', stripeSubscriptionId: 'sub_new' });
  state.subscriptions.set('sub_old', makeSubscription('sub_old', { status: 'canceled' }));
  state.subscriptions.set('sub_new', makeSubscription('sub_new'));
  await WebhookHandlers.handleEvent(subscriptionEvent('sub_old', 'customer.subscription.deleted'));
  assert.equal(state.teams[0].tier, 'team');
  assert.equal(state.teams[0].stripeSubscriptionId, 'sub_new');
  assert.equal(state.updates, 0);
});

test('an older in-flight Stripe snapshot cannot overwrite a concurrently reconciled cancellation', async () => {
  Object.assign(state.teams[0], { tier: 'team', stripeSubscriptionId: 'sub_one' });
  state.subscriptions.set('sub_one', makeSubscription('sub_one'));
  let snapshotTaken, releaseSnapshot;
  const started = new Promise(resolve => { snapshotTaken = resolve; });
  const held = new Promise(resolve => { releaseSnapshot = resolve; });
  let first = true;
  state.beforeRetrieve = async () => {
    if (first) { first = false; snapshotTaken(); await held; }
  };
  const old = WebhookHandlers.handleEvent(subscriptionEvent('sub_one'));
  await started;
  state.subscriptions.get('sub_one').status = 'canceled';
  await WebhookHandlers.handleEvent(subscriptionEvent('sub_one', 'customer.subscription.deleted'));
  assert.equal(state.teams[0].tier, 'free');
  releaseSnapshot();
  await old;
  assert.equal(state.teams[0].tier, 'free');
  assert.equal(state.teams[0].stripeSubscriptionStatus, 'canceled');
  assert.equal(state.sql.filter(query => query.text.includes('pg_advisory_xact_lock')).length, 2);
});

test('subscription metadata cannot move a different customer into the team', async () => {
  state.subscriptions.set('sub_foreign', makeSubscription('sub_foreign', { customer: 'cus_foreign' }));
  await assert.rejects(WebhookHandlers.handleEvent(subscriptionEvent('sub_foreign')), /customer does not match/);
  assert.equal(state.teams[0].tier, 'free');
  assert.equal(state.teams[0].stripeSubscriptionId, null);
  assert.equal(state.updates, 0);
});

test('current Stripe state overrides stale invoice failures and product metadata overrides stale plan metadata', async () => {
  state.teams[0].stripeSubscriptionId = 'sub_one';
  const current = makeSubscription('sub_one');
  current.items.data[0].price.product.metadata.tierId = 'team';
  state.subscriptions.set('sub_one', current);
  await WebhookHandlers.handleEvent({ type: 'invoice.payment_failed', data: { object: {
    parent: { subscription_details: { subscription: { id: 'sub_one' } } },
  } } });
  assert.equal(state.teams[0].stripeSubscriptionStatus, 'active');
  assert.equal(state.teams[0].tier, 'team');
  await WebhookHandlers.handleEvent({ type: 'invoice.paid', data: { object: { subscription: 'sub_one' } } });
  assert.equal(state.teams[0].tier, 'team');
});

test('unpaid initial checkout does not grant paid access', async () => {
  state.subscriptions.set('sub_incomplete', makeSubscription('sub_incomplete', { status: 'incomplete' }));
  await WebhookHandlers.handleEvent({ type: 'checkout.session.completed', data: { object: {
    mode: 'subscription', subscription: 'sub_incomplete', metadata: { teamId: 'team_one', tierId: 'team' },
  } } });
  assert.equal(state.teams[0].tier, 'free');
  assert.equal(state.teams[0].stripeSubscriptionStatus, 'incomplete');
});

test('invalid signatures are rejected before application writes and API responses prohibit caching', async () => {
  const result = await request(app, '/api/billing/webhook', { body: subscriptionEvent('sub_one'), signature: 'bad' });
  assert.equal(result.status, 400);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(state.updates, 0);
  assert.equal(state.retrieved.length, 0);
});
