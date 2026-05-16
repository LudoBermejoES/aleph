## Why

Characters currently have a single `content` field for all narrative text. This conflates physical description, backstory, ongoing story, and current situation into one undifferentiated blob — making it hard to navigate, update incrementally, or display selectively in the UI. As campaigns grow, DMs need structured narrative sections that can evolve independently: a backstory stays mostly fixed while history grows each session and current status changes constantly.

## What Changes

- Add three new markdown fields to the `characters` table: `backstory`, `history`, `current_status`
- Rename `content` semantically to **description** (physical description) — column stays as `content` in DB for backwards compatibility, exposed as `description` in the API
- Each new field is an optional markdown text stored in the DB and editable independently
- Character detail page gains three new collapsible/tabbed sections for the new fields
- API `PUT /api/campaigns/:id/characters/:slug` accepts `backstory`, `history`, `currentStatus`
- API `GET /api/campaigns/:id/characters/:slug` returns all four fields
- `aleph-cli character update` gains `--backstory`, `--history`, `--current-status` flags (plus `--backstory-stdin`, `--history-stdin`, `--current-status-stdin` variants)

## Capabilities

### New Capabilities

- `character-extended-text-fields`: Four distinct markdown narrative fields on characters — description (physical), backstory (origin), history (per-session log), current_status (latest state). Each independently editable via UI, API, and CLI.

### Modified Capabilities

- `character-management`: PUT and GET endpoints now include `backstory`, `history`, `currentStatus` fields alongside existing `content`/description.

## Impact

**Database**: `server/db/schema/characters.ts` — add `backstory`, `history`, `current_status` columns (text, nullable). New migration required.

**Server API**:

- `server/api/campaigns/[id]/characters/[slug].put.ts` — accept and persist the three new fields
- `server/api/campaigns/[id]/characters/[slug].get.ts` — return the three new fields

**Frontend**:

- `app/pages/campaigns/[id]/characters/[slug].vue` (or equivalent detail page) — display and edit all four sections
- i18n keys in `i18n/locales/en.json` and `i18n/locales/es.json`

**CLI**: `cli/src/commands/character.js` — add `--backstory`, `--history`, `--current-status` (+ stdin variants) to `character update`; update both skill files.

**Tests**: unit (DB helpers), integration (API endpoints), E2E (character detail page edit flow).
