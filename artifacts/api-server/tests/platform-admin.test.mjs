import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import { build } from 'esbuild';
import express from 'express';

// Die Regressionen laufen ohne Datenbank gegen einen Stub. Der PostgreSQL-Test unten läuft nur,
// wenn SETPIECE_PLATFORM_ADMIN_TEST_DATABASE_URL auf eine eigens angelegte Testdatenbank zeigt.
const require = createRequire(import.meta.url);
const requireDb = createRequire(new URL('../../../lib/db/package.json', import.meta.url));
const pg = requireDb('pg');
const testUrl = process.env.SETPIECE_PLATFORM_ADMIN_TEST_DATABASE_URL;
const pool = testUrl ? new pg.Pool({ connectionString: testUrl }) : null;

// Der Stub kennt die Konten der aktuellen Anfrage (Header) und beantwortet db.execute nach Abfragetext.
const state = { accounts: {}, current: undefined, executed: [], failing: new Set(), grantRows: [], grantSelectError: null };
const queryText = (query) => query.queryChunks.map((chunk) => (chunk?.value ? chunk.value.join('') : '?')).join('').replace(/\s+/g, ' ').trim();
const monday = (date) => new Date(date).toISOString().slice(0, 10);
const answers = [
  [/GROUP BY 1/, () => [{ week: '2026-11-16', count: 4 }, { week: '2026-09-07', count: 2 }]],
  [/email_verified/, () => [{ total: 40, verified: 31, new7: 5, new30: 14 }]],
  [/FROM teams t LEFT JOIN pilot_access/, () => [
    { id: 't1', tier: 'free', stripe_status: null, pilot_expires_at: null },
    { id: 't2', tier: 'free', stripe_status: null, pilot_expires_at: '2099-01-01T00:00:00Z' },
    { id: 't3', tier: 'solo_coach', stripe_status: 'active', pilot_expires_at: null },
    { id: 't4', tier: 'team', stripe_status: 'trialing', pilot_expires_at: null },
    { id: 't5', tier: 'free', stripe_status: null, pilot_expires_at: '2000-01-01T00:00:00Z' },
  ]],
  [/FROM complimentary_access/, () => {
    if (state.grantTableMissing) throw Object.assign(new Error('relation does not exist'), { code: '42P01' });
    return [{ team_id: 't1', tier: 'team', expires_at: null }, { team_id: 't5', tier: 'solo_coach', expires_at: '2000-01-01T00:00:00Z' }];
  }],
  [/count\(DISTINCT team_id\)/, () => [{ total: 3 }]],
  [/FROM players$/, () => [{ total: 120 }]],
  [/FROM set_pieces$/, () => [{ total: 50, published: 31, draft: 15, archived: 4 }]],
  [/FROM matchdays$/, () => [{ total: 22, new30: 6 }]],
  [/FROM quiz_attempts$/, () => [{ completed_total: 300, completed30: 90, passed30: 70, players30: 41 }]],
  [/FROM pilot_access$/, () => [{ total: 5, redeemed: 2 }]],
  [/FROM team_invites/, () => [{ total: 7 }]],
];
const stub = {
    // select().from().where() liefert das aktuelle Konto, Gratiszugang-Zeilen oder einen Fehler; die
    // Listenabfrage der Benutzersuche (orderBy/limit/offset) liefert hier keine Zeilen.
    select: () => ({ from: () => ({ where: () => {
      const rows = state.grantRows.length ? state.grantRows : (state.current ? [state.current] : []);
      const result = state.grantSelectError ? Promise.reject(state.grantSelectError) : Promise.resolve(rows);
      return Object.assign(result, { orderBy: () => ({ limit: () => ({ offset: async () => [] }) }) });
    } }) }),
    execute: async (query) => {
      const text = queryText(query);
      state.executed.push(text);
      for (const name of state.failing) if (text.includes(name)) throw new Error('synthetic failure');
      const hit = answers.find(([pattern]) => pattern.test(text));
      if (!hit) throw new Error(`unerwartete Abfrage: ${text}`);
      return { rows: hit[1]() };
    },
};
// Der Router bindet db einmal; der PostgreSQL-Test schaltet über state.useReal auf die Testdatenbank um.
const real = pool ? drizzle(pool) : null;
const active = () => (state.useReal ? real : stub);
globalThis.__setpieceAdminTest = {
  db: { select: (...a) => active().select(...a), execute: (...a) => active().execute(...a), transaction: (...a) => active().transaction(...a) },
};

