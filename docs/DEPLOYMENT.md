# Hosting and release handoff

This checkout is a working local build, not a public deployment. Domain, editor email addresses and approved real content are still required. The existing Store and Pool releases are unchanged.

## Configure once

1. Choose the existing domain and confirm the public contact email and the two editor emails.
2. Create/use a **private** GitHub repository. Push this checkout with its pinned Platform submodule. Unpublished content and staged photos must not live in a public repository. GitHub Pages for private repositories requires an eligible account plan; verify this before enabling it. If unavailable, retain the build and use private-repository Cloudflare Pages hosting instead.
3. Give CI a read-only `PLATFORM_READ_TOKEN` for the Platform submodule, unless the repository’s Actions token already has access. Never put tokens in Git URLs. Enable GitHub Pages with Actions and configure the existing domain and HTTPS.
4. Create a GitHub App installed **only on this portfolio repository**, with Contents read/write and Actions read. Keep its client ID, installation ID and PKCS#8 private key in Worker secrets. An App commit triggers the Pages workflow; it does not require a personal token.
5. Create a Cloudflare Access application for the full editor hostname with an allow policy for the two approved email addresses. Configure `ADMIN_ORIGIN`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `EDITOR_EMAILS` and the GitHub values shown in `worker/.dev.vars.example` as Worker secrets/configuration. Set the Worker’s custom domain/route only after Access covers it.
6. Run `npm run build` to produce `.admin-build`. Deploy `worker/wrangler.jsonc` with an authenticated Wrangler installation. `workers_dev` and preview URLs are disabled; `run_worker_first` enforces JWT verification before **every** asset, media and API request. The Worker rejects missing configuration, unexpected origins, invalid audiences and unapproved emails.

Do not copy the local preview session mechanism into production. It exists only in the Node loopback server; it is absent from the Worker bundle.

## Prepare real content

Replace all 20 sample projects/photos with approved material, verify roles and credits, and update the profile/domain/email. Turn off each entry’s sample flag and the portfolio-wide preview flag only after that content pass. Both the Worker and `build:production` refuse sample entries and references to the known `sample-*` stock photos. The build also requires the real HTTPS site URL and public contact email. Generated pages include canonical/Open Graph tags and a sitemap after these are set.

## Publication behavior

A draft save writes `_editor/catalog.json` with the exact published content SHA it was based on. Uploaded files get immutable SHA-256 filenames. They are stored in the private repository but excluded from public output until referenced by published content. Publication validates the saved draft, verifies referenced media, checks both working and published revisions, and commits the published catalog and updated draft baseline atomically. A conflicting save returns 409 and keeps the browser’s edits available for download.

The Pages workflow validates/builds/tests before deploying. The admin reports the workflow for the exact publication commit as queued, publishing, live or failed. A failing build leaves the previous Pages artifact live. The exact deployed source commit is recorded in `/release.json`. Draft-only commits do not trigger Pages. Staged-media-only commits may rebuild the unchanged public content, but the staged media is never included in the artifact.

If another person changes the published catalog directly while a draft is open, reconcile the content in Git after downloading the editor’s recovery copy. The editor deliberately refuses to silently rebase an old draft onto a newer publication.

## First hosted acceptance

Before calling the site live, verify anonymous requests and alternate hostnames are blocked for the editor; both approved editors can log in; an image/draft survives reload; draft URLs and media return 404 on the public origin; publish creates the expected commit; CI deploys that exact commit; the public page and `/release.json` agree; and failed publication preserves the prior live site. Check Safari and complete an owner editing rehearsal. These live provider steps have not been performed by the local build.

## Rollback

For a failed build, leave the prior Pages deployment in place and fix the saved draft. To roll back a successful release, revert its publication commit in Git and let the full Pages gate run again. Reverting the atomic commit restores both published content and its corresponding working baseline. Keep media: immutable files can be reused by either revision. Reopen the editor and reconcile any browser recovery copy against the restored revision.
