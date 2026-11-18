# Development

**Audience:** developers and maintainers working in a local checkout.

## Setup

Match [CI](../.github/actions/verify-site/action.yml): Node 26.12.1 and Ruby 3.3. The supported Node range is in [package.json](../package.json); Bundler’s lockfile version is in [Gemfile.lock](../Gemfile.lock).

```sh
git clone --recurse-submodules https://github.com/aindaco1/rhiannon-portfolio.git
cd rhiannon-portfolio
bundle install
npm ci
npx playwright install chromium
npm run check:pin
npm run dev
```

For an existing checkout, inspect `git status --short`, then initialize the submodule with `git submodule update --init --recursive`. The public Platform submodule needs no extra read token. Use `npm ci` for repeatable installs; use dependency-update commands only when intentionally changing the lockfile.

Open the printed **127.0.0.1** URLs: portfolio on 4321 and admin on 4322. The host check rejects alternate hostnames, including a `localhost` URL. This server is local-only and uses a process-specific HttpOnly cookie instead of hosted email sign-in. Restarting it invalidates that local session; reopen `/admin/`.

## Know which content you are editing

| Command or surface | Reads/writes |
| --- | --- |
| `npm run build` / `build:production` | Reads tracked `content/catalog.json`; generates `.build/`, `dist/`, and `.admin-build/` |
| First `npm run dev` | Seeds a missing `.local/state.json` from the tracked catalog |
| Later `npm run dev` | Reuses the saved local draft and published snapshot; rebuilds the published snapshot |
| Local editor Save | Writes the draft in `.local/state.json` |
| Local editor Publish | Builds and switches `.local/live/`; retains the previous artifact in `.local/previous/` |
| Hosted editor | Uses GitHub working/public catalogs and immutable assets through the Worker |

There is no automatic synchronization between these stores. A Git pull does not replace an existing local draft. A local Publish does not commit content or deploy the website. Never copy the tracked catalog over local state to refresh CSS or templates.

There is no source watcher. Restart `npm run dev` after source changes to reload server modules, rebuild the local published pages, and rebundle admin assets. `npm run build` alone does not refresh `.local/live/`.

## Isolated content work

For a disposable preview without touching the owner’s store:

```sh
DATA_DIR=.local/rehearsal PORT=4331 ADMIN_PORT=4332 npm run dev
```

That directory persists until explicitly removed. Set `SEED_CATALOG=tests/fixtures/catalog.json` before first creation to start with fixtures. It has no effect once state exists. Use adjacent public/admin ports: the local UI derives its public link from the admin port minus one.

Builds and test servers in one checkout share `.admin-build/`; normal builds also share `.build/` and `dist/`. Run them sequentially. Use a separate checkout for concurrent builds or incompatible code versions.

## Common changes

- Content: prefer the appropriate editor. A direct public-catalog edit must account for the hosted working-copy baseline; see [Operations](OPERATIONS.md).
- Layout: change [views](../lib/views.mjs) and [CSS](../assets/css/site.css). Keep header rules shared across page types.
- Blocks: the schema/renderer lives in [content.mjs](../lib/content.mjs), while composer behavior comes from Platform. Update validation, preview, build, and the consumer adapter together when changing a block contract.
- Platform: update the submodule commit and [platform.json](../platform.json) together, then run `npm run check:pin` and the affected integration gate.
- Media: use the upload controls or a reviewed import with backups and revision checks. See [Media pipeline](MEDIA_PIPELINE.md).

Do not use `scripts/seed.mjs` as setup. It is an explicit sample generator that overwrites the tracked catalog and photo-source document.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Port already occupied | Identify the owning process before stopping it; use another adjacent port pair if needed |
| Old content after pulling | Existing local state is intentional; compare it with source before reconciling |
| Old code after editing | Restart the server, then reload the admin tab |
| Platform mismatch | Restore the recorded submodule or deliberately update the pin; do not bypass the check |
| Missing image/PDF/video at build | Check catalog references, tracked assets, and the selected local store’s `assets/` directory |
| Ruby/native module install fails | Check runtime versions and lockfiles before changing dependencies |

Use [Quality assurance](QUALITY_ASSURANCE.md) for verification commands and [Operations](OPERATIONS.md) for recovery. Never delete state as a routine troubleshooting step.
