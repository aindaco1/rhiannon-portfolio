# Working on R. Barela’s portfolio

Read [the handbook](docs/README.md) and the task-relevant guide before editing. Inspect current Git status and owning source; historical task records are evidence from an earlier revision, not current operating instructions.

## Scope and preservation

- Keep KISS and DRY. Use the shared editor and existing rendering/validation contract rather than introducing another CMS, content parser, or frontend framework.
- Preserve owner work in both `content/catalog.json` and `.local/state.json`. They can intentionally differ. Never overwrite the local catalog with the tracked catalog just to refresh code.
- Check `_editor/catalog.json` and its published baseline when changing hosted content. Resolve revision conflicts explicitly; do not force-push or silently rebase someone else’s draft.
- Preserve saved entry IDs, kinds, URLs, and taxonomy slugs. Renaming a label or title must not break its URL.
- Keep original media and immutable uploads. Removing an entry or media from a page does not authorize deleting files or repository history.
- Do not run `scripts/seed.mjs` against this working portfolio: it rewrites the catalog with sample content.
- Keep live email, Worker deployment, D1 migration, and site publication separate from local testing. Follow the user’s authorized scope; a documentation command is not authorization to execute a production mutation.

## Implementation and checks

- Platform ownership and versions are recorded in [platform.json](platform.json). Change a shared invariant in its shared owner; do not leave an unrecorded submodule patch or copy the composer into this repository.
- Use the isolated fixture store for browser mutations. Never redirect test fixtures at the owner’s `.local/` or hosted API.
- Run checks appropriate to the change using [quality assurance](docs/QUALITY_ASSURANCE.md). Documentation-only work needs `npm run test:docs`; functional changes need the affected tests and the complete `npm run check` gate before release.
- Update the canonical guide instead of duplicating instructions. Keep machine-specific logs, recovery files, tokens, and credentials out of tracked docs.
- Report implemented, tested, locally refreshed, committed, and externally deployed states accurately. Do not infer a live deployment from a passing build.
