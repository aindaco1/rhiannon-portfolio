import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
const admin = "http://127.0.0.1:4326",
  seed = JSON.parse(
    await readFile(new URL("../fixtures/catalog.json", import.meta.url)),
  );
const api = async (page, path, method = "GET", body) =>
  page.evaluate(
    async ({ path, method, body }) => {
      const r = await fetch("/api" + path, {
        method,
        headers: { "content-type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, body: await r.json() };
    },
    { path, method, body },
  );
const readyImages = (page) =>
  page
    .locator("img")
    .evaluateAll((imgs) =>
      Promise.all(
        imgs
          .filter((i) => i.getBoundingClientRect().top < innerHeight)
          .map((i) => i.decode().catch(() => {})),
      ),
    );
for (const width of [320, 390, 768, 1440])
  test(`public archive at ${width}px has visible categories, loaded photos and no overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await readyImages(page);
    await expect(page.locator(".project-card")).toHaveCount(20);
    await expect(
      page.getByRole("navigation", { name: "Disciplines" }).getByRole("link"),
    ).toHaveCount(6);
    await expect(
      page.getByRole("link", { name: "Journal", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("img")
        .first()
        .evaluate((e) => e.naturalWidth > 0),
    ).toBe(true);
    expect(errors).toEqual([]);
    if (width === 1440 || width === 390)
      await page.screenshot({ path: `docs/evidence/home-${width}.png` });
  });
test("category, tag, project and contact links work without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4325/");
  await page
    .getByRole("navigation", { name: "Disciplines" })
    .getByRole("link", { name: /Makeup/ })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(6);
  await page.getByRole("heading", { name: "Red study", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Red study");
  await page.locator(".tags a").first().click();
  await expect(page.locator("h1")).toHaveText("Character study");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: /Contact/ })
    .click();
  await expect(page.locator("#contact")).toBeVisible();
  await expect(page.locator(".contact-link")).toHaveAttribute(
    "href",
    seed.profile.instagram,
  );
  await context.close();
});
test("public archive, project and about pass automated accessibility checks", async ({
  page,
}) => {
  for (const route of ["/", "/work/red-study/", "/about/"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
});
test("video loads only after deliberate activation", async ({ page }) => {
  const external = [];
  page.on("request", (req) => {
    if (/vimeo|youtube/.test(req.url())) external.push(req.url());
  });
  await page.goto("/work/after-the-light/");
  expect(external).toEqual([]);
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.route("https://player.vimeo.com/**", (route) =>
    route.fulfill({ body: "<!doctype html><title>Test player</title>" }),
  );
  await page.getByRole("link", { name: /Play film/ }).click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /player.vimeo.com\/video\/76979871/,
  );
});
test("admin and API reject anonymous and cross-origin requests", async ({
  request,
  page,
}) => {
  expect((await request.get(admin + "/api/state")).status()).toBe(401);
  await page.goto(admin + "/admin/");
  await expect(page.locator("h1")).toHaveText("Projects");
  const response = await page.context().request.put(admin + "/api/draft", {
    headers: { origin: "https://evil.example" },
    data: { catalog: seed },
  });
  expect(response.status()).toBe(403);
  expect(
    (await request.get("http://127.0.0.1:4325/_editor/catalog.json")).status(),
  ).toBe(404);
});
test("owner creates taxonomy, authors blocks, uploads, saves, reloads, previews and publishes", async ({
  page,
}) => {
  await page.goto(admin + "/admin/");
  await expect(page.locator("h1")).toHaveText("Projects");
  await page
    .getByRole("button", { name: "Categories & tags", exact: true })
    .click();
  await page
    .getByLabel("New category", { exact: true })
    .fill("Practical effects");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await page.getByLabel("New tag", { exact: true }).fill("Handmade");
  await page.getByRole("button", { name: "Add tag", exact: true }).click();
  await page.getByRole("button", { name: /^Projects/ }).click();
  await page
    .getByRole("button", { name: "New project +", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("A practical study");
  await page
    .getByRole("textbox", { name: "Introduction", exact: true })
    .fill("A locally authored project for the editor rehearsal.");
  await page.getByLabel("Practical effects", { exact: true }).check();
  await page.getByLabel("Handmade", { exact: true }).check();
  await page
    .locator("#cover input[type=file]")
    .setInputFiles("assets/media/sample-red-study.jpg");
  await expect(page.locator("#feedback")).toContainText("Photo uploaded");
  await page
    .locator("#cover")
    .getByLabel("Image description", { exact: true })
    .fill("A portrait used only for testing.");
  await page
    .getByRole("textbox", { name: "Block text", exact: true })
    .fill("A story about making things.");
  await page
    .getByRole("textbox", { name: "Block text", exact: true })
    .press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.getByRole("button", { name: "+ Quote", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Quote text", exact: true })
    .fill("An idea becomes an object.");
  await page
    .getByLabel("Attribution", { exact: true })
    .fill("Test attribution");
  await page
    .getByRole("button", { name: "Move block up", exact: true })
    .click();
  await expect(page.locator(".admin-content-block").first()).toHaveClass(
    /quote/,
  );
  await page
    .getByRole("button", { name: "Undo block change", exact: true })
    .click();
  await expect(page.locator(".admin-content-block").first()).toHaveClass(
    /text/,
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("#feedback")).toContainText("Draft saved");
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
  const state = (await api(page, "/state")).body;
  const entry = state.catalog.entries.find(
    (e) => e.title === "A practical study",
  );
  expect(entry.blocks[0].body).toContain("**A story about making things.**");
  expect(
    (
      await page.request.get("http://127.0.0.1:4325" + entry.cover.src)
    ).status(),
  ).toBe(404);
  await page.reload();
  await page
    .getByRole("button", { name: "A practical study", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Block text", exact: true }),
  ).toContainText("A story about making things.");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.frameLocator("#preview-dialog iframe").locator("h1"),
  ).toHaveText("A practical study");
  await expect
    .poll(() =>
      page
        .frameLocator("#preview-dialog iframe")
        .locator("img")
        .first()
        .evaluate((e) => e.complete && e.naturalWidth > 0),
    )
    .toBe(true);
  expect(
    await page
      .frameLocator("#preview-dialog iframe")
      .locator("h1")
      .evaluate((e) => getComputedStyle(e).fontFamily),
  ).toContain("Helvetica");
  const popupPromise = page.waitForEvent("popup");
  await page
    .frameLocator("#preview-dialog iframe")
    .getByRole("link", { name: "R. Barela", exact: true })
    .first()
    .click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe("http://127.0.0.1:4325/");
  await popup.close();
  await page
    .getByRole("button", { name: "Close preview", exact: true })
    .click();
  await page.getByLabel("Include this project when publishing").check();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Publish changes", exact: true })
    .click();
  await expect(page.locator("#feedback")).toContainText(
    "Published to the local preview",
    { timeout: 30000 },
  );
  const visitor = await page.context().newPage();
  await visitor.goto("http://127.0.0.1:4325/category/practical-effects/");
  await expect(visitor.locator(".project-card")).toHaveCount(1);
  await visitor
    .getByRole("heading", { name: "A practical study", exact: true })
    .click();
  await expect(visitor.locator(".project-body strong")).toHaveText(
    "A story about making things.",
  );
  await expect(visitor.locator(".tags")).toContainText("Handmade");
  await visitor.close();
  // Restore the test instance only; the user's local preview uses a separate store.
  const latest = (await api(page, "/state")).body;
  await api(page, "/draft", "PUT", {
    catalog: seed,
    revision: latest.revision,
    publishedRevision: latest.publishedRevision,
  });
  const restored = (await api(page, "/state")).body;
  expect(
    (
      await api(page, "/publish", "POST", {
        revision: restored.revision,
        publishedRevision: restored.publishedRevision,
      })
    ).status,
  ).toBe(200);
});
test("stale saves return a conflict and preserve the winning draft", async ({
  page,
}) => {
  await page.goto(admin + "/admin/");
  const state = (await api(page, "/state")).body;
  const first = structuredClone(state.catalog);
  first.profile.bio += "\nFirst editor change.";
  expect(
    (
      await api(page, "/draft", "PUT", {
        catalog: first,
        revision: state.revision,
        publishedRevision: state.publishedRevision,
      })
    ).status,
  ).toBe(200);
  const stale = structuredClone(state.catalog);
  stale.profile.bio += "\nStale overwrite.";
  expect(
    (
      await api(page, "/draft", "PUT", {
        catalog: stale,
        revision: state.revision,
        publishedRevision: state.publishedRevision,
      })
    ).status,
  ).toBe(409);
  expect((await api(page, "/state")).body.catalog.profile.bio).toContain(
    "First editor change.",
  );
});
test("failed publication leaves the previous live artifact intact", async ({
  page,
  request,
}) => {
  await page.goto(admin + "/admin/");
  const before = await (await request.get("/release.json")).text();
  const state = (await api(page, "/state")).body;
  const bad = structuredClone(state.catalog);
  bad.entries.find((e) => e.id === "sample-1").cover.src =
    "/assets/media/missing-image.jpg";
  const saved = (
    await api(page, "/draft", "PUT", {
      catalog: bad,
      revision: state.revision,
      publishedRevision: state.publishedRevision,
    })
  ).body;
  expect(
    (
      await api(page, "/publish", "POST", {
        revision: saved.revision,
        publishedRevision: saved.publishedRevision,
      })
    ).status,
  ).toBe(500);
  expect(await (await request.get("/release.json")).text()).toBe(before);
  expect(
    (await api(page, "/state")).body.catalog.entries.find(
      (e) => e.id === "sample-1",
    ).cover.src,
  ).toBe("/assets/media/missing-image.jpg");
});
async function resetDraft(page) {
  const state = (await api(page, "/state")).body;
  expect(
    (
      await api(page, "/draft", "PUT", {
        catalog: seed,
        revision: state.revision,
        publishedRevision: state.publishedRevision,
      })
    ).status,
  ).toBe(200);
  await page.reload();
}
test("mobile editor remains usable and accessible", async ({ page }) => {
  await page.goto(admin + "/admin/");
  await resetDraft(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Red study", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Block text", exact: true })
    .first()
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "docs/evidence/editor-mobile.png" });
});
test("browser recovery restores edits only against their saved baseline", async ({
  page,
}) => {
  await page.goto(admin + "/admin/");
  await resetDraft(page);
  await page.getByRole("button", { name: "Red study", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Introduction", exact: true })
    .fill("An unsaved idea worth keeping.");
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "Unsaved work found" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore edits", exact: true })
    .click();
  await page.getByRole("button", { name: "Red study", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Introduction", exact: true }),
  ).toHaveValue("An unsaved idea worth keeping.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
});
test("a pending photo cannot return to a block that was removed", async ({
  page,
}) => {
  await page.goto(admin + "/admin/");
  await resetDraft(page);
  await page.getByRole("button", { name: "Red study", exact: true }).click();
  await page.getByRole("button", { name: "+ Image", exact: true }).click();
  let release;
  await page.route("**/api/media", async (route) => {
    await new Promise((resolve) => (release = resolve));
    await route.continue();
  });
  await page
    .locator(".content-block--image input[type=file]")
    .setInputFiles("assets/media/sample-red-study.jpg");
  await expect.poll(() => !!release).toBe(true);
  await page.getByRole("button", { name: "Delete block", exact: true }).click();
  release();
  await expect(page.locator("#feedback")).toContainText(
    "original image slot changed",
  );
  await expect(page.locator(".content-block--image")).toHaveCount(0);
  await expect(page.locator(".content-block--gallery img")).toHaveCount(2);
});
test("the journal uses the same editor and appears only after publication", async ({
  page,
  request,
}) => {
  await page.goto(admin + "/admin/");
  await resetDraft(page);
  await page.getByRole("button", { name: /^Journal/ }).click();
  await page.getByRole("button", { name: "New entry +", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("A note from the studio");
  await page
    .getByRole("textbox", { name: "Block text", exact: true })
    .fill("A short journal entry for the rehearsal.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
  expect(await (await request.get("/")).text()).not.toContain(
    'href="/journal/"',
  );
  await page.getByLabel("Include this entry when publishing").check();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Publish changes", exact: true })
    .click();
  await expect(page.locator("#feedback")).toContainText(
    "Published to the local preview",
    { timeout: 30000 },
  );
  expect(await (await request.get("/")).text()).toContain('href="/journal/"');
  expect((await request.get("/journal/a-note-from-the-studio/")).status()).toBe(
    200,
  );
  const state = (await api(page, "/state")).body;
  await api(page, "/draft", "PUT", {
    catalog: seed,
    revision: state.revision,
    publishedRevision: state.publishedRevision,
  });
  const restored = (await api(page, "/state")).body;
  await api(page, "/publish", "POST", {
    revision: restored.revision,
    publishedRevision: restored.publishedRevision,
  });
});
