import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "artifacts/api-server/package.json"));
const ts = createRequire(import.meta.url)("typescript");
const schema = Object.fromEntries(Object.entries({
  usersTable: ["id", "email", "passwordHash"], sessionsTable: ["sid", "sess", "expire"],
  passwordResetTokensTable: ["id", "userId", "token", "usedAt", "expiresAt"], emailVerificationTokensTable: ["id", "userId", "usedAt"],
  playersTable: ["id", "teamId"], setPiecesTable: ["id", "teamId", "status"],
  setPieceRolesTable: ["id", "setPieceId", "createdAt", "updatedAt"],
  roleAssignmentsTable: ["roleId", "playerId"], quizAttemptsTable: ["id"], auditEventsTable: ["id"],
  playerReadinessTable: ["id", "playerId", "setPieceId"], matchdaysTable: ["id", "teamId"], matchdaySetPiecesTable: ["matchdayId", "setPieceId"],
}).map(([name, columns]) => [name, { name, ...Object.fromEntries(columns.map((column) => [column, { table: name, column }])) }]));
const orm = {
  eq: (a, b) => ({ op: "eq", a, b }), gt: (a, b) => ({ op: "gt", a, b }),
  isNull: (a) => ({ op: "null", a }), and: (...items) => ({ op: "and", items }),
  inArray: (a, b) => ({ op: "in", a, b }), sql: (_strings, ...values) => ({ op: "sessionUser", values }),
};
const value = (row, column) => column?.table ? row[column.table]?.[column.column] : column;
function matches(row, condition) {
  if (!condition) return true;
  if (condition.op === "and") return condition.items.every((item) => matches(row, item));
  if (condition.op === "eq") return value(row, condition.a) === value(row, condition.b);
  if (condition.op === "gt") return value(row, condition.a) > value(row, condition.b);
  if (condition.op === "null") return value(row, condition.a) == null;
  if (condition.op === "in") return condition.b.includes(value(row, condition.a));
  if (condition.op === "sessionUser") return value(row, condition.values[0])?.user?.id === condition.values[1];
  throw new Error(`Unexpected condition ${condition.op}`);
}
const project = (row, shape, table) => shape
  ? Object.fromEntries(Object.entries(shape).map(([key, column]) => [key, value(row, column)]))
  : { ...row[table.name] };

