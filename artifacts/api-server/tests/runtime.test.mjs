import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import express from 'express';

const require = createRequire(import.meta.url);
const serverDirectory = fileURLToPath(new URL('..', import.meta.url));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'setpiece-runtime-'));
const publicDirectory = path.join(temporary, 'setpiece/dist/public');
await mkdir(path.join(publicDirectory, 'assets'), { recursive: true });
await writeFile(path.join(publicDirectory, 'index.html'), '<!doctype html><title>Synthetic SETPIECE</title>');
await writeFile(path.join(publicDirectory, 'assets/app.js'), 'console.log("synthetic");');

const state = { authCalls: 0, listenCalls: [], logs: [] };
const apiRouter = express.Router();
apiRouter.get('/private', (_req, res) => res.json({ private: true }));
globalThis.__setpieceRuntimeTest = {
  state, apiRouter,
  authMiddleware(_req, _res, next) { state.authCalls++; next(); },
  logger: { info(...args) { state.logs.push(args); }, error() {} },
};

async function compile(entry, mocks = {}) {
  const result = await build({
    entryPoints: [path.join(serverDirectory, 'src', entry)],
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
    define: { 'import.meta.dirname': JSON.stringify(path.join(temporary, 'api-server/dist')) },
    plugins: [{ name: 'runtime-without-external-services', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        if (Object.hasOwn(mocks, args.path)) return { path: args.path, namespace: 'synthetic' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, ({ path }) => ({
        contents: mocks[path], loader: 'js',
      }));
    } }],
  });
  return () => {
    const compiledModule = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, compiledModule, compiledModule.exports);
    return compiledModule.exports;
  };
}

const loadApp = await compile('app.ts', {
  './lib/logger': 'exports.logger = globalThis.__setpieceRuntimeTest.logger;',
  './lib/webhookHandlers': 'exports.WebhookHandlers = {};',
  './middlewares/authMiddleware': 'exports.authMiddleware = globalThis.__setpieceRuntimeTest.authMiddleware;',
  './routes': 'module.exports = globalThis.__setpieceRuntimeTest.apiRouter;',
  '@workspace/api-zod': 'exports.HealthCheckResponse = { parse: value => value };',
  'pino-http': 'module.exports = () => (_req, _res, next) => next();',
});
const previousEnvironment = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';
const { default: app } = loadApp();
if (previousEnvironment === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnvironment;
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await rm(temporary, { recursive: true, force: true });
  delete globalThis.__setpieceRuntimeTest;
});

test('production serves landing and client deep links without session/database work', async () => {
  const before = state.authCalls;
  for (const pathname of ['/', '/login', '/demo', '/p/synthetic-token']) {
    const response = await fetch(url + pathname, { headers: { cookie: 'sid=synthetic' } });
    assert.equal(response.status, 200, pathname);
    assert.match(await response.text(), /Synthetic SETPIECE/, pathname);
    assert.equal(response.headers.get('cache-control'), 'no-cache');
  }
  assert.equal(state.authCalls, before);
});

test('production serves JS and rejects missing assets instead of returning HTML', async () => {
  const asset = await fetch(url + '/assets/app.js');
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /javascript/);
  assert.match(await asset.text(), /synthetic/);
  const missing = await fetch(url + '/assets/missing.js');
  assert.equal(missing.status, 404);
  assert.doesNotMatch(await missing.text(), /Synthetic SETPIECE/);
});

test('API health is public and uncached even with an expired session cookie', async () => {
  const before = state.authCalls;
  const response = await fetch(url + '/api/healthz', { headers: { cookie: 'sid=expired-synthetic' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(state.authCalls, before);
});

test('API routes retain auth and unknown API routes return JSON 404', async () => {
  const before = state.authCalls;
  const privateResponse = await fetch(url + '/api/private');
  assert.equal(privateResponse.status, 200);
  assert.deepEqual(await privateResponse.json(), { private: true });
  assert.equal(state.authCalls, before + 1);
  const missing = await fetch(url + '/api/missing');
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'Not found' });
  assert.equal(missing.headers.get('cache-control'), 'no-store');
});

test('production fails explicitly when the frontend build is absent', async () => {
  const { mountFrontend } = (await compile('lib/frontend.ts'))();
  assert.throws(() => mountFrontend(express(), path.join(temporary, 'missing')), /Frontend build missing/);
});

test('startup opens the public port without migrations, seeding or Stripe calls', async () => {
  const loadStartup = await compile('index.ts', {
    './app': 'module.exports = { listen(...args) { globalThis.__setpieceRuntimeTest.state.listenCalls.push(args.slice(0, 2)); args[2](); } };',
    './lib/logger': 'exports.logger = globalThis.__setpieceRuntimeTest.logger;',
    '@workspace/db': 'throw new Error("Startup must not access the database");',
    'stripe-replit-sync': 'throw new Error("Startup must not run Stripe migrations");',
    './lib/seedTemplates': 'throw new Error("Startup must not seed data");',
    './lib/stripeClient': 'throw new Error("Startup must not configure Stripe");',
  });
  const previousPort = process.env.PORT;
  try {
    process.env.PORT = '5000';
    loadStartup();
    assert.deepEqual(state.listenCalls.at(-1), [5000, '0.0.0.0']);
    for (const invalid of ['', '0', '-1', '1.5', '65536', 'Infinity', 'invalid']) {
      process.env.PORT = invalid;
      assert.throws(loadStartup, /PORT/);
    }
    assert.equal(state.listenCalls.length, 1);
  } finally {
    if (previousPort === undefined) delete process.env.PORT;
    else process.env.PORT = previousPort;
  }
});
