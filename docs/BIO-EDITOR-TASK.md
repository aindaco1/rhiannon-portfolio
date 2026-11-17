# Bio WYSIWYG and header simplification — acceptance

Completed locally November 17, 2026. Requested: remove the two descriptive header blurbs site-wide and make Bio editable using the existing WYSIWYG content editor. Baseline: `4cda87f`; [tested source hashes](evidence/bio-editor/source-sha256.json) identify this implementation and the unchanged content/PDF. Platform remains `fa363d72d3e5c15dbdb6f9596bb80c41ebbbda8d` (v0.50.0).

The header now contains the name and navigation, with the descriptive region and its CSS removed. **Admin → Bio & contact → Biography & résumé** uses the same Platform composer, toolbar, upload controls, undo, clipboard sanitization and consumer integration as projects and Writing. Contact/site settings sit in a disclosure below the editor. Bio now supports **Save draft**, **Preview**, recovery and the existing site-wide **Publish changes** action.

The existing Markdown biography remains valid and is displayed as a text block without rewriting data on open. A content edit stores blocks in the existing `profile.bio` field; the previous string remains a supported read format. One validator, block renderer and media-reference traversal serve all three editing surfaces. No duplicate editor, new dependency or Platform/Store/Pool change was introduced. The current block-capable build is required once Bio is saved as blocks; an older build cannot read that representation.

## Evidence

Environment: macOS arm64, Node 26.12.1, installed Ruby 3.0.0/Jekyll bundle, Playwright 1.65.1 Chromium. Tests use isolated `.local/browser-tests` state on ports 4325/4326; the actual preview on ports 4321/4322 was inspected without editing or publishing owner data.

| Observable outcome | Check and observed result | Status |
| --- | --- | --- |
| Header removal | Actual home, Bio and preview no longer contain the descriptive region; public tests exercise 320/390/768/1440px. | Verified locally |
| WYSIWYG Bio authoring | Loaded existing Markdown/heading/link unchanged; formatted and linked new text; added/undid a block; uploaded a photo; saved, recovered unsaved edits, reloaded, previewed and published through the UI. | Verified locally |
| Preview and privacy | Bio preview uses the public renderer with private/no-store responses and no scripts. Draft text and photo are absent publicly until publication, then appear. | Verified locally |
| Upload identity | A pending upload cannot reattach to a deleted Bio block; the matching project check still passes. | Verified locally |
| Existing behavior | Project/Writing authoring, category/tag links, recovery, stale-save conflicts and failed-publication preservation pass. | Verified within tested paths |
| Current content preservation | Actual preview and admin retain all 43 résumé bullets, six linked references and the current introduction. Opening/focusing/previewing Bio leaves both runtime snapshots unchanged, verified by deep equality and matching hashes. | Verified locally |
| Responsive/accessibility | Actual current Bio editor has no overflow and zero tested axe WCAG A/AA violations at 390/1440px; existing public/editor accessibility checks pass. | Verified within automated coverage |

**27/27 Node tests and 18/18 browser tests passed** via `npm run check`, including Jekyll/admin build and exact Platform pin validation. The Worker bundle also compiles. Logs: [full check](evidence/bio-editor/check.log), [browser report](evidence/bio-editor/regressions/browser-results.json), [Worker build](evidence/bio-editor/worker-build.log), [current-content review](evidence/bio-editor/review.json). Full diff inspected; `git diff --check` passes.

The initial authoring rehearsal exposed a pre-existing consumer link-control bug: focusing the URL field lost the selected range, and blur plus Apply could invoke insertion twice. The shared consumer adapter now keeps the selection independently and ignores a second apply after closing the link panel. The corrected rehearsal verifies the original linked text survives save/reload/recovery/preview. [Initial failed run](evidence/bio-editor/initial-check.log) and [focused passing run](evidence/bio-editor/focused.log) are retained.

Inspected [desktop header](evidence/bio-editor/home-1440.png), [desktop Bio editor](evidence/bio-editor/current-editor-1440.png) and [mobile Bio editor](evidence/bio-editor/current-editor-390.png) screenshots. The ignored pre-review runtime snapshot is `.local/before-bio-editor-state.json`; no migration or owner-data mutation was needed. The original downloadable PDF remains separate from website edits, as indicated in the admin.

Implemented and tested locally; not deployed. Hosted authentication/publication and Safari/manual assistive-technology review remain unverified. No external messages were sent.
