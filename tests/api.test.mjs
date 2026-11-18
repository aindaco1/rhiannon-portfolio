import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { handleApi, imageType, MAX_UPLOAD } from "../worker/api.mjs";
import worker, { authorize } from "../worker/index.mjs";
const seed = JSON.parse(
  await readFile(new URL("./fixtures/catalog.json", import.meta.url)),
);
const request = (path, method = "GET", body, headers = {}) =>
  new Request("https://editor.example.com" + path, {
    method,
    headers: {
      ...(method !== "GET"
        ? {
            origin: "https://editor.example.com",
            "content-type": "application/json",
          }
        : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const store = {
  load: async () => ({
    catalog: seed,
    revision: "one",
    publishedRevision: "two",
  }),
  save: async () => ({ revision: "saved" }),
  publish: async () => ({ status: "live" }),
  upload: async () => {},
  status: async () => ({ status: "live" }),
};
test("Worker fails closed before serving API or static assets", async () => {
  let assetsCalled = false;
  const env = {
    ASSETS: {
      fetch: () => {
        assetsCalled = true;
        return new Response("secret");
      },
    },
  };
  assert.equal((await worker.fetch(request("/index.html"), env)).status, 403);
  assert(!assetsCalled);
  await assert.rejects(
    authorize(request("/api/state"), {
      ADMIN_ORIGIN: "https://editor.example.com",
      DB: {},
      EDITOR_EMAILS: "a@example.com",
    }),
    /Sign in/,
  );
});
test("cross-origin mutations and missing Origin fail", async () => {
  for (const origin of ["https://evil.example", ""]) {
    const response = await handleApi(
      request("/draft", "PUT", { catalog: seed }, { origin }),
      store,
    );
    assert.equal(response.status, 403);
  }
  assert.equal(
    (
      await handleApi(
        request("/api/draft", "PUT", {
          catalog: seed,
          revision: "one",
          publishedRevision: "two",
        }),
        store,
      )
    ).status,
    200,
  );
});
test("request body budgets and unsupported images fail before writes", async () => {
  let writes = 0;
  const adapter = { ...store, upload: async () => writes++ };
  const oversize = new Request("https://editor.example.com/api/media", {
    method: "POST",
    headers: {
      origin: "https://editor.example.com",
      "content-length": String(MAX_UPLOAD + 1),
    },
    body: "a",
  });
  assert.equal((await handleApi(oversize, adapter)).status, 413);
  const svg = new Request("https://editor.example.com/api/media", {
    method: "POST",
    headers: { origin: "https://editor.example.com" },
    body: "<svg><script>bad()</script></svg>",
  });
  assert.equal((await handleApi(svg, adapter)).status, 400);
  assert.equal(writes, 0);
});
test("bounded photo upload uses immutable hash paths", async () => {
  const bytes = await readFile(
    new URL("../assets/media/sample-red-study.jpg", import.meta.url),
  );
  let saved;
  const req = new Request("https://editor.example.com/api/media", {
    method: "POST",
    headers: { origin: "https://editor.example.com" },
    body: bytes,
  });
  const response = await handleApi(req, {
    ...store,
    upload: async (path, body) => {
      saved = { path, size: body.length };
    },
  });
  assert.equal(response.status, 201);
  assert.match(saved.path, /^\/assets\/media\/[a-f0-9]{64}\.jpg$/);
  assert.equal(saved.size, bytes.length);
});
test("previews use the same block rendering and never cache private content", async () => {
  const response = await handleApi(
    request("/api/preview", "POST", { catalog: seed, id: seed.entries[0].id }),
    store,
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const { html } = await response.json();
  assert(html.includes("The idea"));
  assert(html.includes("noindex,nofollow"));
});
test("production publishing is blocked for sample material", async () => {
  let calls = 0;
  const response = await handleApi(
    request("/api/publish", "POST", {}),
    {
      ...store,
      publish: async () => {
        calls++;
      },
    },
    { production: true },
  );
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("Bio preview uses the public renderer and stays private", async () => {
  const catalog = structuredClone(seed);
  catalog.profile.bio = [
    { type: "text", body: "A **private** biography.", align: "left" },
  ];
  const response = await handleApi(
    request("/api/preview", "POST", { catalog, page: "bio" }),
    store,
    { publicOrigin: "https://portfolio.example" },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const { html } = await response.json();
  assert(html.includes("<h1>Bio</h1>"));
  assert(html.includes("<strong>private</strong>"));
  assert(
    html.includes(
      'href="/assets/documents/r-barela-bio-resume.pdf"',
    ),
  );
  assert(html.includes('href="https://portfolio.example/bio/"'));
  assert(!html.includes("/assets/js/site.js"));
  assert(!html.includes("masthead-bottom"));
});


test("PDF uploads validate bytes, enforce limits and reuse immutable paths", async () => {
  const bytes = await readFile("assets/documents/r-barela-bio-resume.pdf");
  const writes = [];
  const adapter = { ...store, upload: async (path, body) => writes.push({ path, body }) };
  const upload = (body, headers = {}) => handleApi(new Request("https://editor.example.com/api/documents", {
    method: "POST", headers: { origin: "https://editor.example.com", ...headers }, body,
  }), adapter);
  const first = await upload(bytes), second = await upload(bytes);
  assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), await second.json());
  assert.match(writes[0].path, /^\/assets\/documents\/[a-f0-9]{64}\.pdf$/);
  assert.deepEqual(Buffer.from(writes[0].body), bytes);
  for (const body of ["<html>not a PDF</html>", bytes.subarray(0, 1024)])
    assert.equal((await upload(body, { "content-type": "application/pdf" })).status, 400);
  assert.equal((await upload("a", { "content-length": String(MAX_UPLOAD + 1) })).status, 413);
  assert.equal((await upload(new Uint8Array(MAX_UPLOAD + 1))).status, 413);
  assert.equal((await upload(bytes, { origin: "https://other.example" })).status, 403);
  assert.equal(writes.length, 2);
  assert.equal((await worker.fetch(request(writes[0].path), {})).status, 403);
});
