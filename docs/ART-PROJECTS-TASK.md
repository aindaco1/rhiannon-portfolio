# Retablos and Woodcarvings

Completed locally November 17, 2026 (America/Denver), on base commit `96eff04e8feffcbff351c6e4dc690a89fe557810`. Final changed files are identified by [SHA-256 inventory](evidence/art-projects/tested-files.sha256); the [image manifest](evidence/art-projects/import-manifest.json) identifies every supplied file, destination, dimensions and original hash.

Created two real projects under Art, each dated **2014–2026** as requested:

- **Woodcarvings:** 01–06, 09–11, 14 and 20 — 11 images.
- **Retablos:** 07, 08a, 08b, 12, 13, 15–19 and 21 — 11 images.

Images remain in numbered order: the first image is the cover and the remaining ten form an editable gallery. Each image has a visual description for accessibility. All 22 supplied WebP files were copied byte-for-byte; source files are untouched. Both projects are in the committed catalog and the owner's local admin/published preview. Existing projects, Writing, Bio, taxonomy and PDF selection were preserved independently in source and local state.

The existing **Year** field now accepts a single year or an ascending range, normalizing a typed hyphen to an en dash on save. Thumbnails, covers and galleries display complete images; covers use their natural proportions. The preview notice now says the site *includes* sample projects, and the Pexels footer credit refers specifically to sample imagery. No dependencies or shared Platform code changed.

## Verification

Status: **verified within local scope**. Environment: macOS, Node 26.12.1, Jekyll, Playwright 1.65.1/Chromium. No external deployment.

- `npm run check`: **31 unit tests, static/admin build and 21 browser tests passed** ([log](evidence/art-projects/final-check.log), [browser results](evidence/art-projects/browser-results.json)). The initial year-field test used an exact label that excluded the helper text; its selector was corrected, the focused test passed, and the complete gate then passed. Initial failure evidence is retained in this folder.
- Final cover-proportion and preview-wording adjustments were followed by another **31 passing unit tests**, successful **24-entry / 39-page build**, and fresh browser checks of both real projects at 390px and 1440px ([unit log](evidence/art-projects/final-unit.log), [build log](evidence/art-projects/final-build.log), [local browser results](evidence/art-projects/local-browser-smoke.json)). Both pages show the correct date and exact eleven-image order, all images decode, no page overflow or JavaScript errors occur, and automated WCAG checks report zero violations. An initial ad-hoc accessibility run needed an explicit browser context; the corrected harness completed successfully.
- Visually inspected the finished [Retablos mobile page](evidence/art-projects/retablos-390.png), [Woodcarvings desktop page](evidence/art-projects/woodcarvings-1440.png), and [Retablos admin](evidence/art-projects/admin-retablos.png). Both projects open in the admin with the correct range and without dirtying the draft.
- The authenticated local upload/save/publish API imported all images and added only the two projects. A semantic comparison of both working and published catalogs confirms all pre-existing owner content is unchanged ([import result](evidence/art-projects/import-result.json)). The final restart and read-only inspection also left content unchanged. Backups remain in ignored `.local/art-import/`.
- Worker bundling and `git diff --check` passed. Production remains unconfigured; sample projects remain and the portfolio-wide preview flag is still enabled.

Local pages: <http://127.0.0.1:4321/work/retablos/> and <http://127.0.0.1:4321/work/woodcarvings/>. Edit under Projects at <http://127.0.0.1:4322/admin/>.

## Selection update — November 17, 2026

After comparing the three spoon-holding San Pasqual images, retained `12-san-pasqual-studio.webp`, the lightest version, as the Retablos cover. Removed `07-san-pasqual-workshop.webp` and `08a-san-pasqual-tray.webp` from the project and removed the duplicate gallery occurrence of image 12. Retablos now displays nine unique images; Woodcarvings still displays eleven. The original files remain available. The local save/publish build succeeded; browser inspection confirmed all nine images loaded in the intended order and the archive uses the updated cover. All other source and local catalog content was preserved. Backups and a review capture are in ignored `.local/retablos-cleanup/`.

## Woodcarvings cover update — November 17, 2026

Set the supplied praying-skull image (`36aa1578c18f81dcc461402b3987f718617f29b588e256340a22874b59ef4865.webp`, source image 14) as the Woodcarvings cover. Moved the former fish cover into the gallery and removed the skull’s duplicate gallery occurrence, retaining all eleven unique images. Updated its image description to mention the clasped hands. Source and local admin/published content match this selection. The local publication build succeeded; browser verification confirmed the new project/archive cover and all eleven loaded images. Other content was preserved. Backups and a visual capture are in ignored `.local/woodcarvings-cover/`.
