# Hosting and release handoff

The source repository is public by owner request. GitHub Pages uses the Actions workflow and the custom domain `rbarela.com`. The production catalog uses `https://rbarela.com` with preview mode disabled. Each successful deployment records its source commit in `/release.json`. The hosted editor remains disabled pending private draft storage and Access setup. The approved admins are `alonso@hey.com` and `barelarhiannon@gmail.com`, configured in `worker/wrangler.jsonc` under `EDITOR_EMAILS`. The existing Store and Pool releases are unchanged.

The current hosted editor stores drafts and staged uploads in its configured GitHub repository. It must not use this public repository for private drafts: excluding files from the Pages artifact does not hide them from repository visitors. Keep using the local editor until private draft storage and publication to this public repository are implemented and verified.

## Configure once

1. Use `rbarela.com` for the public site and confirm the public contact email. Use the approved admin allowlist in `worker/wrangler.jsonc` for editor access.
2. Use the public `aindaco1/rhiannon-portfolio` repository with its pinned Platform submodule. Local editor state, environment files and build output remain ignored. This public-repository decision supersedes the original private-repository plan; the hosted editor needs the storage change described above before deployment.
3. The Platform submodule is public, so CI can use the standard Actions token; no `PLATFORM_READ_TOKEN` secret is needed for the current dependency. Enable GitHub Pages with Actions, set the custom domain to `rbarela.com`, and enable HTTPS when available. Before a production build, complete the content review below, set `profile.url` to `https://rbarela.com`, and set `demo` to `false` in `content/catalog.json`.
4. Create a GitHub App installed **only on this portfolio repository**, with Contents read/write and Actions read. Keep its client ID, installation ID and PKCS#8 private key in Worker secrets. An App commit triggers the Pages workflow; it does not require a personal token.
5. Create a Cloudflare Access application for the full editor hostname with an allow policy matching the two `EDITOR_EMAILS` addresses in `worker/wrangler.jsonc`. Configure `ADMIN_ORIGIN`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` and the GitHub values shown in `worker/.dev.vars.example` as Worker secrets/configuration. The email allowlist is already a Worker variable; do not replace it with a secret or duplicate override. Set the Worker’s custom domain/route only after Access covers it.
6. Run `npm run build` to produce `.admin-build`. Deploy `worker/wrangler.jsonc` with an authenticated Wrangler installation. `workers_dev` and preview URLs are disabled; `run_worker_first` enforces JWT verification before **every** asset, media and API request. The Worker rejects missing configuration, unexpected origins, invalid audiences and unapproved emails.

Do not copy the local preview session mechanism into production. It exists only in the Node loopback server; it is absent from the Worker bundle.

## Prepare real content

The production catalog includes twenty real projects and three supplied Writing pieces, with no sample or draft entries. Preview mode is disabled, the site URL is `https://rbarela.com`, and the public contact email is `barelarhiannon@gmail.com`. Future content updates should preserve verified roles and credits. Both the Worker and `build:production` refuse sample entries and references to the known `sample-*` stock photos. The build also requires the real HTTPS site URL and public contact email. Generated pages include canonical/Open Graph tags and a sitemap.

## Publication behavior

A draft save writes `_editor/catalog.json` with the exact published content SHA it was based on. Uploaded files get immutable SHA-256 filenames. They are stored in the private repository but excluded from public output until referenced by published content. Publication validates the saved draft, verifies referenced media, checks both working and published revisions, and commits the published catalog and updated draft baseline atomically. A conflicting save returns 409 and keeps the browser’s edits available for download.

The Pages workflow validates/builds/tests before deploying. The admin reports the workflow for the exact publication commit as queued, publishing, live or failed. A failing build leaves the previous Pages artifact live. The exact deployed source commit is recorded in `/release.json`. Draft-only commits do not trigger Pages. Staged-media-only commits may rebuild the unchanged public content, but the staged media is never included in the artifact.

If another person changes the published catalog directly while a draft is open, reconcile the content in Git after downloading the editor’s recovery copy. The editor deliberately refuses to silently rebase an old draft onto a newer publication.

## First hosted acceptance

Before calling the site live, verify anonymous requests and alternate hostnames are blocked for the editor; both approved editors can log in; an image/draft survives reload; draft URLs and media return 404 on the public origin; publish creates the expected commit; CI deploys that exact commit; the public page and `/release.json` agree; and failed publication preserves the prior live site. Check Safari and complete an owner editing rehearsal. These live provider steps have not been performed by the local build.

## Rollback

For a failed build, leave the prior Pages deployment in place and fix the saved draft. To roll back a successful release, revert its publication commit in Git and let the full Pages gate run again. Reverting the atomic commit restores both published content and its corresponding working baseline. Keep media: immutable files can be reused by either revision. Reopen the editor and reconcile any browser recovery copy against the restored revision.
