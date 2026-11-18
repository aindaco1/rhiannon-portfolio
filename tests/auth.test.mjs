import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { authorize, handleAuth } from "../worker/auth.mjs";
import worker from "../worker/index.mjs";
import { database } from "./helpers/d1.mjs";
import { sha256Hex } from "../shared/dust-wave-platform/packages/worker-core/src/crypto.js";
const origin = "https://rbarela.com";
const req = (path, body, token, overrides = {}) => new Request("https://test.workers.dev/api/" + path, { method: body ? "POST" : "GET", headers: { origin, "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...overrides }, ...(body ? { body: JSON.stringify(body) } : {}) });
const config = JSON.parse(await readFile("worker/wrangler.jsonc"));
const envFor = () => ({ ...config.vars, DB: database(), RESEND_API_KEY: "test-only-key", EMAIL_FROM: "Test <test@example.com>" });
test("approved editors use one-time hashed email links and expiring/revocable sessions", async t => {
  const env = envFor(), emails = [], now = Date.now();
  t.mock.method(globalThis, "fetch", async (url, init) => { assert.equal(url, "https://api.resend.com/emails"); emails.push(JSON.parse(init.body)); return new Response("{}", { status: 200 }); });
  for (const email of config.vars.EDITOR_EMAILS.split(",")) {
    const result = await handleAuth(req("auth/login", { email: email.toUpperCase() }), env, now);
    assert.match(result.message, /If this address/);
    const text = emails.at(-1).text, link = text.match(/https:\/\/\S+/)[0];
    assert.equal(new URL(link).origin, origin);
    assert.equal(new URL(link).pathname, "/admin/");
    const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token");
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) n FROM editor_tokens WHERE hash=?").get(token).n, 0);
    const session = await handleAuth(req("auth/verify", { token }), env, now);
    assert.equal(await authorize(req("state", null, session.accessToken), env, now), email);
    await assert.rejects(handleAuth(req("auth/verify", { token }), env, now), /used or expired/);
    await assert.rejects(authorize(req("state", null, token), env, now), /expired/);
    await assert.rejects(authorize(req("state", null, session.accessToken), env, session.expiresAt), /expired/);
    await assert.rejects(authorize(req("state", null, session.accessToken), { ...env, EDITOR_EMAILS: "someone@example.com" }, now), /expired/);
    await handleAuth(req("auth/logout", {}, session.accessToken), env, now);
    await assert.rejects(authorize(req("state", null, session.accessToken), env, now), /expired/);
  }
  const count = emails.length;
  await handleAuth(req("auth/login", { email: "stranger@example.com" }), env, now);
  assert.equal(emails.length, count);
});
test("expired links, simultaneous exchanges, rate limits and mail failures fail safely", async t => {
  const env = envFor(), now = Date.now(), email = config.vars.EDITOR_EMAILS.split(",")[0], token = "a".repeat(43), hash = await sha256Hex(token);
  env.DB.sqlite.prepare("INSERT INTO editor_tokens VALUES (?,'link',?,?,NULL)").run(hash, email, now);
  await assert.rejects(handleAuth(req("auth/verify", { token }), env, now), /expired/);
  env.DB.sqlite.prepare("UPDATE editor_tokens SET expires_at=? WHERE hash=?").run(now + 5000, hash);
  const results = await Promise.allSettled([handleAuth(req("auth/verify", { token }), env, now), handleAuth(req("auth/verify", { token }), env, now)]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.find(r => r.status === "rejected").reason.status, 401);
  t.mock.method(globalThis, "fetch", async () => new Response("failed", { status: 503 }));
  for (let i = 0; i < 3; i++) await assert.rejects(handleAuth(req("auth/login", { email }), env, now), /could not be sent/);
  await assert.rejects(handleAuth(req("auth/login", { email }), env, now), e => e.status === 429);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) n FROM editor_tokens WHERE kind='link' AND consumed_by IS NULL").get().n, 0);
});
test("cross-origin preflight is allowed only for the configured editor; CORS never substitutes for a session", async () => {
  const env = envFor();
  const preflight = await worker.fetch(new Request("https://test.workers.dev/api/draft", { method: "OPTIONS", headers: { origin, "access-control-request-headers": "authorization,content-type" } }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  assert.equal(preflight.headers.get("access-control-allow-credentials"), null);
  for (const path of ["state", "draft", "publish", "preview"]) {
    const response = await worker.fetch(req(path, path === "state" ? null : {}), env);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
  }
  for (const path of ["/assets/media/a.jpg", "/assets/documents/test.pdf", "/assets/videos/test.mp4"]) assert.equal((await worker.fetch(new Request("https://test.workers.dev" + path, { headers: { origin } }), env)).status, 401);
  for (const other of ["https://evil.example", "https://www.rbarela.com", "null", ""]) {
    const response = await worker.fetch(req("state", null, null, { origin: other }), env);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
});
