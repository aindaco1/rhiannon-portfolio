# Editor guide

**Audience:** R. Barela and approved portfolio editors. No coding is needed for normal editing.

## Open the editor

Use [the hosted editor](https://rbarela.com/admin/) when the hosted service has been configured. Enter your approved email address and open the sign-in link. Links work once and expire after 15 minutes; a signed-in browser tab has an eight-hour session. Request a new link if yours has expired. A generic “link is on its way” message is not proof of inbox delivery.

For work on the development computer, start the site as described in [Development](DEVELOPMENT.md) and open [the local editor](http://127.0.0.1:4322/admin/). Its banner says that saves stay on this computer; it does not send sign-in email.

## Save, preview, publish

| Action | Result |
| --- | --- |
| Edit | Changes the current browser copy; browser recovery is a fallback |
| Save draft | Saves the whole working portfolio, without changing visitor pages |
| Preview | Shows the current project, writing piece, or Bio using the site’s renderer |
| Include when publishing | Chooses whether an entry belongs on the website at the next publication |
| Publish changes | Saves pending edits, then publishes all included entries plus Bio, categories, tags, and settings |
| Download recovery copy | Downloads the current catalog as JSON; it does not include media files |
| Reload saved version | Replaces browser edits with the saved working version after confirmation |

Publishing applies to the whole portfolio, not just the screen you are on. Review other pending edits first. In the hosted editor, saved drafts and uploaded files are visible in the public GitHub repository even when they are not included on the website. Keep confidential or embargoed work outside this workflow.

Local publication updates the local preview. Hosted publication queues a site build; the previous website remains until deployment succeeds. “No public changes to publish” means the public catalog did not change. If a release remains queued or fails, keep the saved draft and ask the maintainer to check the release.

## Create or edit a project

1. Choose **Projects → New project +**, or select an existing project.
2. Enter its title, introduction if useful, **Year or range**, role, and credits. Use `2026` or an ascending range such as `2014–2026`.
3. Choose at least one category and a cover image before including the project in publication. Give the image an accurate description, or mark it decorative when appropriate.
4. Write **The story** and add images, galleries, or video using the block controls.
5. Select **Include this project when publishing**, save, preview, and publish when ready.

The cover is the square-cropped archive thumbnail and the full project cover. Use a subject that works in a centered square crop; there is no focal-point picker. Gallery images keep their original proportions.

Projects sort newest first, using the start year of ranges. The arrows on the Projects list reorder only projects sharing that starting year. A saved title can change without changing the page URL. Delete removes an entry from the draft; it remains on the website until publication. To temporarily hide it, clear its Include checkbox instead.

## Write a piece

Choose **Writing → New piece +**. Add a title, publication date, and text in **The writing**. The introduction, cover, topics, tags, and acknowledgments are optional. Expand **Images, topics & page details** for those fields.

Use headings, paragraphs, links, lists, quotes, and media in the same editor as projects. Check **Include this piece when publishing**, save, preview, and publish. Writing sorts by publication date, newest first. The dashboard does not import or extract text from PDFs.

## Use the WYSIWYG blocks

Select a block to format, move, or remove it. Use the buttons below the editor or commands such as `/image`, `/gallery`, and `/video`. **Undo block change** reverses block edits in the current editing session; it is not a full site history browser.

| Block | Use |
| --- | --- |
| Text | Paragraphs, headings, emphasis, links, and lists |
| Quote | A quotation and optional attribution |
| Image | One uploaded photo, description, and caption |
| Gallery | An ordered set of photos, captions, and grid or carousel layout |
| Video | A YouTube/Vimeo link or uploaded web-ready MP4, with optional poster/caption |
| Divider | A horizontal separator |

Grid galleries become masonry on public pages. Clicking a photo opens all photos from that gallery, in authored order, with arrow buttons, keyboard navigation, and Escape to close. The editor preview is script-free; its image links provide a full-image fallback. Carousel blocks retain their scrolling layout.

## Update Bio, headshot, reel, or PDF

Open **Bio & contact**. Edit the introduction and biography/résumé in the shared editor. Keep the headshot Image block and director-reel Video block at the beginning of the Bio blocks to place them below **Download bio & résumé** and above **For projects and collaborations** in the left column. Media after the first text or other non-image/video block stays with the main Bio text.

- Headshot: **Choose photo** replaces it; **Image description** edits its accessible description; **Remove photo** clears it. Remove the block if it is no longer needed.
- Reel: choose **MP4 video**, then **Upload or replace MP4**. Edit **Video caption**, or use **Remove video**.
- PDF: **Upload or replace PDF** chooses the downloadable document. Review the selected file, save, then publish. The PDF is separate from the page text; editing one does not update the other.
- Contact and external links: expand **Contact, links & site settings**. The public email is separate from the approved-editor allowlist.

All upload controls explain accepted sizes and formats. [Media pipeline](MEDIA_PIPELINE.md) gives preparation guidance.

## Manage categories and tags

Open **Categories & tags**, enter **New category** or **New tag**, and click the matching **Add** button. You can save and publish either type independently. Assign terms on each project’s editing screen. Empty creation forms do not block saving existing edits.

Categories represent broad disciplines. Tags add useful detail; prefer existing labels and a small relevant set. The initial [tag pass](PROJECT-TAGS.md) provides examples, not mandatory classifications. Rename a label freely; its URL stays stable. Reassign entries before deleting a term. A term’s archive is generated only when published content uses it, and discipline navigation counts published projects.

## Recover from an interruption

If the editor offers browser recovery, restore only when it says the saved baseline still matches. When it reports newer saved work, download the recovery copy and compare rather than overwriting it. After an uncertain save or publication response, reload the saved version before retrying.

Do not clear browser storage while recovering unsaved work. There is no general “upload recovery JSON” button; a maintainer can reconcile an export with saved state. See [Operations](OPERATIONS.md) for conflicts, backups, and failed releases.
