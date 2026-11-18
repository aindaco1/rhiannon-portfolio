import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { handleApi } from "../../worker/api.mjs";
const origin = "https://rbarela.test", endpoint = "https://r-barela-editor.jogo.workers.dev";
const seed = JSON.parse(await readFile("tests/fixtures/catalog.json"));
const token = "s".repeat(43), link = "l".repeat(43);
async function hostedEditor(page) {
  const errors = [], calls = [], assets = new Map();
  let catalog = structuredClone(seed), revision = "draft-1", denied = false, unchanged = false;
  page.on("pageerror", e => errors.push(e.message));
  await page.route(origin + "/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/admin/") && !path.startsWith("/assets/")) return route.fulfill({ status: 404 });
    const file = path.endsWith("/") ? path + "index.html" : path;
    const contentType = file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "application/javascript" : "image/svg+xml";
    try { await route.fulfill({ body: await readFile("dist" + file), contentType }); }
    catch { await route.fulfill({ status: 404 }); }
  });
  await page.route(endpoint + "/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const headers = { "access-control-allow-origin": origin, "access-control-allow-headers": "Content-Type,Authorization", "access-control-allow-methods": "GET,POST,PUT,OPTIONS", "cache-control": "private,no-store" };
    calls.push({ path, headers: request.headers(), method: request.method() });
    const json = (body, status = 200) => route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(body) });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/api/auth/login") return json({ message: "If this address has editor access, check your email." });
    if (path === "/api/auth/verify") return request.postDataJSON().token === link ? json({ accessToken: token, expiresAt: Date.now() + 600000, email: "editor@example.com" }) : json({ error: "This link is invalid or expired." }, 401);
    if (path === "/api/auth/logout") return json({ ok: true });
    if (denied || request.headers().authorization !== `Bearer ${token}`) return json({ error: "Your session expired." }, 401);
    if (path.startsWith("/assets/")) {
      const bytes = assets.get(path) || await readFile("." + path);
      return route.fulfill({ headers, contentType: path.endsWith(".pdf") ? "application/pdf" : path.endsWith(".mp4") ? "video/mp4" : "image/jpeg", body: bytes });
    }
    const req = new Request(request.url(), { method: request.method(), headers: { origin, "content-type": request.headers()["content-type"] || "application/json" }, ...(request.method() === "GET" ? {} : { body: request.postDataBuffer() }) });
    const response = await handleApi(req, {
      load: async () => ({ catalog, revision, publishedRevision: "public-1", mode: "github" }),
      save: async next => { catalog = next; revision = "draft-2"; return { catalog, revision, publishedRevision: "public-1" }; },
      upload: async (path, bytes) => assets.set(path, bytes),
      publish: async () => unchanged ? ({ status: "unchanged" }) : ({ status: "queued", commit: "c".repeat(40) }),
      status: async () => ({ status: "live" }),
    }, { editorOrigin: origin, publicOrigin: origin });
    return route.fulfill({ status: response.status, headers, contentType: "application/json", body: await response.text() });
  });
  return { calls, errors, expire() { denied = true; }, unchanged() { unchanged = true; } };
}
test("hosted /admin signs in, keeps private media authenticated, saves and previews without DNS proxying", async ({ page }) => {
  const state = await hostedEditor(page);
  await page.goto(origin + "/admin/");
  await expect(page.getByRole("heading", { name: "Sign in to your portfolio" })).toBeVisible();
  expect(state.calls).toHaveLength(0);
  await page.getByLabel("Email address").fill("editor@example.com");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.locator("#login-message")).toContainText("check your email");
  await page.goto(origin + "/admin/#token=" + link);
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  expect(page.url()).toBe(origin + "/admin/");
  await expect(page.locator(".entry-row img").first()).toHaveAttribute("src", /^blob:/);
  await page.getByRole("button", { name: "Bio & contact", exact: true }).click();
  await page.getByRole("textbox", { name: "Short introduction", exact: true }).fill("Edited through the hosted editor.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("#feedback")).toContainText("Draft saved");
  await page.getByRole("button", { name: "Reload saved version" }).click();
  await expect(page.getByRole("textbox", { name: "Short introduction", exact: true })).toHaveValue("Edited through the hosted editor.");
  await expect(page.locator("#bio-pdf-download")).toHaveAttribute("href", /^blob:/);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Bio preview" })).toBeVisible();
  await expect(page.frameLocator("#preview-dialog iframe").getByRole("heading", { name: "Bio", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Publish changes", exact: true }).click();
  await expect(page.locator("#feedback")).toContainText("Live — commit", { timeout: 10000 });
  state.unchanged();
  await page.getByRole("button", { name: "Publish changes", exact: true }).click();
  await expect(page.locator("#feedback")).toContainText("No public changes to publish");
  for (const call of state.calls.filter(c => !c.path.startsWith("/api/auth/") && c.method !== "OPTIONS")) {
    expect(call.headers.authorization).toBe(`Bearer ${token}`);
    expect(call.headers.cookie).toBeUndefined();
  }
  await page.screenshot({ path: ".local/hosted-editor.png", fullPage: true });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("#login-message")).toContainText("Signed out");
  await expect(page.locator("#view")).toBeEmpty();
  expect(await page.evaluate(() => sessionStorage.getItem("r-barela-editor-session-v1"))).toBeNull();
  expect(state.errors).toEqual([]);
});
test("invalid links and session expiry show sign-in while preserving unsaved recovery", async ({ page }) => {
  const state = await hostedEditor(page);
  await page.goto(origin + "/admin/#token=invalid");
  await expect(page.locator("#login-message")).toContainText("expired");
  expect(page.url()).toBe(origin + "/admin/");
  await page.goto(origin + "/admin/#token=" + link);
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bio & contact", exact: true }).click();
  await page.getByRole("textbox", { name: "Short introduction", exact: true }).fill("Unsaved work survives expiry.");
  state.expire();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("#login-message")).toContainText("session expired");
  expect(await page.evaluate(() => localStorage.getItem("r-barela-recovery-v1"))).toContain("Unsaved work survives expiry.");
  expect(state.errors).toEqual([]);
});
