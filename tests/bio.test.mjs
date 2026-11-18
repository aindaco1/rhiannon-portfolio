import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateCatalog,
  bioBlocks,
  bioPdf,
  BIO_PDF_PATH,
  mediaReferences,
  rich,
} from "../lib/content.mjs";
import { bio } from "../lib/views.mjs";
const seed = JSON.parse(
  await readFile(new URL("./fixtures/catalog.json", import.meta.url)),
);

test("legacy Bio loads without rewriting its text, headings or links", () => {
  const catalog = structuredClone(seed);
  catalog.profile.bio =
    "A **biography** with [a link](https://example.com).\n\n## Credits\n\n- First credit\n- Second credit";
  const result = validateCatalog(catalog);
  assert.equal(result.profile.bio, catalog.profile.bio);
  assert.equal(bioBlocks(result.profile)[0].body, catalog.profile.bio);
  assert(bio(result).includes(rich(catalog.profile.bio)));
});

test("Bio blocks share validation and media publication boundaries with entries", () => {
  const catalog = structuredClone(seed);
  catalog.profile.bio = [
    { type: "text", body: "A **formatted** biography.", align: "left" },
    {
      type: "image",
      src: "/assets/media/portrait.jpg",
      alt: "Artist portrait",
    },
  ];
  const valid = validateCatalog(catalog);
  assert(bio(valid).includes("<strong>formatted</strong>"));
  assert(mediaReferences(valid, true).includes("/assets/media/portrait.jpg"));
  assert(!mediaReferences(seed, true).includes("/assets/media/portrait.jpg"));
  catalog.profile.bio[1].src = "https://example.com/image.jpg";
  assert.throws(() => validateCatalog(catalog), /Images must be uploaded/);
  catalog.profile.bio = [{ type: "html", body: "<script>bad()</script>" }];
  assert.throws(() => validateCatalog(catalog), /Unsupported content block/);
  catalog.profile.bio = Array.from({ length: 101 }, () => ({
    type: "text",
    body: "Text",
  }));
  assert.throws(() => validateCatalog(catalog), /At most 100 blocks/);
});


test("legacy PDF links survive and replacements require an uploaded document", () => {
  assert.equal(bioPdf(validateCatalog(seed).profile).src, BIO_PDF_PATH);
  assert(bio(seed).includes(`href="${BIO_PDF_PATH}"`));
  const catalog = structuredClone(seed);
  const src = `/assets/documents/${"a".repeat(64)}.pdf`;
  catalog.profile.bioPdf = { src, name: "Updated résumé.pdf" };
  assert.deepEqual(validateCatalog(catalog).profile.bioPdf, catalog.profile.bioPdf);
  assert(bio(catalog).includes(`href="${src}"`));
  assert(!mediaReferences(catalog).includes(src));
  for (const path of ["https://example.com/bio.pdf", "/assets/documents/../../secret.pdf", "/assets/media/photo.jpg", "/assets/documents/unuploaded.pdf"]) {
    catalog.profile.bioPdf.src = path;
    assert.throws(() => validateCatalog(catalog), /uploaded bio and résumé PDF/);
  }
  catalog.profile.bioPdf = { src, name: "" };
  assert.throws(() => validateCatalog(catalog), /PDF filename/);
});
