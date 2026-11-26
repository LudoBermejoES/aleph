# Design: Session Cinematics

## Context (what the code does today)

- Sessions: `gameSessions` in `server/db/schema/sessions.ts`; page `app/pages/campaigns/[id]/sessions/[slug]/index.vue`; API `server/api/campaigns/[id]/sessions/[slug]/**`. Session GET returns `hasContent` flags and `logContent`.
- Uploads: `readMultipartFormData` buffers the whole body in memory (e.g. `maps/[slug]/upload.post.ts`); images validated by `server/utils/image-upload.ts` (10 MB, MIME allow-list) and `detectMimeFromBytes` (`server/utils/sanitize.ts`, image magic only). Files land under `process.cwd()/<campaign.contentDir>/...`.
- Auth: `server/middleware/01.auth.ts` (cookie or `X-API-Key`), `02.campaign.ts` sets `event.context.campaignRole`, `03.csrf.ts` exempts API-key requests. Session cookie is `sameSite: 'strict'` (`server/utils/auth.ts`).
- Visibility: entity `visibility` (`VISIBILITY_MIN_ROLE` in `server/utils/permissions.ts`) vs `:::secret` blocks stripped by `server/plugins/strip-secrets.ts`; `?preview_as=` via `getEffectiveRole` (`server/utils/effective-role.ts`). See `docs/aleph-visibility.md` in the parent repo.
- Two traps found: `server/middleware/etag.ts` buffers EVERY GET body under `/api/campaigns/` into memory (a 90 MB video would be buffered and Range would break), and `deployment/nginx.conf` sets no `client_max_body_size`, so nginx's default 1 MB applies (existing 10 MB image uploads only work if set elsewhere on the server; verify).
- Backups: `backup:run` (03:00 UTC) tars the DB snapshot + `content/` + `.env` to R2 (`docs/backup.md`); `deployment/deploy.sh` excludes `content` from rsync, so files survive deploys.

## Decisions

### 1. Data model

Table `session_cinematics`:

| column                                                    | notes                                                                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `id` text PK                                              | uuid; also the storage directory name                                                                                                      |
| `session_id` FK -> `game_sessions.id` ON DELETE CASCADE   |                                                                                                                                            |
| `campaign_id` FK -> `campaigns.id` ON DELETE CASCADE      | denormalised for cheap scoping/tests                                                                                                       |
| `slug` text                                               | from scene.json `slug`; unique per session                                                                                                 |
| `title`, `aria` text                                      | `aria` is the iframe/video accessible description                                                                                          |
| `credit_html` text                                        | sanitised on write (decision 3)                                                                                                            |
| `duration_seconds` integer null                           | optional `--duration`; not probed server-side (no ffmpeg)                                                                                  |
| `sort_order` integer default 0                            |                                                                                                                                            |
| `visibility` text default `members`                       | one of `public`, `members`, `dm_only`, reusing `VISIBILITY_MIN_ROLE` keys (not `editors`/`private`: a cinematic is not owned by an editor) |
| `html_bytes`, `video_bytes`, `thumb_bytes` integer null   | null = file not uploaded yet                                                                                                               |
| `html_sha256`, `video_sha256` text null                   | used as ETag and for CLI idempotent re-upload                                                                                              |
| `uploaded_by` FK -> `user.id`, `created_at`, `updated_at` |                                                                                                                                            |

Unique `(session_id, slug)`; index on `(session_id, sort_order)`. A row is "ready" when `html_bytes` and `video_bytes` are set; thumb is optional. A session with no rows behaves exactly as today. Migration `0040_*.sql` via `drizzle-kit generate` (convention: numbered files in `server/db/migrations`, applied at boot).

Storage: `<contentDir>/cinematics/<cinematic id>/scene.html|video.mp4|thumb.webp`. Fixed filenames and an id (never user input) in the path remove traversal and extension-spoofing concerns. Rows cascade-delete with the session; files are removed by the delete handlers (session delete included).

### 2. Upload

Rejected: one big multipart POST (like maps). `readMultipartFormData` would hold ~100 MB in RAM per request, and the CLI's `postMultipart` does `readFile` of the whole file. Chosen: metadata and files are separate calls and files are streamed raw.

