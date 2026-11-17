import { SignJWT, importPKCS8 } from "jose";
import { createGitHubClient } from "../shared/dust-wave-platform/packages/worker-core/src/github.js";
import { readBoundedJson } from "../shared/dust-wave-platform/packages/worker-core/src/response-body.js";
import {
  ContentError,
  publicCatalog,
  validateCatalog,
  mediaReferences,
} from "../lib/content.mjs";
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
    "GITHUB_APP_CLIENT_ID",
    "GITHUB_APP_INSTALLATION_ID",
    "GITHUB_APP_PRIVATE_KEY",
  ])
    if (!env[name])
      throw new ContentError("Repository publishing is not configured.", 503);
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
        repositories: [env.GITHUB_REPO],
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
  };
  const client = createGitHubClient({
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    ref: branch,
    token,
    userAgent: "r-barela-portfolio",
    maxContentBytes: 5 * 1024 * 1024,
    maxResponseBytes: 8 * 1024 * 1024,
  });
  async function state() {
    const [live, draft] = await Promise.all([
      client.getTextFile(livePath),
      client.getTextFile(draftPath),
    ]);
    checked(live);
    if (!draft.ok && draft.status !== 404) checked(draft);
    const stored = draft.ok ? JSON.parse(draft.content) : null;
    return {
      catalog: stored?.catalog || JSON.parse(live.content),
      revision: draft.ok ? draft.sha : "none:" + live.sha,
      publishedRevision: stored?.basePublishedRevision || live.sha,
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
      const payload = stringify({ catalog, basePublishedRevision: published });
      const result = checked(
        await client.putTextFile(
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
      // Verify every referenced public image before creating the publication commit.
      for (const path of mediaReferences(catalog, true)) {
        const response = await fetch(
          `${base}/contents/${path.slice(1)}?ref=${encodeURIComponent(branch)}`,
          { headers, signal: AbortSignal.timeout(15000) },
        );
        if (!response.ok)
          throw new ContentError(
            "A referenced image is missing. Upload it again before publishing.",
          );
        await response.body?.cancel();
      }
      const content = stringify(publicCatalog(catalog)),
        nextPublished = await blobSha(content),
        draftContent = stringify({
          catalog,
          basePublishedRevision: nextPublished,
        });
      const result = checked(
        await client.putTextFiles(
          [
            { path: livePath, content, expectedSha: published },
            { path: draftPath, content: draftContent, expectedSha: revision },
          ],
          "Publish portfolio changes",
        ),
      );
      return {
        commit: result.commitSha,
        status: "queued",
        revision: await blobSha(draftContent),
        publishedRevision: nextPublished,
      };
    },
    upload: async (path, bytes) => {
      let binary = "";
      for (let i = 0; i < bytes.length; i += 32768)
        binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      // Immutable content hashes make retries safe; media is emitted only if a published entry references it.
      const result = await client.putBase64File(
        path.slice(1),
        btoa(binary),
        "Stage portfolio photo",
      );
      if (!result.ok) {
        const existing = await fetch(
          `${base}/contents/${path.slice(1)}?ref=${encodeURIComponent(branch)}`,
          { headers, signal: AbortSignal.timeout(15000) },
        );
        if (!existing.ok) checked(result);
        await existing.body?.cancel();
      }
    },
    media: async (path) => {
      const response = await fetch(
        `${base}/contents/${path.slice(1)}?ref=${encodeURIComponent(branch)}`,
        {
          headers: { ...headers, accept: "application/vnd.github.raw+json" },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) return new Response("Not found", { status: 404 });
      return new Response(response.body, {
        headers: {
          "content-type": path.endsWith(".png")
            ? "image/png"
            : path.endsWith(".webp")
              ? "image/webp"
              : "image/jpeg",
        },
      });
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
