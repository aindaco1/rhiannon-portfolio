import { SignJWT, importPKCS8 } from "jose";
import { createGitHubClient } from "../shared/dust-wave-platform/packages/worker-core/src/github.js";
import { readBoundedJson, readBoundedBytes } from "../shared/dust-wave-platform/packages/worker-core/src/response-body.js";
import {
  ContentError,
  publicCatalog,
  validateCatalog,
  mediaReferences,
  videoReferences,
  isVideoPath,
  MAX_VIDEO_BYTES,
  bioPdf,
  isPdfPath,
  PDF_DOWNLOAD_HEADERS,
} from "../lib/content.mjs";
import { videoResponse } from "../lib/video-response.mjs";
const livePath = "content/catalog.json",
  draftPath = "_editor/catalog.json";
const stringify = (value) => JSON.stringify(value, null, 2) + "\n";
const checked = (result) => {
  if (!result.ok)
    throw new ContentError(
      result.status === 409 || result.status === 422
        ? "The saved content changed. Your draft is preserved; reload before trying again."
        : "GitHub could not complete this operation.",
      result.status === 409 || result.status === 422 ? 409 : 502,
    );
  return result;
};
async function blobSha(text) {
  const bytes = new TextEncoder().encode(text),
    prefix = new TextEncoder().encode(`blob ${bytes.length}\0`),
    all = new Uint8Array(prefix.length + bytes.length);
  all.set(prefix);
  all.set(bytes, prefix.length);
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-1", all)),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function createGitHubStore(env) {
  for (const name of [
    "GITHUB_OWNER",
    "GITHUB_REPO",
    "GITHUB_DRAFT_REPO",
    "GITHUB_APP_CLIENT_ID",
    "GITHUB_APP_INSTALLATION_ID",
    "GITHUB_APP_PRIVATE_KEY",
  ])
    if (!env[name])
      throw new ContentError("Repository publishing is not configured.", 503);
  if (env.GITHUB_DRAFT_REPO === env.GITHUB_REPO) throw new ContentError("Draft storage must be a separate private repository.", 503);
  const issuer = env.GITHUB_APP_CLIENT_ID,
    now = Math.floor(Date.now() / 1000),
    key = await importPKCS8(env.GITHUB_APP_PRIVATE_KEY, "RS256");
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(issuer)
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 540)
    .sign(key);
  const auth = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(env.GITHUB_APP_INSTALLATION_ID)}/access_tokens`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${jwt}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "r-barela-portfolio",
      },
      body: JSON.stringify({
        repositories: [env.GITHUB_REPO, env.GITHUB_DRAFT_REPO],
        permissions: { contents: "write", actions: "read" },
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!auth.ok)
    throw new ContentError("Repository authorization is unavailable.", 503);
  const { token } = await readBoundedJson(auth, 64 * 1024);
  if (!token)
    throw new ContentError("Repository authorization is unavailable.", 503);
  const branch = env.GITHUB_BRANCH || "main",
    base = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "user-agent": "r-barela-portfolio",
    "x-github-api-version": "2022-11-28",
    "content-type": "application/json",
  };
  const privateBranch = env.GITHUB_DRAFT_BRANCH || "main";
  const privateBase = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_DRAFT_REPO)}`;
  async function github(root, path, { method = "GET", body } = {}) {
    const response = await fetch(root + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
    checked(response);
    return readBoundedJson(response, 16 * 1024 * 1024);
  }
  // Excluding files from Pages does not hide them from a public Git repository.
  if ((await github(privateBase, "")).private !== true) throw new ContentError("Draft storage must be private.", 503);
  const makeClient = (repo, ref) => createGitHubClient({ owner: env.GITHUB_OWNER, repo, ref, token, userAgent: "r-barela-portfolio", maxContentBytes: MAX_VIDEO_BYTES, maxResponseBytes: 16 * 1024 * 1024 });
  const client = makeClient(env.GITHUB_REPO, branch);
  const drafts = makeClient(env.GITHUB_DRAFT_REPO, privateBranch);
  const contents = (path, ref) => `/contents/${path.replace(/^\//, "")}?ref=${encodeURIComponent(ref)}`;
  const encodeBytes = (bytes) => {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(binary);
  };
  async function state() {
    const [live, draft] = await Promise.all([
      client.getTextFile(livePath),
      drafts.getTextFile(draftPath),
    ]);
    checked(live);
    if (!draft.ok && draft.status !== 404) checked(draft);
    const stored = draft.ok ? JSON.parse(draft.content) : null;
    return {
      catalog: stored?.catalog || JSON.parse(live.content),
      revision: draft.ok ? draft.sha : "none:" + live.sha,
      publishedRevision: stored?.pending?.catalogSha === live.sha ? live.sha : stored?.basePublishedRevision || live.sha,
      pending: stored?.pending,
      currentPublishedRevision: live.sha,
      mode: "github",
      live,
      draft,
    };
  }
  const snapshot = (s) => ({
    catalog: s.catalog,
    revision: s.revision,
    publishedRevision: s.publishedRevision,
    currentPublishedRevision: s.currentPublishedRevision,
    conflict: s.publishedRevision !== s.currentPublishedRevision,
    mode: s.mode,
    pendingPublication: s.pending && s.pending.catalogSha !== s.live.sha,
    publicationCommit: s.pending?.catalogSha === s.live.sha ? s.pending.commit : null,
  });
  const compare = (s, revision, published) => {
    if (
      revision !== s.revision ||
      published !== s.currentPublishedRevision ||
      s.publishedRevision !== s.currentPublishedRevision
    )
      throw new ContentError(
        "A newer version exists. Download your recovery copy and reconcile the changes before publishing.",
        409,
      );
  };
  return {
    load: async () => snapshot(await state()),
    save: async (catalog, revision, published) => {
      const s = await state();
      compare(s, revision, published);
      validateCatalog(catalog, { previous: s.catalog });
      if (s.pending && s.pending.catalogSha !== s.live.sha) throw new ContentError("A publication is pending. Reload, then retry Publish before saving new edits.", 409);
      const payload = stringify({ catalog, basePublishedRevision: published });
      const result = checked(
        await drafts.putTextFile(
          draftPath,
          payload,
          "Save portfolio draft",
          s.draft.ok ? s.draft.sha : undefined,
        ),
      );
      return {
        catalog,
        revision: result.contentSha,
        publishedRevision: published,
        mode: "github",
      };
    },
    publish: async (revision, published) => {
      const s = await state();
      compare(s, revision, published);
      if (!s.draft.ok)
        throw new ContentError("Save a draft before publishing.");
      const catalog = validateCatalog(s.catalog, { production: true });
      const content = stringify(publicCatalog(catalog)), nextPublished = await blobSha(content);
      if (s.pending?.catalogSha === s.live.sha) return { commit: s.pending.commit, status: "queued", revision: s.revision, publishedRevision: s.live.sha };
      if (nextPublished === published && !s.pending) return { status: "unchanged", revision, publishedRevision: published };
      const head = await github(base, `/git/ref/heads/${encodeURIComponent(branch)}`);
      const parent = head.object.sha;
      const commit = await github(base, `/git/commits/${parent}`);
      const live = checked(await client.getTextFile(livePath, parent));
      if (live.sha !== published) throw new ContentError("The published portfolio changed. Reload before publishing.", 409);
      const inventory = await github(base, `/git/trees/${commit.tree.sha}?recursive=1`);
      if (inventory.truncated || !Array.isArray(inventory.tree)) throw new ContentError("The public media inventory could not be read completely.", 502);
      const existingPaths = new Set(inventory.tree.filter(file => file.type === "blob").map(file => file.path));
      const tree = [];
      // Only copy media referenced by published content, never the whole private tree.
      for (const path of new Set([...mediaReferences(catalog, true), ...videoReferences(catalog, true), bioPdf(catalog.profile).src])) {
        if (existingPaths.has(path.slice(1))) continue;
        const source = await fetch(privateBase + contents(path, privateBranch), { headers: { ...headers, accept: "application/vnd.github.raw+json" }, signal: AbortSignal.timeout(30000) });
        if (source.status === 404) throw new ContentError("A referenced image, video or PDF is missing. Upload it again before publishing.");
        checked(source);
        const bytes = await readBoundedBytes(source, MAX_VIDEO_BYTES);
        const blob = await github(base, "/git/blobs", { method: "POST", body: { content: encodeBytes(bytes), encoding: "base64" } });
        tree.push({ path: path.slice(1), mode: "100644", type: "blob", sha: blob.sha });
      }
      tree.push({ path: livePath, mode: "100644", type: "blob", content });
      const nextTree = await github(base, "/git/trees", { method: "POST", body: { base_tree: commit.tree.sha, tree } });
      const nextCommit = await github(base, "/git/commits", { method: "POST", body: { message: "Publish portfolio changes", tree: nextTree.sha, parents: [parent] } });
      // Persist intent with a private compare-and-swap BEFORE advancing the public ref.
      // A lost response or interrupted final write is recoverable by comparing catalogSha.
      const draftContent = stringify({ catalog, basePublishedRevision: published, pending: { commit: nextCommit.sha, catalogSha: nextPublished } });
      const intent = checked(await drafts.putTextFile(draftPath, draftContent, "Prepare portfolio publication", revision));
      await github(base, `/git/refs/heads/${encodeURIComponent(branch)}`, { method: "PATCH", body: { sha: nextCommit.sha, force: false } });
      return { commit: nextCommit.sha, status: "queued", revision: intent.contentSha, publishedRevision: nextPublished };
    },
    upload: async (path, bytes) => {
      const result = await drafts.putBase64File(path.slice(1), encodeBytes(bytes), "Stage private portfolio media");
      if (!result.ok) {
        const existing = await fetch(privateBase + contents(path, privateBranch), { headers, signal: AbortSignal.timeout(15000) });
        await existing.body?.cancel();
        if (!existing.ok) checked(result);
      }
    },
    media: async (path, request) => {
      let response = await fetch(privateBase + contents(path, privateBranch), { headers: { ...headers, accept: "application/vnd.github.raw+json" }, signal: AbortSignal.timeout(30000) });
      if (response.status === 404) {
        await response.body?.cancel();
        response = await fetch(base + contents(path, branch), { headers: { ...headers, accept: "application/vnd.github.raw+json" }, signal: AbortSignal.timeout(30000) });
      }
      if (response.status === 404) return new Response("Not found", { status: 404 });
      checked(response);
      if (isVideoPath(path)) return videoResponse(await readBoundedBytes(response, MAX_VIDEO_BYTES), request);
      return new Response(response.body, { headers: isPdfPath(path) ? PDF_DOWNLOAD_HEADERS : { "content-type": path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg" } });
    },
    status: async (revision) => {
      if (!/^[a-f0-9]{40}$/.test(revision || ""))
        throw new ContentError("Invalid publication revision.");
      const response = await fetch(
        `${base}/actions/workflows/pages.yml/runs?head_sha=${revision}&per_page=10`,
        { headers, signal: AbortSignal.timeout(15000) },
      );
      if (!response.ok)
        throw new ContentError(
          "Publication status is temporarily unavailable.",
          502,
        );
      const body = await readBoundedJson(response, 2 * 1024 * 1024);
      const run = body.workflow_runs?.find((r) => r.head_sha === revision);
      return {
        commit: revision,
        status: !run
          ? "queued"
          : run.status === "completed"
            ? run.conclusion === "success"
              ? "live"
              : "failed"
            : "publishing",
        url: run?.html_url,
      };
    },
  };
}
