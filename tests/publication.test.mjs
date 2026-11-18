import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { generateKeyPair, exportPKCS8 } from "jose";
import { readFile } from "node:fs/promises";
import { createGitHubStore } from "../worker/github-store.mjs";
import { publicCatalog } from "../lib/content.mjs";
const stringify = value => JSON.stringify(value, null, 2) + "\n";
const sha = bytes => createHash("sha1").update(`blob ${Buffer.byteLength(bytes)}\0`).update(bytes).digest("hex");
const { privateKey } = await generateKeyPair("RS256", { extractable: true });
const env = { GITHUB_OWNER: "owner", GITHUB_REPO: "portfolio", GITHUB_APP_CLIENT_ID: "app", GITHUB_APP_INSTALLATION_ID: "1", GITHUB_APP_PRIVATE_KEY: await exportPKCS8(privateKey) };
function provider(catalog) {
  const publicFiles = new Map([["content/catalog.json", stringify(publicCatalog(catalog))], ["assets/documents/r-barela-bio-resume.pdf", "existing PDF"]]);
  const blobs = new Map(), commits = new Map(), trees = new Map(), requests = [];
  let seq = 1, head = "a".repeat(40), loseResponse = false, conflict = false, truncated = false;
  const id = () => (++seq).toString(16).padStart(40, "0");
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  async function fetch(url, init = {}) {
    const u = new URL(url), method = init.method || "GET", body = init.body ? JSON.parse(init.body) : null;
    requests.push({ path: u.pathname, method, body });
    if (u.pathname.endsWith("access_tokens")) return json({ token: "test-only-token" });
    const files = publicFiles;
    assert(u.pathname.startsWith("/repos/owner/portfolio/"));
    const path = u.pathname.replace("/repos/owner/portfolio", "");
    if (path.startsWith("/contents/")) {
      const name = decodeURIComponent(path.slice(10)), current = files.get(name);
      if (method === "PUT") {
        if ((body.sha || undefined) !== (current == null ? undefined : sha(current))) return json({}, 409);
        const bytes = Buffer.from(body.content, "base64"); files.set(name, bytes);
        return json({ content: { sha: sha(bytes) }, commit: { sha: id() } });
      }
      if (current == null) return json({}, 404);
      if (init.headers.accept === "application/vnd.github.raw+json") return new Response(current);
      return json({ encoding: "base64", content: Buffer.from(current).toString("base64"), sha: sha(current) });
    }
    if (path.startsWith("/git/ref/")) return json({ object: { sha: head } });
    if (path.startsWith("/git/commits/")) return json({ tree: { sha: "b".repeat(40) } });
    if (path.startsWith("/git/trees/")) return json({ truncated, tree: [...publicFiles.keys()].map(path => ({ path, type: "blob" })) });
    if (path === "/git/blobs") { const bytes = Buffer.from(body.content, body.encoding === "utf-8" ? "utf8" : "base64"), key = sha(bytes); blobs.set(key, bytes); return json({ sha: key }); }
    if (path === "/git/trees") { const key = id(); trees.set(key, body.tree); return json({ sha: key }); }
    if (path === "/git/commits") { const key = id(); commits.set(key, body); return json({ sha: key }); }
    if (path.startsWith("/git/refs/") && method === "PATCH") {
      if (conflict) { conflict = false; head = id(); return json({}, 422); }
      const commit = commits.get(body.sha);
      if (commit.parents[0] !== head || body.force !== false) return json({}, 422);
      for (const entry of trees.get(commit.tree)) publicFiles.set(entry.path, entry.content ?? blobs.get(entry.sha));
      head = body.sha;
      if (loseResponse) { loseResponse = false; throw new Error("Simulated lost response after public ref advance"); }
      return json({ object: { sha: head } });
    }
    throw new Error(`Unexpected test request ${method} ${path}`);
  }
  return { fetch, publicFiles, requests, loseNextResponse() { loseResponse = true; }, conflictNextPublish() { conflict = true; }, truncateInventory() { truncated = true; } };
}
async function fixture(t) {
  const catalog = JSON.parse(await readFile("tests/fixtures/catalog.json"));
  Object.assign(catalog, { demo: false, entries: [] });
  Object.assign(catalog.profile, { portrait: "", bio: "A public biography.", email: "artist@example.com", url: "https://rbarela.com" });
  const mock = provider(catalog); t.mock.method(globalThis, "fetch", mock.fetch);
  const store = await createGitHubStore(env);
  return { catalog, mock, store };
}
test("same-repository save retains drafts and uploads; publication atomically updates the public catalog and draft baseline", async t => {
  const { catalog, mock, store } = await fixture(t);
  const visible = `/assets/media/${"c".repeat(64)}.jpg`, hidden = `/assets/media/${"d".repeat(64)}.jpg`;
  await store.upload(visible, new Uint8Array([1, 2, 3]));
  await store.upload(hidden, new Uint8Array([4, 5, 6]));
  const initial = await store.load();
  catalog.profile.bio = [{ type: "image", src: visible, alt: "Published photo" }];
  catalog.entries = [{ id: "draft-note", kind: "post", slug: "draft-note", status: "draft", title: "Unpublished draft", intro: "", year: 2026, role: "", credits: "", sample: false, date: "2026-11-17", categories: [], tags: [], cover: { src: hidden, alt: "Unpublished image" }, blocks: [{ type: "text", body: "Draft words" }] }];
  const draft = await store.save(catalog, initial.revision, initial.publishedRevision);
  assert(mock.publicFiles.has(visible.slice(1)));
  assert(mock.publicFiles.has(hidden.slice(1)));
  assert.match(mock.publicFiles.get("_editor/catalog.json").toString(), /Unpublished draft/);
  assert(!mock.publicFiles.get("content/catalog.json").toString().includes("Published photo"));
  const result = await store.publish(draft.revision, draft.publishedRevision);
  assert.match(mock.publicFiles.get("content/catalog.json").toString(), /Published photo/);
  assert(!mock.publicFiles.get("content/catalog.json").toString().includes("Unpublished draft"));
  const state = await store.load();
  assert.equal(state.conflict, false);
  assert.equal(state.publishedRevision, result.publishedRevision);
  assert.equal(state.revision, result.revision);
  assert.equal(state.catalog.entries[0].title, "Unpublished draft");
  const updates = mock.requests.filter(r => r.method === "PATCH");
  assert.equal(updates.length, 1);
  assert.equal(updates[0].body.force, false);
  await store.save({ ...catalog, profile: { ...catalog.profile, intro: "A later draft" } }, state.revision, state.publishedRevision);
});
test("a lost publication response leaves the published file and draft baseline consistent on reload", async t => {
  const { catalog, mock, store } = await fixture(t);
  const initial = await store.load(); catalog.profile.bio = "The next biography.";
  const draft = await store.save(catalog, initial.revision, initial.publishedRevision);
  mock.loseNextResponse();
  await assert.rejects(store.publish(draft.revision, draft.publishedRevision), e => e.status === 502);
  const reloaded = await store.load();
  assert.equal(reloaded.conflict, false);
  assert.equal(reloaded.publishedRevision, sha(mock.publicFiles.get("content/catalog.json")));
  assert.equal(reloaded.catalog.profile.bio, "The next biography.");
  await assert.rejects(store.publish(draft.revision, draft.publishedRevision), e => e.status === 409);
});
test("a concurrent branch advance preserves both catalogs and allows a fresh retry", async t => {
  const { catalog, mock, store } = await fixture(t);
  const initial = await store.load(); catalog.profile.bio = "The next biography.";
  const draft = await store.save(catalog, initial.revision, initial.publishedRevision);
  const before = mock.publicFiles.get("content/catalog.json");
  mock.conflictNextPublish();
  await assert.rejects(store.publish(draft.revision, draft.publishedRevision), e => e.status === 409);
  const pending = await store.load();
  assert.equal(mock.publicFiles.get("content/catalog.json"), before);
  assert.equal(pending.catalog.profile.bio, "The next biography.");
  assert.equal(pending.conflict, false);
  await store.publish(pending.revision, pending.publishedRevision);
  assert.equal((await store.load()).conflict, false);
});

test("a media-heavy portfolio publishes within a bounded request budget and rejects an incomplete inventory", async t => {
  const { catalog, mock, store } = await fixture(t);
  const images = Array.from({ length: 200 }, (_, i) => {
    const src = `/assets/media/${i.toString(16).padStart(64, "0")}.jpg`;
    mock.publicFiles.set(src.slice(1), "existing image");
    return { src, alt: `Photo ${i}` };
  });
  catalog.profile.bio = Array.from({ length: 10 }, (_, i) => ({ type: "gallery", layout: "grid", images: images.slice(i * 20, (i + 1) * 20) }));
  const initial = await store.load();
  const draft = await store.save(catalog, initial.revision, initial.publishedRevision);
  const before = mock.requests.length;
  await store.publish(draft.revision, draft.publishedRevision);
  assert(mock.requests.length - before < 20);
  const state = await store.load();
  mock.truncateInventory();
  const writesBefore = mock.requests.filter(r => r.method !== "GET").length;
  await assert.rejects(store.publish(state.revision, state.publishedRevision), /inventory is incomplete/);
  assert.equal(mock.requests.filter(r => r.method !== "GET").length, writesBefore);
});
