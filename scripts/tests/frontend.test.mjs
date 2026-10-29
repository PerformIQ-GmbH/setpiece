import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { clearClientSession } from '../../artifacts/setpiece/src/lib/session-cleanup.ts';
import { computeStructural } from '../../artifacts/setpiece/src/lib/board-health.ts';
import { safeReturnTo } from '../../artifacts/setpiece/src/lib/auth-return-to.ts';
import { demoTeam, demoPlayers, demoSetPiece, demoMatchday, demoReadiness, demoReadinessForAnswer } from '../../artifacts/setpiece/src/lib/demo-fixture.ts';

const swSource = await readFile(new URL('../../artifacts/setpiece/public/sw.js', import.meta.url), 'utf8');

test('auth return destinations stay inside the app, including after percent decoding', () => {
  for (const path of ['/dashboard', '/teams/demo/templates?from=login#roles', '/join/some-token', '/teams/a?name=FC%20Beispiel']) assert.equal(safeReturnTo(path), path);
  for (const path of [null, '', '//evil.example', '/\\evil.example', '\\evil.example', 'https://evil.example', 'javascript:alert(1)', '/\nevil.example', '/\tevil.example', '/%2Fevil.example', '/%5Cevil.example', '/%250Aevil.example', '/%252F%252Fevil.example', '/%invalid']) assert.equal(safeReturnTo(path), '/dashboard', String(path));
});

function serviceWorker({ offline = false, base = '/', existing = [] } = {}) {
  const handlers = {}, stored = new Map(), deleted = [], writes = [];
  const cache = {
    addAll: async () => {},
    match: async request => stored.get(typeof request === 'string' ? request : request.url),
    put: async (request, response) => { writes.push(request.url); stored.set(request.url, response); },
  };
  const caches = {
    keys: async () => existing,
    open: async () => cache,
    delete: async key => { deleted.push(key); return true; },
    match: async path => path.endsWith('offline.html') ? new Response('Verbindung erforderlich') : undefined,
  };
  vm.runInNewContext(swSource, {
    URL, Response, caches,
    fetch: async () => { if (offline) throw new Error('offline'); return new Response('private team data'); },
    self: {
      registration: { scope: `https://setpiece.example${base}` },
      location: { origin: 'https://setpiece.example' },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      skipWaiting() {}, clients: { claim: async () => {} },
    },
  });
  const request = (path, { method = 'GET', mode = 'cors' } = {}) => {
    let result;
    handlers.fetch({ request: { url: new URL(path, 'https://setpiece.example').href, method, mode }, respondWith: value => { result = value; } });
    return result;
  };
  return { handlers, request, deleted, writes };
}

test('service worker leaves APIs, mutations, cross-origin and unhashed files to the network', () => {
  const sw = serviceWorker({ base: '/app/' });
  for (const path of ['/api/teams', '/api/auth/me', '/api/billing', '/app/api/players', '/app/config.json', '/app/assets/private.json', '/app/assets/main.js', 'https://other.example/a.js']) {
    assert.equal(sw.request(path), undefined, path);
  }
  assert.equal(sw.request('/app/assets/index-abc12345.js', { method: 'POST' }), undefined);
  assert.deepEqual(sw.writes, []);
});

test('authenticated HTML is fetched without caching, including navigation at a nested base path', async () => {
  const sw = serviceWorker({ base: '/app/' });
  const response = await sw.request('/app/teams/private', { mode: 'navigate' });
  assert.equal(await response.text(), 'private team data');
  assert.deepEqual(sw.writes, []);
});

test('offline navigation shows a connection notice and never an earlier team page', async () => {
  const sw = serviceWorker({ offline: true });
  const response = await sw.request('/teams/private', { mode: 'navigate' });
  assert.equal(await response.text(), 'Verbindung erforderlich');
  assert.deepEqual(sw.writes, []);
});

test('only versioned static build files are cached', async () => {
  const sw = serviceWorker();
  await sw.request('/assets/index-abc12345.js');
  assert.deepEqual(sw.writes, ['https://setpiece.example/assets/index-abc12345.js']);
});

