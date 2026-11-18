import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateCatalog,
  publicCatalog,
  mediaReferences,
  parseVideo,
  renderBlocks,
  esc,
} from "../lib/content.mjs";
import { shell, archive, project } from "../lib/views.mjs";
const seed = JSON.parse(
  await readFile(new URL("./fixtures/catalog.json", import.meta.url)),
);
const copy = () => structuredClone(seed);
test("20 sample projects span all five disciplines; Writing is discoverable when empty", () => {
  const d = validateCatalog(copy());
  assert.equal(d.entries.length, 20);
  assert.equal(d.categories.length, 5);
  for (const term of d.categories)
    assert(d.entries.some((e) => e.categories.includes(term.id)));
  assert(
    shell(d, { title: "Work", body: archive(d) }).includes('href="/writing/"'),
  );
});
test("category renames preserve their URL and referenced terms cannot be deleted", () => {
  const d = copy();
  d.categories[0].label = "Fine art";
  assert.equal(
    validateCatalog(d, { previous: seed }).categories[0].slug,
    "art",
  );
  d.categories[0].slug = "fine-art";
  assert.throws(() => validateCatalog(d, { previous: seed }), /stable/);
  const bad = copy();
  bad.categories.shift();
  assert.throws(() => validateCatalog(bad), /Reassign/);
});
test("entry URLs remain stable and duplicate URLs fail", () => {
  const d = copy();
  d.entries[0].slug = "new-url";
  assert.throws(() => validateCatalog(d, { previous: seed }), /stable/);
  d.entries[0].slug = d.entries[1].slug;
  assert.throws(() => validateCatalog(d), /unique/);
});
test("project years accept an editable range while preserving single years", () => {
  const d = copy();
  d.entries[0].year = "2014-2026";
  const ranged = validateCatalog(d);
  assert.equal(ranged.entries[0].year, "2014–2026");
  assert.equal(ranged.entries[1].year, seed.entries[1].year);
  assert(project(ranged, ranged.entries[0]).includes("2014–2026"));
  assert(archive(ranged).includes("2014–2026"));
  d.entries[0].year = "2026";
  assert.equal(validateCatalog(d).entries[0].year, 2026);
  for (const value of ["2026–2014", "1899–2026", "2014–2101", "2014–bad", "2026.5", null, ""]) {
    d.entries[0].year = value;
    assert.throws(() => validateCatalog(d), /ascending year range/);
  }
});
test("private draft entries and their photos are absent from published data", () => {
  const d = copy();
  d.entries[0].status = "draft";
  d.entries[0].cover.src = "/assets/media/private-photo.jpg";
  const pub = publicCatalog(d);
  assert.equal(pub.entries.length, 19);
  assert(!mediaReferences(d, true).includes("/assets/media/private-photo.jpg"));
  assert(!archive(pub).includes("Red study"));
});
test("production rejects the preview and sample project flags, then requires a domain/contact", () => {
  const d = copy();
  assert.throws(
    () => validateCatalog(d, { production: true }),
    /sample content/,
  );
  d.demo = false;
  assert.throws(() => validateCatalog(d, { production: true }), /domain/);
  d.profile.url = "https://example.com";
  d.profile.email = "artist@example.com";
  assert.throws(
    () => validateCatalog(d, { production: true }),
    /sample project/,
  );
  d.entries.forEach((e) => (e.sample = false));
  assert.throws(() => validateCatalog(d, { production: true }), /stock sample/);
  for (const entry of d.entries) {
    entry.cover.src = "/assets/media/approved.jpg";
    entry.blocks = [];
  }
  assert.doesNotThrow(() => validateCatalog(d, { production: true }));
});
test("media and block inputs are validated at the server boundary", () => {
  for (const src of [
    "//evil.example/x.jpg",
    "/assets/media/../../secret.png",
    "data:image/svg+xml,x",
    "https://example.com/photo.jpg",
  ]) {
    const d = copy();
    d.entries[0].cover.src = src;
    assert.throws(() => validateCatalog(d), /uploaded/);
  }
  const d = copy();
  d.entries[0].cover.alt = "";
  assert.throws(() => validateCatalog(d), /Describe/);
  d.entries[0].cover.decorative = true;
  assert.doesNotThrow(() => validateCatalog(d));
  d.entries[0].blocks.push({ type: "embed" });
  assert.throws(() => validateCatalog(d), /Unsupported/);
});
test("only safe YouTube/Vimeo videos can become players", () => {
  assert.deepEqual(parseVideo("https://youtu.be/dQw4w9WgXcQ"), {
    provider: "youtube",
    video_id: "dQw4w9WgXcQ",
  });
  assert.deepEqual(parseVideo("https://vimeo.com/76979871"), {
    provider: "vimeo",
    video_id: "76979871",
  });
  for (const url of [
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://user:pass@vimeo.com/76979871",
  ])
    assert.throws(() => parseVideo(url));
  const d = copy();
  d.entries[0].blocks = [{ type: "video", provider: "local", video_id: "abc" }];
  assert.throws(() => validateCatalog(d), /Only/);
});
test("public text and attributes cannot inject executable markup", () => {
  const d = copy();
  d.profile.intro = '" onload="alert(1) <script>bad()</script>';
  d.entries[0].blocks = [
    {
      type: "text",
      body: "<script>bad()</script>\n\n[bad](javascript:alert(1))\n\n**Bold** and _italic_",
      align: "left",
    },
  ];
  const html = shell(d, { title: "x", body: project(d, d.entries[0]) });
  assert(!html.includes("<script>bad()"));
  assert(!html.includes('href="javascript:'));
  assert(html.includes("&quot; onload=&quot;"));
  assert(html.includes("<strong>Bold</strong>"));
  assert(html.includes("<em>italic</em>"));
  assert.equal(esc('"<>'), "&quot;&lt;&gt;");
});
test("all supported blocks render without remote embeds until an explicit play", () => {
  const html = renderBlocks([
    { type: "quote", text: "A thought", author: "An author" },
    { type: "divider" },
    { type: "image", src: "/assets/media/a.jpg", alt: "An image" },
    {
      type: "gallery",
      layout: "carousel",
      images: [{ src: "/assets/media/b.jpg", alt: "A second image" }],
    },
    { type: "video", provider: "vimeo", video_id: "76979871" },
  ]);
  assert(html.includes("<blockquote"));
  assert(html.includes('tabindex="0"'));
  assert(html.includes("https://vimeo.com/76979871"));
  assert(!html.includes("<iframe"));
});

test("unlisted Vimeo share links preserve the playback hash", () => {
  const video = parseVideo("https://vimeo.com/76979871/abcdef1234");
  assert.equal(video.src, "https://vimeo.com/76979871/abcdef1234");
  const d = copy();
  d.entries[0].blocks = [{ type: "video", ...video }];
  const block = validateCatalog(d).entries[0].blocks[0];
  assert(renderBlocks([block]).includes('data-video-hash="abcdef1234"'));
  assert.deepEqual(
    parseVideo("https://vimeo.com/76979871?h=abcdef1234"),
    video,
  );
});