process.env.SETPIECE_PILOT_ENABLED = 'true';
const sourceDir = fileURLToPath(new URL('../src/', import.meta.url));
const bundled = await build({
  stdin: {
    contents: `
      export { default as adminRouter } from './routes/platformAdmin';
      export { resolveComplimentaryAccess, teamAccess } from './lib/teamAccess';
      export { fillWeeks, weekStart, summarizeTeams, loadAdminStats } from './lib/adminStats';
      export { isAdminUser } from './lib/platformAdmin';
    `,
    resolveDir: sourceDir,
    loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  plugins: [{ name: 'isolated-admin-db', setup(plugin) {
    plugin.onResolve({ filter: /^@workspace\/db$/ }, () => ({ path: 'db', namespace: 'admin-test' }));
    plugin.onLoad({ filter: /.*/, namespace: 'admin-test' }, () => ({
      contents: "export * from '../../../lib/db/src/schema'; export const db = globalThis.__setpieceAdminTest.db;",
      resolveDir: sourceDir,
      loader: 'ts',
    }));
  } }],
});
const compiled = { exports: {} };
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(
  id => id === 'drizzle-zod' ? requireDb(id) : require(id), compiled, compiled.exports,
);
const { adminRouter, resolveComplimentaryAccess, teamAccess, fillWeeks, weekStart, summarizeTeams, loadAdminStats, isAdminUser } = compiled.exports;

// Fiktive Konten. Die Anmeldung wird über Header simuliert; Rechte prüft der Router selbst.
state.accounts = {
  admin: { email: 'Admin@Example.test', emailVerified: true },
  unverified: { email: 'admin@example.test', emailVerified: false },
  coach: { email: 'coach@example.test', emailVerified: true },
  ghost: undefined,
};
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const id = req.get('x-test-account');
  req.isAuthenticated = () => Boolean(id);
  if (id) { req.user = { id }; state.current = state.accounts[id]; }
  next();
});
app.use('/api', adminRouter);
app.use((_error, _req, res, _next) => res.status(500).end());
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
after(async () => {
  await new Promise(resolve => server.close(resolve));
  await pool?.end();
  delete globalThis.__setpieceAdminTest;
});
function request(path, id, body) {
  return fetch(`http://127.0.0.1:${server.address().port}/api/platform-admin${path}`, {
    headers: { ...(id ? { 'x-test-account': id } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
  });
}
const withAdmins = async (value, run) => {
  const old = process.env.PLATFORM_ADMIN_EMAILS;
  if (value === undefined) delete process.env.PLATFORM_ADMIN_EMAILS; else process.env.PLATFORM_ADMIN_EMAILS = value;
  try { return await run(); } finally {
    if (old === undefined) delete process.env.PLATFORM_ADMIN_EMAILS; else process.env.PLATFORM_ADMIN_EMAILS = old;
  }
};
const endpoints = ['/stats', '/users'];

test('nicht angemeldet: alle Adminrouten antworten 401', async () => {
  await withAdmins('admin@example.test', async () => {
    for (const path of endpoints) assert.equal((await request(path)).status, 401, path);
    assert.equal((await request('/teams/t1/complimentary-access', undefined, { action: 'revoke', reason: 'Test' })).status, 401);
  });
});

test('normaler Nutzer, unbestätigte E-Mail und unbekanntes Konto erhalten 403', async () => {
  await withAdmins('admin@example.test', async () => {
    for (const id of ['coach', 'unverified', 'ghost']) {
      for (const path of endpoints) assert.equal((await request(path, id)).status, 403, `${id} ${path}`);
      assert.equal((await request('/teams/t1/complimentary-access', id, { action: 'revoke', reason: 'Test' })).status, 403, id);
    }
  });
  assert.equal(state.executed.length, 0, 'bei 403 darf keine Kennzahl abgefragt werden');
});

test('ohne gesetzte Variable PLATFORM_ADMIN_EMAILS ist alles gesperrt, auch für die Adminadresse', async () => {
  for (const value of [undefined, '', ' , ']) {
    await withAdmins(value, async () => {
      for (const path of endpoints) assert.equal((await request(path, 'admin')).status, 403, `${value} ${path}`);
    });
  }
  assert.equal(isAdminUser({ email: 'admin@example.test', emailVerified: true }, new Set()), false);
});

test('bestätigte Adminadresse (Gross-/Kleinschreibung egal) erhält 200 und no-store', async () => {
  await withAdmins(' Other@example.test , admin@EXAMPLE.test ', async () => {
    const response = await request('/stats', 'admin');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await request('/users', 'admin')).status, 200);
  });
});

