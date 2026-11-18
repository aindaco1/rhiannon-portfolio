# Project and experience

**Audience:** the artist, editors, designers, and contributors.

## Purpose

Present R. Barela’s disciplines equally and make it straightforward to understand the work and make contact. The artist can manage projects, writing, Bio, taxonomy, and media through one browser editor. The current source collection contains real projects and three supplied writing pieces; sample assets remain only as test fixtures.

## Visitor experience

| Area | Behavior |
| --- | --- |
| Work | Square, centered cover crops; discipline navigation with counts; projects sorted newest first by starting year |
| Project | Full cover, role/year/discipline/tags, authored blocks, credits, and related work |
| Galleries | Two masonry columns on wider screens, one on phones; original image proportions; a viewer containing only the selected gallery |
| Writing | Text-led index and individual essays with author, publication date, and reading time; cover and taxonomy optional |
| Bio | Introduction, downloadable bio/résumé, headshot and director reel, contact links, and a longer biography/résumé |
| Navigation | R. Barela, Work, Writing, Bio; no duplicate Contact header or footer call-to-action |

Date ranges use their first year for sorting: 2014–2026 sorts as 2014. Within the same starting year, the artist’s manual order is retained. Writing sorts by publication date. A category is a broad discipline; a tag describes a medium, format, technique, or useful grouping.

## Visual direction

The Dare informed the large sans-serif identity and restrained presentation. The supplied Creative Independent reference informed category navigation and the editorial reading layout. This is an original implementation using those references, with content owned by the artist.

- Helvetica/Arial/system sans-serif; large tight headings; black text, fine dividers, generous spacing.
- White portfolio pages and a warm off-white Writing background.
- One shared header size, padding, and responsive navigation rhythm across all routes.
- Transparent project image frames; square crops only for archive cards. Covers and gallery images retain the whole artwork.
- Writing stays close to the project system but prioritizes readable text instead of a mandatory image/role.
- Gallery enhancement uses native CSS columns and a native dialog; no gallery framework. Image order remains the authored DOM order, read down each masonry column.

[site.css](../assets/css/site.css) owns exact tokens, spacing, and breakpoints. [Quality assurance](QUALITY_ASSURANCE.md) covers keyboard access, reduced motion, metadata, and responsive review.

## Boundaries

This is a portfolio and publishing tool, not a store, social network, or automatic asset-processing service. There are no visitor accounts, comments, payments, or search UI. Contact is by the artist’s configured links. Hosted editing has a small approved-email roster with equal editing/publishing access; it has no admin-role management screen.

Images must be prepared for web delivery. The editor accepts bounded MP4 files but does not transcode video. Writing is entered through the WYSIWYG editor; PDF text extraction was an import task, not an admin feature. Future scope should extend the existing content model and shared editor only where a concrete need requires it.
