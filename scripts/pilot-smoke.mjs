import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { createRequire } from 'node:module';

// Run against a purpose-created, schema-only test database and a localhost API.
const { Pool } = createRequire(new URL('../lib/db/package.json', import.meta.url))('pg');
const databaseUrl = process.env.SETPIECE_TEST_DATABASE_URL;
const base = process.env.SETPIECE_TEST_API_URL;
if (!databaseUrl || !base || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('An isolated test database and localhost API URL are required.');
const pool = new Pool({ connectionString: databaseUrl });
try {
  const { rows: [database] } = await pool.query('SELECT current_database() name, (SELECT count(*) FROM users)::int users');
  assert.match(database.name, /^setpiece_flow_test(?:_\d+)?$/);
  assert.equal(database.users, 0, 'Use a fresh schema-only test database');
  const code = randomBytes(16).toString('hex').toUpperCase();
  await pool.query('INSERT INTO pilot_access(slot,code_hash) VALUES (1,$1)', [createHash('sha256').update(code).digest('hex')]);
  async function request(pathname, { method = 'GET', body, cookie, status = 200 } = {}) {
    const response = await fetch(base + '/api' + pathname, { method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    assert.equal(response.status, status, `${method} ${pathname}: ${text.slice(0, 180)}`);
    assert.match(response.headers.get('cache-control'), /no-store/);
    return { data: text ? JSON.parse(text) : null, cookie: response.headers.getSetCookie().map(x => x.split(';')[0]).join('; ') };
  }
  const password = randomBytes(20).toString('hex');
  const coach = await request('/auth/register', { method: 'POST', status: 201, body: { email: 'coach@example.invalid', password, firstName: 'Fiktiv', lastName: 'Trainer' } });
  assert.ok(coach.cookie);
  const second = await request('/auth/register', { method: 'POST', status: 201, body: { email: 'other@example.invalid', password, firstName: 'Anderer', lastName: 'Testtrainer' } });
  const { data: team } = await request('/teams', { method: 'POST', cookie: coach.cookie, status: 201, body: { name: 'FC Test U19' } });
  await request(`/teams/${team.id}/pilot`, { method: 'POST', status: 403, cookie: second.cookie, body: { code } });
  const { data: claimed } = await request(`/teams/${team.id}/pilot`, { method: 'POST', cookie: coach.cookie, body: { code } });
  assert.ok(new Date(claimed.expiresAt) > new Date());
  const { data: active } = await request(`/teams/${team.id}`, { cookie: coach.cookie });
  assert.equal(active.tier, 'free');
  assert.equal(active.effectiveTier, 'solo_coach');
  const root = `/teams/${team.id}`;
  const { data: player } = await request(root + '/players', { method: 'POST', status: 201, cookie: coach.cookie, body: { firstName: 'Spieler', lastName: 'Neun', shirtNumber: 9 } });
  const { data: standard } = await request(root + '/set-pieces', { method: 'POST', status: 201, cookie: coach.cookie, body: { title: 'Fiktiver Eckball', category: 'offensive_corner_left' } });
  const standardRoot = root + `/set-pieces/${standard.id}`;
  const { data: role } = await request(standardRoot + '/roles', { method: 'POST', status: 201, cookie: coach.cookie, body: { name: 'Erster Pfosten', startPosition: { x: 50, y: 50 } } });
  await request(standardRoot + '/assignments', { method: 'PUT', cookie: coach.cookie, body: { roleId: role.id, playerId: player.id } });
  await request(root + '/players', { cookie: second.cookie, status: 403 });
  const { data: link } = await request(root + '/share-links', { method: 'POST', status: 201, cookie: coach.cookie, body: { playerScope: [player.id], allowedSetPieceIds: [standard.id] } });
  await request(`/p/${link.token}`);
  const { data: quiz } = await request(`/p/${link.token}/quiz?setPieceId=${standard.id}&playerId=${player.id}`);
  assert.ok(quiz.questions.length >= 2);
  assert.ok(quiz.questions.every(question => !('correctAnswer' in question)));
  const { data: result } = await request(`/p/${link.token}/quiz`, { method: 'POST', body: {
    playerId: player.id, setPieceId: standard.id, roleId: role.id,
    answers: quiz.questions.map(q => ({ questionId: q.id, answer: q.type === 'tap_zone' ? { x: 50, y: 50 } : true })),
  } });
  assert.equal(result.passed, true);
  assert.equal(result.score, 100);
  const { data: readiness } = await request(root + '/readiness', { cookie: coach.cookie });
  assert.equal(readiness.summary.passed, 1);
  await request(root + `/share-links/${link.id}/revoke`, { method: 'POST', cookie: coach.cookie });
  await request(`/p/${link.token}`, { status: 410 });
  await request('/billing/checkout', { method: 'POST', cookie: coach.cookie, status: 503, body: { teamId: team.id, tierId: 'solo_coach' } });
  await request('/auth/logout', { method: 'POST', cookie: coach.cookie });
  await request('/teams', { cookie: coach.cookie, status: 401 });
  console.log('PILOT_SMOKE_OK: registration, owner-only pilot, team isolation, standard, role assignment, scoped link, quiz, trainer result, revocation, paid-checkout block, logout.');
} finally { await pool.end(); }
