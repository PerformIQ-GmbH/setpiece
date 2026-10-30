import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

const require = createRequire(import.meta.url);
const pg = createRequire(new URL('../../../lib/db/package.json', import.meta.url))('pg');
const pool = process.env.SETPIECE_TEST_DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.SETPIECE_TEST_DATABASE_URL }) : null;
// This suite may write only to a purpose-created database with this exact name.
if (pool) {
  const { rows } = await pool.query('SELECT current_database() AS name');
  assert.equal(rows[0].name, 'setpiece_pilot_test');
}
const pilotAccessTable = pgTable('pilot_access', {
  teamId: varchar('team_id'), expiresAt: timestamp('expires_at', { withTimezone: true }),
});
globalThis.__setpiecePilotTest = { db: pool ? drizzle(pool) : null, pilotAccessTable };
const bundled = await build({
  entryPoints: [fileURLToPath(new URL('../src/lib/pilot.ts', import.meta.url))],
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  plugins: [{ name: 'isolated-pilot-db', setup(b) {
    b.onResolve({ filter: /^@workspace\/db$/ }, () => ({ path: 'db', namespace: 'pilot-test' }));
    b.onLoad({ filter: /.*/, namespace: 'pilot-test' }, () => ({ contents:
      'module.exports = globalThis.__setpiecePilotTest;', loader: 'js' }));
  } }],
});
const compiled = { exports: {} };
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(require, compiled, compiled.exports);
const { effectivePilotTier, teamPilotAccess, redeemPilot } = compiled.exports;
after(async () => { await pool?.end(); delete globalThis.__setpiecePilotTest; });

test('pilot grants only an unexpired free team, and stops exactly at expiry', () => {
  const end = new Date('2026-12-01T12:00:00Z');
  assert.equal(effectivePilotTier('free', end, new Date(end.getTime() - 1)), 'solo_coach');
  assert.equal(effectivePilotTier('free', end, end), 'free');
  assert.equal(effectivePilotTier('free', end, new Date(end.getTime() + 1)), 'free');
  assert.equal(effectivePilotTier('team', end), 'team');
  assert.equal(effectivePilotTier('free', null), 'free');
});

test('disabled pilot does not access the database or change entitlements', async () => {
  const old = process.env.SETPIECE_PILOT_ENABLED;
  delete process.env.SETPIECE_PILOT_ENABLED;
  try { assert.deepEqual(await teamPilotAccess('synthetic', 'free'), {
    effectiveTier: 'free', pilotExpiresAt: null, pilotAvailable: false,
  }); } finally {
    if (old === undefined) delete process.env.SETPIECE_PILOT_ENABLED;
    else process.env.SETPIECE_PILOT_ENABLED = old;
  }
});

test('real PostgreSQL claims enforce ownership, five slots, expiry and concurrency', { skip: !pool }, async () => {
  await pool.query('CREATE TABLE users (id varchar PRIMARY KEY); CREATE TABLE teams (id varchar PRIMARY KEY, owner_id varchar REFERENCES users(id), tier varchar); CREATE TABLE memberships (team_id varchar REFERENCES teams(id), user_id varchar REFERENCES users(id), role varchar)');
  await pool.query(await readFile(new URL('../../../lib/db/migrations/20261029_pilot_access.sql', import.meta.url), 'utf8'));
  const codes = Array.from({ length: 5 }, () => randomBytes(16).toString('hex').toUpperCase());
  for (let i = 1; i <= 7; i++) {
    await pool.query('INSERT INTO users VALUES ($1)', [`fake-user-${i}`]);
    await pool.query('INSERT INTO teams VALUES ($1,$2,$3)', [`fake-team-${i}`, `fake-user-${i}`, i === 7 ? 'team' : 'free']);
    await pool.query('INSERT INTO memberships VALUES ($1,$2,$3)', [`fake-team-${i}`, `fake-user-${i}`, i === 6 ? 'assistant' : 'head_coach']);
  }
  for (let i = 0; i < codes.length; i++) await pool.query('INSERT INTO pilot_access(slot,code_hash) VALUES ($1,$2)', [i + 1, createHash('sha256').update(codes[i]).digest('hex')]);
  assert.deepEqual(await redeemPilot('fake-team-1', 'fake-user-2', codes[0]), { error: 'ineligible' });
  assert.deepEqual(await redeemPilot('fake-team-6', 'fake-user-6', codes[0]), { error: 'ineligible' });
  assert.deepEqual(await redeemPilot('fake-team-7', 'fake-user-7', codes[0]), { error: 'ineligible' });
  assert.deepEqual(await redeemPilot('fake-team-1', 'fake-user-1', 'F'.repeat(32)), { error: 'unavailable' });
  const claim = await redeemPilot('fake-team-1', 'fake-user-1', codes[0].toLowerCase());
  assert.ok(claim.expiresAt instanceof Date);
  const repeated = await redeemPilot('fake-team-1', 'fake-user-1', codes[0]);
  assert.equal(repeated.expiresAt.getTime(), claim.expiresAt.getTime());
  assert.deepEqual(await redeemPilot('fake-team-1', 'fake-user-1', codes[1]), { error: 'unavailable' });
  const race = await Promise.all([redeemPilot('fake-team-2', 'fake-user-2', codes[1]), redeemPilot('fake-team-3', 'fake-user-3', codes[1])]);
  assert.equal(race.filter(x => x.expiresAt).length, 1);
  assert.equal(race.filter(x => x.error === 'unavailable').length, 1);
  const accountRace = await Promise.all([redeemPilot('fake-team-4', 'fake-user-4', codes[2]), redeemPilot('fake-team-4', 'fake-user-4', codes[3])]);
  assert.equal(accountRace.filter(x => x.expiresAt).length, 1);
  assert.equal(accountRace.filter(x => x.error === 'unavailable').length, 1);
  const { rows: [duration] } = await pool.query("SELECT count(*)::int total, bool_and(expires_at IS NULL OR expires_at - redeemed_at = interval '720 hours') exact FROM pilot_access");
  assert.deepEqual(duration, { total: 5, exact: true });
  await assert.rejects(pool.query('INSERT INTO pilot_access(slot,code_hash) VALUES (6,$1)', ['a'.repeat(64)]), e => e.code === '23514');
});
