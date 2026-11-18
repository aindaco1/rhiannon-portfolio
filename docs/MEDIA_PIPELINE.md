# Media preparation and uploads

**Audience:** editors preparing assets and maintainers importing or diagnosing media.

## Supported uploads

The UI uses “MB” for binary limits: 5 × 1024² bytes or 25 × 1024² bytes. [content.mjs](../lib/content.mjs) owns the constants; [admin.mjs](../admin/admin.mjs) provides the upload guidance.

| Asset | Accepted / enforced | Recommended preparation |
| --- | --- | --- |
| Photo, cover, poster, gallery image | JPEG/JPG, PNG, WebP; 5 MB per upload; build decoding capped at 40 megapixels | 1600–2400 pixels on the longest edge, original aspect ratio, sRGB; WebP for smaller files; PNG/WebP for transparency |
| Uploaded video | Complete supported MP4 container; 25 MB per upload | H.264/AVC, 8-bit 4:2:0, optional AAC stereo at 96–128 kbps, 720p, original aspect ratio, 24–30 fps, fast start |
| Bio/résumé document | Complete PDF signature/end marker; 5 MB per upload | Searchable text, embedded fonts, Letter or A4, images around 150 dpi |
| External video | Valid HTTPS YouTube watch/share/embed/shorts or Vimeo video link | Verify playback, permissions, captions, and poster; retain an unlisted Vimeo share hash when required |

Convert HEIC, TIFF, RAW, MOV, ProRes, and HEVC sources before uploading. A `.mp4` extension alone does not prove compatible codecs. The app validates container structure and size; it does not transcode, inspect every codec, scan documents, or remove all embedded metadata. Image format is checked by upload signature, then decoded/validated during build. Prepare and inspect the deliverable before choosing it in the editor.

## Where files go

Uploads receive immutable SHA-256 names under `/assets/media/`, `/assets/videos/`, or `/assets/documents/`. Photos get an extension inferred from their bytes. Uploading identical bytes resolves to the same content path; replacing an asset normally creates a different path.

- Local uploads live under the selected local store’s `assets/` directory.
- Hosted uploads are committed to the same public GitHub repository as the portfolio.
- Website builds copy only referenced published media, including Bio media and the selected résumé PDF.
- Removing a block or replacing a file changes references; it does not erase the earlier upload or Git history.

Keep source masters outside the repository. A browser catalog recovery export is not a media backup. See [Operations](OPERATIONS.md) for backup scope.

## Build and display

The build reads uploaded bytes, checks images with Sharp, copies originals, and creates an 800px-wide WebP derivative at quality 82 without enlargement. Rendered images receive actual dimensions and responsive `srcset` values. The build is not a general original-file optimizer: a large supplied original remains an original download candidate.

Archive cover frames use a centered square crop. Project covers and masonry gallery images preserve the whole image. Gallery dialogs use original image URLs rather than the 800px thumbnail. Preserve image order and useful captions when importing multiple galleries; the viewer groups by individual gallery block.

MP4 blocks use native controls, `playsinline`, `preload="none"`, and looping playback. They preserve audio and start on visitor action. Local and authenticated API video delivery support byte ranges. YouTube/Vimeo iframes are created only after Play is chosen; without enhancement their links still lead to the provider.

The selected PDF downloads as `R-Barela-Bio-and-Resume.pdf`; its original selected filename is retained in the editor model. A PDF replacement and on-page résumé text are independent edits.

## Preparation review

1. Keep an untouched master and create a separate web export.
2. Inspect orientation, color, transparency, and legibility at actual display size. Avoid cropping the artwork to fit gallery dimensions.
3. For video, inspect the stream/container with `ffprobe` if available, play the beginning/middle/end, confirm audio and seeking, and check final byte size. A useful read-only inspection command is:

   ```sh
   ffprobe -v error -show_entries format=size,duration:stream=codec_name,codec_type,width,height,pix_fmt,avg_frame_rate -of json 'web-export.mp4'
   ```

4. Upload, supply an accurate description/caption, save, and preview. After publication, verify the actual image or playable video on desktop and phone.

FFmpeg/ffprobe are optional preparation tools, not npm dependencies or an upload service. This repository has no supported automatic bulk-import command. Previous imports used task-specific scripts and manifests. For another import, inventory the supplied files, back up current catalogs/media, use existing validation and revision-checked storage APIs, and verify every reference before publication.

## Provenance

Real portfolio media was supplied for the artist’s site. Preserve credits and original meaning; do not infer a person’s role from a production photograph. [IMAGE-SOURCES.md](IMAGE-SOURCES.md) records stock sample-photo provenance for test fixtures. Those unused files must remain available to the test suite but are excluded from production output when unreferenced.