function database(initial = {}) {
  const data = Object.fromEntries(Object.keys(schema).map((name) => [name, structuredClone(initial[name] ?? [])]));
  let transactionTail = Promise.resolve();
  const db = { data, calls: [], failDelete: false,
    select(shape) {
      return { from(table) {
        let rows = data[table.name].map((record) => ({ [table.name]: record }));
        const query = {
          innerJoin(join, condition) {
            rows = rows.flatMap((row) => data[join.name].map((record) => ({ ...row, [join.name]: record }))).filter((row) => matches(row, condition));
            return query;
          },
          where(condition) {
            const run = async () => {
              db.calls.push({ action: "select", table: table.name });
              return rows.filter((row) => matches(row, condition)).map((row) => project(row, shape, table));
            };
            return { then: (...args) => run().then(...args), for: async (mode) => {
              db.calls.push({ action: "lock", table: table.name, mode });
              return run();
            } };
          },
        };
        return query;
      } };
    },
    update(table) { return { set(patch) { return { where(condition) {
      let result;
      const run = () => {
        if (result) return result;
        db.calls.push({ action: "update", table: table.name });
        result = data[table.name].filter((record) => matches({ [table.name]: record }, condition));
        result.forEach((record) => Object.assign(record, patch));
        return result;
      };
      return { returning: async (shape) => run().map((record) => project({ [table.name]: record }, shape, table)), then: (resolve, reject) => Promise.resolve().then(run).then(resolve, reject) };
    } }; } }; },
    insert(table) { return { values(record) {
      let result;
      const run = (conflict) => {
        if (result) return result;
        db.calls.push({ action: "insert", table: table.name });
        const columns = conflict && (Array.isArray(conflict.target) ? conflict.target : [conflict.target]);
        const existing = columns && data[table.name].find((candidate) => columns.every((column) => candidate[column.column] === record[column.column]));
        if (existing) {
          if (conflict.nothing) result = [];
          else { Object.assign(existing, conflict.set); result = [existing]; }
        }
        else { result = [{ id: `test-${data[table.name].length}`, ...record }]; data[table.name].push(...result); }
        return result;
      };
      return { returning: async () => run(), onConflictDoUpdate: async (conflict) => run(conflict),
        onConflictDoNothing: (conflict) => ({ returning: async () => run({ ...conflict, nothing: true }) }),
        then: (resolve, reject) => Promise.resolve().then(() => run()).then(resolve, reject) };
    } }; },
    delete(table) { return { async where(condition) {
      if (db.failDelete) throw new Error("synthetic delete failure");
      db.calls.push({ action: "delete", table: table.name });
      data[table.name] = data[table.name].filter((record) => !matches({ [table.name]: record }, condition));
    } }; },
    async transaction(callback) {
      const previous = transactionTail;
      let unlock;
      transactionTail = new Promise((resolve) => { unlock = resolve; });
      await previous;
      await db.beforeTransaction?.();
      const before = structuredClone(data);
      try { return await callback(db); } catch (error) { Object.assign(data, before); throw error; }
      finally { unlock(); }
    },
  };
  return db;
}
function load(relative, mocks, clock = Date, globals = {}) {
  const filename = path.join(root, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, Buffer, URLSearchParams, Date: clock, ...globals,
    require: (name) => {
      if (name in mocks) return mocks[name];
      throw new Error(`Unmocked import forbidden (no DB/network access): ${name}`);
    },
  }, { filename });
  return module.exports;
}
function harness() {
  const routes = {};
  return { routes, express: { Router: () => ({ get(url, handler) { routes[`GET ${url}`] = handler; }, post(url, handler) { routes[`POST ${url}`] = handler; } }) } };
}
function response() {
  return { statusCode: 200, headers: {}, cookies: [], cleared: [],
    status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; },
    setHeader(name, val) { this.headers[name] = val; }, cookie(...args) { this.cookies.push(args); },
    clearCookie(...args) { this.cleared.push(args); }, redirect(url) { this.redirected = url; },
  };
}
const request = (body = {}, extra = {}) => ({ body, query: {}, headers: { host: "synthetic.example.invalid" }, ip: "203.0.113.1", socket: {}, log: { info() {}, error() {} }, ...extra });
function authFixture(initial = {}, clock = Date, googleProfile) {
  const db = database(initial);
  const h = harness();
  const auth = load("artifacts/api-server/src/lib/auth.ts", { crypto, express: {}, "@workspace/db": { db, ...schema }, "drizzle-orm": orm }, clock);
  const hashes = [];
  const sentEmails = [];
  load("artifacts/api-server/src/routes/auth.ts", {
    express: h.express, "@workspace/db": { db, ...schema }, "drizzle-orm": orm, crypto, "zod/v4": require("zod/v4"),
    bcrypt: { hash: async (password) => { hashes.push(password); return `hash:${password}`; }, compare: async (password, hash) => { await db.beforeCompare?.(); return hash === `hash:${password}`; } },
    "@workspace/api-zod": {
      ExchangeMobileAuthorizationCodeBody: require("zod/v4").z.object({ email: require("zod/v4").z.string(), password: require("zod/v4").z.string() }),
      ExchangeMobileAuthorizationCodeResponse: { parse: value => value },
    },
    "../lib/auth": auth, "../lib/email": {
      async sendVerificationEmail(...args) { sentEmails.push({ type: "verification", args }); },
      async sendPasswordResetEmail(...args) { sentEmails.push({ type: "reset", args }); },
    },
  }, clock, {
    process: { env: { APP_DOMAIN: "synthetic.example.invalid", REPLIT_DOMAINS: "trusted-preview.example.invalid", GOOGLE_CLIENT_ID: "synthetic-client", GOOGLE_CLIENT_SECRET: "synthetic-secret" } },
    fetch: async (url) => {
      if (!googleProfile) throw new Error("Network access forbidden in tests");
      return { ok: true, async json() { return url.includes("/token") ? { access_token: "synthetic-token" } : googleProfile; } };
    },
  });
  return { db, ...h, auth, hashes, sentEmails };
}
async function invoke(routes, method, req) { const res = response(); await routes[method](req, res); return res; }

