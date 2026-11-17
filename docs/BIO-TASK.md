# Bio and résumé — acceptance record

Completed locally November 17, 2026. Requested: remove the header Contact link, rename About to Bio, include the attached bio/résumé content, and make the original document downloadable. Baseline: `e9a7d51`. Changed-source hashes are in [source-sha256.json](evidence/bio/source-sha256.json).

The header now contains Work, Writing and Bio. `/bio/` uses the supplied biography, pronouns, location, training, exhibitions, affiliations, awards and all 35 film/production entries, with the listed contact email. The existing profile Markdown field remains the content owner, editable under **Bio & contact**; no new schema, editor or upload subsystem was added. The download links to one explicitly copied public PDF asset. The footer contact link remains available on Bio. `/about/` redirects to `/bio/`.

Source: `/Users/aindaco1/Desktop/Artist Bio and Resume - R. Barela (1).pdf`. Both pages were rendered and visually read, with text extraction as a cross-check. Source text was treated as content, not instructions. Wording, dates, credits and the two separately listed untitled-film credits were retained; paragraph breaks, headings and emphasis were adapted for the web. Credits were not independently researched. The original PDF is unchanged: **92,173 bytes**, SHA-256 `b6a5378aa6929746a16c39495af8f1dbbb5341323a252b011699b4d860f64af1`.

## Checks and evidence

Environment: macOS arm64, Node 26.12.1, installed Ruby 3.0.0/Jekyll bundle, Playwright 1.65.1 Chromium. Platform remains pinned at v0.50.0; dependencies and shared repositories were not changed.

- **Verified locally:** `npm run check` passed, including 24 Node tests, 16 browser tests and the public/admin build. Existing checks were updated for the renamed navigation. [Log](evidence/bio/check.log) and [browser report](evidence/bio/regressions/browser-results.json).
- **Verified on actual preview:** Bio renders all 43 résumé bullets, including 35 film/production entries; header links are exactly Work/Writing/Bio; email is correct; no horizontal overflow at 320, 390, 768 or 1440px. Axe reports zero tested WCAG A/AA violations at 390 and 1440px. [Browser review](evidence/bio/browser-review.json).
- **Verified download:** clicked the actual download link in Chromium; downloaded bytes match the supplied original hash, filename is `R-Barela-Bio-and-Resume.pdf`, HTTP status is 200 and MIME type is `application/pdf`.
- **Verified profile and compatibility:** the admin shows the complete editable biography/résumé and contact email. The old About URL reaches Bio. A legacy `#contact` fragment is dropped by the static meta refresh, but the contact section remains on the destination page; new footer links target `/bio/#contact` directly. The initial review helper expected that fragment to survive and used an exact field name that omitted its accessible hint; corrected checks match the observed navigation and field.
- **Preserved:** only `intro`, `bio` and `email` changed in each local working/published profile. All 22 work/writing entries and other data were deep-compared and retained. Backup: ignored `.local/before-bio-state.json`. [Preservation record](evidence/bio/preservation.json).

Inspected the actual [desktop Bio](evidence/bio/page-1440.png), [mobile Bio](evidence/bio/page-390.png), and [mobile credits](evidence/bio/credits-390.png) captures. Full diff reviewed; `git diff --check` passes. A final build-script comment and README clarification after testing do not change runtime behavior.

Implemented and tested locally, not deployed. Existing hosted setup requirements remain. Safari and a manual assistive-technology audit were not performed. Profile text edits do not rewrite the PDF; replace the static document when a revised résumé is supplied.
