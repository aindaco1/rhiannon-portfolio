import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generateKeyPair, exportPKCS8, exportJWK, SignJWT } from "jose";
import { createGitHubStore } from "../worker/github-store.mjs";
import { authorize } from "../worker/index.mjs";
const seed = JSON.parse(
  await readFile(new URL("./fixtures/catalog.json", import.meta.url)),
);
const { privateKey, publicKey } = await generateKeyPair("RS256", {
  extractable: true,
});
const pem = await exportPKCS8(privateKey);
const env = {
  GITHUB_OWNER: "owner",
  GITHUB_REPO: "portfolio",
  GITHUB_APP_CLIENT_ID: "app",
  GITHUB_APP_INSTALLATION_ID: "1",
  GITHUB_APP_PRIVATE_KEY: pem,
};
const ok = (data) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
test("GitHub App tokens are repository-scoped; draft saves preserve expected SHA and baseline", async () => {
  const original = globalThis.fetch,
    calls = [];
  const published = "1".repeat(40),
    draft = "2".repeat(40);
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/access_tokens"))
      return ok({ token: "test-only-token" });
    if (init.method === "PUT")
      return ok({
        content: { sha: "3".repeat(40) },
        commit: { sha: "4".repeat(40) },
      });
    const isDraft = String(url).includes("_editor");
    return ok({
      sha: isDraft ? draft : published,
      encoding: "base64",
      content: Buffer.from(
        JSON.stringify(
          isDraft ? { catalog: seed, basePublishedRevision: published } : seed,
        ),
      ).toString("base64"),
    });
  };
  try {
    const store = await createGitHubStore(env);
    const state = await store.load();
    assert.equal(state.revision, draft);
    assert.equal(state.publishedRevision, published);
    const next = structuredClone(seed);
    next.profile.bio += " Changed.";
    const saved = await store.save(next, draft, published);
    assert.equal(saved.revision, "3".repeat(40));
    const tokenBody = JSON.parse(calls[0].init.body);
    assert.deepEqual(tokenBody.repositories, ["portfolio"]);
    assert.deepEqual(tokenBody.permissions, {
      contents: "write",
      actions: "read",
    });
    const put = JSON.parse(
      calls.find((c) => c.init.method === "PUT").init.body,
    );
    assert.equal(put.sha, draft);
    assert.equal(
      JSON.parse(Buffer.from(put.content, "base64")).basePublishedRevision,
      published,
    );
    await assert.rejects(store.save(next, "stale", published), /newer version/);
  } finally {
    globalThis.fetch = original;
  }
});
test("a changed live file does not silently rebase an existing working draft", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/access_tokens"))
      return ok({ token: "test-only-token" });
    const isDraft = String(url).includes("_editor");
    return ok({
      sha: isDraft ? "2".repeat(40) : "9".repeat(40),
      encoding: "base64",
      content: Buffer.from(
        JSON.stringify(
          isDraft
            ? { catalog: seed, basePublishedRevision: "1".repeat(40) }
            : seed,
        ),
      ).toString("base64"),
    });
  };
  try {
    const store = await createGitHubStore(env),
      state = await store.load();
    assert.equal(state.conflict, true);
    assert.equal(state.publishedRevision, "1".repeat(40));
    await assert.rejects(
      store.publish(state.revision, state.publishedRevision),
      /newer version/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("Cloudflare Access verifies signature, audience, expiry and the email allowlist", async () => {
  const original = globalThis.fetch,
    jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  jwk.alg = "RS256";
  globalThis.fetch = async () => ok({ keys: [jwk] });
  const access = {
    ADMIN_ORIGIN: "https://editor.example.com",
    ACCESS_TEAM_DOMAIN: "https://portfolio-test.cloudflareaccess.com",
    ACCESS_AUD: "portfolio-aud",
    EDITOR_EMAILS: "artist@example.com",
  };
  const token = async ({
    email = "artist@example.com",
    aud = "portfolio-aud",
    expires = "2m",
  } = {}) =>
    new SignJWT({ email })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(access.ACCESS_TEAM_DOMAIN)
      .setAudience(aud)
      .setIssuedAt()
      .setExpirationTime(expires)
      .sign(privateKey);
  const request = (jwt) =>
    new Request("https://editor.example.com/api/state", {
      headers: { "cf-access-jwt-assertion": jwt },
    });
  try {
    assert.equal(
      await authorize(request(await token()), access),
      "artist@example.com",
    );
    await assert.rejects(
      authorize(request(await token({ aud: "other" })), access),
      /invalid/,
    );
    await assert.rejects(
      authorize(request(await token({ expires: "-1m" })), access),
      /invalid/,
    );
    await assert.rejects(
      authorize(
        request(await token({ email: "stranger@example.com" })),
        access,
      ),
      /does not have/,
    );
    await assert.rejects(
      authorize(new Request("https://alternate.example.com/api/state"), access),
      /origin/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("GitHub publication rejects a missing PDF and protected downloads retain PDF headers", async () => {
  const original = globalThis.fetch;
  const catalog = structuredClone(seed);
  catalog.demo = false;
  catalog.entries = [];
  catalog.profile.portrait = "";
  catalog.profile.email = "artist@example.com";
  catalog.profile.url = "https://portfolio.example.com";
  const path = `/assets/documents/${"a".repeat(64)}.pdf`;
  catalog.profile.bioPdf = { src: path, name: "Updated résumé.pdf" };
  const bytes = await readFile("assets/documents/r-barela-bio-resume.pdf");
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/access_tokens")) return ok({ token: "test-only-token" });
    if (String(url).includes("assets/documents/"))
      return init.headers.accept === "application/vnd.github.raw+json"
        ? new Response(bytes)
        : new Response("Missing", { status: 404 });
    const draft = String(url).includes("_editor");
    return ok({
      sha: (draft ? "2" : "1").repeat(40), encoding: "base64",
      content: Buffer.from(JSON.stringify(draft ? { catalog, basePublishedRevision: "1".repeat(40) } : catalog)).toString("base64"),
    });
  };
  try {
    const store = await createGitHubStore(env);
    await assert.rejects(store.publish("2".repeat(40), "1".repeat(40)), /image, video or PDF is missing/);
    assert(calls.some((call) => call.url.includes(path.slice(1))));
    assert(!calls.some((call) => ["PUT", "PATCH"].includes(call.init.method)));
    const file = await store.media(path);
    assert.equal(file.headers.get("content-type"), "application/pdf");
    assert.match(file.headers.get("content-disposition"), /^attachment;/);
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), bytes);
  } finally {
    globalThis.fetch = original;
  }
});

test('GitHub publication checks local videos and protected video previews serve ranges', async () => {
  const original = globalThis.fetch;
  const catalog = structuredClone(seed);
  Object.assign(catalog, { demo: false, entries: [] });
  Object.assign(catalog.profile, { portrait: '', email: 'artist@example.com', url: 'https://portfolio.example' });
  const path = `/assets/videos/${'a'.repeat(64)}.mp4`;
  catalog.profile.bio = [{ type: 'video', provider: 'local', src: path }];
  const bytes = await readFile('tests/fixtures/loop.mp4');
  let writes = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (['PUT', 'PATCH', 'POST'].includes(init.method) && !String(url).includes('/access_tokens')) writes++;
    if (String(url).includes('/access_tokens')) return ok({ token: 'test-only-token' });
    if (String(url).includes('assets/videos/')) return init.headers.accept === 'application/vnd.github.raw+json' ? new Response(bytes) : new Response('Missing', { status: 404 });
    const draft = String(url).includes('_editor');
    return ok({ sha: (draft ? '2' : '1').repeat(40), encoding: 'base64', content: Buffer.from(JSON.stringify(draft ? { catalog, basePublishedRevision: '1'.repeat(40) } : catalog)).toString('base64') });
  };
  try {
    const store = await createGitHubStore(env);
    await assert.rejects(store.publish('2'.repeat(40), '1'.repeat(40)), /video or PDF is missing/);
    assert.equal(writes, 0);
    const response = await store.media(path, new Request('https://editor.example' + path, { headers: { range: 'bytes=10-19' } }));
    assert.equal(response.status, 206);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(10,20));
  } finally { globalThis.fetch = original; }
});
