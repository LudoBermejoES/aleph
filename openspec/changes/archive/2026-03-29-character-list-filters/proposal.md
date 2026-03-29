## Why

The character list page is the primary entry point for managing PCs and NPCs, but it offers only a PC/NPC toggle and a folder sidebar — no search, no status filter, and no sort control. As campaigns grow to dozens or hundreds of characters, finding a specific NPC by race, class, status, or organization requires opening individual detail pages one by one. This friction is solvable entirely with existing DB fields and server-side infrastructure already in place.

## What Changes

- Add a text search input (debounced, server-side) to the character list page
- Add filter controls for status, race, class, alignment, organization membership, and location
- Add sort controls (field + direction) with URL-synced state
- Add `race`, `class`, `alignment`, `organizationId`, `locationEntityId`, `sort`, and `sortDir` query params to `GET /api/campaigns/:id/characters`
- Add `GET /api/campaigns/:id/characters/meta` endpoint returning distinct races, classes, and alignments for filter dropdowns
- Enrich list row display: add status badge, alignment, location name, and primary organization badge
- Persist filter/sort state in URL query params for deep-linking

## Capabilities

### New Capabilities

- `character-list-filters`: Search, filter, and sort controls on the character list page; enriched list row display; URL-persisted state

### Modified Capabilities

- `character-management`: The character list API gains new query parameters (`race`, `class`, `alignment`, `organizationId`, `locationEntityId`, `sort`, `sortDir`) and a new `/meta` sub-endpoint. List display shows more fields per row.

## Impact

- **Frontend**: `app/pages/campaigns/[id]/characters/index.vue` — significant UI additions (search bar, filter bar, sort controls, enriched rows)
- **API**: `server/api/campaigns/[id]/characters/index.get.ts` — new filter and sort params; `server/api/campaigns/[id]/characters/meta.get.ts` — new endpoint
- **No schema changes**: All needed fields (`race`, `class`, `alignment`, `status`, `locationEntityId`, `isCompanionOf`) already exist on the `characters` table
- **aleph-cli**: The CLI's `characters list` command should accept `--race`, `--class`, `--alignment`, `--status`, `--sort`, and `--sort-dir` flags to match the new API params
