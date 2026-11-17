import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sampleWriting } from "./fixtures/writing.mjs";
import { validateCatalog, entryPath } from "../lib/content.mjs";
import {
  writingArchive,
  entryView,
  writingEntries,
  shell,
} from "../lib/views.mjs";
const base = JSON.parse(
  await readFile(new URL("./fixtures/catalog.json", import.meta.url)),
);
const fixture = () => ({
  ...structuredClone(base),
  entries: [
    ...structuredClone(base.entries),
    ...structuredClone(sampleWriting),
  ],
});
test("Writing has an empty state and a permanent navigation link", () => {
  assert.match(writingArchive(base), /New writing will appear/);
  assert.match(
    shell(base, {
      title: "Writing",
      body: writingArchive(base),
      path: "/writing/",
    }),
    /href="\/writing\/" aria-current="page">Writing/,
  );
});
test("free-form writing needs no image, introduction, role or taxonomy", () => {
  const c = fixture(),
    e = c.entries.at(-1);
  e.intro = "";
  e.role = "";
  e.categories = [];
  e.tags = [];
  e.cover = { src: "", alt: "", caption: "" };
  assert.doesNotThrow(() => validateCatalog(c));
  const html = entryView(c, e);
  assert.match(html, /class="writing-article"/);
  assert.match(html, /<p>Some observations/);
  assert(!html.includes('class="project-cover"'));
  assert(!html.includes("<dt>Role</dt>"));
  assert(!html.includes("writing-deck"));
  assert.match(html, /<dt>Published<\/dt>/);
  assert.equal(entryPath(e), "/writing/keeping-a-notebook/");
});
test("writing archives are newest first and never list private drafts", () => {
  const c = fixture();
  assert.deepEqual(
    writingEntries(c).map((e) => e.slug),
    ["a-room-before-the-scene", "keeping-a-notebook"],
  );
  c.entries.at(-1).status = "draft";
  assert(!writingArchive(c).includes("Keeping a notebook"));
  assert(!entryView(c, c.entries.at(-2)).includes("keeping-a-notebook"));
});
test("writing previews share the article renderer, preserve formatting and escape authored text", () => {
  const c = fixture(),
    e = c.entries.at(-1);
  e.title = "Text <script>bad()</script>";
  e.blocks = [
    {
      type: "text",
      align: "left",
      body: "A **bold** thought.\n\n## Another paragraph\n\n[Bad](javascript:alert(1))",
    },
  ];
  const html = shell(c, {
    title: e.title,
    body: entryView(c, e),
    path: entryPath(e),
    preview: true,
  });
  assert.match(html, /class="page-writing"/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<h2>Another paragraph<\/h2>/);
  assert(!html.includes("<script>bad()"));
  assert(!html.includes('href="javascript:'));
  assert(!html.includes("/assets/js/site.js"));
});
test("writing sharing metadata never borrows an unrelated project cover", () => {
  const c = fixture();
  c.profile.url = "https://portfolio.example";
  const e = c.entries.at(-1);
  const html = shell(c, {
    title: e.title,
    body: entryView(c, e),
    path: entryPath(e),
  });
  assert(!html.includes('property="og:image"'));
  assert.match(
    html,
    /rel="canonical" href="https:\/\/portfolio.example\/writing\/keeping-a-notebook\/"/,
  );
});