test("registration refuses an existing Google identity without changing credentials or issuing a session", async () => {
  const f = authFixture({ usersTable: [{ id: "google-user", email: "coach@example.invalid", passwordHash: null, authProvider: "google", emailVerified: true }] });
  const res = await invoke(f.routes, "POST /auth/register", request({ email: " Coach@Example.invalid ", password: "new-password" }));
  assert.equal(res.statusCode, 409);
  assert.equal(f.db.data.usersTable[0].passwordHash, null);
  assert.equal(f.db.data.sessionsTable.length, 0);
  assert.equal(f.hashes.length, 0);
});

test("new registration still creates a normalized account; malformed input and bcrypt-truncated passwords are rejected", async () => {
  const f = authFixture();
  const invalid = await invoke(f.routes, "POST /auth/register", request({ email: {}, password: "new-password" }));
  assert.equal(invalid.statusCode, 400);
  const long = await invoke(f.routes, "POST /auth/register", request({ email: "long@example.invalid", password: "é".repeat(37) }));
  assert.equal(long.statusCode, 400);
  const res = await invoke(f.routes, "POST /auth/register", request({ email: " Coach@Example.invalid ", password: "new-password" }));
  assert.equal(res.statusCode, 201);
  assert.equal(f.db.data.usersTable[0].email, "coach@example.invalid");
  assert.equal(f.db.data.sessionsTable.length, 1);
});

test("reset and verification links ignore attacker-controlled forwarded hosts", async () => {
  const f = authFixture({ usersTable: [{ id: "coach", email: "coach@example.invalid" }] });
  const headers = { host: "attacker.example.invalid", "x-forwarded-host": "attacker.example.invalid", "x-forwarded-proto": "http" };
  await invoke(f.routes, "POST /auth/forgot-password", request({ email: "coach@example.invalid" }, { headers }));
  await invoke(f.routes, "POST /auth/resend-verification", request({ email: "coach@example.invalid" }, { headers }));
  assert.equal(f.sentEmails.length, 2);
  assert.ok(f.sentEmails.every(email => email.args[2] === "https://synthetic.example.invalid"));
  const oauth = await invoke(f.routes, "GET /auth/google", request({}, { headers, query: { returnTo: "/\\attacker.example.invalid" } }));
  const params = new URL(oauth.redirected).searchParams;
  assert.equal(params.get("redirect_uri"), "https://synthetic.example.invalid/api/auth/google/callback");
  assert.equal(JSON.parse(Buffer.from(params.get("state"), "base64url").toString()).returnTo, "/");
  const preview = await invoke(f.routes, "GET /auth/google", request({}, { headers: { host: "trusted-preview.example.invalid" } }));
  assert.equal(new URL(preview.redirected).searchParams.get("redirect_uri"), "https://trusted-preview.example.invalid/api/auth/google/callback");
});

const googleRequest = () => request({}, {
  cookies: { oauth_state: "synthetic-nonce" },
  query: { code: "synthetic-code", state: Buffer.from(JSON.stringify({ nonce: "synthetic-nonce", returnTo: "/dashboard" })).toString("base64url") },
});
test("verified Google login removes credentials and sessions planted by an unverified signup", async () => {
  const f = authFixture({
    usersTable: [{ id: "coach", email: "coach@example.invalid", emailVerified: false, passwordHash: "planted-hash", authProvider: "email" }],
    sessionsTable: [{ sid: "planted-session", sess: { user: { id: "coach" } } }],
  }, Date, { id: "google-id", email: "coach@example.invalid", verified_email: true });
  const res = await invoke(f.routes, "GET /auth/google/callback", googleRequest());
  assert.equal(res.redirected, "/dashboard");
  assert.equal(f.db.data.usersTable[0].passwordHash, null);
  assert.equal(f.db.data.usersTable[0].authProvider, "google");
  assert.ok(f.db.data.sessionsTable.every((session) => session.sid !== "planted-session"));
  assert.equal(f.db.data.sessionsTable.length, 1);
});

