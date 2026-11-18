# Film projects, chronological ordering and real Writing

Completed November 17, 2026 in the local portfolio checkout. Baseline: `44704ef`. Exact tested source/media hashes are recorded in [tested-files.sha256](evidence/film-import/tested-files.sha256). Environment: macOS, Node 26.12.1, FFmpeg, Sharp, bundled pdfplumber/Poppler, and Playwright Chromium. No remote deployment was performed.

## Result

Imported all fifteen project folders under the supplied `Desktop/Film` directory plus the explicitly approved loose Santa Bunny video: **16 new projects, 133 supplied images and 3 videos**. Existing deep inside, Sketches, Retablos and Woodcarvings remain intact, for **20 real projects**. Folder labels supply titles, years and categories; no additional credits or project descriptions were invented. Santa Bunny is labeled **Unfinished film** on its page and video caption.

| New project | Year | Categories | Supplied images | Videos |
| --- | --- | --- | ---: | ---: |
| A Night in Paradiso | 2026 | Sets, Makeup, Props, Film | 6 | 0 |
| Alone | 2022 | Sets | 20 | 1 |
| Brains For Dinner | 2023 | Film | 6 | 1 |
| Demons With Green Faces | 2024 | Makeup | 5 | 0 |
| Dream Synopsis | 2026 | Makeup | 4 | 0 |
| Eraser X - Wilgira Music Video | 2024 | Makeup | 5 | 0 |
| First Time Sexpot | 2025 | Film | 14 | 0 |
| Loner | 2022 | Makeup, Props | 28 | 0 |
| Noche Obscura | 2024 | Props, Sets | 7 | 0 |
| Pandora's Greenhouse | 2024 | Makeup | 13 | 0 |
| Red Razor on Soft Skin | 2026 | Makeup | 2 | 0 |
| Sanctuary | 2023 | Makeup | 4 | 0 |
| Shellfish Knish | 2023 | Makeup | 2 | 0 |
| Tarot | 2022 | Makeup | 9 | 0 |
| Two in the Morning | 2024 | Sets, Props | 8 | 0 |
| Santa Bunny | 2021 | Film | 0 | 1 |

One shared comparator orders project archives, related selections and the admin newest first, using the first year of a range. Thus Sketches (2021–2026) precedes Retablos/Woodcarvings (2014–2026). Equal-year projects retain their existing relative order; admin arrows reorder only within that starting year. Editing a year updates the order. Writing continues to use publication dates.

Replaced both dummy posts with **Initials on the Chamber Walls** (June 16, 2026), **Remembering, Becoming** (April 30, 2026), and **The Intimacy of Touching Knees in a Theatre** (March 30, 2026). All four PDF pages were rendered and visually inspected. Titles, subtitles, original dates, wording, paragraph spacing and italic emphasis were retained; print footers/page numbers and the Substack avatar were omitted. The poems have six and nine paragraphs; the prose has eleven paragraphs and five italic spans. Full text lives in ordinary shared-editor text blocks, editable through **Admin → Writing**. All imported media also uses the existing cover/gallery/video controls.

## Media preparation and persistence

HEIC originals were decoded with macOS `sips`; photos were oriented using embedded metadata and converted to WebP at quality 88, up to 1600 pixels on the longest edge, without enlargement or cropping. Contact sheets of all supplied images were visually reviewed for covers and descriptions. Originals are unchanged; source and prepared hashes were checked. The build supplies its existing 800px derivatives.

Videos retain their complete content and audio, with H.264/AAC in fast-start MP4. Alone is 1280×720, approximately 29.97 fps, 27.127 seconds / 5,784,424 bytes; Brains For Dinner is 1280×720, 10 fps, 74.9 seconds / 6,843,385 bytes; Santa Bunny is 720×720, 3 fps, 41 seconds / 4,353,782 bytes. Alone's variable-frame-rate source was normalized to its nominal 29.97 fps; duration differs by less than one frame. Santa Bunny's display rotation was applied and its square aspect ratio retained. Its cover comes from the video. Brains For Dinner uses a supplied character photograph for the video poster. All are below the existing 25 MiB limit. No upload policy, shared Platform code or video-player behavior changed.

The committed catalog and actual local editor were updated separately. A fresh API snapshot confirmed no unpublished local changes before import. Uploaded 138 immutable assets through the existing media/video endpoints, saved with optimistic revisions and published through the local API. The owner-edited local Bio, profile/settings and four existing real projects were asserted unchanged. The local catalog intentionally retains the owner's settings where they differ from the committed seed. Backups are in ignored `.local/film-import/`; the local store retains its previous public artifact.

## Acceptance evidence

| Claim | Actual check and result | Status/boundary |
| --- | --- | --- |
| Correct imports and metadata | [Media manifest](evidence/film-import/import-manifest.json), [Writing manifest](evidence/film-import/writing-manifest.json), catalog comparisons, exact folder metadata and 20/3 counts | Verified within scope |
| Date sorting and stable same-year ordering | New unit test exercises deliberately shuffled single/range years, category archives, related work and source immutability. New browser test exercises disabled cross-year movement, same-year movement, save/reload and a year edit | Verified with isolated fixture |
| Regression gate | `npm run check`: 36 unit tests and build passed; the first browser run had a test-selector mismatch on the Year field. Selector corrected; complete `npm run test:browser` rerun: **25 passed**. [Initial log](evidence/film-import/check-initial.log), [final log](evidence/film-import/browser-final.log), [browser results](evidence/film-import/browser-results.json) | Verified locally; provider adapters remain mocked |
| Build compatibility | 23 entries / 32 pages built; Cloudflare Worker bundled with esbuild; `git diff --check` passed | Local build only |
| Local persistence and preservation | Real media upload, draft and publish API calls; subsequent API/catalog equality assertions. [Import result](evidence/film-import/import-result.json) | Verified on loopback store |
| Actual public content | All 16 imported project pages at 1440px and 390px: image decoding/counts, video counts, no horizontal overflow, related order. All six project archives at both widths: exact title order and counts | Verified in Chromium |
| Actual Writing | All three pages at both widths: complete text equality, paragraph/emphasis counts, source dates, no overflow; removed sample routes return 404 | Verified in Chromium |
| Admin | All 16 imported projects opened with their correct years/galleries/videos; all three pieces opened as WYSIWYG text with correct content, emphasis and dates | Real local editor; read-only content inspection |
| Media playback | Full FFmpeg decode of all three prepared files; Chromium play and seek to 60%, native dimensions and duration verified. [Media checks](evidence/film-import/media-validation.json) | Browser playback muted; no listening or frame-by-frame editorial review |
| Accessibility/layout | 16 automated Axe page/viewport checks passed. Captures reviewed for desktop/mobile home, project covers, Writing index, both poems, prose and admin | Automated checks do not replace a full assistive-technology audit |

Actual content checks and capture inventory: [preview-review.json](evidence/film-import/preview-review.json). Representative captures: [home](evidence/film-import/home-1440.png), [mobile home](evidence/film-import/home-390.png), [Writing](evidence/film-import/writing-1440.png), [mobile poem](evidence/film-import/initials-on-the-chamber-walls-390.png), [prose](evidence/film-import/the-intimacy-of-touching-knees-in-a-theatre-1440.png), [Writing editor](evidence/film-import/admin-the-intimacy-of-touching-knees-in-a-theatre.png).

Public local preview: `http://127.0.0.1:4321/`; editor: `http://127.0.0.1:4322/admin/`. Hosted access, deployment and physical Safari/iOS checks remain unperformed. This task did not change Store, Pool or the pinned shared Platform.
