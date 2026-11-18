# Project galleries and taxonomy publishing

- Outcome: masonry project grids; an accessible image viewer scoped to each gallery; consistent Writing masthead sizing; independent category/tag creation and publication.
- Scope: portfolio rendering, visitor assets, admin field validation, and focused regression checks. Preserve catalog data, image order, carousel blocks, and all owner drafts. No external deployment.
- Reuse reviewed: Platform v0.50.0 contains gallery/editor styling but no public masonry/lightbox module. Dust Wave New implements these in its page footer. Use its gallery-scoped navigation pattern with native CSS columns and a native dialog here, without copying the footer's site-specific layout machinery or adding dependencies.
- Acceptance: mixed image proportions form a masonry layout without crops; every image in the selected gallery is reachable, other galleries stay separate; keyboard navigation, closing, focus return, and no-script links work; Writing identity matches other routes at desktop/mobile widths; tag-only and category-only save/publish succeed while required persisted fields remain validated.
- Baseline: 32b0f25. Exact tested source/test hashes and production release identity are in [tested-files.json](evidence/gallery-task/tested-files.json).
- Protected state: save an ignored local state backup; tests use the existing isolated fixture store on ports 4325/4326. Refresh the actual local preview only after tests pass and compare its catalog/published snapshots before and after.

## Acceptance — November 17, 2026

Environment: Node 26.12.1, local Chromium, macOS. Desktop and resized mobile viewports; no physical-device or external deployment verification.

| Claim | Expected and observed evidence | Status |
| --- | --- | --- |
| Independent taxonomy publication | Reproduced the original tag-only failure: “Please fill out this field” from the empty creation form. After the fix, both tag-only and category-only Add → Save → rename → Publish → reload flows pass. Empty Add remains required; an empty project title still cannot save. | Verified locally |
| Masonry and complete gallery | Mixed landscape/portrait fixtures retain natural proportions, stack without row gaps, and use two columns at 1440px / one at 390px. Each modal opens the clicked image and traverses the full selected grid in authored order. Separate, single-image, and carousel groups remain independent. | Verified locally |
| Keyboard and fallback | Enter opens; arrows and buttons navigate; Tab cycles within the dialog; Escape/Close returns focus to the clicked image; scrolling resumes. Automated accessibility checks pass. Original-image links work without JavaScript. | Verified in Chromium |
| Writing identity | Home, Writing index and article use identical computed name sizes at 320, 390, 768 and 1440px in the test suite. Real Home/Bio/Writing routes also match at 390, 768 and 1440px. | Verified locally |
| Real portfolio | All 19 current galleries expose all 159 authored images in their respective groups. Opening the last image and advancing wraps to the first; closing returns focus. Retablos desktop/mobile screenshots were visually inspected. No page script errors. | Verified locally |

Commands: `npm run check` passed 36 unit tests, the static build, and all 28 browser tests (zero skips/failures). `npm run build:production` passed with 23 entries and 50 pages. [Browser results](evidence/gallery-task/browser-results.json) and [actual preview checks](evidence/gallery-task/runtime-result.json) record the exercised surfaces. The desktop/mobile [masonry](evidence/gallery-task/masonry-1440.png), [viewer](evidence/gallery-task/modal-390.png), and [Writing](evidence/gallery-task/writing-390.png) captures were visually inspected; these committed captures use isolated test fixtures.

Protected state: tests wrote only to `.local/browser-tests`. The owner catalog changed independently during testing, so a fresh `.local/gallery-task/state-before-refresh.json` snapshot was taken immediately before restarting the existing local server. Both draft and published catalogs remained deeply equal to that fresh snapshot afterward. No catalog edits or publications were performed against the owner instance. Original task and refresh backups remain under ignored `.local/gallery-task/`.

The actual preview and admin bundle are refreshed. Existing editor tabs should reload to use the updated bundle/session. The protected editor preview stays script-free, with image links resolving through its authenticated media route. No shared Platform changes, dependency additions, push, or external deployment were made.