test('Kennzahlen aggregieren Benutzer, Teams, Tarife, Standards und Antworten; keine personenbezogenen Daten', async () => {
  const now = new Date('2026-11-27T10:00:00Z');
  const stats = await loadAdminStats(now);
  assert.deepEqual(stats.unavailable, []);
  assert.deepEqual(stats.users, { total: 40, verified: 31, new7: 5, new30: 14 });
  assert.equal(stats.signupsPerWeek.length, 12);
  assert.equal(stats.signupsPerWeek.at(-1).week, '2026-11-23');
  assert.equal(stats.signupsPerWeek.find((w) => w.week === '2026-11-16').count, 4);
  assert.equal(stats.signupsPerWeek.find((w) => w.week === '2026-09-07').count, 2);
  assert.equal(stats.signupsPerWeek.reduce((sum, w) => sum + w.count, 0), 6);
  // t1 free + Gratiszugang team, t2 free + Pilot, t3 solo, t4 team, t5 free (Pilot und Gratiszugang abgelaufen)
  assert.equal(stats.teams.total, 5);
  assert.deepEqual(stats.teams.byBillingTier, { free: 3, solo_coach: 1, team: 1 });
  assert.deepEqual(stats.teams.byEffectiveTier, { free: 1, solo_coach: 2, team: 2 });
  assert.equal(stats.teams.withActivePilot, 1);
  assert.equal(stats.teams.withActiveComplimentary, 1);
  assert.equal(stats.teams.withActiveSubscription, 2);
  assert.equal(stats.teams.active30, 3);
  assert.equal(stats.players, 120);
  assert.deepEqual(stats.setPieces, { total: 50, published: 31, draft: 15, archived: 4 });
  assert.deepEqual(stats.matchdays, { total: 22, new30: 6 });
  assert.deepEqual(stats.quiz, { completedTotal: 300, completed30: 90, passed30: 70, players30: 41 });
  assert.deepEqual(stats.pilot, { total: 5, redeemed: 2, open: 3 });
  assert.equal(stats.openInvites, 7);
  assert.doesNotMatch(JSON.stringify(stats), /mail|name|token|hash|"id"/i);
});

test('der Statistikendpunkt liefert dieselbe Struktur über HTTP', async () => {
  await withAdmins('admin@example.test', async () => {
    const body = await (await request('/stats', 'admin')).json();
    assert.equal(body.users.total, 40);
    assert.equal(body.signupsPerWeek.length, 12);
    assert.deepEqual(body.unavailable, []);
  });
});

test('ein fehlschlagender Abschnitt wird weggelassen und gemeldet, der Rest bleibt', async () => {
  state.failing.add('completed_total');
  const log = console.error;
  console.error = () => {};
  try {
    const stats = await loadAdminStats(new Date('2026-11-27T10:00:00Z'));
    assert.equal(stats.quiz, null);
    assert.deepEqual(stats.unavailable, ['quiz']);
    assert.equal(stats.users.total, 40);
  } finally {
    console.error = log;
    state.failing.clear();
  }
});

test('fehlt die Gratiszugang-Tabelle noch (Migration offen), bleiben die Kennzahlen ohne Gratiszugang vollständig', async () => {
  state.grantTableMissing = true;
  try {
    const stats = await loadAdminStats(new Date('2026-11-27T10:00:00Z'));
    assert.deepEqual(stats.unavailable, []);
    assert.equal(stats.teams.withActiveComplimentary, 0);
    assert.deepEqual(stats.teams.byEffectiveTier, { free: 2, solo_coach: 2, team: 1 });
  } finally {
    state.grantTableMissing = false;
  }
});

