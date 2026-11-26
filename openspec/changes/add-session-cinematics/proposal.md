# Proposal: Session Cinematics

## Why

The `diorama` repo produces short pixel-art Three.js "diorama films" per story scene. Each ships as a self-contained interactive `<slug>.html` (~6 MB, all JS and GLB models inlined), a recorded `<slug>.mp4` (1600x1000, 30 fps, 30-90 MB), a `thumb.webp`, and a `scene.json` (`slug`, `title`, `aria`, `credit`). A Kingmaker one is being built for session `25-de-octubre-de-2026`. Aleph has nowhere to put them: session pages only hold markdown (`summary`, `ai_notes`, `manual_notes`), and the existing upload paths only accept png/jpeg/webp images up to 10 MB.

The blocker is not storage but trust. The HTML is arbitrary author-supplied script. Served same-origin it would run with the viewer's aleph cookie and could call the API as them. The credits (CC BY 4.0) must also always be visible.

## What Changes

- New table `session_cinematics` (0..N per session) with a Drizzle migration.
- New API under `/api/campaigns/:id/sessions/:slug/cinematics`: create, list, update metadata, delete, per-file streaming upload (`PUT .../files/:kind`), and file serving (`GET .../html|video|thumb`) with HTTP Range support.
- The interactive HTML is served only with `Content-Security-Policy: sandbox allow-scripts ...` plus `X-Content-Type-Options: nosniff`, and embedded only via `<iframe sandbox="allow-scripts" allow="fullscreen">` (no `allow-same-origin`).
- Session page gets a "Cinematics" section: native `<video>` (poster = thumb), "Play interactive" opens the sandboxed iframe, credits always visible, visibility-filtered.
- CLI `aleph session cinematic upload|list|update|delete`; both skill docs updated.
- `deployment/nginx.conf`: raise `client_max_body_size` for the upload route (currently unset, i.e. nginx's 1 MB default).
- `server/middleware/etag.ts` and `server/plugins/strip-secrets.ts` must skip binary cinematic responses.

### Non-goals

- Building/transcoding scenes or videos (diorama repo owns that; no ffmpeg on the server).
- Serving cinematics from a second domain/CDN (considered, rejected; see design.md).
- Embedding cinematics in entity/character pages, or in markdown bodies.
- Resumable/chunked uploads; public (anonymous) sharing links.

## Impact

- Affected: `server/db/schema/sessions.ts`, new migration `server/db/migrations/0040_*.sql`, new `server/api/campaigns/[id]/sessions/[slug]/cinematics/**`, new `server/services/cinematics.ts`, `server/middleware/etag.ts`, `server/plugins/strip-secrets.ts`, `app/pages/campaigns/[id]/sessions/[slug]/index.vue` (+ new `SessionCinematics.vue`), `i18n/locales/{en,es}.json`, `deployment/nginx.conf`, `docs/backup.md`/`docs/content-model.md`.
- **aleph-cli impact: YES.** New endpoints and data model: new `cli/src/commands/session.js` subcommand group, a streaming `putFile` helper in `cli/src/lib/client.js`, `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` (bump version in frontmatter; both together).
- Backups: files live under the campaign `contentDir`, which `backup:run` already archives (cost noted in design.md).