test("Google linking requires a verified email and preserves an already verified account's credentials", async () => {
  const initial = { usersTable: [{ id: "coach", email: "coach@example.invalid", emailVerified: true, passwordHash: "verified-hash", authProvider: "email" }] };
  const invalid = authFixture(initial, Date, { id: "google-id", email: "coach@example.invalid", verified_email: false });
  assert.equal((await invoke(invalid.routes, "GET /auth/google/callback", googleRequest())).redirected, "/login?error=google_profile_failed");
  assert.equal(invalid.db.data.sessionsTable.length, 0);
  const valid = authFixture(initial, Date, { id: "google-id", email: "coach@example.invalid", verified_email: true });
  assert.equal((await invoke(valid.routes, "GET /auth/google/callback", googleRequest())).redirected, "/dashboard");
  assert.equal(valid.db.data.usersTable[0].passwordHash, "verified-hash");
});

test("Google reads current credentials under its user lock instead of overwriting a concurrent verified password", async () => {
  const f = authFixture({ usersTable: [{ id: "coach", email: "coach@example.invalid", emailVerified: false, passwordHash: "planted-hash", authProvider: "email" }] },
    Date, { id: "google-id", email: "coach@example.invalid", verified_email: true });
  f.db.beforeTransaction = () => {
    Object.assign(f.db.data.usersTable[0], { emailVerified: true, passwordHash: "newly-verified-hash" });
  };
  assert.equal((await invoke(f.routes, "GET /auth/google/callback", googleRequest())).redirected, "/dashboard");
  assert.equal(f.db.data.usersTable[0].passwordHash, "newly-verified-hash");
  assert.ok(f.db.calls.some(call => call.action === "lock" && call.table === "usersTable" && call.mode === "update"));
});

test("Google claim invalidates old tokens and rolls back credentials, sessions and tokens together on failure", async () => {
  const initial = {
    usersTable: [{ id: "coach", email: "coach@example.invalid", emailVerified: false, passwordHash: "planted-hash", authProvider: "email" }],
    sessionsTable: [{ sid: "planted-session", sess: { user: { id: "coach" } } }],
    passwordResetTokensTable: [{ id: "r1", userId: "coach", usedAt: null }],
    emailVerificationTokensTable: [{ id: "v1", userId: "coach", usedAt: null }],
  };
  const f = authFixture(initial, Date, { id: "google-id", email: "coach@example.invalid", verified_email: true });
  await invoke(f.routes, "GET /auth/google/callback", googleRequest());
  assert.ok(f.db.data.passwordResetTokensTable[0].usedAt instanceof Date);
  assert.ok(f.db.data.emailVerificationTokensTable[0].usedAt instanceof Date);
  const failed = authFixture(initial, Date, { id: "google-id", email: "coach@example.invalid", verified_email: true });
  failed.db.failDelete = true;
  const res = await invoke(failed.routes, "GET /auth/google/callback", googleRequest());
  assert.equal(res.redirected, "/login?error=google_failed");
  assert.equal(res.cookies.length, 0);
  assert.equal(failed.db.data.usersTable[0].passwordHash, "planted-hash");
  assert.equal(failed.db.data.passwordResetTokensTable[0].usedAt, null);
  assert.equal(failed.db.data.sessionsTable[0].sid, "planted-session");
});

