import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import * as variantContent from "../../artifacts/api-server/src/lib/variantContent.ts";
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
  roleAssignmentsTable: ["roleId", "playerId"], quizAttemptsTable: ["id", "playerId", "setPieceId", "roleId"], auditEventsTable: ["id"],
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
  return { routes, express: { Router: () => Object.fromEntries(["get", "post", "patch", "put", "delete"].map(method => [method, (url, handler) => { routes[`${method.toUpperCase()} ${url}`] = handler; }])) } };
}
function response() {
  return { statusCode: 200, headers: {}, cookies: [], cleared: [],
    status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; },
    sendStatus(code) { this.statusCode = code; return this; },
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
    "../lib/variantContent": variantContent,
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
    "../lib/variantContent": variantContent,
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

function publishedQuizData() {
  const data = quizData();
  const piece = data.setPiecesTable[0];
  piece.status = "ready";
  piece.boardData = { schemaVersion: 2, defaultVariantId: "A", activeVariantId: "B", variants: ["A", "B"].map(id => ({ id, name: id, recognitionCue: "Zonal", teamSignal: "One arm", roleTasks: {}, annotations: [], entities: [], steps: [{ id: "phase", sortOrder: 0 }], stepPositions: { phase: { "own-role": id === "A" ? { x: 10, y: 20 } : { x: 80, y: 90 } } }, entityStepPositions: {} })) };
  piece.boardData.publishedContent = variantContent.publishContent(piece, data.setPieceRolesTable);
  return data;
}
const quizQuery = (variantId = "A") => request({}, { query: { setPieceId: "piece", playerId: "player", roleId: "own-role", variantId } });
const answerTask = task => ({ playerId: "player", setPieceId: "piece", roleId: "own-role", variantId: task.variantId, contentVersion: task.contentVersion, answers: [{ questionId: "q1_start_zone", answer: task.variantId === "A" ? { x: 10, y: 20 } : { x: 80, y: 90 } }, { questionId: "q3_understand", answer: true }] });

test("published quiz grades the selected variant, rejects wrong/stale scopes, and never writes unscoped completion", async () => {
  const f = quizFixture(publishedQuizData());
  const a = (await invoke(f.routes, "GET /p/:shareToken/quiz", quizQuery("A"))).body;
  const b = (await invoke(f.routes, "GET /p/:shareToken/quiz", quizQuery("B"))).body;
  assert.notEqual(a.contentVersion, b.contentVersion);
  assert.equal((await invoke(f.routes, "GET /p/:shareToken/quiz", quizQuery("outside"))).statusCode, 400);
  assert.equal((await invoke(f.routes, "POST /p/:shareToken/quiz", request({ ...answerTask(a), variantId: "B" }))).statusCode, 409);
  assert.equal((await invoke(f.routes, "POST /p/:shareToken/quiz", request({ ...answerTask(a), roleId: undefined }))).statusCode, 409);
  assert.equal(f.db.data.quizAttemptsTable.length, 0);
  const passed = await invoke(f.routes, "POST /p/:shareToken/quiz", request(answerTask(b)));
  assert.equal(passed.body.passed, true);
  assert.equal(f.db.data.playerReadinessTable.length, 0);
  assert.equal(f.db.data.quizAttemptsTable[0].answers.at(-1).answer.variantId, "B");
  f.db.data.roleAssignmentsTable = [];
  assert.equal((await invoke(f.routes, "POST /p/:shareToken/quiz", request(answerTask(a)))).statusCode, 400);
});

test("draft saves cannot change published quiz; republishing B invalidates only B and rejects its stale answer", async () => {
  const f = quizFixture(publishedQuizData());
  const a = (await invoke(f.routes, "GET /p/:shareToken/quiz", quizQuery("A"))).body;
  const b = (await invoke(f.routes, "GET /p/:shareToken/quiz", quizQuery("B"))).body;
  const piece = f.db.data.setPiecesTable[0];
  piece.boardData.variants[1].teamSignal = "Two arms";
  assert.equal((await invoke(f.routes, "GET /p/:shareToken/quiz", quizQuery("B"))).body.contentVersion, b.contentVersion);
  piece.boardData.publishedContent = variantContent.publishContent(piece, f.db.data.setPieceRolesTable);
  assert.equal((await invoke(f.routes, "GET /p/:shareToken/quiz", quizQuery("A"))).body.contentVersion, a.contentVersion);
  assert.notEqual((await invoke(f.routes, "GET /p/:shareToken/quiz", quizQuery("B"))).body.contentVersion, b.contentVersion);
  assert.equal((await invoke(f.routes, "POST /p/:shareToken/quiz", request(answerTask(b)))).statusCode, 409);
  f.db.data.setPieceRolesTable = [];
  assert.equal((await invoke(f.routes, "POST /p/:shareToken/quiz", request(answerTask(a)))).statusCode, 400);
});

test("trainer readiness requires each published mandatory role/variant, ignores legacy passed, and reopens only changed B", async () => {
  const data = publishedQuizData();
  data.playerReadinessTable = [{ id: "old", playerId: "player", setPieceId: "piece", roleId: "own-role", status: "passed" }];
  const piece = data.setPiecesTable[0], role = data.setPieceRolesTable[0];
  const content = variantContent.playerContent(piece, [role]);
  const a = variantContent.variantTask(content.piece, role, "A"), b = variantContent.variantTask(content.piece, role, "B");
  const attempt = task => ({ playerId: "player", setPieceId: "piece", roleId: role.id, passed: true, completedAt: new Date(), answers: [variantContent.taskScopeAnswer(task, "passed")] });
  data.quizAttemptsTable = [attempt(a)];
  const f = readinessFixture(data);
  let res = await invoke(f.routes, "GET /teams/:teamId/readiness", request());
  assert.equal(res.body.summary.passed, 0);
  assert.deepEqual(Array.from(res.body.players[0].readiness, r => r.status), ["passed", "not_opened"]);
  f.db.data.quizAttemptsTable.push(attempt(b));
  assert.equal((await invoke(f.routes, "GET /teams/:teamId/readiness", request())).body.summary.passed, 1);
  const stored = f.db.data.setPiecesTable[0];
  stored.boardData.variants[1].teamSignal = "Changed";
  stored.boardData.publishedContent = variantContent.publishContent(stored, f.db.data.setPieceRolesTable);
  res = await invoke(f.routes, "GET /teams/:teamId/readiness", request());
  assert.deepEqual(Array.from(res.body.players[0].readiness, r => r.status), ["passed", "not_opened"]);
  assert.ok(f.db.calls.every(call => call.action === "select"));
});

function sharingFixture(initial) {
  const db = database(initial), h = harness();
  load("artifacts/api-server/src/routes/sharing.ts", {
    express: h.express, "@workspace/db": { db, ...schema }, "drizzle-orm": orm, crypto, "zod/v4": require("zod/v4"),
    "../lib/variantContent": variantContent, "../lib/entitlements": {},
    "../lib/authorization": { async requireShareToken() { return { teamId: "team", playerScope: ["player"] }; }, async isSetPieceInShareScope() { return true; } },
  });
  return { db, ...h };
}
test("player projection offers separate frozen tasks and confirmation checks role, variant and version", async () => {
  const f = sharingFixture(publishedQuizData());
  f.db.data.setPiecesTable[0].boardData.variants[1].teamSignal = "Unpublished";
  const res = await invoke(f.routes, "GET /p/:shareToken/player/:playerId", request({}, { params: { playerId: "player" } }));
  const piece = res.body.setPieces[0];
  assert.equal(piece.tasks.length, 2);
  assert.equal(piece.boardData.activeVariantId, "A");
  assert.equal(piece.tasks[1].boardData.teamSignal, "One arm");
  const a = piece.tasks[0];
  const body = { playerId: "player", setPieceId: "piece", roleId: a.roleId, variantId: a.variantId, contentVersion: a.contentVersion };
  assert.equal((await invoke(f.routes, "POST /p/:shareToken/ready", request({ ...body, variantId: "outside" }))).statusCode, 400);
  assert.equal((await invoke(f.routes, "POST /p/:shareToken/ready", request({ ...body, contentVersion: "forged" }))).statusCode, 409);
  assert.equal((await invoke(f.routes, "POST /p/:shareToken/ready", request({ ...body, roleId: "other-role" }))).statusCode, 400);
  const opened = await invoke(f.routes, "POST /p/:shareToken/ready", request(body));
  assert.equal(opened.body.status, "opened");
  assert.equal(f.db.data.playerReadinessTable.length, 0);
  const after = await invoke(f.routes, "GET /p/:shareToken/player/:playerId", request({}, { params: { playerId: "player" } }));
  assert.deepEqual(Array.from(after.body.setPieces[0].tasks, t => t.status), ["opened", "not_opened"]);
  assert.equal(after.body.setPieces[0].readiness.status, "not_opened");
});

function publishingFixture(initial) {
  const db = database(initial), h = harness();
  load("artifacts/api-server/src/routes/setPieces.ts", {
    express: h.express, "@workspace/db": { db, ...schema }, "drizzle-orm": orm, "zod/v4": require("zod/v4"),
    "../lib/variantContent": variantContent, "../lib/entitlements": { async checkEntitlement() { return true; } }, "../lib/roleSuitability": {},
    "../lib/authorization": { async requireCoachAccess() { return "team"; }, async requireHeadCoachAccess() { return "team"; }, parseParam: value => value },
  });
  return { db, ...h };
}
const pieceRequest = body => request(body, { params: { setPieceId: "piece" }, user: { id: "coach" } });
test("publication and autosave serialize under row lock and forged or stale client snapshots never replace publication", async () => {
  const f = publishingFixture(publishedQuizData());
  const oldBoard = structuredClone(f.db.data.setPiecesTable[0].boardData);
  f.db.data.setPiecesTable[0].boardData.variants[1].teamSignal = "New published signal";
  const [published, saved] = await Promise.all([
    invoke(f.routes, "PATCH /teams/:teamId/set-pieces/:setPieceId/status", pieceRequest({ status: "ready", requiredVariantIds: ["B"] })),
    invoke(f.routes, "PATCH /teams/:teamId/set-pieces/:setPieceId", pieceRequest({ boardData: { ...oldBoard, publishedContent: { version: "forged" } } })),
  ]);
  assert.equal(published.statusCode, 200); assert.equal(saved.statusCode, 200);
  const final = f.db.data.setPiecesTable[0].boardData;
  assert.equal(final.variants[1].teamSignal, "One arm", "autosave remains a draft edit");
  assert.equal(final.publishedContent.boardData.variants[1].teamSignal, "New published signal");
  assert.deepEqual(Array.from(final.publishedContent.requiredVariantIds), ["B"]);
  assert.equal(f.db.calls.filter(c => c.action === "lock" && c.table === "setPiecesTable").length, 2);
  const invalid = await invoke(f.routes, "PATCH /teams/:teamId/set-pieces/:setPieceId/status", pieceRequest({ status: "ready", requiredVariantIds: ["outside"] }));
  assert.equal(invalid.statusCode, 400);
});


for (const legacyStatus of ["ready", "active_matchday"]) test(`first V2 autosave preserves ${legacyStatus} legacy board, quiz and readiness until explicit publication`, async () => {
  const data = quizData();
  data.setPiecesTable[0].status = legacyStatus;
  data.setPiecesTable[0].boardData = { annotations: [], entities: [], legacyMarker: "shared content" };
  data.playerReadinessTable = [{ id: "done", playerId: "player", setPieceId: "piece", roleId: "own-role", status: "passed" }];
  const f = publishingFixture(data);
  const upgraded = publishedQuizData().setPiecesTable[0].boardData;
  const save = await invoke(f.routes, "PATCH /teams/:teamId/set-pieces/:setPieceId", pieceRequest({ boardData: upgraded }));
  assert.equal(save.statusCode, 200);
  const stored = f.db.data.setPiecesTable[0];
  assert.equal(stored.boardData.schemaVersion, 2);
  assert.equal(stored.boardData.publishedContent.boardData.schemaVersion, undefined);
  assert.equal(stored.boardData.publishedContent.boardData.legacyMarker, "shared content");
  const playerFixture = sharingFixture(f.db.data);
  const player = await invoke(playerFixture.routes, "GET /p/:shareToken/player/:playerId", request({}, { params: { playerId: "player" } }));
  assert.equal(player.body.setPieces[0].boardData.legacyMarker, "shared content");
  assert.equal(player.body.setPieces[0].tasks, undefined);
  assert.equal(player.body.setPieces[0].readiness.status, "passed");
  const quiz = quizFixture(f.db.data);
  const response = await invoke(quiz.routes, "POST /p/:shareToken/quiz", request({ playerId: "player", setPieceId: "piece", roleId: "own-role", answers: [{ questionId: "q1_start_zone", answer: { x: 10, y: 20 } }, { questionId: "q3_understand", answer: true }] }));
  assert.equal(response.body.passed, true);
  const ready = readinessFixture(f.db.data);
  assert.equal((await invoke(ready.routes, "GET /teams/:teamId/readiness", request())).body.summary.passed, 1);
  await invoke(f.routes, "PATCH /teams/:teamId/set-pieces/:setPieceId/status", pieceRequest({ status: "ready" }));
  assert.equal(f.db.data.setPiecesTable[0].boardData.publishedContent.boardData.schemaVersion, 2);
});

test("set-piece clone strips publication and remaps every variant's role tasks, phase positions and annotation references", async () => {
  const data = publishedQuizData();
  for (const v of data.setPiecesTable[0].boardData.variants) {
    v.roleTasks = { "own-role": { description: "Run" } };
    v.annotations = [{ id: "line", linkedRoleId: "own-role", snappedStartRef: "own-role", snappedEndRef: "ball" }];
  }
  const source = structuredClone(data.setPiecesTable[0].boardData);
  const f = publishingFixture(data);
  const result = await invoke(f.routes, "POST /teams/:teamId/set-pieces/:setPieceId/clone", pieceRequest({}));
  assert.equal(result.statusCode, 201);
  const cloned = result.body, newRole = cloned.roles.find(role => role.name === "Near post");
  assert.notEqual(newRole.id, "own-role");
  assert.equal(cloned.boardData.publishedContent, undefined);
  assert.equal(cloned.status, "draft");
  for (const variant of cloned.boardData.variants) {
    assert.equal(variant.roleTasks[newRole.id].description, "Run");
    assert.equal(variant.roleTasks["own-role"], undefined);
    assert.ok(variant.stepPositions.phase[newRole.id]);
    assert.equal(variant.stepPositions.phase["own-role"], undefined);
    assert.equal(variant.annotations[0].linkedRoleId, newRole.id);
    assert.equal(variant.annotations[0].snappedStartRef, newRole.id);
    assert.equal(variant.annotations[0].snappedEndRef, "ball");
  }
  assert.deepEqual(f.db.data.setPiecesTable[0].boardData, source);
});

function matchdayFixture(initial) {
  const db = database(initial), h = harness();
  load("artifacts/api-server/src/routes/matchdays.ts", {
    express: h.express, "@workspace/db": { db, ...schema }, "drizzle-orm": orm, "zod/v4": require("zod/v4"),
    "../lib/entitlements": {}, "../lib/roleSuitability": {},
    "../lib/authorization": { async requireCoachAccess() { return "team"; }, parseParam: value => value },
  });
  return { db, ...h };
}
const matchdayRequest = () => request({ setPieceId: "piece" }, { params: { matchdayId: "match" } });

test("matchday membership preserves published content and cannot implicitly republish drafts or archives", async () => {
  for (const status of ["ready", "active_matchday", "draft", "archived"]) {
    const data = publishedQuizData();
    data.matchdaysTable = [{ id: "match", teamId: "team" }];
    data.setPiecesTable[0].status = status;
    const snapshot = structuredClone(data.setPiecesTable[0].boardData.publishedContent);
    data.setPiecesTable[0].boardData.variants[0].teamSignal = "Unpublished edit";
    const f = matchdayFixture(data);
    assert.equal((await invoke(f.routes, "POST /teams/:teamId/matchdays/:matchdayId/set-pieces", matchdayRequest())).statusCode, 201);
    assert.equal(f.db.data.setPiecesTable[0].status, status === "ready" ? "active_matchday" : status);
    assert.deepEqual(f.db.data.setPiecesTable[0].boardData.publishedContent, snapshot);
    assert.equal((await invoke(f.routes, "DELETE /teams/:teamId/matchdays/:matchdayId/set-pieces", matchdayRequest())).statusCode, 204);
    assert.equal(f.db.data.setPiecesTable[0].status, ["ready", "active_matchday"].includes(status) ? "ready" : status);
    assert.equal(f.db.calls.filter(call => call.action === "lock").length, 2);
  }
});

test("matchday removal requires same-team membership and retains activation in other matchdays", async () => {
  for (const scenario of ["foreign", "missing", "other-matchday"]) {
    const data = publishedQuizData();
    data.matchdaysTable = [{ id: "match", teamId: "team" }];
    data.setPiecesTable[0].status = "active_matchday";
    if (scenario === "foreign") data.setPiecesTable[0].teamId = "other-team";
    if (scenario === "other-matchday") data.matchdaySetPiecesTable = [
      { matchdayId: "match", setPieceId: "piece" }, { matchdayId: "another", setPieceId: "piece" },
    ];
    const f = matchdayFixture(data);
    const res = await invoke(f.routes, "DELETE /teams/:teamId/matchdays/:matchdayId/set-pieces", matchdayRequest());
    assert.equal(res.statusCode, scenario === "foreign" ? 404 : 204);
    assert.equal(f.db.data.setPiecesTable[0].status, "active_matchday");
    assert.equal(f.db.calls.some(call => call.action === "update"), false);
  }
});