test('Wochenreihe füllt Lücken auf, beginnt montags und endet mit der aktuellen Woche', () => {
  const wednesday = new Date('2026-11-25T23:59:00Z');
  assert.equal(monday(weekStart(wednesday)), '2026-11-23');
  assert.equal(monday(weekStart(new Date('2026-11-29T12:00:00Z'))), '2026-11-23');
  assert.equal(monday(weekStart(new Date('2026-11-30T00:00:00Z'))), '2026-11-30');
  const weeks = fillWeeks([{ week: '2026-11-23', count: 3 }, { week: '2025-01-06', count: 99 }], wednesday, 4);
  assert.deepEqual(weeks, [
    { week: '2026-11-02', count: 0 }, { week: '2026-11-09', count: 0 },
    { week: '2026-11-16', count: 0 }, { week: '2026-11-23', count: 3 },
  ]);
  assert.deepEqual(fillWeeks([], wednesday).map((w) => w.count), Array(12).fill(0));
});

test('Tarifverteilung: Pilot nur bei freien Teams, Gratiszugang nur über dem Abo, abgelaufene zählen nicht', () => {
  const now = new Date('2026-11-27T10:00:00Z');
  const future = new Date('2027-01-01T00:00:00Z');
  const past = new Date('2026-01-01T00:00:00Z');
  const summary = summarizeTeams([
    { tier: 'team', stripeStatus: 'active', pilotExpiresAt: future, grant: { tier: 'solo_coach', expiresAt: null } },
    { tier: 'free', stripeStatus: null, pilotExpiresAt: future, grant: { tier: 'team', expiresAt: future } },
    { tier: 'free', stripeStatus: 'canceled', pilotExpiresAt: past, grant: { tier: 'team', expiresAt: past } },
  ], now);
  assert.deepEqual(summary.byBillingTier, { free: 2, solo_coach: 0, team: 1 });
  assert.deepEqual(summary.byEffectiveTier, { free: 1, solo_coach: 0, team: 2 });
  assert.equal(summary.withActivePilot, 1);
  assert.equal(summary.withActiveComplimentary, 2);
  assert.equal(summary.withActiveSubscription, 1);
  // Ist der Pilot abgeschaltet, zählt er nicht.
  assert.equal(summarizeTeams([{ tier: 'free', stripeStatus: null, pilotExpiresAt: future }], now, false).byEffectiveTier.free, 1);
});

test('Gratiszugang endet zum Zeitpunkt und senkt nie einen höheren Tarif', () => {
  const expiresAt = new Date('2026-12-01T12:00:00Z');
  const before = new Date(expiresAt.getTime() - 1);
  assert.equal(resolveComplimentaryAccess('free', { tier: 'solo_coach', expiresAt }, before).effectiveTier, 'solo_coach');
  assert.equal(resolveComplimentaryAccess('free', { tier: 'solo_coach', expiresAt }, expiresAt).effectiveTier, 'free');
  assert.equal(resolveComplimentaryAccess('free', { tier: 'solo_coach', expiresAt }, expiresAt).complimentaryAccess.active, false);
  assert.equal(resolveComplimentaryAccess('team', { tier: 'solo_coach', expiresAt: null }).effectiveTier, 'team');
  assert.equal(resolveComplimentaryAccess('solo_coach', undefined).effectiveTier, 'solo_coach');
  assert.equal(resolveComplimentaryAccess('solo_coach', { tier: 'team', expiresAt: null }).effectiveTier, 'team');
});

test('teamAccess wendet den Gratiszugang an und ignoriert eine noch fehlende Tabelle', async () => {
  state.grantRows = [{ tier: 'team', expiresAt: null }];
  try {
    const granted = await teamAccess('t1', 'free');
    assert.equal(granted.effectiveTier, 'team');
    assert.equal(granted.complimentaryAccess.active, true);
  } finally { state.grantRows = []; }
  state.current = undefined;
  delete process.env.SETPIECE_PILOT_ENABLED; // der Pilot liest über denselben Select
  state.grantSelectError = Object.assign(new Error('missing'), { code: '42P01' });
  try {
    assert.equal((await teamAccess('t1', 'free')).effectiveTier, 'free');
    state.grantSelectError = new Error('other failure');
    await assert.rejects(teamAccess('t1', 'free'), /other failure/);
  } finally { state.grantSelectError = null; process.env.SETPIECE_PILOT_ENABLED = 'true'; }
});

