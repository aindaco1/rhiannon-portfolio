# Bio and résumé PDF upload

Implemented and verified locally on November 17, 2026 (America/Denver).

**Outcome:** Under **Bio & contact → Upload or replace PDF**, the owner can upload a PDF up to 5 MB, download the selected file privately, save/reload the selection, preview it, and publish it to the Bio page. The current public download remains unchanged until publication. Page text and the PDF are edited separately. Legacy profiles retain the supplied PDF without a content migration.

Reuses the existing authenticated API, immutable uploads, draft recovery, save/publish controls and storage adapters. Only the selected PDF enters the public build. Earlier uploads remain in private storage. Uploads validate size and PDF header/end markers; this is not a full PDF parser or a malware scanner. No new dependencies or Platform changes.

## Evidence

The tested source, tests and documentation are identified by [SHA-256 inventory](evidence/pdf-upload/tested-files.sha256). Environment: macOS, Node 26.12.1, Ruby/Jekyll, Playwright 1.65.1 Chromium. Browser publication tests use isolated fixture storage at `.local/browser-tests` on ports 4325/4326, not the owner's content.

| Claim | Observed result and boundary | Status |
| --- | --- | --- |
| Upload, save, reload, private preview download and publish | Actual browser interaction and local persistence; downloaded bytes match the uploaded PDF. A second replacement changes the public link only after publishing; the previous file is omitted from the next artifact. | Verified within scope |
| Upload failures preserve the selection | Spoofed/truncated PDFs, oversized requests, cross-origin requests, anonymous access, out-of-order responses and leaving/reopening Bio are covered. Save/publish are disabled during uploads. | Verified within scope |
| Failed publication preserves the site | A missing PDF makes the local build fail; the release metadata and current downloadable bytes remain unchanged. GitHub preflight also rejects a missing PDF in a mocked-provider test. | Verified within scope |
| Mobile UI and existing editor behavior | 20 browser tests pass, including the existing project/Writing/Bio workflows; new PDF controls pass automated WCAG checks at 390px with no page overflow. [Mobile rejection state](evidence/pdf-upload/editor-mobile.png) was visually inspected. | Verified within scope |
| Owner preview preservation | Read-only check on ports 4321/4322 confirms the control, original PDF download, no JS errors and no dirty draft. State hash before/after the server restart and UI inspection matches `213813a4f61073364a276ebb8ed51f8776f75df006c3667a4a5d9415e13e25d0`. [Desktop capture](evidence/pdf-upload/local-editor.png) was visually inspected. | Verified within scope |
| Production service | Worker bundles successfully; GitHub/Access behavior has local mocked-provider coverage. No live GitHub/Cloudflare configuration or deployment was performed. | Unverified live |

`npm run check` passed: 29 unit tests, static site/admin build, 20 browser tests. An additional GitHub PDF preflight/download test was then added; `npm test` passed all 30 tests. The implementation did not change between these runs. Worker bundling and `git diff --check` passed. Logs: [full gate](evidence/pdf-upload/check.log), [final unit tests](evidence/pdf-upload/unit.log), [browser report](evidence/pdf-upload/browser-results.json), [Worker build](evidence/pdf-upload/worker-build.log), [local smoke](evidence/pdf-upload/local-smoke.json).

The supplied PDF remains byte-identical: SHA-256 `b6a5378aa6929746a16c39495af8f1dbbb5341323a252b011699b4d860f64af1`. A pre-restart copy of the owner's content remains in ignored `.local/before-pdf-upload-state.json`. The local server is refreshed; this change has not been deployed publicly.