test("new Google identities and a simultaneous email registration cannot create duplicate identities", async () => {
  const f = authFixture({}, Date, { id: "google-id", email: "coach@example.invalid", verified_email: true });
  await invoke(f.routes, "GET /auth/google/callback", googleRequest());
  assert.equal(f.db.data.usersTable.length, 1);
  assert.equal(f.db.data.usersTable[0].emailVerified, true);
  assert.equal(f.db.data.sessionsTable.length, 1);
  const registering = authFixture();
  registering.db.beforeTransaction = () => registering.db.data.usersTable.push({
    id: "google-won", email: "coach@example.invalid", emailVerified: true, passwordHash: null,
  });
  const res = await invoke(registering.routes, "POST /auth/register", request({ email: "coach@example.invalid", password: "planted-password" }));
  assert.equal(res.statusCode, 409);
  assert.equal(registering.db.data.usersTable.length, 1);
  assert.equal(registering.db.data.usersTable[0].passwordHash, null);
  assert.equal(registering.db.data.sessionsTable.length, 0);
});

for (const endpoint of ["POST /auth/login", "POST /mobile-auth/token-exchange"]) {
  test(`${endpoint}: Google claim revokes a login that was still verifying the old password`, async () => {
    const f = authFixture({ usersTable: [{ id: "coach", email: "coach@example.invalid", emailVerified: false, passwordHash: "hash:planted-password", authProvider: "email" }] },
      Date, { id: "google-id", email: "coach@example.invalid", verified_email: true });
    let compareStarted, releaseCompare;
    const started = new Promise(resolve => { compareStarted = resolve; });
    const held = new Promise(resolve => { releaseCompare = resolve; });
    f.db.beforeCompare = async () => { compareStarted(); await held; };
    const loginResponse = response();
    const login = f.routes[endpoint](request({ email: "coach@example.invalid", password: "planted-password" }), loginResponse);
    await started;
    assert.ok(f.db.calls.some(call => call.action === "lock" && call.table === "usersTable" && call.mode === "update"));
    const google = invoke(f.routes, "GET /auth/google/callback", googleRequest());
    // Let an unlocked Google claim complete before releasing bcrypt. With the
    // shared user transaction it waits, then revokes the just-created old login.
    await new Promise(resolve => setImmediate(resolve));
    releaseCompare();
    await login;
    const googleResponse = await google;
    const oldSid = endpoint.includes("mobile") ? loginResponse.body.token : loginResponse.cookies[0][1];
    const googleSid = googleResponse.cookies[0][1];
    assert.ok(oldSid);
    assert.deepEqual(f.db.data.sessionsTable.map(session => session.sid), [googleSid]);
    assert.equal(await f.auth.getSession(oldSid), null);
    assert.equal(f.db.data.usersTable[0].passwordHash, null);
  });
}

const resetFixtures = () => ({
  usersTable: [{ id: "coach", passwordHash: "old-hash" }],
  passwordResetTokensTable: [
    { id: "r1", userId: "coach", token: "valid-token", usedAt: null, expiresAt: new Date(Date.now() + 60_000) },
    { id: "r2", userId: "coach", token: "other-token", usedAt: null, expiresAt: new Date(Date.now() + 60_000) },
  ],
  sessionsTable: [{ sid: "old-session", sess: { user: { id: "coach" } } }, { sid: "other-session", sess: { user: { id: "other-coach" } } }],
});
test("password reset consumes all reset tokens and revokes only the affected user's sessions atomically", async () => {
  const f = authFixture(resetFixtures());
  const res = await invoke(f.routes, "POST /auth/reset-password", request({ token: "valid-token", password: "new-password" }));
  assert.equal(res.statusCode, 200);
  assert.equal(f.db.data.usersTable[0].passwordHash, "hash:new-password");
  assert.ok(f.db.data.passwordResetTokensTable.every((token) => token.usedAt instanceof Date));
  assert.deepEqual(f.db.data.sessionsTable.map((session) => session.sid), ["other-session"]);
  assert.equal(res.cleared[0][0], "sid");
  assert.ok(f.db.calls.some(call => call.action === "lock" && call.table === "usersTable" && call.mode === "update"));
  assert.equal((await invoke(f.routes, "POST /auth/reset-password", request({ token: "valid-token", password: "another-password" }))).statusCode, 400);
});

