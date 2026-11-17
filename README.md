# R. Barela

A static portfolio and a small browser editor. Twenty fictional projects demonstrate art, makeup, props, sets and film. The interface takes its typography and spacing from The Dare and its discipline navigation and reading layout from The Creative Independent.

## Run locally

Requires a supported Node runtime (26.12.1 used here), Ruby/Bundler and Git access to Dust Wave Platform.

```sh
git submodule update --init --recursive
npm ci
bundle install
npm run dev
```

- Portfolio: http://127.0.0.1:4321
- Editor: http://127.0.0.1:4322/admin/

The editor automatically starts a local session on the loopback address. It cannot be reached over the LAN. Local drafts, staged photos and published pages persist in ignored `.local/`; the committed sample content is never rewritten by the local editor. Stop and restart the server to rebuild source changes. Publishing in the local editor rebuilds the visitor site immediately. The previous local artifact is retained in `.local/previous` until the next successful publish.

## Editing

1. Add a project, title, introduction and cover photograph.
2. Select categories and tags, or create them under **Categories & tags**. Rename labels without changing their URLs. Reassign entries before deleting a term.
3. Write with the shared block editor. Text, headings, lists, links, quotes, photos, galleries, YouTube/Vimeo and dividers are supported. Select a block for formatting and move controls; use the plus buttons or `/image`, `/gallery`, etc. Undo reverses block edits.
4. **Save draft** persists the working portfolio. It does not publish text or photos. Browser recovery is a fallback, not the durable store. **Preview** renders the current project with the same presentation code as the public build.
5. Check **Include when publishing** for entries that should appear. **Publish changes** publishes all pending included entries, taxonomy and profile changes together. Draft-only entries remain private.

Journals use the same editor and page template. No Journal link appears until a journal entry is published. Contact points to Instagram until a real email is provided.

Photos: JPG, PNG and WebP, up to 5 MB / 40 megapixels. Prepare camera originals separately. The build creates 800px WebP derivatives; uploaded originals must already be web-ready. Movies stay on YouTube or Vimeo and load only after the visitor chooses Play.

## Structure and reuse

- `content/catalog.json`: the public, versioned content model. One small catalog avoids a database and duplicate front-matter parsers.
- `_editor/catalog.json`: production working copy and its published baseline, in the private repository only.
- `assets/media/`: immutable uploads and sample photographs. Only media referenced by published entries is copied into the visitor artifact.
- `lib/content.mjs`: one validation and block-rendering contract shared by preview, Worker and build.
- `lib/views.mjs`: the common page templates. Jekyll’s small default layout emits prepared HTML without interpreting authored Liquid tags.
- `admin/`: portfolio forms and thin shared-editor adapter.
- `worker/`: Cloudflare Access authentication and GitHub App storage adapter.
- `scripts/local-store.mjs`: local disk implementation of the same storage contract.

Dust Wave Platform is pinned to **v0.50.0**, commit `fa363d72d3e5c15dbdb6f9596bb80c41ebbbda8d`. The app uses its shared block composer/model, rich-text codec and paste sanitization, media-target/removal controls, API client, unsaved-change guard, draft-baseline recovery, bounded request/response readers, GitHub transport, and asset minifier. No editor code was copied from Store or Pool. No React, Vite, database, or duplicate project/post editor.

The single catalog is deliberate: this is a small, two-editor portfolio. Saves use optimistic revisions and publish as an atomic multi-file Git commit; concurrent edits are rejected instead of merged silently. Download a recovery copy before reconciling a conflict.

## Verify

```sh
npm run check
npm audit
npm run build:production
```

The last command **must fail** while sample content is enabled. Browser tests use a separate `.local/browser-tests` store and ports 4325/4326. They use a fixed catalog in `tests/fixtures/` and never write to your preview state or a live repository. Keep the unreferenced `sample-*` image files for these fixtures; the production build excludes them when no published entry uses them. The production Worker bundles for Cloudflare and has no local authentication bypass.

See [deployment](docs/DEPLOYMENT.md), [acceptance evidence](TASK.md), and [photo sources](docs/IMAGE-SOURCES.md). The original [plan](PLAN.md) remains as the design/scope record; the shared-editor prerequisite is now complete.