test('service worker activation removes private caches left by earlier releases', async () => {
  const sw = serviceWorker({ existing: ['setpiece-v1', 'setpiece-api', 'setpiece-static-v3', 'another-app'] });
  let completed;
  sw.handlers.activate({ waitUntil: value => { completed = value; } });
  await completed;
  assert.deepEqual(sw.deleted.sort(), ['setpiece-api', 'setpiece-v1']);
});

function storage(values) {
  return Object.assign(Object.create({ removeItem(key) { delete this[key]; } }), values);
}

test('logout and identity changes remove client queries, old caches and player selections', async () => {
  const old = Object.fromEntries(['localStorage', 'sessionStorage', 'caches'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const events = [];
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage({ sp_player_secret: 'player-1', 'setpiece-lang': 'de' }) });
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage({ sp_player_other: 'player-2' }) });
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: { keys: async () => ['setpiece-api', 'other-app'], delete: async key => events.push(key) } });
    await clearClientSession({ cancelQueries: async () => events.push('cancel'), clear: () => events.push('clear') });
    assert.deepEqual(events, ['cancel', 'clear', 'setpiece-api']);
    assert.equal(globalThis.localStorage.sp_player_secret, undefined);
    assert.equal(globalThis.sessionStorage.sp_player_other, undefined);
    assert.equal(globalThis.localStorage['setpiece-lang'], 'de');
    globalThis.localStorage.sp_player_retry = 'player-3';
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: { keys: async () => { throw new Error('storage denied'); } } });
    await clearClientSession({ cancelQueries: async () => { throw new Error('cancel failed'); }, clear: () => events.push('clear-again') });
    assert.equal(globalThis.localStorage.sp_player_retry, undefined);
    assert.ok(events.includes('clear-again'));
  } finally {
    for (const [name, descriptor] of Object.entries(old)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

test('the fictional demo has a complete, consistent team, set piece and matchday', () => {
  assert.equal(demoSetPiece.teamId, demoTeam.id);
  assert.equal(demoMatchday.setPieces[0].id, demoSetPiece.id);
  for (const role of demoSetPiece.roles) {
    const assignment = demoSetPiece.assignments.find(item => item.roleId === role.id);
    assert.ok(assignment);
    assert.ok(demoPlayers.some(player => player.id === assignment.playerId));
    assert.ok(Number.isFinite(role.startPosition.x) && Number.isFinite(role.startPosition.y));
  }
  assert.ok(demoSetPiece.boardData.annotations.some(item => item.linkedRoleId === 'role-9' && item.points.length >= 2));
});

test('a local quiz answer updates the correct demo player and the coach totals without modifying the fixture', () => {
  const before = structuredClone(demoReadiness);
  for (const correct of [true, false]) {
    const next = demoReadinessForAnswer(correct);
    assert.equal(next.details.find(item => item.playerId === 'demo-9').status, correct ? 'passed' : 'needs_review');
    assert.equal(next.summary.passed, correct ? 2 : 1);
    assert.equal(next.summary.needsReview, correct ? 0 : 1);
    assert.equal(Object.values(next.summary).reduce((a, b) => a + b, 0), demoPlayers.length);
  }
  assert.deepEqual(demoReadiness, before);
});

test('a stationary, assigned role needs no movement path; missing or unavailable players remain visible', () => {
  const roles = [{ id: 'cover', name: 'Rückraum sichern' }];
  const assignments = [{ roleId: 'cover', playerId: 'p6' }];
  const players = [{ id: 'p6', firstName: 'Spieler', lastName: '6' }];
  assert.deepEqual(computeStructural(roles, assignments, players), []);
  assert.equal(computeStructural(roles, [], players)[0].severity, 'red');
  assert.equal(computeStructural(roles, assignments, [{ ...players[0], status: 'injured' }])[0].severity, 'red');
  assert.equal(computeStructural(roles, assignments, [{ ...players[0], status: 'inactive' }])[0].severity, 'amber');
});