- `POST /api/campaigns/:id/sessions/:slug/cinematics` JSON `{title, slug, aria?, credit?, durationSeconds?, sortOrder?, visibility?}` -> 201. DM/co-DM only (`hasMinRole(role, 'co_dm')`). 409 on duplicate slug.
- `PUT .../cinematics/:cid/files/:kind` with `kind` in `html|video|thumb`, body = raw bytes (`Content-Type: application/octet-stream`). The handler streams `event.node.req` to a temp file in the same dir, counting bytes and aborting (413) past the limit, then sniffs and `rename`s over the target (atomic: a failed replace leaves the old file). Re-PUT = replace. Same role gate. `Content-Length` over the limit is rejected before reading.
- Limits (constants in `server/services/cinematics.ts`): html 12 MB (6 MB real, headroom), video 100 MB (diorama's own rule is < 90 MB), thumb 512 KB.
- Sniffing (a declared type is never trusted): video must have `ftyp` at bytes 4-8; thumb must be `image/webp` per `detectMimeFromBytes`; html must be valid UTF-8, no NUL bytes, and contain `<html` or a `<!doctype html` within the first 1 KB (BOM/whitespace tolerated). The HTML check is a sanity check, NOT a safety check; safety is decision 3.
- Metadata `PUT .../cinematics/:cid` (title, aria, credit, sortOrder, visibility), `DELETE .../cinematics/:cid` (row + directory). API-key calls skip CSRF as for every other route.
- `credit` is HTML in `scene.json` and is rendered with `v-html` in the main origin, so it is sanitised on write with an allow-list (`a[href http/https only, rel], em, strong, b, i, br, span`, text) and `rel="noopener noreferrer" target="_blank"` forced on links. Everything else is stripped. This reuses no existing sanitiser (none exists for HTML); implement with a small allow-list function (add `sanitize-html` only if a reviewer prefers a library over ~40 lines; no new dependency by default) with unit tests.
- nginx: add `location ~ ^/api/campaigns/[^/]+/sessions/[^/]+/cinematics/[^/]+/files/ { client_max_body_size 110m; proxy_request_buffering off; proxy_read_timeout 900s; proxy_pass http://localhost:3033; }`. Do not raise the limit globally.
- CLI: `aleph session cinematic upload <session-slug> --campaign <id> --html f --video f [--thumb f] [--meta scene.json] [--title --visibility --order]`. Reads `scene.json` for title/slug/aria/credit (flags override), creates or finds the cinematic by slug, then PUTs each file with a streaming `fetch` (`duplex: 'half'`, `fs.createReadStream`), skipping a file whose sha256 equals the stored one. Also `list`, `update`, `delete`.

### 3. Security: isolating the author-supplied HTML (the critical part)

Threat: the page is arbitrary JS. Same-origin it could `fetch('/api/...')` with the viewer's cookie (CSRF token is a readable cookie, so even CSRF does not stop it), read `document.cookie`/`localStorage`, and act as a DM if a DM views it. The uploader is DM/co-DM, so this is trust-limited, but DM-uploaded files come from tools and third-party assets, and a compromised or copied file must not become a stored-XSS on a campaign wiki.

Options:

1. Separate origin (e.g. `cinematics.aleph.ludobermejo.es` or a different registrable domain). Strongest, but needs DNS, TLS cert, an nginx vhost, an auth scheme for that origin (cookies do not cross sites; needs signed short-lived URLs) and a deploy change. Disproportionate for a 4-person wiki.
2. Same origin, but served with `Content-Security-Policy: sandbox allow-scripts` and embedded in `<iframe sandbox="allow-scripts">`. The sandbox gives the document an opaque (unique) origin: `document.cookie` is empty, `localStorage` throws, and its `fetch` to aleph is cross-origin with no CORS grant (aleph sends no `Access-Control-Allow-Origin`) and, because the session cookie is `SameSite=Strict`, no cookie is attached from an opaque origin either. WebGL2 works. The header protects the document even when someone opens the URL directly in a tab (the iframe attribute alone does not), which is the key reason for using both.
3. `iframe srcdoc`/blob URL: loads 6 MB through the page JS and still needs the attribute sandbox only; rejected (no header protection, and a blob inherits the creator's origin).

**Chosen: option 2**, with the header as the primary control and the iframe attribute as a second layer. The HTML route responds:

```
Content-Type: text/html; charset=utf-8
Content-Security-Policy: sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; worker-src blob:; connect-src data: blob:; frame-ancestors 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Cache-Control: private, max-age=0, must-revalidate   (ETag = html_sha256)
```

Notes: `allow-same-origin`, `allow-top-navigation`, `allow-popups`, `allow-forms`, `allow-modals` are never granted. `connect-src data: blob:` (no `https:`) blocks exfiltration to third parties; scenes inline GLB as data URIs so they should not need the network. `'unsafe-eval'`/`blob:` are included only if the real diorama output needs them: a task verifies the Kingmaker scene and `xii-el-cuarto-que-come` under this exact CSP and trims it. `frame-ancestors 'self'` stops embedding by other sites. The route is behind normal auth + visibility, so there is no anonymous access. Residual risk accepted: a hostile file could still burn CPU/GPU in the viewer's tab or show phishing-like content inside the frame; it cannot touch the aleph session. Upgrade path to option 1 is a route move only.

Fullscreen: `<iframe sandbox="allow-scripts" allow="fullscreen" allowfullscreen referrerpolicy="no-referrer" loading="lazy" :title="aria">`. The iframe is created only after the user presses "Play interactive" (a 6 MB WebGL scene must not auto-load for every viewer). `?free=1`, `?subs=0` are exposed as toggles on that URL; `?t=` is not exposed.

`ETag`/`Content-Disposition`: all files served `inline`; video `Content-Type: video/mp4`, thumb `image/webp`, both with `nosniff`.

### 4. Display and visibility

New `app/components/SessionCinematics.vue` on the session page, below the content tabs. For each visible cinematic: title, `<video controls preload="metadata" :poster="thumbUrl" playsinline>` pointing at the video route, a "Play interactive version" button (iframe, with a close and a fullscreen button), and the credit HTML (always rendered, not collapsible). Section is not rendered when the list is empty. Strings in `i18n/locales/en.json` and `es.json` under `sessions.cinematics.*` (the only locale dir). DM/co-DM also see an "upload" hint with the CLI command, visibility badge and a delete button; browser upload UI is a non-goal.

Visibility rule (server, in `server/services/cinematics.ts`): row visible if `hasMinRole(getEffectiveRole(event), required)` where `required` = `VISIBILITY_MIN_ROLE[visibility]` (`public` 0, `members` player, `dm_only` co_dm). Applied identically to list, to each file route, and to the session delete. A hidden cinematic answers **404** on every route (never 403, no existence leak). `?preview_as=player` works because `getEffectiveRole` is used. Visitors of public campaigns see only `public`. This is the entity-style axis; there are no `:::secret` blocks inside binary files, so `title`/`aria`/`credit` of a DM-only item are simply not returned. The list is a separate endpoint (`GET .../cinematics`); the session GET is unchanged except for `hasContent`-style `cinematicCount` (visible ones only).

Binary responses must bypass two global layers: `etag.ts` (skip paths matching `/cinematics/[^/]+/(html|video|thumb)$`; it buffers bodies) and `strip-secrets.ts` (must leave Buffers/streams untouched; add a test).

### 5. Serving, Range, caching, backups

- `GET .../cinematics/:cid/video`: `fs.stat` for size, `Accept-Ranges: bytes`. No `Range` -> 200 with `createReadStream`. `Range: bytes=a-b` / `a-` / `-n` -> 206, `Content-Range`, `Content-Length`, stream with `{start,end}`. Unsatisfiable or multi-range -> 416 with `Content-Range: bytes */size`. Stream errors destroy the response (no buffering).
- Caching: `ETag: "<sha256>"`, `Cache-Control: private, max-age=3600, must-revalidate` for video/thumb (auth-gated, so never `public`), `If-None-Match` -> 304. Replace changes the hash, so stale caches revalidate.
- Storage under `<contentDir>/cinematics/` is inside `content/`, hence already in `backup:run` and preserved by `deploy.sh`. Cost: MP4 does not compress and the tar.gz is uploaded daily with 7+4+6 retention, so each 60 MB video adds roughly 1 GB of R2 over the retention window. Accepted for now (videos are regenerable from the diorama repo, but the interactive file is the master). Documented in `docs/backup.md` with a note that an exclusion for `cinematics/*/video.mp4` is the first knob to turn.
- Disk: no quota in v1; limit is 100 MB per video and a cap of 20 cinematics per session (constant).

### 6. Tests

Per CLAUDE.md: unit (sniffers, range parser, credit sanitiser, visibility predicate), integration on :3333 (CRUD, streaming upload, 413, 206/416, role/visibility matrix, unauthenticated 401, preview_as), e2e (player vs DM view, play, credits), and a negative security test: load the sandboxed route in a Playwright page containing a hostile fixture and assert `document.cookie === ''`, `localStorage` throws, and `fetch('/api/me')` fails or returns no data; plus a header assertion on the raw route. Mutation-check the negative test by removing `sandbox` from the header and requiring it to go red (restart the server between edit and run: server routes are not hot-reloaded).

### 7. CLI and skills

`cli/src/commands/session.js` gains `cinematic` group; `cli/src/lib/client.js` gains a streaming `putFile`. `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` (bump `version` in frontmatter, currently 3.30) updated together; `docs/cli.md` too.

## Risks

- The CSP may be too tight for some scene; mitigated by verifying with real scenes, and the `sandbox` directive (the part that matters) is independent of the other directives.
- nginx change is a server-side deploy step outside CI; called out in tasks.
- Partial uploads: a row with only some files is not "ready" and is hidden from non-DM roles.
