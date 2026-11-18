import { normalizeEmail, randomToken, sha256Hex } from "../shared/dust-wave-platform/packages/worker-core/src/crypto.js";
import { prepareResendEmail } from "../shared/dust-wave-platform/packages/worker-core/src/email.js";
import { readJsonObject } from "../shared/dust-wave-platform/packages/worker-core/src/request-validation.js";
import { ContentError } from "../lib/content.mjs";

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const MINUTE = 60_000;
const generic = { message: "If this address has editor access, a sign-in link is on its way. Check your email." };
const approved = (env, email) => String(env.EDITOR_EMAILS || "").split(",").map(normalizeEmail).includes(email);
function configured(env) {
  if (!env.DB || !env.EDITOR_EMAILS) throw new ContentError("Editor sign-in is not configured.", 503);
}
async function rateLimit(env, key, maximum, now) {
  const interval = 60 * MINUTE, bucket = Math.floor(now / interval);
  const hash = await sha256Hex(`${key}:${bucket}`);
  const row = await env.DB.prepare(`INSERT INTO editor_rate_limits (key,count,expires_at) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`).bind(hash, (bucket + 1) * interval).first();
  if (row.count > maximum) throw new ContentError("Too many attempts. Please try again later.", 429);
}
async function bodyOf(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ContentError("Use application/json.", 415);
  return readJsonObject(request, 2048);
}
export async function authorize(request, env, now = Date.now()) {
  configured(env);
  const value = request.headers.get("authorization") || "";
  if (!value.startsWith("Bearer ") || !TOKEN.test(value.slice(7))) throw new ContentError("Sign in to edit this portfolio.", 401);
  const hash = await sha256Hex(value.slice(7));
  const session = await env.DB.prepare("SELECT email FROM editor_tokens WHERE hash=? AND kind='session' AND expires_at>?").bind(hash, now).first();
  if (!session || !approved(env, session.email)) throw new ContentError("Your session expired. Sign in again; your recovery copy is preserved.", 401);
  return session.email;
}
export async function handleAuth(request, env, now = Date.now()) {
  configured(env);
  const path = new URL(request.url).pathname;
  if (request.method !== "POST") throw new ContentError("Method not allowed.", 405);
  if (path === "/api/auth/logout") {
    await authorize(request, env, now);
    await env.DB.prepare("DELETE FROM editor_tokens WHERE hash=?").bind(await sha256Hex(request.headers.get("authorization").slice(7))).run();
    return { ok: true };
  }
  if (!["/api/auth/login", "/api/auth/verify"].includes(path)) throw new ContentError("Not found.", 404);
  await rateLimit(env, `ip:${request.headers.get("cf-connecting-ip") || "unknown"}`, 30, now);
  const input = await bodyOf(request);
  if (path === "/api/auth/login") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new ContentError("Email sign-in is not configured.", 503);
    const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
    if (email.length > 254 || !/^[^\s@<>\x00-\x1f]+@[^\s@<>\x00-\x1f]+\.[^\s@<>\x00-\x1f]+$/.test(email)) throw new ContentError("Enter a valid email address.");
    await rateLimit(env, `email:${email}`, 3, now);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM editor_tokens WHERE expires_at<?").bind(now),
      env.DB.prepare("DELETE FROM editor_rate_limits WHERE expires_at<?").bind(now),
    ]);
    if (!approved(env, email)) return generic;
    const token = randomToken(), hash = await sha256Hex(token);
    await env.DB.prepare("INSERT INTO editor_tokens (hash,kind,email,expires_at) VALUES (?,'link',?,?)").bind(hash, email, now + 15 * MINUTE).run();
    const link = `${env.ADMIN_ORIGIN}/admin/#token=${token}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": `portfolio-login/${hash}` },
      body: JSON.stringify(prepareResendEmail({ from: env.EMAIL_FROM, to: [email], subject: "Sign in to the R. Barela editor", text: `Open this link to sign in to your portfolio editor:\n\n${link}\n\nThis link works once and expires in 15 minutes. If you did not request it, you can ignore this email.` })),
      signal: AbortSignal.timeout(15000),
    });
    await response.body?.cancel();
    if (!response.ok) {
      await env.DB.prepare("DELETE FROM editor_tokens WHERE hash=?").bind(hash).run();
      throw new ContentError("The sign-in email could not be sent. Please try again later.", 503);
    }
    return generic;
  }
  if (typeof input.token !== "string" || !TOKEN.test(input.token)) throw new ContentError("This sign-in link is invalid or expired.", 401);
  const hash = await sha256Hex(input.token);
  const source = await env.DB.prepare("SELECT email FROM editor_tokens WHERE hash=? AND kind='link' AND consumed_by IS NULL AND expires_at>?").bind(hash, now).first();
  if (!source || !approved(env, source.email)) throw new ContentError("This sign-in link was used or expired. Request a new link.", 401);
  const accessToken = randomToken(), sessionHash = await sha256Hex(accessToken), expiresAt = now + 8 * 60 * MINUTE;
  // D1 batches are transactional. A concurrent exchange can consume this link only once.
  await env.DB.batch([
    env.DB.prepare("UPDATE editor_tokens SET consumed_by=? WHERE hash=? AND kind='link' AND consumed_by IS NULL AND expires_at>?").bind(sessionHash, hash, now),
    env.DB.prepare("INSERT INTO editor_tokens (hash,kind,email,expires_at) SELECT ?,'session',email,? FROM editor_tokens WHERE hash=? AND consumed_by=?").bind(sessionHash, expiresAt, hash, sessionHash),
  ]);
  if (!await env.DB.prepare("SELECT hash FROM editor_tokens WHERE hash=?").bind(sessionHash).first()) throw new ContentError("This sign-in link was already used.", 401);
  return { accessToken, expiresAt, email: source.email };
}
