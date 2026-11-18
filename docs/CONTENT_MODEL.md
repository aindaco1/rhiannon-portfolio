# Content model

**Audience:** maintainers, import authors, and editor-integrators. Normal authoring belongs in the [editor guide](EDITOR_GUIDE.md).

[lib/content.mjs](../lib/content.mjs) is the executable schema. Use `validateCatalog(input, {previous, production})`; do not create a separate import validator. Validation returns a normalized clone and does not write storage.

## Catalog and profile

The catalog has `schemaVersion: 1`, `demo`, `profile`, `categories`, `tags`, and `entries`. `publicCatalog()` filters entries to `status: "published"`; profile and taxonomy are shared across the whole publication.

| Profile field | Contract |
| --- | --- |
| `name`, `intro` | Required identity and introduction; limits 100 / 300 characters |
| `bio` | Shared block array; legacy nonempty Markdown strings remain supported and normalize for editing |
| `email` | Public contact address; required for production, distinct from the editor roster |
| `instagram`, `imdb` | Validated HTTPS profile/name URLs |
| `url` | HTTPS origin without a trailing slash; required for production and used for canonical metadata |
| `bioPdf` | Optional `{src, name}` selecting the downloadable PDF; absence falls back to the original supplied PDF |
| `portrait` | Optional legacy image path; current headshots use an Image block |

Leading Bio Image/Video blocks render in the left column; the first non-image/video block begins the main reading content. A later image stays in that reading content. PDF replacement does not rewrite Bio text.

## Entries and taxonomy

Entries share `{id, slug, kind, status, sample, title, intro, role, credits, year, date, categories, tags, cover, blocks}`. Writing uses `kind: "post"`; projects use `"project"`. Visibility is `"draft"` or `"published"`. Writing still has normalized year/cover fields in storage even when those controls are not shown.

- IDs are unique; URLs are unique per kind. Existing ID/kind/slug relationships remain stable when saving against `previous`.
- Titles are required and limited to 150 characters. Introduction and role can be empty. Credits are plain text, limited to 4,000 characters.
- Years accept 1900–2100, either a single year or an ascending range. A single year normalizes to a number; a range to an en-dash string. Dates use `YYYY-MM-DD` and must parse as a date.
- Published projects need at least one category and a cover image. Writing has no mandatory cover, category, introduction, or role.
- Categories and tags are `{id, slug, label}` objects. Labels are limited to 60 characters; each collection allows 100 terms. IDs/slugs must be unique within their collection, and an existing term’s slug stays stable.
- Entry term arrays reference term IDs without duplicates. Reassign references before deleting a term.
- The catalog allows 200 entries. Project sorting is descending by starting year with stable tie order; writing is descending by publication date.

Production requires `demo: false`, a public origin and contact email, no published sample entries, and no referenced `sample-*` photographs. Keeping unused fixture files in the repository is allowed.

## Blocks and media

Supported block types are `text`, `quote`, `image`, `gallery`, `video`, and `divider`, with up to 100 blocks per entry or block-based Bio. Text uses the shared restricted Markdown/WYSIWYG codec, not arbitrary HTML. Alignment is left, center, right, or justify.

Images store `src`, `alt`, optional `caption`, and `decorative`. Nondecorative images with a source need a description. Galleries contain up to 30 images in authored order and support grid or carousel layout. The shared model retains caption-style metadata; the portfolio renderer currently shows captions inline.

Video providers are `youtube`, `vimeo`, or `local`. Provider IDs/URLs are validated; local video references use SHA-256 MP4 paths. The PDF has its own document path contract. Exact limits and preparation guidance live in [Media pipeline](MEDIA_PIPELINE.md).

## Public paths

| Content | Route |
| --- | --- |
| Work index | `/` |
| Project | `/work/{slug}/` |
| Writing index / piece | `/writing/`, `/writing/{slug}/` |
| Bio | `/bio/` |
| Used category / tag | `/category/{slug}/`, `/tag/{slug}/` |
| Earlier entry points | `/about/` → Bio; `/journal/` and published `/journal/{slug}/` → Writing |

The compatibility pages are HTML redirects, not server-side 301 responses. Taxonomy archives are generated only for terms used by published entries. Navigation counts published projects; tags can also be attached to Writing. Saved title/label changes keep existing paths.
