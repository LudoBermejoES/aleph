# Session Cinematics

## ADDED Requirements

### Requirement: Session cinematics data model

The system SHALL store zero or more cinematics per game session in a `session_cinematics` table carrying title, slug, aria description, sanitised credit HTML, optional duration, sort order, visibility, uploader, byte sizes and sha256 hashes of the uploaded files, and the files themselves under `<campaign contentDir>/cinematics/<cinematic id>/`. A cinematic MUST be unique by slug within its session and MUST be deleted together with its session.

#### Scenario: Create a cinematic

- **WHEN** a DM sends `POST /api/campaigns/:id/sessions/:slug/cinematics` with `{title, slug, credit}` for an existing session
- **THEN** the response is 201 with the cinematic id, `visibility` defaults to `members`, and no files are recorded yet

#### Scenario: Duplicate slug

- **WHEN** a cinematic with the same slug already exists in that session and the same POST is repeated
- **THEN** the response is 409 and no second row exists

#### Scenario: Session deleted

- **WHEN** a session with two cinematics is deleted
- **THEN** both rows and their directories under `cinematics/` no longer exist

### Requirement: Cinematic upload endpoints

The system SHALL accept each cinematic file through `PUT /api/campaigns/:id/sessions/:slug/cinematics/:cid/files/:kind` with `kind` one of `html`, `video`, `thumb`, streaming the raw request body to disk without buffering it in memory. The endpoint MUST be restricted to `dm` and `co_dm`, MUST enforce the limits html 12 MB, video 100 MB and thumb 512 KB (413 when exceeded, partial data discarded), and MUST replace the previous file atomically.

#### Scenario: Upload a video

- **WHEN** a co-DM PUTs a valid 60 MB MP4 to `.../files/video`
- **THEN** the response is 200, `video_bytes` and `video_sha256` are stored and the file is at `<contentDir>/cinematics/<cid>/video.mp4`

#### Scenario: Oversized upload

- **WHEN** a PUT body exceeds the limit for its kind
- **THEN** the response is 413 and neither a partial file nor a changed row remains

#### Scenario: Replace keeps the old file on failure

- **WHEN** a replacement upload fails validation after an earlier successful upload
- **THEN** the earlier file and its hash are unchanged

#### Scenario: Non-DM roles are refused

- **WHEN** an editor, player or visitor sends any cinematic write request
- **THEN** the response is 403

#### Scenario: Unauthenticated write

- **WHEN** a request without session cookie or `X-API-Key` PUTs a file
- **THEN** the response is 401

### Requirement: Content sniffing of uploaded files

The system MUST validate uploaded bytes instead of trusting declared types: video MUST have an `ftyp` box at byte offset 4, thumb MUST be detected as `image/webp` by `detectMimeFromBytes`, and html MUST be valid UTF-8 without NUL bytes containing `<html` or `<!doctype html` within its first 1 KB.

#### Scenario: Fake video

- **WHEN** a PNG file is PUT to `.../files/video`
- **THEN** the response is 400 and the row is unchanged

#### Scenario: Binary posing as HTML

- **WHEN** a file containing NUL bytes is PUT to `.../files/html`
- **THEN** the response is 400

### Requirement: Credit HTML sanitisation

The system MUST sanitise `credit` on write with an allow-list limited to `a` (http/https `href` only), `em`, `strong`, `b`, `i`, `br` and `span`, MUST force `rel="noopener noreferrer"` and `target="_blank"` on links, and MUST strip all other tags and attributes, so the stored value is safe to render with `v-html`.

#### Scenario: Script in credit

- **WHEN** `credit` contains `<a href="javascript:alert(1)">x</a><script>y</script>`
- **THEN** the stored value contains no `javascript:` URL and no `<script>` element

#### Scenario: Legitimate attribution survives

- **WHEN** `credit` is `Door: <a href="https://polyfork.dev">Polyfork</a>, CC BY 4.0`
- **THEN** the link and text are stored, with `rel` and `target` added

### Requirement: Sandboxed delivery of the interactive HTML

The system SHALL serve the cinematic HTML only with `Content-Security-Policy` containing `sandbox allow-scripts` and never `allow-same-origin`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and `frame-ancestors 'self'`, and the CSP MUST restrict `connect-src` to `data:` and `blob:`. The session page MUST embed it only through an `<iframe sandbox="allow-scripts" allow="fullscreen">` without `allow-same-origin`, created only after the user requests the interactive version.

#### Scenario: Headers on the raw route

- **WHEN** an authorised user requests `.../cinematics/:cid/html`
- **THEN** the response has `Content-Type: text/html; charset=utf-8` and the CSP header begins with `sandbox allow-scripts` and does not contain `allow-same-origin`

#### Scenario: Script cannot reach the viewer's session

- **WHEN** a hostile HTML fixture served by that route runs `document.cookie`, `localStorage.getItem('x')` and `fetch('/api/me', {credentials: 'include'})`
- **THEN** the cookie string is empty, `localStorage` throws a SecurityError, and the fetch fails or returns no user data

#### Scenario: Opened directly in a tab

- **WHEN** an authorised user navigates a top-level tab to the HTML route
- **THEN** the sandbox CSP still applies and the page has an opaque origin

#### Scenario: No auto-load

- **WHEN** the session page renders a cinematic
- **THEN** no iframe exists until the user presses the play-interactive control

### Requirement: Video and thumbnail serving with Range support

The system SHALL serve the video with `Accept-Ranges: bytes`, answering `Range: bytes=a-b`, `a-` and `-n` with 206 and a correct `Content-Range`, unsatisfiable or multi-range requests with 416, and no `Range` with a 200 stream; files MUST be streamed from disk, MUST carry `ETag` (sha256), `Cache-Control: private` and `X-Content-Type-Options: nosniff`, and MUST bypass the buffering ETag middleware (`server/middleware/etag.ts`) and the secret-stripping plugin (`server/plugins/strip-secrets.ts`).

