# Hosting and release handoff

Keep DNS management at Wix. The public site and the `/admin/` editor interface use GitHub Pages at `https://rbarela.com`. The editor calls a separate authenticated API at `https://r-barela-editor.jogo.workers.dev`. This follows Chile Drop's static admin plus Worker pattern; it needs neither a Cloudflare zone for rbarela.com nor Cloudflare Access.

The approved editors are `alonso@hey.com` and `barelarhiannon@gmail.com`, configured in `worker/wrangler.jsonc`. Both have full editing and publishing access. The public editor HTML/JavaScript contains no credentials, drafts or staged media. The API requires a valid bearer session and the exact `https://rbarela.com` Origin. CORS is an additional browser boundary, not authentication.

## Configure once

1. Keep the current Wix records, GitHub Pages custom domain and enforced HTTPS. No additional DNS records are needed for the editor when using an already verified email sender.
2. Keep all content in the public `aindaco1/rhiannon-portfolio` repository, following Pool's working-copy pattern. Save writes `_editor/catalog.json`; uploads write immutable assets. The build excludes drafts and unreferenced media from the website. **Saved drafts and uploads are visible in GitHub source/history**, even before publication. This is the owner-selected visibility model; no separate drafts repository is used.
3. Create a private GitHub App for this account, with **Contents: read/write**, **Actions: read**, and mandatory **Metadata: read**. Disable webhooks and OAuth/user authorization; installation tokens handle server-side publication. Install it only on `aindaco1/rhiannon-portfolio`. Put its client ID, installation ID and PKCS#8 private key in Worker secrets. Convert a downloaded PKCS#1 key with `openssl pkcs8 -topk8 -nocrypt -in downloaded.pem -out private-pkcs8.pem` if needed. Never put keys in Pages, source control or browser configuration.
4. Use the dedicated `r-barela-editor-sessions` D1 database bound as `DB`; its ID is in `worker/wrangler.jsonc`. Run `wrangler d1 migrations apply DB --remote --config worker/wrangler.jsonc` before deployment. Do not use Chile Drop's database or secrets.
5. Configure a separate sending-only `RESEND_API_KEY` restricted to a verified sender domain and an `EMAIL_FROM` sender on that domain. The existing verified `dustwave.xyz` sender can be used without changing rbarela.com DNS. If a rbarela.com sender is desired later, add the email provider's verification records at Wix; nameservers still stay at Wix.
6. Set the three GitHub App values and the two email values from `worker/.dev.vars.example` using Worker secrets. Keep the approved email allowlist and origins in the checked-in configuration. `wrangler secret put NAME --config worker/wrangler.jsonc` accepts each value on stdin. Avoid credentials in command arguments or logs.
7. Run `npm run check` and `npm run build:production`, then deploy `worker/wrangler.jsonc` using the authenticated Wrangler CLI. `workers_dev` is enabled and preview URLs are disabled. The Worker serves only API/authenticated editor media; Pages serves the editor shell built into `dist/admin/`. `admin/config.json` contains only the public API origin.
8. Complete hosted acceptance below, then publish the tested site revision to `main`. An App publication commit triggers the normal Pages workflow. The public Platform submodule needs no extra read secret.

The loopback editor retains its existing local cookie/session behavior and isolated `.local/` storage. That bypass does not exist in the Worker.

## Sign-in and editor media

An approved email receives a single-use sign-in link valid for 15 minutes, returning to `/admin/#token=...`. The editor immediately removes the fragment and exchanges the link for an eight-hour session stored in that browser tab's session storage. D1 stores token hashes. Logout revokes the session, and removing an email from `EDITOR_EMAILS` denies its existing sessions. Login requests have email and IP rate limits; unapproved addresses receive the same generic success message without an email.

Editor images, PDFs and videos are fetched using the session header, then shown with temporary browser blob URLs. Preview uses the public renderer with authenticated media substitutions. Logout clears the rendered content and blob URLs. An expired session preserves the browser recovery copy. No bearer tokens are placed in media URLs.

## Publication behavior

Save writes `_editor/catalog.json` and its published baseline to the same repository. Uploads receive immutable SHA-256 paths there. These files are visible on GitHub, while the website artifact contains only media referenced by published content. Draft-only commits do not deploy Pages; an asset upload may rebuild the unchanged public catalog.

Publish validates the saved draft, verifies every referenced image/video/PDF, and checks both working and published revisions. It updates `content/catalog.json` and the working copy's baseline in one non-forced Git commit. A concurrent save or publication returns a conflict instead of silently replacing newer content. After a lost response, reload the saved state before retrying. A public build failure leaves the previous Pages artifact live.

The editor reports the Pages workflow for the exact publication commit. `/release.json` records the actually deployed source revision; compare it during live acceptance. A successful workflow result alone does not replace that check. Direct edits to the public catalog require reconciling any older working copy, using a recovery copy as needed.

## First hosted acceptance

The local test suite uses test email delivery, a local SQLite adapter for session SQL, mocked GitHub responses, and browser API fixtures. Those checks do not establish live email delivery, Cloudflare limits or GitHub App installation permissions.

Before calling the hosted editor operational, verify:

- Anonymous API and editor-media requests fail; unapproved origins get no permissive CORS headers. Anonymous `/admin/` serves only the login screen.
- Both approved editors can request and use an email link; expiry, reuse and logout are rejected. Do not send test emails without the owner's authorization.
- An uploaded image/PDF/video and saved draft survive reload and render in preview. Unreferenced media and draft entries stay out of Pages until publication; their repository source is visible on GitHub as agreed.
- Publish copies only included content; reload after a lost response preserves a consistent draft baseline; the workflow and public `/release.json` match the resulting commit.
- Maximum supported image/PDF (5 MB) and video (25 MB) uploads and a representative multi-file publication fit the actual Worker plan's memory, CPU and subrequest limits.
- Safari and an owner editing rehearsal work. Existing Store, Pool and Chile Drop services remain unchanged.

## Rollback

For a failed build, keep the prior Pages deployment and fix the saved draft. To roll back a successful release, revert its publication commit and let Pages build again. The atomic commit includes both the published catalog and working baseline; download a recovery copy before reconciling later edits. Preserve immutable media so older revisions can still reference it. Worker code can be rolled back independently; do not roll back the session schema without checking its compatibility.
