# R. Barela portfolio — acceptance record

Built November 17, 2026 in `/Users/aindaco1/Library/Mobile Documents/com~apple~CloudDocs/rhiannon-portfolio`.

**Outcome:** a working local portfolio and browser editor, with 20 clearly labeled fictional projects across Art, Makeup, Props, Sets and Film. Typography and whitespace follow The Dare; visible categories, metadata and reading columns follow the Creative Independent reference. Dummy photographs are credited stock images, not artist credits. The public site and editor are available on loopback ports 4321 and 4322.

**Shared foundation:** Platform v0.50.0, `fa363d72d3e5c15dbdb6f9596bb80c41ebbbda8d`; exact package versions in `platform.json`. The shared composer/model, codec, media identity/removal, API client, recovery/unsaved guards, request boundaries, GitHub transport and asset minifier are used directly. Store, Pool and Platform were not modified. One content model and one editor serve projects and journal entries. Git is the production store; local disk implements the same contract for development. No database or frontend framework was added.

## Acceptance evidence

Environment: macOS arm64; Node 26.12.1; Ruby 3.0.0 / installed GitHub Pages Jekyll bundle for local builds; Playwright 1.65.1 Chromium 159. CI is configured for Node 26.12.1 and Ruby 3.3. Tests exercise an isolated `.local/browser-tests` store on ports 4325/4326; no production services or user preview data are written by tests.

| Claim | Expected and observed | Evidence / boundary |
| --- | --- | --- |
| Responsive public portfolio | 20 projects; five disciplines; category/tag/detail/contact navigation; no horizontal overflow at 320, 390, 768 and 1440px; image decoding succeeds. | Actual Chromium; `docs/evidence/final-browser-check.log`, home screenshots. |
| Progressive navigation and accessibility | Core navigation works with JavaScript disabled. Public archive/project/About and mobile editor have zero tested WCAG A/AA axe violations. Keyboard skip link works. | Actual Chromium + axe; finite automated coverage, not a complete manual accessibility audit. |
| Authoring and publication | Owner creates taxonomy, uploads a photo, formats text, adds/reorders/undoes blocks, saves/reloads, previews and publishes. New category and page appear; a staged photo is 404 before publication. | Actual local browser → API → disk → Jekyll → visitor page rehearsal. |
| Shared editor and upload identity | A late upload cannot attach to a deleted block. Block reorder, undo, and rich Markdown survive round trips. | Browser tests through the actual Platform composer and consumer adapter. |
| Recovery and concurrency | Browser recovery preserves unsaved text; stale writes return 409 without replacing the winning draft. Failed publication preserves the previous live artifact and the saved working copy. | Local browser/API tests, including missing-media failure. |
| Preview | Protected photos and CSS render; current text uses the shared renderer. Preview navigation opens the public site separately. Preview does not execute authored scripts. | Browser assertions of loaded image, computed Helvetica font and popup destination; inspected `preview.png`. |
| Journal | Same editor; navigation absent until a post is included and published. | Actual local publication and URL checks. No posts remain in the delivered 20-project content. |
| Security boundaries | JWT signature/audience/expiry/email checks; missing configuration fails closed; cross-origin writes, unsupported media, oversized bodies and unsafe content fail. | 19 Node tests; Access/JWKS and GitHub endpoints are simulated. The Worker bundle compiles for the browser/Workers runtime. |
| Deployment guard | Production rejects preview mode, sample entry flags, known stock-photo paths and missing domain/contact. Private catalog/admin/tooling never enter the public source directory. | `build:production` intentionally exits 1 on the delivered sample content; public `_editor` path returns 404. |
| Dependencies and identity | Exact Platform pin passes. npm audit reports 0 vulnerabilities; no inherited Store/Pool exception is used. | `npm-audit.json`, `platform.json`, `source-sha256.json`. |

Validation: **19/19 Node tests and 15/15 browser tests passed.** `npm run check` passed; final affected checks and the full browser suite passed after preview hardening. Logs: `verification.log`, `unit-results.log`, `final-browser-check.log`. A separate actual Jekyll build confirmed authored `{{ ... }}` and `{% ... %}` remain literal. Source hashes in `docs/evidence/source-sha256.json` identify the tested owned source, excluding generated evidence and this record to avoid self-reference.

Inspected screenshots: desktop/mobile home, desktop project, reading column, shared editor, mobile editor and protected preview. During verification, an actual toolbar layout shift caused Undo clicks to miss; reserving toolbar space fixed it. The preview originally lost authenticated styles/photos in its opaque sandbox; a same-origin, script-disabled preview now renders correctly. Save normalization was also corrected so a completed save clears dirty state. The focused checks now cover these regressions.

## Handoff and limits

The local implementation is complete. The Cloudflare Worker and GitHub Pages workflows are implemented and checked locally; **no portfolio repository was pushed, no production services were provisioned, and no public deployment was made**. Live Access login, GitHub App publication, remote CI/Pages deployment, private-repository Pages entitlement and a real owner editing rehearsal remain unverified. Those require the existing domain, approved editor/contact emails and service configuration. Safari/manual assistive-technology review remains a launch check.

Replace sample content and verify biography/credits before launch. Until a contact email is supplied, Contact links to the provided Instagram profile. IMDb is linked as supplied; no credits were inferred. Read `docs/DEPLOYMENT.md` for configuration and rollback. A successful local publish retains the previous local artifact; production rollback is a revert of the atomic publication commit followed by the normal release checks. Draft media remains private unless referenced by published content.

Applicable guidance: development-task skill and acceptance-evidence procedure; Sites design and local-preview guidance, retaining the explicitly agreed Jekyll/Cloudflare/Git stack. Attached reference instructions were treated as reference material. No memory updates or external messages were made.
