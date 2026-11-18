# Operations and recovery

**Audience:** maintainers supporting editors and operating the portfolio.

## Before changing state

Identify the checkout, runtime, and content store involved. Inspect Git status, current public revision, and the saved working baseline. Ask the editor to save or export in-browser work before a disruptive recovery operation. A local preview, a GitHub catalog, and a deployed Pages artifact can all be at different revisions.

Use [Deployment](DEPLOYMENT.md) for release/configuration commands and [API](API.md) for request semantics. Do not run production login, upload, publish, or D1 mutation calls as generic health checks.

## Backup scope

| Item | What to preserve |
| --- | --- |
| Source | Git history, current revision, submodule pin, uncommitted changes, and any untracked intended assets |
| Local authoring | `.local/state.json` and `.local/assets/` (or those paths under the configured `DATA_DIR`) |
| Hosted authoring | Both `content/catalog.json` and `_editor/catalog.json` at a known commit, plus all referenced immutable assets |
| Browser recovery | Downloaded recovery JSON for unsaved work; this contains catalog data only |
| Service configuration | Worker configuration, migration history, deployment identifiers, and recoverable credentials in approved secret storage |
| Sessions | A protected D1 export before schema/incident work when needed; it contains email/session metadata |

Generated `dist/`, `.build/`, `.admin-build/`, and local `live/` pages are rebuildable. They are not substitutes for the catalog and media. The local `previous/` artifact is only the last publication and can be replaced by the next publication. There is no configured scheduled backup job.

Keep backups outside the public repository. Immutable media must remain available for older published revisions; removing an unreferenced upload is a separate retention decision, not routine cleanup.

## Local backup and restore rehearsal

Stop the relevant local server so the snapshot is consistent. Preserve source/uncommitted files separately as listed above. From the repository root, this creates a dated backup of local authoring state and uploaded assets:

```sh
portfolio_backup="../rhiannon-local-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$portfolio_backup"
cp .local/state.json "$portfolio_backup/state.json"
if [ -d .local/assets ]; then
  cp -R .local/assets "$portfolio_backup/assets"
fi
git rev-parse HEAD > "$portfolio_backup/source-revision.txt"
```

Adapt the input paths if the server uses a different `DATA_DIR`. Confirm the copy completed, parse the saved JSON, and verify referenced media against the backup plus the source assets. The revision text identifies the required source; it does not back up that source.

Rehearse recovery into a new directory, using the matching source revision and available dependencies:

```sh
portfolio_restore=".local/restore-review-$(date +%Y%m%d-%H%M%S)"
cp -R "$portfolio_backup" "$portfolio_restore"
DATA_DIR="$portfolio_restore" PORT=4331 ADMIN_PORT=4332 npm run dev
```

Inspect the recovered public pages and admin catalog. Check Bio, writing, galleries, PDF, video playback, and both draft/published state. Do not replace the owner’s original store until the recovery is reviewed. Stop the rehearsal server afterward. Run builds sequentially because admin build assets are shared within a checkout.

For hosted content, first inspect a selected Git revision in a separate checkout/local store. Restoring a historical public catalog must also reconcile the current working baseline and later editor changes. A blind overwrite of `_editor/catalog.json` can lose work. Browser JSON exports have no one-click import UI; a maintainer must validate and reconcile them through the existing store/API contract.

## Concurrent edits and stale baselines

On a 409 or “newer version” message:

1. Download the browser recovery copy before reloading.
2. Load the latest saved catalog and current public revision. Compare changes by stable entry/term IDs.
3. Reapply the intended edits to the newer catalog, preserving unrelated work.
4. Save with the current working and published revisions. Preview before publication.

If a direct repository edit moved the public catalog ahead of the working baseline, the editor correctly refuses to silently rebase. A maintainer must reconcile the working copy and its `basePublishedRevision` against the actual public file SHA using a reviewed, revision-checked change. Do not invent hashes, clear the working copy, or force-push to bypass the conflict.

After a lost response, read saved state before retrying. Hosted publication updates the catalog and baseline in one commit; retrying an old revision is not a recovery strategy. “No public changes to publish” is a successful no-change result.

## Incident guide

| Symptom | Diagnosis and response |
| --- | --- |
| Sign-in email missing | Confirm the approved address, sender configuration, provider delivery outcome, and spam folder. Generic acknowledgment is not delivery evidence; respect rate limits. |
| Link used/expired | Request a fresh link. Do not reuse a token or paste it into logs. |
| Session expired | Sign in again; preserve browser recovery. Removing an email from the configured allowlist also denies its sessions. |
| Media fails only in editor | Check authenticated Worker fetches and session expiry; hosted media uses temporary blob URLs. Reload saved state after preserving edits. |
| Save fails | Correct validation or reconcile revisions. Check GitHub App scope/installation for repository errors. |
| Publish reports missing media | Locate the exact missing reference; restore/upload the original asset and revalidate. Do not remove unrelated blocks to make the build pass. |
| Publish queued or failed | Inspect Pages for the exact commit; keep the current live artifact. Fix the cause and publish/release the corrected state. |
| Website looks old | Compare public `/release.json`, the Pages run, and the intended source commit; then reload cached assets. |
| Unused tag has no page | Expected until a published entry uses it. A draft-only assignment does not create a public archive. |
| Video is blank or cannot seek | Check actual codecs, full MP4 structure, poster/source references, Range responses, and browser playback; file extension is insufficient. |

## Rollback and service recovery

For a bad successful site release, preserve later drafts first, then revert the appropriate source/publication commit and let the normal gated Pages deployment run. Review the resulting catalog and working baseline together. Keep immutable media referenced by the restored revision.

Worker rollback is separate from Pages. Preserve compatible D1 tables and migration history; a database restore can revive stale session records and is not a content rollback. The artist’s catalog is in Git, not D1. Re-establish the configured roster and credentials deliberately after a service incident, then perform the bounded acceptance steps in [Deployment](DEPLOYMENT.md).
