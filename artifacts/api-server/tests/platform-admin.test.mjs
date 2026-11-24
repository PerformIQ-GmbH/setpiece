import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import { build } from 'esbuild';
import express from 'express';

const require = createRequire(import.meta.url);
const requireDb = createRequire(new URL('../../../lib/db/package.json', import.meta.url));
const pg = requireDb('pg');
const testUrl = process.env.SETPIECE_PLATFORM_ADMIN_TEST_DATABASE_URL;
const pool = testUrl ? new pg.Pool({ connectionString: testUrl }) : null;
const bindings = { db: pool ? drizzle(pool) : null };
globalThis.__setpieceAdminTest = bindings;
const sourceDir = fileURLToPath(new URL('../src/', import.meta.url));
process.env.SETPIECE_PLATFORM_ADMIN_USER_IDS = 'synthetic-admin, synthetic-unverified';
process.env.SETPIECE_PILOT_ENABLED = 'true';

const bundled = await build({
  stdin: {
    contents: `
      export { default as adminRouter } from './routes/platformAdmin';
      export { resolveComplimentaryAccess, teamAccess } from './lib/teamAccess';
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
const { adminRouter, resolveComplimentaryAccess, teamAccess } = compiled.exports;

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const id = req.get('x-test-account');
  if (id) req.user = { id };
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

test('platform admin endpoints fail closed for visitors and ordinary team accounts', async () => {
  assert.equal((await request('/users')).status, 401);
  assert.equal((await request('/users', 'synthetic-team-owner')).status, 403);
  assert.equal((await request('/teams/team-one/complimentary-access', 'synthetic-team-owner', { action: 'revoke' })).status, 403);
});

test('complimentary access expires at the given instant and preserves higher billing or pilot access', () => {
  const expiresAt = new Date('2026-12-01T12:00:00Z');
  const before = new Date(expiresAt.getTime() - 1);
  assert.equal(resolveComplimentaryAccess('free', { tier: 'solo_coach', expiresAt }, before).effectiveTier, 'solo_coach');
  assert.equal(resolveComplimentaryAccess('free', { tier: 'solo_coach', expiresAt }, expiresAt).effectiveTier, 'free');
  assert.equal(resolveComplimentaryAccess('team', { tier: 'solo_coach', expiresAt: null }).effectiveTier, 'team');
  assert.equal(resolveComplimentaryAccess('solo_coach', undefined).effectiveTier, 'solo_coach');
  assert.equal(resolveComplimentaryAccess('solo_coach', { tier: 'team', expiresAt: null }).effectiveTier, 'team');
});

test('isolated PostgreSQL verifies account search, grants, retries, audit rollback and revocation', { skip: !pool }, async () => {
  const { rows: [database] } = await pool.query('SELECT current_database() AS name');
  assert.equal(database.name, 'setpiece_platform_admin_test');
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users (id varchar PRIMARY KEY, email varchar, email_verified boolean, first_name varchar, last_name varchar);
    CREATE TABLE IF NOT EXISTS teams (id varchar PRIMARY KEY, name varchar, tier varchar, owner_id varchar);
    CREATE TABLE IF NOT EXISTS memberships (team_id varchar, user_id varchar, role varchar);
    CREATE TABLE IF NOT EXISTS pilot_access (team_id varchar, expires_at timestamptz);
  `);
  const migration = await readFile(new URL('../../../lib/db/migrations/20261124_complimentary_access.sql', import.meta.url), 'utf8');
  await pool.query(migration);
  await pool.query(migration);
  await pool.query(`
    TRUNCATE complimentary_access, complimentary_access_events, users, teams, memberships, pilot_access;
    INSERT INTO users VALUES
      ('synthetic-admin', 'platform@example.test', true, 'Platform', 'Admin'),
      ('synthetic-unverified', 'unverified@example.test', false, 'Unverified', 'Account'),
      ('synthetic-team-owner', 'owner@example.test', true, 'Taylor', 'Coach');
    INSERT INTO teams VALUES ('team-one', 'Test FC', 'free', 'synthetic-team-owner');
    INSERT INTO memberships VALUES ('team-one', 'synthetic-team-owner', 'head_coach');
    INSERT INTO pilot_access VALUES ('team-one', now() + interval '5 days');
  `);

  const admin = 'synthetic-admin';
  const endpoint = '/teams/team-one/complimentary-access';
  assert.equal((await request('/access', admin)).status, 204);
  assert.equal((await request('/access', 'synthetic-unverified')).status, 403);
  const search = await request('/users?q=Taylor+Coach', admin);
  assert.equal(search.status, 200);
  const { users } = await search.json();
  assert.equal(users.length, 1);
  assert.equal(users[0].teams[0].role, 'head_coach');
  assert.equal(users[0].teams[0].effectiveTier, 'solo_coach');
  assert.equal((await (await request('/users?q=%25', admin)).json()).users.length, 0);
  assert.equal((await request(endpoint, admin, {
    action: 'grant', tier: 'team', expiresAt: '2000-01-01T00:00:00.000Z', reason: 'Past expiry',
  })).status, 400);
  assert.equal((await request('/teams/missing/complimentary-access', admin, { action: 'revoke', reason: 'Missing team' })).status, 404);

  const grant = { action: 'grant', tier: 'team', expiresAt: null, reason: 'Partner test' };
  const results = await Promise.all([request(endpoint, admin, grant), request(endpoint, admin, grant)]);
  assert.deepEqual(results.map(result => result.status), [204, 204]);
  assert.equal((await teamAccess('team-one', 'free')).effectiveTier, 'team');
  assert.equal((await pool.query("SELECT tier FROM teams WHERE id = 'team-one'")).rows[0].tier, 'free');
  assert.deepEqual((await pool.query('SELECT admin_id, action, reason FROM complimentary_access_events')).rows, [
    { admin_id: admin, action: 'grant', reason: 'Partner test' },
  ]);

  await pool.query("ALTER TABLE complimentary_access_events ADD CONSTRAINT synthetic_reject_audit CHECK (reason <> 'Reject event')");
  try {
    assert.equal((await request(endpoint, admin, { action: 'revoke', reason: 'Reject event' })).status, 500);
    assert.equal((await teamAccess('team-one', 'free')).effectiveTier, 'team');
  } finally {
    await pool.query('ALTER TABLE complimentary_access_events DROP CONSTRAINT synthetic_reject_audit');
  }
  assert.equal((await request(endpoint, admin, { action: 'revoke', reason: 'Partner ended' })).status, 204);
  assert.equal((await teamAccess('team-one', 'free')).effectiveTier, 'solo_coach');
  assert.equal((await pool.query("SELECT count(*)::int AS total FROM complimentary_access_events WHERE action = 'revoke'")).rows[0].total, 1);
});