#### Scenario: Seek

- **WHEN** the browser requests `Range: bytes=1000-1999` on a 60 MB video
- **THEN** the response is 206 with `Content-Range: bytes 1000-1999/<size>`, `Content-Length: 1000` and exactly those bytes

#### Scenario: Out-of-range

- **WHEN** the requested start is beyond the file size
- **THEN** the response is 416 with `Content-Range: bytes */<size>`

#### Scenario: Revalidation

- **WHEN** a request carries `If-None-Match` equal to the current ETag
- **THEN** the response is 304 with no body

#### Scenario: Large file is not buffered

- **WHEN** a full 90 MB video is requested
- **THEN** server memory does not grow by the file size and the body arrives byte-identical to the stored file

### Requirement: Cinematic visibility

The system SHALL give each cinematic a `visibility` of `public`, `members` or `dm_only` and MUST apply the minimum role from `VISIBILITY_MIN_ROLE` using `getEffectiveRole` (so `?preview_as=` works) identically on the list, on every file route and on counts; a cinematic the caller may not see MUST answer 404, and a cinematic with no `html` or no `video` uploaded MUST be hidden from roles below `co_dm`.

#### Scenario: Player and a DM-only cinematic

- **WHEN** a player lists cinematics and fetches the video of a `dm_only` cinematic
- **THEN** the list omits it and the file route returns 404

#### Scenario: DM sees everything

- **WHEN** a DM lists cinematics of a session containing `public`, `members` and `dm_only` items
- **THEN** all three are returned with their visibility

#### Scenario: Preview as player

- **WHEN** a DM requests the list with `?preview_as=player`
- **THEN** `dm_only` items are omitted

#### Scenario: Visitor of a public campaign

- **WHEN** a visitor lists cinematics
- **THEN** only `public` ones are returned

#### Scenario: Unauthenticated read

- **WHEN** a request with no credentials reads the list or any file route
- **THEN** the response is 401

#### Scenario: Incomplete upload

- **WHEN** a cinematic has only its metadata and a player lists the session's cinematics
- **THEN** it is not returned

### Requirement: Cinematics section on the session page

The session page (`app/pages/campaigns/[id]/sessions/[slug]/index.vue`) SHALL show a "Cinematics" section when at least one visible cinematic exists, with for each: title, a native `<video controls preload="metadata">` using the thumb as poster, a control to open the interactive version in the sandboxed iframe with fullscreen, and the credit HTML always visible. All text MUST come from `i18n/locales/en.json` and `es.json`.

#### Scenario: Session without cinematics

- **WHEN** a session has no visible cinematic
- **THEN** the section is not rendered

#### Scenario: Watching and credits

- **WHEN** a player opens a session with a `members` cinematic
- **THEN** the video with poster and the credit text with its CC BY links are visible without any interaction

#### Scenario: Interactive version

- **WHEN** the user presses "Play interactive version"
- **THEN** an iframe with `sandbox="allow-scripts"` and `allow="fullscreen"` loads the HTML route and a close control removes it

#### Scenario: Spanish locale

- **WHEN** the UI language is Spanish
- **THEN** the section heading and controls use the `es.json` strings

### Requirement: Listing, updating and deleting cinematics

The system SHALL provide `GET .../cinematics` (visible items ordered by `sort_order` then title, with URLs and no filesystem paths), `PUT .../cinematics/:cid` (title, aria, credit, sort order, visibility) and `DELETE .../cinematics/:cid` (row and directory), the latter two for `dm` and `co_dm` only.

#### Scenario: Reorder and retitle

- **WHEN** a DM PUTs a new `sortOrder` and `title`
- **THEN** a subsequent list returns the new order and title

#### Scenario: Delete

- **WHEN** a DM deletes a cinematic
- **THEN** the response is 204, its files are gone and later file requests return 404

#### Scenario: Player cannot delete

- **WHEN** a player sends DELETE
- **THEN** the response is 403 and the cinematic remains

### Requirement: CLI support

The CLI SHALL provide `aleph session cinematic upload|list|update|delete`. Upload MUST create or find the cinematic by slug, stream each file without reading it fully into memory, and skip files whose sha256 already matches. `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` MUST document the commands and be updated together.

#### Scenario: Upload from a diorama scene folder

- **WHEN** a DM runs `upload <session-slug> --campaign <id> --html <file> --video <file> --thumb <file> --meta scene.json` with the scene's `.html`, `.mp4`, `thumb.webp` and `scene.json`
- **THEN** the cinematic takes title, slug, aria and credit from `scene.json` (flags override) and exists with the scene's title and credit and all three files are stored

#### Scenario: Re-run is idempotent

- **WHEN** the same command is run again with unchanged files
- **THEN** no file is re-sent and the command reports them as unchanged

#### Scenario: Missing file

- **WHEN** `--video` points to a non-existent path
- **THEN** the CLI exits non-zero before any request is made

### Requirement: Deployment and backup coverage

Cinematic files MUST live under the campaign `contentDir` so they are archived by `backup:run` and preserved by `deployment/deploy.sh`, and `deployment/nginx.conf` MUST allow bodies up to 110 MB, without request buffering, only on the cinematic file-upload location.

#### Scenario: Backup includes cinematics

- **WHEN** a backup archive is created after an upload
- **THEN** the archive contains `cinematics/<cid>/scene.html` and `video.mp4` under the campaign content directory

#### Scenario: Other routes keep the small limit

- **WHEN** nginx is configured as in the repo
- **THEN** only the cinematic files location sets `client_max_body_size 110m`