test("a failed session revocation rolls back the password and token changes", async () => {
  const f = authFixture(resetFixtures()); f.db.failDelete = true;
  await assert.rejects(invoke(f.routes, "POST /auth/reset-password", request({ token: "valid-token", password: "new-password" })), /synthetic delete failure/);
  assert.equal(f.db.data.usersTable[0].passwordHash, "old-hash");
  assert.equal(f.db.data.passwordResetTokensTable[0].usedAt, null);
  assert.equal(f.db.data.sessionsTable.length, 2);
});

test("web and mobile login share account throttling and return Retry-After; the window expires", async () => {
  let now = Date.now();
  class Clock extends Date { static now() { return now; } }
  const f = authFixture({}, Clock);
  for (let n = 0; n < 10; n++) {
    const res = await invoke(f.routes, "POST /auth/login", request({ email: " Coach@Example.invalid ", password: "wrong" }, { ip: `203.0.113.${n + 1}` }));
    assert.equal(res.statusCode, 401);
  }
  const blocked = await invoke(f.routes, "POST /mobile-auth/token-exchange", request({ email: "coach@example.invalid", password: "wrong" }));
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers["Retry-After"], "900");
  now += 15 * 60_000;
  assert.equal(f.auth.limitAuthAttempts(request({ email: "coach@example.invalid" }), response(), "login"), true);
});

test("login IP limits cannot be bypassed by changing email or supplying an untrusted forwarding header", () => {
  const f = authFixture();
  for (let n = 0; n < 50; n++) assert.equal(f.auth.limitAuthAttempts(request({ email: `coach${n}@example.invalid` }, { headers: { "x-forwarded-for": `203.0.113.${n}` } }), response(), "login"), true);
  const res = response();
  assert.equal(f.auth.limitAuthAttempts(request({ email: "fresh@example.invalid" }), res, "login"), false);
  assert.equal(res.statusCode, 429);
});

function quizFixture(initial, link = { teamId: "team", playerScope: ["player"] }) {
  const db = database(initial); const h = harness();
  load("artifacts/api-server/src/routes/quiz.ts", {
    express: h.express, "@workspace/db": { db, ...schema }, "drizzle-orm": orm, "zod/v4": require("zod/v4"),
    "../lib/authorization": { async requireShareToken(_req, res) { if (!link) res.status(403).json({ error: "revoked" }); return link; }, async isSetPieceInShareScope() { return true; } },
  });
  return { db, ...h };
}
const quizData = () => ({
  playersTable: [{ id: "player", teamId: "team" }], setPiecesTable: [{ id: "piece", teamId: "team", title: "Corner" }],
  setPieceRolesTable: [{ id: "own-role", setPieceId: "piece", name: "Near post", startPosition: { x: 10, y: 20 }, coachingPoint: null }, { id: "other-role", setPieceId: "piece", name: "Other", startPosition: null, coachingPoint: null }],
  roleAssignmentsTable: [{ roleId: "own-role", playerId: "player" }, { roleId: "other-role", playerId: "other-player" }],
});
test("quiz submission rejects someone else's role before persisting an attempt or readiness", async () => {
  const f = quizFixture(quizData());
  const res = await invoke(f.routes, "POST /p/:shareToken/quiz", request({ playerId: "player", setPieceId: "piece", roleId: "other-role", answers: [{ questionId: "q3_understand", answer: true }] }));
  assert.equal(res.statusCode, 400);
  assert.equal(f.db.data.quizAttemptsTable.length, 0);
  assert.equal(f.db.data.playerReadinessTable.length, 0);
});

test("valid quiz derives and stores the player's actual role, including submissions without roleId", async () => {
  const f = quizFixture(quizData());
  const res = await invoke(f.routes, "POST /p/:shareToken/quiz", request({ playerId: "player", setPieceId: "piece", answers: [
    { questionId: "q1_start_zone", answer: { x: 10, y: 20 } }, { questionId: "q3_understand", answer: true },
  ] }));
  assert.equal(res.body.passed, true);
  assert.equal(f.db.data.quizAttemptsTable[0].roleId, "own-role");
  assert.equal(f.db.data.playerReadinessTable[0].roleId, "own-role");
});

