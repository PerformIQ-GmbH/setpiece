// Starts a private ephemeral HTTP listener; production fixtures are forbidden.
if (!process.env.SETPIECE_TEST_DATABASE_URL || process.env.DATABASE_URL !== process.env.SETPIECE_TEST_DATABASE_URL) {
  throw new Error('The API and smoke test must use the same isolated database.');
}
const { default: app } = await import('../src/app');
const { pool } = await import('@workspace/db');
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Missing test listener');
process.env.SETPIECE_TEST_API_URL = `http://127.0.0.1:${address.port}`;
try { await import('../../../scripts/pilot-smoke.mjs'); }
finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await pool.end();
}
