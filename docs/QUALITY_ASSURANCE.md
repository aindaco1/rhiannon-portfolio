# Quality assurance

**Audience:** developers, reviewers, and release operators.

## Commands and scope

| Command | Establishes |
| --- | --- |
| `npm run test:docs` | Maintained guide presence, one title, heading anchors, whitespace, and relative links |
| `npm run check:pin` | Platform submodule commit/package versions match the recorded pin |
| `npm test` | Node unit, API, authentication, publication, media, and content contracts |
| `npm run build` | Source catalog renders and referenced media builds into the static artifact |
| `npm run test:browser` | Chromium workflows against a newly created isolated fixture server; run `npm run build` first for the hosted-admin fixtures |
| `npm run check` | Documentation, unit/API tests, build, and browser suite in sequence |
| `npm run build:production` | Production content gate and hosted admin artifact |
| `npm audit` / `npm audit --omit=dev` | Dependency audit used by CI; reports can change independently of code |

Run from the root after the [development setup](DEVELOPMENT.md). The authoritative release gate is the [shared verification action](../.github/actions/verify-site/action.yml), invoked by check and Pages workflows. Read actual results rather than relying on a historical test count.

The documentation checker supports the inline Markdown links used by this handbook. It checks local targets and Markdown heading anchors; external URLs and the accuracy of operational claims still need review. It does not scan generated evidence or rewrite historical task records.

For documentation-only changes, run the documentation check and review commands against their owning source. Run a targeted command/rehearsal for new operational instructions when safe. Do not execute a live mutation solely to validate documentation.

## Test environments

[playwright.config.js](../playwright.config.js) starts [test-server.mjs](../scripts/test-server.mjs), resets only `.local/browser-tests`, and uses ports 4325/4326. It seeds from `tests/fixtures/catalog.json`, not the owner’s catalog. The fixture includes stock assets that must remain in source even though real public content no longer references them.

Hosted browser fixtures read the existing `dist/admin/` bundle. The complete `npm run check` builds it first; a standalone browser run must do the same after source changes.

Auth tests use a local SQLite adapter for the session SQL and stub email delivery. GitHub storage/publication tests use mocked responses. Hosted browser tests exercise sign-in, session expiry/recovery, and authenticated media with API fixtures. They do not prove live Resend delivery, Cloudflare plan limits, or GitHub App permissions.

Browser results are written to `docs/evidence/browser-results.json`; several existing tests also update screenshot files under `docs/evidence/`. Failure traces/screenshots go under ignored `test-results/`. Inspect generated diffs and retain task-specific evidence intentionally rather than accidentally replacing unrelated historical captures. Avoid concurrent browser suites in one checkout.

## Behavioral coverage

| Area | Representative coverage |
| --- | --- |
| Content | Stable IDs/URLs, term references, year ranges/sorting, public/draft filtering, sanitization, production sample rejection |
| Editor | Shared WYSIWYG operations, save/reload/preview, taxonomy-only publication, conflict and browser recovery |
| Media | Image/PDF/MP4 upload validation, stale-upload protection, removal/undo, protected previews, video ranges |
| Authentication | Allowed/denied origins, link expiry/reuse/races, token hashing, session revocation, mail failure/rate limits |
| Publication | Atomic public/working baseline updates, lost responses, concurrent branch advances, complete media inventory, unchanged-publication result |
| Visitor UI | Responsive overflow, category/tag navigation, no-script behavior, gallery grouping/focus/navigation, consistent Writing identity, axe checks |

The scripts in [tests/](../tests) are the exact contract. Use focused tests while developing, then the complete gate for a functional release. Production builds must include the real catalog and referenced assets; fixture success alone is insufficient.

## Manual release checks

- Review a real project, a multi-image gallery, Writing index/article, and Bio on desktop and a narrow phone. Check 560/600/900px transitions when changing header or layout rules.
- Confirm the shared name/header spacing, square archive crops, uncropped artwork, gallery captions, keyboard focus return, and no horizontal overflow.
- Check keyboard-only navigation, skip links, visible focus, reduced motion, readable contrast, descriptive image text, and text enlargement. Axe is useful but does not establish complete accessibility or screen-reader behavior.
- Play/seek actual videos, check sound and external-provider permissions/captions, and open the downloadable PDF. Browser fixtures do not establish third-party playback.
- Inspect titles/descriptions, canonical URLs and Open Graph fields from `lib/views.mjs`, and generated `robots.txt`/`sitemap.xml`. Demo/preview pages must remain noindex; real production uses the configured origin. There is no separate Twitter-card or JSON-LD implementation to verify.
- Use an authorized hosted rehearsal for actual sign-in, upload, save, preview, publication, and deployed release matching. Test Safari separately; the automated suite is Chromium.

## Evidence and limits

Record the tested commit or file hashes, commands/results, environment, screenshots actually inspected, and remaining gaps. Link task evidence from the handbook’s history section. Keep tokens, private recovery exports, and raw provider logs out of tracked evidence.

The [documentation review](DOCUMENTATION-TASK.md) records validation of this handbook. Earlier acceptance notes remain dated evidence of their own revisions; they are not blanket proof that current external services are operational.