test('ungültige Gratiszugang-Änderungen antworten 400, bevor die Datenbank berührt wird', async () => {
  await withAdmins('admin@example.test', async () => {
    const endpoint = '/teams/t1/complimentary-access';
    assert.equal((await request(endpoint, 'admin', { action: 'grant', tier: 'free', expiresAt: null, reason: 'Test' })).status, 400);
    assert.equal((await request(endpoint, 'admin', { action: 'grant', tier: 'team', expiresAt: null, reason: 'x' })).status, 400);
    assert.equal((await request(endpoint, 'admin', { action: 'grant', tier: 'team', expiresAt: '2000-01-01T00:00:00.000Z', reason: 'Abgelaufen' })).status, 400);
    assert.equal((await request(endpoint, 'admin', { action: 'delete', reason: 'Test' })).status, 400);
  });
});

test('PostgreSQL: Suche, Vergabe, Wiederholung, Protokoll-Rollback und Widerruf', { skip: !pool }, async () => {
  const { rows: [database] } = await pool.query('SELECT current_database() AS name');
  assert.equal(database.name, 'setpiece_platform_admin_test');
  state.useReal = true;
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users (id varchar PRIMARY KEY, email varchar, email_verified boolean, first_name varchar, last_name varchar);
    CREATE TABLE IF NOT EXISTS teams (id varchar PRIMARY KEY, name varchar, tier varchar, owner_id varchar);
    CREATE TABLE IF NOT EXISTS memberships (team_id varchar, user_id varchar, role varchar);
    CREATE TABLE IF NOT EXISTS pilot_access (team_id varchar, expires_at timestamptz);
  `);
  const migration = await readFile(new URL('../../../lib/db/migrations/20261127_complimentary_access.sql', import.meta.url), 'utf8');
  await pool.query(migration);
  await pool.query(migration);
  await pool.query(`
    TRUNCATE complimentary_access, complimentary_access_events, users, teams, memberships, pilot_access;
    INSERT INTO users VALUES
      ('admin', 'admin@example.test', true, 'Platform', 'Admin'),
      ('owner', 'owner@example.test', true, 'Taylor', 'Coach');
    INSERT INTO teams VALUES ('team-one', 'Test FC', 'free', 'owner');
    INSERT INTO memberships VALUES ('team-one', 'owner', 'head_coach');
    INSERT INTO pilot_access VALUES ('team-one', now() + interval '5 days');
  `);
  await withAdmins('admin@example.test', async () => {
    state.accounts.admin = { email: 'admin@example.test', emailVerified: true };
    // Der Stub-Select der Konten ist abgelöst: Konto kommt jetzt aus der echten Tabelle.
    const endpoint = '/teams/team-one/complimentary-access';
    const { users } = await (await request('/users?q=Taylor+Coach', 'admin')).json();
    assert.equal(users.length, 1);
    assert.equal(users[0].teams[0].role, 'head_coach');
    assert.equal(users[0].teams[0].effectiveTier, 'solo_coach');
    assert.equal((await (await request('/users?q=%25', 'admin')).json()).users.length, 0);
    assert.equal((await request('/teams/missing/complimentary-access', 'admin', { action: 'revoke', reason: 'Missing team' })).status, 404);
    const grant = { action: 'grant', tier: 'team', expiresAt: null, reason: 'Partner test' };
    const results = await Promise.all([request(endpoint, 'admin', grant), request(endpoint, 'admin', grant)]);
    assert.deepEqual(results.map(result => result.status), [204, 204]);
    assert.equal((await teamAccess('team-one', 'free')).effectiveTier, 'team');
    assert.deepEqual((await pool.query('SELECT admin_id, action, reason FROM complimentary_access_events')).rows, [
      { admin_id: 'admin', action: 'grant', reason: 'Partner test' },
    ]);
    await pool.query("ALTER TABLE complimentary_access_events ADD CONSTRAINT synthetic_reject_audit CHECK (reason <> 'Reject event')");
    try {
      assert.equal((await request(endpoint, 'admin', { action: 'revoke', reason: 'Reject event' })).status, 500);
      assert.equal((await teamAccess('team-one', 'free')).effectiveTier, 'team');
    } finally {
      await pool.query('ALTER TABLE complimentary_access_events DROP CONSTRAINT synthetic_reject_audit');
    }
    assert.equal((await request(endpoint, 'admin', { action: 'revoke', reason: 'Partner ended' })).status, 204);
    assert.equal((await teamAccess('team-one', 'free')).effectiveTier, 'solo_coach');
  });
});
