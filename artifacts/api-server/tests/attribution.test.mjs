import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import express from 'express';

const apiRequire = createRequire(import.meta.url);
const dbRequire = createRequire(new URL('../../../lib/db/package.json', import.meta.url));
const load = id => { try { return apiRequire(id); } catch { return dbRequire(id); } };
const testDatabaseUrl = process.env.SETPIECE_TEST_DATABASE_URL;

async function compile(contents, plugins = []) {
  const bundled = await build({
    stdin: { contents, resolveDir: fileURLToPath(new URL('..', import.meta.url)) },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, plugins,
  });
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(load, compiled, compiled.exports);
  return compiled.exports;
}

const { signupAttribution } = await compile("export * from './src/lib/attribution.ts';");

test('signup origin keeps short plain values and drops untrusted input', () => {
  assert.deepEqual(signupAttribution({
    signupUtmSource: ' instagram ', signupUtmMedium: 'paid', signupUtmCampaign: 'Start Dez_2026',
    signupReferrerHost: 'L.Instagram.com', returnTo: '/dashboard',
  }), {
    signupUtmSource: 'instagram', signupUtmMedium: 'paid', signupUtmCampaign: 'Start Dez_2026',
    signupReferrerHost: 'l.instagram.com',
  });
  const none = { signupUtmSource: null, signupUtmMedium: null, signupUtmCampaign: null, signupReferrerHost: null };
  assert.deepEqual(signupAttribution(undefined), none);
  assert.deepEqual(signupAttribution('instagram'), none);
  assert.deepEqual(signupAttribution({
    signupUtmSource: 'x'.repeat(101), signupUtmMedium: '<script>', signupUtmCampaign: ['a', 'b'],
    signupReferrerHost: 'https://evil.example/path',
  }), none);
  assert.deepEqual(signupAttribution({ signupUtmSource: 'x'.repeat(100), signupReferrerHost: 'localhost' }),
    { ...none, signupUtmSource: 'x'.repeat(100) });
});

test('registration stores validated origin in real PostgreSQL', { skip: !testDatabaseUrl }, async () => {
  const pg = load('pg');
  const pool = new pg.Pool({ connectionString: testDatabaseUrl });
  after(() => pool.end());
  // This test may reset tables only in a purpose-created database with this exact name.
  const { rows: [{ name }] } = await pool.query('SELECT current_database() AS name');
  assert.equal(name, 'setpiece_attribution_test');
  await pool.query('DROP TABLE IF EXISTS email_verification_tokens, sessions, users');
  await pool.query(`CREATE TABLE users (id varchar PRIMARY KEY DEFAULT gen_random_uuid(), email varchar UNIQUE,
    first_name varchar, last_name varchar, profile_image_url varchar, password_hash varchar,
    email_verified boolean NOT NULL DEFAULT false, auth_provider varchar(50) NOT NULL DEFAULT 'replit',
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE sessions (sid varchar PRIMARY KEY, sess jsonb NOT NULL, expire timestamp NOT NULL);
    CREATE TABLE email_verification_tokens (id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE, token varchar NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`);
  const migration = await readFile(new URL('../../../lib/db/migrations/20261124_signup_attribution.sql', import.meta.url), 'utf8');
  await pool.query(migration);
  await pool.query(migration);

  process.env.DATABASE_URL = testDatabaseUrl;
  const workspace = { '@workspace/db': '../../../lib/db/src/index.ts', '@workspace/api-zod': '../../../lib/api-zod/src/index.ts' };
  const { authRouter, appPool } = await compile(`export { default as authRouter } from './src/routes/auth.ts';
    export { pool as appPool } from '@workspace/db';`, [{ name: 'real-db-no-mail', setup(b) {
    b.onResolve({ filter: /^@workspace\/(db|api-zod)$/ }, args => ({ path: fileURLToPath(new URL(workspace[args.path], import.meta.url)) }));
    b.onResolve({ filter: /lib\/email$/ }, () => ({ path: 'email', namespace: 'no-mail' }));
    b.onLoad({ filter: /.*/, namespace: 'no-mail' }, () => ({ contents: 'exports.sendVerificationEmail = async () => {};', loader: 'js' }));
  } }]);
  const app = express().use(express.json()).use((req, _res, next) => { req.log = { warn() {}, error() {} }; next(); }).use('/api', authRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const register = (email, attribution) => fetch(`http://127.0.0.1:${server.address().port}/api/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'synthetic-password', attribution }),
    });
    assert.equal((await register('coach-a@example.test', {
      signupUtmSource: 'instagram', signupUtmMedium: 'paid', signupUtmCampaign: 'start-dez', signupReferrerHost: 'l.instagram.com',
    })).status, 201);
    assert.equal((await register('coach-b@example.test', { signupUtmSource: 'y'.repeat(500), signupReferrerHost: 'not a host' })).status, 201);
    assert.equal((await register('coach-c@example.test')).status, 201);
    const { rows } = await pool.query(`SELECT email, signup_utm_source, signup_utm_medium, signup_utm_campaign, signup_referrer_host
      FROM users ORDER BY email`);
    assert.deepEqual(rows.map(row => Object.values(row)), [
      ['coach-a@example.test', 'instagram', 'paid', 'start-dez', 'l.instagram.com'],
      ['coach-b@example.test', null, null, null, null],
      ['coach-c@example.test', null, null, null, null],
    ]);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await appPool.end();
  }
});
