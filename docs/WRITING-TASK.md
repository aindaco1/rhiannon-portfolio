# Writing section — acceptance record

Completed locally November 17, 2026. Requested outcome: explain admin access and add free-form Writing, informed by the attached Creative Independent reference while retaining the work-page visual family and existing WYSIWYG editor. The user approved two clearly labeled sample pieces for design review.

The admin is at <http://127.0.0.1:4322/admin/>; the public Writing section is at <http://127.0.0.1:4321/writing/> while `npm run dev` is running. Local admin access starts a loopback session without a password. Hosted authentication remains unconfigured.

## Implementation

Writing reuses the existing `post` schema, Platform block composer, rich-text codec, rendering, upload controls, drafts, recovery and publication pipeline. It adds a text-led archive, a narrower article column, cream background, dotted rules, author/date/reading-time details, and related writing. Images, introductions and taxonomy are optional. The prose-first admin hides project-only fields and puts optional page settings below the editor. Publication date determines public order; project ordering is unchanged.

The Creative Independent guide and essay screenshots were inspected as design reference material. Its reading-column and metadata arrangements informed this layout; the existing portfolio typography stays in place. No reference text or branding was copied. `/journal/` and published `/journal/<slug>/` links redirect to `/writing/` equivalents. Projects retain their own template.

The demo includes “A room before the scene” and “Keeping a notebook.” Both are marked as sample text, explicitly not attributed to R. Barela, and retain the sample-content production guard. All 20 existing projects and non-entry metadata were compared before and after adding the samples, separately in working and published snapshots; they are unchanged. The ignored backup is `.local/before-writing-state.json`. See [preservation evidence](evidence/writing/local-state-preservation.json).

## Verification

Source baseline: `1a77aa2ef60365cf6b276a8f22b3237326069506`. Exact tested owned-source and build hashes are in [source-sha256.json](evidence/writing/source-sha256.json). Platform remains v0.50.0 at `fa363d72d3e5c15dbdb6f9596bb80c41ebbbda8d`; Platform, Store and Pool were not modified. No dependencies were added.

Environment: macOS arm64, Node 26.12.1, Ruby 3.0.0 with the installed Jekyll bundle, Playwright 1.65.1 / Chromium. Browser publication tests use the isolated `.local/browser-tests` store on ports 4325/4326. Read-only final visual review used the actual local preview and admin on ports 4321/4322.

| Claim | Observed evidence | Status |
| --- | --- | --- |
| Writing is discoverable and readable | Permanent navigation, empty state, newest-first archive and two complete samples. Index/article layouts have no horizontal overflow at 320, 390, 768 and 1440px. Desktop/mobile screenshots inspected. | Verified within local scope |
| Existing WYSIWYG supports free-form authoring | Created a piece without cover/intro/taxonomy, saved, published and opened it. Edited a sample through the actual composer, applied bold, saved/reloaded and verified formatted preview. Draft changes stayed absent from the public page. | Verified within local scope |
| Work behavior is preserved | Existing category/tag/contact, upload, formatting, undo, preview, publish, recovery, stale-save and failed-publication checks pass. | Verified within tested paths |
| Accessibility | Zero tested axe WCAG A/AA violations on Writing detail at 390/1440px and on the index/editor at both sizes. The original Work/About/editor checks also pass. | Verified within automated coverage |
| URLs and privacy | Legacy article and index links redirect correctly. Writing canonical metadata points to its new URL; image-free articles do not borrow a project image. Draft articles stay out of archives and related links. | Verified within local scope |
| Production boundaries | Sample production build intentionally exits 1; Worker bundles successfully; npm audit reports 0 vulnerabilities. No provider state was changed. | Verified locally; hosted behavior unverified |

`npm run check` passed: **24/24 Node tests, 16/16 browser tests**, plus the Jekyll/admin build and exact Platform pin check. The sample build contains 22 entries. Evidence: [check.log](evidence/writing/check.log), [browser-results.json](evidence/writing/browser-results.json), [preview-review.json](evidence/writing/preview-review.json), [production-guard.log](evidence/writing/production-guard.log), [worker-build.log](evidence/writing/worker-build.log), [npm-audit.json](evidence/writing/npm-audit.json). `git diff --check` passes.

Inspected captures include [desktop archive](evidence/writing/index-desktop.png), [mobile archive](evidence/writing/index-mobile.png), [desktop article](evidence/writing/article-1440.png), [mobile article](evidence/writing/detail-mobile.png), [complete short note](evidence/writing/note-mobile.png), [desktop editor](evidence/writing/editor-desktop.png), and [mobile editor](evidence/writing/editor-mobile.png). The initial accessibility run found the Writing badge inheriting muted text on black (2.55:1); a scoped selector fixes the cascade, and the final checks pass. A separate capture helper initially needed an explicit browser context and a wait for the redirect; the successful review output above uses both.

## Handoff and limits

Open **Admin → Writing → New piece +**. Write using **The writing** editor, **Save draft**, and **Preview**. To publish, check **Include this piece when publishing**, then choose **Publish changes**. Publication includes all saved pending site changes together, as before. Categories and tags remain editable through the existing admin.

Implemented and verified locally; not pushed or deployed. Live Cloudflare Access login, GitHub App publication and remote CI/hosting remain unverified, as in the initial build. Real domain/editor/contact details and replacement of demo material remain launch requirements. Safari and manual assistive-technology review were not performed. Local sample content and protected state are preserved; no external messages were sent.
