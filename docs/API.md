# Editor API

**Audience:** maintainers and integration authors. Normal editing uses the browser dashboard.

Sources: [API handler](../worker/api.mjs), [hosted dispatch](../worker/index.mjs), [authentication](../worker/auth.mjs), and [storage adapter](../worker/github-store.mjs).

## Origin and authentication

The hosted API origin is configured in [admin/config.json](../admin/config.json). Every hosted request must supply the exact HTTPS `ADMIN_ORIGIN` from [wrangler.jsonc](../worker/wrangler.jsonc), including GET/media requests. Approved OPTIONS requests receive CORS headers for `Content-Type`, `Authorization`, and `Range`. CORS does not replace authentication.

All non-auth API routes and media reads require `Authorization: Bearer …`. Tokens stay in the browser tab’s session storage; D1 stores only hashes. The email allowlist is rechecked when authorizing existing sessions. Responses use `private, no-store`, `nosniff`, and `noindex, nofollow` headers.

Local development uses a separate HttpOnly cookie acquired from `/admin/`; mutations require the exact local Origin. The deployed Worker has no local bypass. Do not reuse local cookies, test tokens, or production credentials across these modes.

## Sign-in routes

All auth routes use POST. Login and verify accept JSON objects limited to 2 KiB.

| Route | Input | Success |
| --- | --- | --- |
| `/api/auth/login` | `{email}` | 200 `{message}`; generic acknowledgment, including for unapproved addresses |
| `/api/auth/verify` | `{token}` | 200 `{accessToken, expiresAt, email}` |
| `/api/auth/logout` | Valid bearer session | 200 `{ok: true}`; revokes that session |

Links expire after 15 minutes and can be exchanged once, transactionally. Sessions last eight hours. Login/verify share an IP limit of 30 attempts per hour; login also permits three attempts per normalized email per hour. Expired token/rate-limit rows are cleaned opportunistically during login. There is no scheduled cleanup worker or durable email outbox.

## Content routes

Use JSON for catalog/control requests and raw file bytes for uploads; there is no multipart upload protocol.

| Method / route | Request | Success |
| --- | --- | --- |
| GET `/api/state` | — | Catalog and revision snapshot |
| PUT `/api/draft` | `{catalog, revision, publishedRevision}`; up to 2 MiB | Saved catalog/revisions |
| POST `/api/preview` | `{catalog, id}` or `{catalog, page: "bio"}`; up to 2 MiB | `{html}`; no persistence |
| POST `/api/publish` | `{revision, publishedRevision}`; up to 1 KiB | Publication result |
| GET `/api/status?revision=…` | Exact publication commit SHA in hosted mode | `{commit, status, url?}` |
| POST `/api/media` | Raw supported image bytes | 201 `{src}` |
| POST `/api/videos` | Raw supported MP4 bytes | 201 `{src}` |
| POST `/api/documents` | Raw supported PDF bytes | 201 `{src}` |
| GET / HEAD `/assets/...` | Valid media/document/video path and session | Authenticated media; MP4 supports Range |

[Media pipeline](MEDIA_PIPELINE.md) owns upload limits and validation boundaries. The API has no general file read, arbitrary embed, media-delete, or user-management route.

## Revisions and publication states

A snapshot includes `catalog`, `revision`, `publishedRevision`, and `mode`. Hosted snapshots also include `currentPublishedRevision` and `conflict`. Pass returned revisions back unchanged; do not recompute or assume a fixed hash width. Hosted revisions are Git file SHAs (or an initial `none:` marker); local revisions are catalog hashes.

Save/publish rejects a changed working copy, a changed public file, or a stale working baseline. The hosted publication commit updates the public catalog and the working baseline atomically. A lost response can therefore be reconciled by reading state again.

| State | Meaning |
| --- | --- |
| `unchanged` | Public catalog already matches; no new release commit |
| `queued` | Publication commit created, or its workflow is not yet visible |
| `publishing` | Matching Pages workflow is running |
| `live` | Local artifact switched, or matching hosted workflow succeeded |
| `failed` | Matching hosted workflow completed without success |
| `unknown` | Local status query does not match the current published hash |

Hosted status checks the Pages workflow for the exact commit. Operators should also compare public `/release.json`; a workflow response is not a direct check of every deployed page. The editor polls 30 times at four-second intervals before reporting that a release is still queued.

## Error handling

Errors return `{error: "…"}`. Treat the status and preserved state as authoritative; display human-readable details without inventing a retry outcome.

| Status | Typical action |
| --- | --- |
| 400 | Correct validation errors, missing references, or invalid URLs |
| 401 | Sign in again; retain browser recovery data |
| 403 | Correct the Origin/configuration or access boundary; do not weaken it |
| 404 / 405 | Check the exact supported path/method |
| 409 | Download recovery, reload, and reconcile; do not blindly retry an old revision |
| 413 / 415 | Reduce the request/file or correct content type |
| 429 | Wait for the rate-limit window; avoid repeated sign-in attempts |
| 500 / 502 / 503 | Check service/build/configuration and read saved state before retrying an uncertain mutation |

Use the isolated tests in [Quality assurance](QUALITY_ASSURANCE.md) for write examples. Do not send production login emails or publish content merely to exercise this reference.
