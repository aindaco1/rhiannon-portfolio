# Project handbook

**Audience:** R. Barela, editors, developers, operators, and future agents.

**Reviewed:** November 17, 2026, against the checked-in implementation. This handbook describes configuration and behavior; it is not a live service health report.

## Choose a guide

| Task | Guide |
| --- | --- |
| Understand the site, design, and product boundaries | [Project](PROJECT.md) |
| Add projects, write, update Bio, and publish | [Editor guide](EDITOR_GUIDE.md) |
| Install, run locally, and work with separate content stores | [Development](DEVELOPMENT.md) |
| Find the code that owns a behavior | [Architecture](ARCHITECTURE.md) |
| Understand fields, blocks, stable URLs, and ordering | [Content model](CONTENT_MODEL.md) |
| Prepare photos, video, and the downloadable PDF | [Media pipeline](MEDIA_PIPELINE.md) |
| Integrate or diagnose the editor API | [API](API.md) |
| Configure hosting, sign-in, and a release | [Deployment](DEPLOYMENT.md) |
| Back up, recover, resolve conflicts, or roll back | [Operations](OPERATIONS.md) |
| Select checks and assess their limits | [Quality assurance](QUALITY_ASSURANCE.md) |

[The root README](../README.md) is the quick start. [AGENTS.md](../AGENTS.md) is the contributor brief. Detailed procedures belong in the guides above.

## Sources of truth

| Concern | Owning source |
| --- | --- |
| Versioned public content | [content/catalog.json](../content/catalog.json) |
| Hosted working copy and publication baseline | `_editor/catalog.json`, maintained by [github-store.mjs](../worker/github-store.mjs) |
| Local working and published snapshots | Ignored `.local/state.json`, maintained by [local-store.mjs](../scripts/local-store.mjs) |
| Schema, limits, URL validation, block rendering | [lib/content.mjs](../lib/content.mjs) |
| Public composition and metadata | [lib/views.mjs](../lib/views.mjs) |
| Visual rules and enhancements | [site.css](../assets/css/site.css), [site.js](../assets/js/site.js) |
| Authoring UI and hosted browser session | [admin.mjs](../admin/admin.mjs), [session.mjs](../admin/session.mjs) |
| API, authentication, persistence | [worker/](../worker) |
| Build and public artifact boundary | [scripts/build.mjs](../scripts/build.mjs) |
| Platform pin | [platform.json](../platform.json), [.gitmodules](../.gitmodules) |
| Runtime and commands | [package.json](../package.json), [Gemfile.lock](../Gemfile.lock) |
| Hosting and API origins | [admin/config.json](../admin/config.json), [worker/wrangler.jsonc](../worker/wrangler.jsonc), catalog profile URL |
| Release gates | [.github/workflows/](../.github/workflows), [shared verification action](../.github/actions/verify-site/action.yml) |

The artist remains the authority for titles, dates, credits, descriptions, and publication choices. A test or image-derived tag guess does not establish a production credit.

## Maintaining the handbook

Update the owning guide with any changed behavior, configuration, or workflow. Link to executable values instead of repeating secret names, limits, or version pins throughout the handbook. Run `npm run test:docs` after edits. The checker covers the maintained guide set, its headings, whitespace, and relative links; it does not check external website availability or revalidate historical evidence.

Review deployment settings and service acceptance before a release, recovery steps after storage changes, and editing instructions after UI changes. Never place credentials or browser recovery exports in docs. Documentation is excluded from the website by the build’s explicit staging process; Pages deploys `dist/`, not the repository root.

## Historical records

These records retain their original revision-specific claims. Earlier dummy-content, private-repository, Cloudflare Access, and undeployed-editor descriptions have been superseded by the current guides.

| Area | Records |
| --- | --- |
| Initial scope and implementation | [Plan](../PLAN.md), [initial acceptance](../TASK.md) |
| Writing | [Writing implementation](WRITING-TASK.md), [real Film and Writing import](FILM-IMPORT-TASK.md) |
| Bio | [Bio text](BIO-TASK.md), [WYSIWYG](BIO-EDITOR-TASK.md), [PDF upload](PDF-UPLOAD-TASK.md), [director reel](DIRECTOR-REEL-TASK.md), [media layout](BIO-MEDIA-LAYOUT.md) |
| Art collections | [Retablos/Woodcarvings](ART-PROJECTS-TASK.md), [Sketches](SKETCHES-TASK.md), [deep inside](DEEP-INSIDE-TASK.md) |
| Taxonomy and galleries | [Tag assignments](PROJECT-TAGS.md), [masonry and publication](GALLERY-TAXONOMY-TASK.md) |
| Other evidence | [Admin access history](ADMIN-ACCESS-TASK.md), [sample photo provenance](IMAGE-SOURCES.md), [documentation review](DOCUMENTATION-TASK.md), [evidence directory](evidence) |

The guide structure follows the handbook/source-map approach in [ZEMA](https://github.com/aindaco1/zema-landing/tree/main/docs) and the task-oriented development/API/operations guides in [Nob Hill Chile Drop](https://github.com/aindaco1/nob-hill-chile-drop/tree/main/docs). Their project-specific services and procedures are not inherited here.
