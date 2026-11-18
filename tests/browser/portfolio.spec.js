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
      page.getByRole("link", { name: "Writing", exact: true }),
    ).toHaveCount(1);
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
    await expect(page.locator(".masthead-bottom")).toHaveCount(0);
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
    .getByRole("link", { name: "Bio", exact: true })
    .click();
  await expect(page.locator("#contact")).toBeVisible();
  await expect(page.locator(".contact-link")).toHaveAttribute(
    "href",
    seed.profile.instagram,
  );
  await context.close();
});
test("public archive, project and bio pass automated accessibility checks", async ({
  page,
}) => {
  for (const route of ["/", "/work/red-study/", "/bio/"]) {
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
for (const owner of ["project", "bio"])
  test(`a pending ${owner} photo cannot return to a block that was removed`, async ({
    page,
  }) => {
    await page.goto(admin + "/admin/");
    await resetDraft(page);
    await page
      .getByRole("button", {
        name: owner === "bio" ? "Bio & contact" : "Red study",
        exact: true,
      })
      .click();
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
    await page
      .getByRole("button", { name: "Delete block", exact: true })
      .click();
    release();
    await expect(page.locator("#feedback")).toContainText(
      "original image slot changed",
    );
    await expect(page.locator(".content-block--image")).toHaveCount(0);
    await expect(page.locator(".content-block--gallery img")).toHaveCount(
      owner === "project" ? 2 : 0,
    );
  });
test("writing uses the shared editor; only published pieces appear", async ({
  page,
  request,
}) => {
  await page.goto(admin + "/admin/");
  await resetDraft(page);
  await page.getByRole("button", { name: /^Writing/ }).click();
  await page.getByRole("button", { name: "New piece +", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("A note from the studio");
  await page
    .getByRole("textbox", { name: "Block text", exact: true })
    .fill("A short piece of writing for the rehearsal.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
  expect(await (await request.get("/writing/")).text()).not.toContain(
    "A note from the studio",
  );
  await page.getByLabel("Include this piece when publishing").check();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Publish changes", exact: true })
    .click();
  await expect(page.locator("#feedback")).toContainText(
    "Published to the local preview",
    { timeout: 30000 },
  );
  expect(await (await request.get("/writing/")).text()).toContain(
    "A note from the studio",
  );
  expect((await request.get("/writing/a-note-from-the-studio/")).status()).toBe(
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

test("Writing is text-led, responsive, accessible and uses the same WYSIWYG preview", async ({
  page,
  request,
}) => {
  const { sampleWriting } = await import("../fixtures/writing.mjs");
  await page.goto(admin + "/admin/");
  await resetDraft(page);
  const state = (await api(page, "/state")).body;
  const catalog = {
    ...state.catalog,
    entries: [...state.catalog.entries, ...structuredClone(sampleWriting)],
  };
  const saved = (
    await api(page, "/draft", "PUT", {
      catalog,
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
  ).toBe(200);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("http://127.0.0.1:4325/writing/");
    await expect(page.locator(".writing-list-item")).toHaveCount(2);
    await expect(page.locator(".writing-list img")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: /A room before the scene/ }).click();
    await expect(page.locator("h1")).toHaveText("A room before the scene");
    await expect(page.locator(".writing-body h2").first()).toHaveText(
      "The things left behind",
    );
    await expect(page.locator(".project-cover")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1440) {
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
      await page.screenshot({
        path: `docs/evidence/writing/article-${width}.png`,
      });
    }
  }
  await page.goto("http://127.0.0.1:4325/journal/a-room-before-the-scene/");
  await expect(page).toHaveURL(/\/writing\/a-room-before-the-scene\/$/);
  await page.goto(admin + "/admin/");
  await page.getByRole("button", { name: /^Writing/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Move A room before the scene up",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "A room before the scene", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit writing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Role / discipline", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Year", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "The writing", exact: true }),
  ).toBeVisible();
  const text = page
    .getByRole("textbox", { name: "Block text", exact: true })
    .first();
  await text.fill("An independently edited paragraph.");
  await text.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
  await page.reload();
  await page.getByRole("button", { name: /^Writing/ }).click();
  await page
    .getByRole("button", { name: "A room before the scene", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Block text", exact: true }).first(),
  ).toContainText("An independently edited paragraph.");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.frameLocator("#preview-dialog iframe");
  await expect(
    page.getByRole("dialog", { name: "Writing preview" }),
  ).toBeVisible();
  await expect(preview.locator("body")).toHaveClass("page-writing");
  await expect(preview.locator(".writing-body strong").first()).toHaveText(
    "An independently edited paragraph.",
  );
  const live = await (
    await request.get("/writing/a-room-before-the-scene/")
  ).text();
  expect(live).not.toContain("An independently edited paragraph.");
  await page
    .getByRole("button", { name: "Close preview", exact: true })
    .click();
  const latest = (await api(page, "/state")).body;
  await api(page, "/draft", "PUT", {
    catalog: seed,
    revision: latest.revision,
    publishedRevision: latest.publishedRevision,
  });
  const restored = (await api(page, "/state")).body;
  await api(page, "/publish", "POST", {
    revision: restored.revision,
    publishedRevision: restored.publishedRevision,
  });
});

test("Bio supports the shared WYSIWYG editor, recovery, private preview and publication", async ({
  page,
  request,
}) => {
  await page.goto(admin + "/admin/");
  await resetDraft(page);
  const before = (await api(page, "/state")).body;
  before.catalog.profile.bio =
    "A biography with [an existing link](https://example.com).\n\n## Credits\n\n- A retained credit";
  await api(page, "/draft", "PUT", {
    catalog: before.catalog,
    revision: before.revision,
    publishedRevision: before.publishedRevision,
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Bio & contact", exact: true })
    .click();
  await expect(page.locator('[data-profile="bio"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  await expect(
    page.locator('#blocks a[href="https://example.com"]'),
  ).toHaveText("an existing link");
  await expect(page.locator("#blocks h2")).toHaveText("Credits");
  await page
    .getByRole("textbox", { name: "Short introduction", exact: true })
    .fill("An updated introduction.");
  await page.getByRole("button", { name: "+ Text", exact: true }).click();
  let text = page
    .getByRole("textbox", { name: "Block text", exact: true })
    .last();
  await text.fill("A new Bio paragraph.");
  await text.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await text.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Link URL", exact: true })
    .fill("https://example.com/new");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByRole("button", { name: "+ Quote", exact: true }).click();
  await page
    .getByRole("button", { name: "Undo block change", exact: true })
    .click();
  await expect(page.locator(".content-block--quote")).toHaveCount(0);
  await page.getByRole("button", { name: "+ Image", exact: true }).click();
  await page
    .locator(".content-block--image input[type=file]")
    .setInputFiles("assets/media/sample-red-study.jpg");
  await expect(page.locator("#feedback")).toContainText("Photo uploaded");
  await page
    .getByLabel("Image description", { exact: true })
    .fill("A Bio rehearsal image.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
  const savedBio = (await api(page, "/state")).body.catalog.profile.bio;
  expect(Array.isArray(savedBio)).toBe(true);
  expect(savedBio[0].body).toBe(before.catalog.profile.bio);
  expect(savedBio[1].body).toContain("https://example.com/new");
  const photo = savedBio[2].src;
  expect((await request.get(photo)).status()).toBe(404);
  // Check edits after a normalized save bind to the newly saved profile.
  await page
    .getByRole("textbox", { name: "Short introduction", exact: true })
    .fill("A recovered Bio introduction.");
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await page
    .getByRole("button", { name: "Restore edits", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Bio & contact", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Short introduction", exact: true }),
  ).toHaveValue("A recovered Bio introduction.");
  await expect(
    page.locator('#blocks a[href="https://example.com/new"]'),
  ).toHaveText("A new Bio paragraph.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Bio preview" })).toBeVisible();
  const preview = page.frameLocator("#preview-dialog iframe");
  await expect(preview.locator("h1")).toHaveText("Bio");
  await expect(preview.locator(".bio-reading strong")).toHaveText(
    "A new Bio paragraph.",
  );
  await expect
    .poll(() =>
      preview
        .locator(".bio-reading img")
        .evaluate((e) => e.complete && e.naturalWidth > 0),
    )
    .toBe(true);
  expect(await (await request.get("/bio/")).text()).not.toContain(
    "A new Bio paragraph.",
  );
  await page
    .getByRole("button", { name: "Close preview", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("textbox", { name: "Block text", exact: true })
    .first()
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: "docs/evidence/bio-editor/editor-mobile.png" });
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Publish changes", exact: true })
    .click();
  await expect(page.locator("#feedback")).toContainText(
    "Published to the local preview",
    { timeout: 30000 },
  );
  const publicBio = await (await request.get("/bio/")).text();
  expect(publicBio).toContain("A new Bio paragraph.");
  expect(publicBio).toContain("A recovered Bio introduction.");
  expect(publicBio).not.toContain("masthead-bottom");
  expect((await request.get(photo)).status()).toBe(200);
  const latest = (await api(page, "/state")).body;
  await api(page, "/draft", "PUT", {
    catalog: seed,
    revision: latest.revision,
    publishedRevision: latest.publishedRevision,
  });
  const restored = (await api(page, "/state")).body;
  await api(page, "/publish", "POST", {
    revision: restored.revision,
    publishedRevision: restored.publishedRevision,
  });
});

test("Bio PDF replacement is private until publication and survives save/reload", async ({ page, request }) => {
  test.setTimeout(120000);
  const originalPath = "/assets/documents/r-barela-bio-resume.pdf";
  const original = await readFile("." + originalPath);
  const replacement = Buffer.concat([original, Buffer.from("\n\n")]);
  await page.goto(admin + "/admin/");
  await resetDraft(page);
  let state = (await api(page, "/state")).body;
  expect((await api(page, "/publish", "POST", { revision: state.revision, publishedRevision: state.publishedRevision })).status).toBe(200);
  await page.reload();
  await page.getByRole("button", { name: "Bio & contact", exact: true }).click();
  await expect(page.locator("#bio-pdf-download")).toHaveAttribute("href", originalPath);
  await expect(page.locator("#save")).toBeDisabled();
  await page.getByLabel("Upload or replace PDF", { exact: true }).setInputFiles({ name: "Updated bio and résumé.pdf", mimeType: "application/pdf", buffer: replacement });
  await expect(page.locator("#feedback")).toContainText("PDF uploaded. Save");
  const path = await page.locator("#bio-pdf-download").getAttribute("href");
  expect(path).toMatch(/^\/assets\/documents\/[a-f0-9]{64}\.pdf$/);
  expect((await request.get(path)).status()).toBe(404);
  expect((await request.get(admin + path)).status()).toBe(401);
  expect(await (await request.get(originalPath)).body()).toEqual(original);
  const protectedFile = await page.context().request.get(admin + path);
  expect(protectedFile.headers()["content-type"]).toBe("application/pdf");
  expect(protectedFile.headers()["cache-control"]).toContain("no-store");
  expect(protectedFile.headers()["content-disposition"]).toContain("attachment");
  expect(await protectedFile.body()).toEqual(replacement);
  await page.locator("#save").click();
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
  await page.reload();
  await page.getByRole("button", { name: "Bio & contact", exact: true }).click();
  await expect(page.locator("#bio-pdf-download")).toHaveAttribute("href", path);
  await expect(page.locator("#bio-pdf-download")).toHaveText("Updated bio and résumé.pdf");
  await page.locator("#preview").click();
  const preview = page.frameLocator("#preview-dialog iframe");
  await expect(preview.locator(".bio-download a")).toHaveAttribute("href", path);
  const downloadEvent = page.waitForEvent("download");
  await preview.locator(".bio-download a").click();
  const download = await downloadEvent;
  expect(await readFile(await download.path())).toEqual(replacement);
  await page.getByRole("button", { name: "Close preview", exact: true }).click();
  // A renamed non-PDF must not replace the saved document or dirty the draft.
  await page.getByLabel("Upload or replace PDF", { exact: true }).setInputFiles({ name: "Invalid.pdf", mimeType: "application/pdf", buffer: Buffer.from("<html>not a PDF</html>") });
  await expect(page.locator("#feedback")).toContainText("Choose a complete PDF");
  await expect(page.locator("#bio-pdf-download")).toHaveAttribute("href", path);
  await expect(page.locator("#save")).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.locator("#bio-pdf-upload").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/evidence/pdf-upload/editor-mobile.png" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#publish").click();
  await expect(page.locator("#feedback")).toContainText("Published to the local preview", { timeout: 30000 });
  expect(await (await request.get("/bio/")).text()).toContain(`href="${path}"`);
  expect(await (await request.get(path)).body()).toEqual(replacement);
  expect((await request.get(originalPath)).status()).toBe(404);
  // A second file leaves the live download alone until another publication.
  await page.getByLabel("Upload or replace PDF", { exact: true }).setInputFiles({ name: "Second revision.pdf", mimeType: "application/pdf", buffer: original });
  await expect(page.locator("#feedback")).toContainText("PDF uploaded. Save");
  const nextPath = await page.locator("#bio-pdf-download").getAttribute("href");
  expect(nextPath).not.toBe(path);
  expect((await request.get(nextPath)).status()).toBe(404);
  expect(await (await request.get(path)).body()).toEqual(replacement);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#publish").click();
  await expect(page.locator("#feedback")).toContainText("Published to the local preview", { timeout: 30000 });
  expect(await (await request.get(nextPath)).body()).toEqual(original);
  expect((await request.get(path)).status()).toBe(404);
  // A missing document causes a failed build without replacing the live site.
  const release = await (await request.get("/release.json")).text();
  state = (await api(page, "/state")).body;
  state.catalog.profile.bioPdf.src = `/assets/documents/${"f".repeat(64)}.pdf`;
  expect((await api(page, "/draft", "PUT", { catalog: state.catalog, revision: state.revision, publishedRevision: state.publishedRevision })).status).toBe(200);
  state = (await api(page, "/state")).body;
  expect((await api(page, "/publish", "POST", { revision: state.revision, publishedRevision: state.publishedRevision })).status).toBe(500);
  expect(await (await request.get("/release.json")).text()).toBe(release);
  expect(await (await request.get(nextPath)).body()).toEqual(original);
  await resetDraft(page);
  state = (await api(page, "/state")).body;
  await api(page, "/publish", "POST", { revision: state.revision, publishedRevision: state.publishedRevision });
});

test("a late PDF upload cannot replace a newer selection or a remounted Bio editor", async ({ page }) => {
  await page.goto(admin + "/admin/");
  await resetDraft(page);
  await page.getByRole("button", { name: "Bio & contact", exact: true }).click();
  const bytes = await readFile("assets/documents/r-barela-bio-resume.pdf");
  let release;
  await page.route("**/api/documents", async (route) => {
    if (route.request().postDataBuffer().equals(bytes))
      await new Promise((resolve) => (release = resolve));
    await route.continue();
  });
  const upload = page.getByLabel("Upload or replace PDF", { exact: true });
  await upload.setInputFiles({ name: "Older.pdf", mimeType: "application/pdf", buffer: bytes });
  await expect.poll(() => !!release).toBe(true);
  await expect(page.locator("#save")).toBeDisabled();
  await expect(page.locator("#publish")).toBeDisabled();
  await upload.setInputFiles({ name: "Newer.pdf", mimeType: "application/pdf", buffer: Buffer.concat([bytes, Buffer.from("\n")]) });
  await expect(page.locator("#bio-pdf-download")).toHaveText("Newer.pdf");
  release();
  await expect(page.locator("#feedback")).toContainText("selection changed");
  await expect(page.locator("#bio-pdf-download")).toHaveText("Newer.pdf");
  release = undefined;
  await upload.setInputFiles({ name: "Late.pdf", mimeType: "application/pdf", buffer: bytes });
  await expect.poll(() => !!release).toBe(true);
  await page.getByRole("button", { name: /^Writing/ }).click();
  await page.getByRole("button", { name: "Bio & contact", exact: true }).click();
  release();
  await expect(page.locator("#feedback")).toContainText("selection changed");
  await expect(page.locator("#bio-pdf-download")).toHaveText("Newer.pdf");
  await page.locator("#save").click();
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
  await resetDraft(page);
});

test("project year ranges save, reload and appear in preview", async ({ page }) => {
  await page.goto(admin + "/admin/");
  await resetDraft(page);
  await page.getByRole("button", { name: "Red study", exact: true }).click();
  await page.getByLabel(/^Year or range/).fill("2014-2026");
  await page.locator("#save").click();
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
  await expect(page.getByLabel(/^Year or range/)).toHaveValue("2014–2026");
  await page.reload();
  await page.getByRole("button", { name: "Red study", exact: true }).click();
  await expect(page.getByLabel(/^Year or range/)).toHaveValue("2014–2026");
  await page.locator("#preview").click();
  await expect(page.frameLocator("#preview-dialog iframe").locator(".project-details")).toContainText("2014–2026");
  await page.getByRole("button", { name: "Close preview", exact: true }).click();
  await page.getByLabel(/^Year or range/).fill("2026–2014");
  await page.locator("#save").click();
  await expect(page.locator("#feedback")).toContainText("ascending year range");
  expect((await api(page, "/state")).body.catalog.entries[0].year).toBe("2014–2026");
  await page.getByLabel(/^Year or range/).fill("2026");
  await page.locator("#save").click();
  await expect(page.locator("#save-state")).toHaveText("Draft saved");
  expect((await api(page, "/state")).body.catalog.entries[0].year).toBe(2026);
  await resetDraft(page);
});

test('MP4 blocks upload privately, save, preview, play, seek and publish', async ({ page, request }) => {
  test.setTimeout(120000);
  const bytes = await readFile('tests/fixtures/loop.mp4');
  await page.goto(admin + '/admin/');
  await resetDraft(page);
  await page.getByRole('button', { name: 'Red study', exact: true }).click();
  await page.getByRole('button', { name: '+ Video', exact: true }).click();
  await page.getByLabel('Video source', { exact: true }).selectOption('local');
  await page.getByLabel('Upload or replace MP4', { exact: true }).setInputFiles('tests/fixtures/loop.mp4');
  await expect(page.locator('#feedback')).toContainText('Video uploaded. Save');
  await page.getByLabel('Video caption', { exact: true }).fill('Test loop');
  const path = await page.locator('#blocks video').getAttribute('src');
  expect((await request.get(path)).status()).toBe(404);
  expect((await request.get(admin + path)).status()).toBe(401);
  const range = await page.context().request.get(admin + path, { headers: { range: 'bytes=10-19' } });
  expect(range.status()).toBe(206);
  expect(await range.body()).toEqual(bytes.subarray(10,20));
  await page.locator('#save').click();
  await expect(page.locator('#save-state')).toHaveText('Draft saved');
  await page.reload();
  await page.getByRole('button', { name: 'Red study', exact: true }).click();
  await expect(page.getByLabel('Video caption', { exact: true })).toHaveValue('Test loop');
  await expect(page.locator('#blocks video')).toHaveAttribute('src', path);
  await page.getByLabel('Upload or replace MP4', { exact: true }).setInputFiles({ name: 'bad.mp4', mimeType: 'video/mp4', buffer: Buffer.from('invalid') });
  await expect(page.locator('#feedback')).toContainText('complete MP4');
  await expect(page.locator('#save')).toBeDisabled();
  await page.locator('#preview').click();
  const preview = page.frameLocator('#preview-dialog iframe').locator('video');
  await expect(preview).toHaveAttribute('preload', 'none');
  await preview.evaluate(async v => { v.muted = true; await v.play(); });
  await expect.poll(() => preview.evaluate(v => v.currentTime)).toBeGreaterThan(0.1);
  await preview.evaluate(v => { v.pause(); v.currentTime = 2; });
  await expect.poll(() => preview.evaluate(v => v.readyState >= 2 && !v.seeking)).toBe(true);
  await page.getByRole('button', { name: 'Close preview', exact: true }).click();
  page.once('dialog', d => d.accept());
  await page.locator('#publish').click();
  await expect(page.locator('#feedback')).toContainText('Published to the local preview', { timeout: 30000 });
  expect(await (await request.get(path)).body()).toEqual(bytes);
  const publicPage = await page.context().newPage();
  await publicPage.goto('http://127.0.0.1:4325/work/red-study/');
  const video = publicPage.locator('video');
  await video.evaluate(async v => { v.muted = true; await v.play(); });
  await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(0.1);
  expect(await video.evaluate(v => v.loop && v.controls && v.playsInline)).toBe(true);
  await publicPage.close();
  // Failed publication must retain the last successful release and video.
  const release = await (await request.get('/release.json')).text();
  let state = (await api(page, '/state')).body;
  state.catalog.entries[0].blocks.find(b => b.provider === 'local').src = `/assets/videos/${'f'.repeat(64)}.mp4`;
  expect((await api(page, '/draft', 'PUT', { catalog: state.catalog, revision: state.revision, publishedRevision: state.publishedRevision })).status).toBe(200);
  state = (await api(page, '/state')).body;
  expect((await api(page, '/publish', 'POST', { revision: state.revision, publishedRevision: state.publishedRevision })).status).toBe(500);
  expect(await (await request.get('/release.json')).text()).toBe(release);
  expect((await request.get(path)).status()).toBe(200);
  await resetDraft(page);
  state = (await api(page, '/state')).body;
  await api(page, '/publish', 'POST', { revision: state.revision, publishedRevision: state.publishedRevision });
});

test('late MP4 uploads cannot overwrite a changed block', async ({ page }) => {
  await page.goto(admin + '/admin/');
  await resetDraft(page);
  await page.getByRole('button', { name: 'Red study', exact: true }).click();
  await page.getByRole('button', { name: '+ Video', exact: true }).click();
  await page.getByLabel('Video source', { exact: true }).selectOption('local');
  let release;
  await page.route('**/api/videos', async route => {
    await new Promise(resolve => { release = resolve; });
    await route.continue();
  });
  await page.getByLabel('Upload or replace MP4', { exact: true }).setInputFiles('tests/fixtures/loop.mp4');
  await expect.poll(() => !!release).toBe(true);
  await expect(page.locator('#publish')).toBeDisabled();
  await page.getByLabel('Video source', { exact: true }).selectOption('embed');
  release();
  await expect(page.locator('#feedback')).toContainText('original block changed');
  await expect(page.locator('#blocks video')).toHaveCount(0);
  await expect(page.getByLabel('Video source', { exact: true })).toHaveValue('embed');
  await page.locator('#save').click();
  await expect(page.locator('#save-state')).toHaveText('Draft saved');
  expect((await api(page, '/state')).body.catalog.entries[0].blocks.at(-1).src).toBe('');
  await resetDraft(page);
});