test("quiz questions enforce player scope; foreign-team pieces and revoked links cannot be used", async () => {
  const f = quizFixture(quizData());
  const scoped = await invoke(f.routes, "GET /p/:shareToken/quiz", request({}, { query: { setPieceId: "piece", playerId: "other-player" } }));
  assert.equal(scoped.statusCode, 403);
  f.db.data.setPiecesTable[0].teamId = "foreign-team";
  const foreign = await invoke(f.routes, "POST /p/:shareToken/quiz", request({ playerId: "player", setPieceId: "piece", roleId: "own-role", answers: [] }));
  assert.equal(foreign.statusCode, 404);
  const revoked = quizFixture(quizData(), null);
  assert.equal((await invoke(revoked.routes, "POST /p/:shareToken/quiz", request({}))).statusCode, 403);
  assert.equal(revoked.db.calls.length, 0);
});

function readinessFixture(initial) {
  const db = database(initial); const h = harness();
  load("artifacts/api-server/src/routes/readiness.ts", {
    express: h.express, "@workspace/db": { db, ...schema }, "drizzle-orm": orm, "zod/v4": require("zod/v4"),
    "../lib/authorization": { async requireTeamAccess() { return "team"; } },
  });
  return { db, ...h };
}
const readinessData = () => ({
  playersTable: [{ id: "player", teamId: "team" }],
  setPiecesTable: [1, 2, 3].map((id) => ({ id: `piece${id}`, teamId: "team", status: "ready" })),
  setPieceRolesTable: [1, 2, 3].map((id) => ({ id: `role${id}`, setPieceId: `piece${id}`, createdAt: new Date(0), updatedAt: new Date(0) })),
  roleAssignmentsTable: [1, 2, 3].map((id) => ({ roleId: `role${id}`, playerId: "player" })),
  playerReadinessTable: [{ id: "done", playerId: "player", setPieceId: "piece1", roleId: "role1", status: "passed" }],
});
test("one completed task out of three cannot mark the player passed; GET projects pending tasks without writes", async () => {
  const f = readinessFixture(readinessData());
  const res = await invoke(f.routes, "GET /teams/:teamId/readiness", request());
  assert.equal(res.body.summary.passed, 0);
  assert.equal(res.body.players[0].readiness.length, 3);
  assert.deepEqual(Array.from(res.body.players[0].readiness, (item) => item.status), ["passed", "not_opened", "not_opened"]);
  assert.ok(f.db.calls.every((call) => call.action === "select"));
});

test("all current tasks must pass; reassigned roles invalidate historical completion and drafts are excluded", async () => {
  const data = readinessData();
  data.playerReadinessTable = [1, 2, 3].map((id) => ({ id: `done${id}`, playerId: "player", setPieceId: `piece${id}`, roleId: `role${id}`, status: "passed" }));
  const f = readinessFixture(data);
  assert.equal((await invoke(f.routes, "GET /teams/:teamId/readiness", request())).body.summary.passed, 1);
  f.db.data.playerReadinessTable[1].roleId = "previous-role";
  assert.equal((await invoke(f.routes, "GET /teams/:teamId/readiness", request())).body.summary.passed, 0);
  f.db.data.setPiecesTable[1].status = "draft";
  const current = await invoke(f.routes, "GET /teams/:teamId/readiness", request());
  assert.equal(current.body.summary.passed, 1);
  assert.equal(current.body.players[0].readiness.length, 2);
});

test("readiness rejects foreign-team matchday filters", async () => {
  const f = readinessFixture({ ...readinessData(), matchdaysTable: [{ id: "match", teamId: "foreign-team" }] });
  const res = await invoke(f.routes, "GET /teams/:teamId/readiness", request({}, { query: { matchdayId: "match" } }));
  assert.equal(res.statusCode, 404);
});
