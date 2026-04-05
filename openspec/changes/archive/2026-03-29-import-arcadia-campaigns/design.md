## Context

The Arcadia TTRPG universe has 15 years of history documented as Jekyll markdown files in `/Users/ludo/code/arcadia/docs/campaigns/`. The Aleph server already has all the required API endpoints (campaigns, session-groups, sessions, session content) from previous development. This is a one-time data migration wrapped in a reusable idempotent script.

**Source data structure:**

- `la-familia/` — 45 session files (`session-01.md` → `session-44-2026-03-01.md`), no subfolders for notes
- `la-fuerza-oculta/` — `manual-notes/` (53 files), `ai-notes/` (37 files), `ai-notes-summary/` (35 files); sessions cross-referenced by date in filenames
- `aun-sin-nombre/` — `ai-notes/` (9 files), `ai-notes-summary/` (9 files); no manual notes
- `genesis/` — 6 session files (`session-01.md` → `session-06.md`)
- `hospital/` — 2 session files (`session-01.md`, `session-02.md`)
- `crematorio-la-tranquilidad/` — `sessions/index.md` (1 narrative session), `ai-notes/` (1 file)

**Session file format:** Jekyll front-matter YAML (`layout`, `title`, `permalink`) + markdown content body. Title pattern: `"Campaign - Sesión NN"`. Date sometimes embedded in filename: `session-20-2025-06-15.md`.

**Aleph API endpoints used:**

- `POST /api/campaigns` — create campaign
- `POST /api/campaigns/:id/session-groups` — create group
- `POST /api/campaigns/:id/sessions` — create session (accepts `title`, `scheduledDate`, `groupSlug`, `status`)
- `PUT /api/campaigns/:id/sessions/:slug/content` — upsert content (`type`: `manual_notes` | `ai_notes` | `summary`)
- Auth: `X-API-Key` header (from `~/.aleph/config.json`)

## Goals / Non-Goals

**Goals:**

- Import all 6 campaigns into Aleph with correct names, descriptions, and slugs
- Import all sessions with title, number, date (where available), and status (`completed` for past sessions)
- Import session content: `manual_notes` from session body text, `ai_notes` from `ai-notes/` files, `summary` from `ai-notes-summary/` files
- Idempotent: detect existing campaigns/sessions by slug and skip them
- Standalone script (`cli/bin/import-arcadia.js`) — not wired into the main aleph CLI

**Non-Goals:**

- Importing characters, entities, quests, maps, or relations (separate future concern)
- Creating session groups beyond the top-level campaign grouping (La Fuerza Oculta's narrative arcs could be groups, but this is deferred)
- Real-time progress UI — simple console output is sufficient

## Decisions

**Decision 1: Standalone script vs. CLI command**
Chosen: standalone script (`node cli/bin/import-arcadia.js`). Rationale: this is a one-off migration for a specific directory path, not a reusable generic command. Keeping it separate avoids polluting the main CLI surface.

**Decision 2: Auth via existing config**
Uses `~/.aleph/config.json` (same as aleph-cli). The user must be logged in (`aleph login`) before running. No new auth mechanism needed.

**Decision 3: Session date extraction**
Files like `session-20-2025-06-15.md` encode the date in the filename. Files like `session-01.md` have no date. Strategy: parse date from filename if present; leave `scheduledDate` null otherwise.

**Decision 4: Session status**
All sessions with a parseable date in the past → `completed`. Sessions without dates → `completed` (all are historical). Crematorio session → `completed`. This is safe since all campaigns are past or ongoing.

**Decision 5: Content mapping**

- `manual_notes`: body of the session file itself (stripped of Jekyll front-matter)
- `ai_notes`: content of corresponding `ai-notes/<date>-gemini-notes.md` matched by date
- `summary`: content of corresponding `ai-notes-summary/<date>-gemini-notes.md` matched by date
- For La Familia and Génesis (no separate notes dirs): only `manual_notes` from session body

**Decision 6: Session groups**
La Fuerza Oculta will get session groups corresponding to its narrative phases (Junio 2025 "Los Fugitivos", Julio 2025 "Profesionalización Heroica", etc.) derived from the `sessions/index.md` groupings. Other campaigns get no groups (single-group campaigns don't benefit from grouping).

**Decision 7: Idempotency**
`GET /api/campaigns` → check if campaign name exists → skip creation if so. For sessions: attempt create, catch 409/duplicate slug error → skip. Simple and avoids complex state tracking.

## Risks / Trade-offs

- [Slug collisions across campaigns] → Each campaign is separate; slugs are scoped per campaign, so no cross-campaign collisions.
- [Jekyll liquid tags in content] → Some files contain `{{ site.baseurl }}` references. Strip or leave as-is; they won't break Aleph's markdown renderer but will render as raw text. Acceptable for now.
- [Missing date mappings] → For La Fuerza Oculta, `ai-notes` files are matched to `manual-notes` by date substring in filename. Mismatches → content simply not imported for that session. Non-blocking.
- [Server rate limiting / timeout] → 92+ HTTP requests sequentially. No rate limiting in Aleph. Sequential requests with no delay is fine for local server.
- [Large markdown files] → Some AI notes files are long. Aleph stores them as text blobs; no size limit enforced.
