# R. Barela

A static portfolio and a small browser editor. Retablos and Woodcarvings contain 20 selected artwork images from 2014–2026. Sketches adds 21 drawings and illustrations from 2021–2026. Twenty fictional projects still demonstrate art, makeup, props, sets and film; two clearly labeled sample pieces demonstrate free-form Writing. The interface takes its typography and spacing from The Dare and its discipline navigation and reading layout from The Creative Independent.

## Run locally

Requires a supported Node runtime (26.12.1 used here), Ruby/Bundler and Git access to Dust Wave Platform.

```sh
git submodule update --init --recursive
npm ci
bundle install
npm run dev
```

- Portfolio: http://127.0.0.1:4321
- Writing: http://127.0.0.1:4321/writing/
- Bio: http://127.0.0.1:4321/bio/
- Editor: http://127.0.0.1:4322/admin/

The editor automatically starts a local session on the loopback address. It cannot be reached over the LAN. Local drafts, staged photos/PDFs and published pages persist in ignored `.local/`; the committed sample content is never rewritten by the local editor. Stop and restart the server to rebuild source changes. Publishing in the local editor rebuilds the visitor site immediately. The previous local artifact is retained in `.local/previous` until the next successful publish.

## Editing

1. Add a project, title, introduction and cover photograph. The **Year or range** field accepts a single year (2026) or a span (2014–2026).
2. Select categories and tags, or create them under **Categories & tags**. Rename labels without changing their URLs. Reassign entries before deleting a term.
3. Write with the shared block editor. Text, headings, lists, links, quotes, photos, galleries, YouTube/Vimeo, uploaded MP4 loops and dividers are supported. Select a block for formatting and move controls; use the plus buttons or `/image`, `/gallery`, etc. Undo reverses block edits.
4. **Save draft** persists the working portfolio. It does not publish text, photos or PDFs. Browser recovery is a fallback, not the durable store. **Preview** renders the current project with the same presentation code as the public build.
5. Check **Include when publishing** for entries that should appear. **Publish changes** publishes all pending included entries, taxonomy and profile changes together. Draft-only entries remain private.

For free-form text, open **Writing → New piece +**, add a title and write in **The writing** using the same WYSIWYG editor. The introduction, cover, categories and tags are optional; expand **Images, topics & page details** to set them. Use **Save draft** and **Preview** while working, then check **Include this piece when publishing** and choose **Publish changes**. Publishing includes all saved pending changes across the site.

Writing has a permanent navigation link, a newest-first index, and a dedicated reading layout: a narrower text column, author/date/reading-time details, and optional images. Previously shared `/journal/` URLs redirect to `/writing/`. The two demo pieces are labeled as sample text, not R. Barela’s writing, and production validation rejects them until removed or replaced.

Bio contains the supplied biography and résumé, a downloadable PDF (initially the supplied original), and the listed contact email. The header has the name and Work, Writing and Bio navigation; the footer retains a direct contact link. Old `/about/` links redirect to `/bio/`. Under **Bio & contact** in the admin, edit the introduction and use the shared WYSIWYG block editor for the biography and résumé. The headshot is an Image block: use **Choose photo** to replace it, **Image description** to edit its accessible description, or **Remove photo** to remove it. Formatting, links, lists, images, undo, **Save draft**, **Preview**, and **Publish changes** work as they do for projects and Writing. Contact links and site settings are in a disclosure below the editor. **Upload or replace PDF** accepts a PDF up to 5 MB. The selected filename links to a private download for review. **Save draft** keeps the selection; **Publish changes** updates the public Bio download. Until publication, visitors keep the previous PDF. The page text and PDF are edited separately. Existing profiles keep the original `assets/documents/r-barela-bio-resume.pdf` until a replacement is selected.

Photos: JPG, PNG and WebP, up to 5 MB / 40 megapixels. Prepare camera originals separately. The build creates 800px WebP derivatives; uploaded originals must already be web-ready. Project thumbnails, covers and galleries show complete images without cropping the artwork. Movies can use YouTube or Vimeo links, or a prepared H.264 MP4 loop up to 10 MB through **Video → Video source → MP4 loop → Upload or replace MP4**. Prepare large originals separately. Playback starts when the visitor chooses Play; uploaded MP4s repeat and preserve their audio. MP4 containers and upload sizes are validated, but the admin does not transcode or inspect codecs.

## Structure and reuse

- `content/catalog.json`: the public, versioned content model. One small catalog avoids a database and duplicate front-matter parsers.
- `_editor/catalog.json`: production working copy and its published baseline, in the private repository only.
- `assets/media/`: immutable photo uploads and sample photographs. Only media referenced by the published profile and entries is copied into the visitor artifact.
- `assets/documents/`: the original bio/résumé PDF and immutable replacements. Only the selected PDF is copied into the visitor artifact; earlier uploads stay in private storage.
- `lib/content.mjs`: one validation and block-rendering contract shared by preview, Worker and build.
- `lib/views.mjs`: the common page templates. Jekyll’s small default layout emits prepared HTML without interpreting authored Liquid tags.
- `admin/`: portfolio forms and thin shared-editor adapter.
- `worker/`: Cloudflare Access authentication and GitHub App storage adapter.
- `scripts/local-store.mjs`: local disk implementation of the same storage contract.

Dust Wave Platform is pinned to **v0.50.0**, commit `fa363d72d3e5c15dbdb6f9596bb80c41ebbbda8d`. The app uses its shared block composer/model, rich-text codec and paste sanitization, media-target/removal controls, API client, unsaved-change guard, draft-baseline recovery, bounded request/response readers, GitHub transport, and asset minifier. No editor code was copied from Store or Pool. No React, Vite, database, or duplicate editor. Projects, Writing and Bio use one composer integration. Bio accepts existing Markdown and saves block content after its first editor change.

The single catalog is deliberate: this is a small, two-editor portfolio. Saves use optimistic revisions and publish as an atomic multi-file Git commit; concurrent edits are rejected instead of merged silently. Download a recovery copy before reconciling a conflict.

## Verify

```sh
npm run check
npm audit
npm run build:production
```

The last command **must fail** while sample content is enabled. Browser tests use a separate `.local/browser-tests` store and ports 4325/4326. They use a fixed catalog in `tests/fixtures/` and never write to your preview state or a live repository. Keep the unreferenced `sample-*` image files for these fixtures; the production build excludes them when no published entry uses them. The production Worker bundles for Cloudflare and has no local authentication bypass.

See [deployment](docs/DEPLOYMENT.md), [initial acceptance evidence](TASK.md), [Writing acceptance evidence](docs/WRITING-TASK.md), [Bio acceptance evidence](docs/BIO-TASK.md), [Bio editor acceptance](docs/BIO-EDITOR-TASK.md), [PDF upload acceptance](docs/PDF-UPLOAD-TASK.md), and [photo sources](docs/IMAGE-SOURCES.md). The original [plan](PLAN.md) remains as the design/scope record; the shared-editor prerequisite is now complete.
