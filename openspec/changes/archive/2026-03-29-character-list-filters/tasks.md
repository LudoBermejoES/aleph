# Tasks: Character List Filters

## 1. API — Extended Filters and Sort

- [x] 1.1 Add `race`, `class`, `alignment`, `locationEntityId` filter params to `server/api/campaigns/[id]/characters/index.get.ts` (server-side WHERE clauses)
- [x] 1.2 Add `organizationId` filter param with inner-join on `organizationMembers` table
- [x] 1.3 Add `sort` param support: resolve field name to Drizzle column (`name → entities.name`, `updatedAt → entities.updatedAt`, `status → characters.status`, `race → characters.race`, `class → characters.class`); fall back to `updatedAt desc` for unknown values
- [x] 1.4 Add `sortDir` param (`asc` / `desc`); default `desc`
- [x] 1.5 Left-join `organizationMembers` + `organizations` to include `primaryOrg: { name, role }` (first membership) in each character row
- [x] 1.6 Left-join `entities` on `characters.locationEntityId` to include `locationName` in each character row

## 2. API — Meta Endpoint

- [x] 2.1 Create `server/api/campaigns/[id]/characters/meta.get.ts` returning `{ races: string[], classes: string[], alignments: string[] }` (distinct non-null values for campaign)
- [x] 2.2 Require authenticated campaign member (visitor+) for meta endpoint

## 3. Frontend — Filter Bar Component

- [x] 3.1 Add debounced (300ms) text search input to character list page; sync value to URL param `search`
- [x] 3.2 Add status filter buttons (All / Alive / Dead / Missing / Unknown); sync to URL param `status`
- [x] 3.3 Add race dropdown populated from `/characters/meta`; sync to URL param `race`
- [x] 3.4 Add class dropdown populated from `/characters/meta`; sync to URL param `class`
- [x] 3.5 Add alignment dropdown (hardcoded standard values + "All"); sync to URL param `alignment`
- [x] 3.6 Add organization dropdown populated from active campaign orgs with members; sync to URL param `org`
- [x] 3.7 Add location dropdown populated from locations currently assigned to characters; sync to URL param `location`
- [x] 3.8 Add "Include companions" toggle; sync to URL param `companions` (default: show all)

## 4. Frontend — Sort Controls

- [x] 4.1 Add sort field selector (Name, Recently Updated, Status, Race, Class); sync to URL param `sort`
- [x] 4.2 Add sort direction toggle (A→Z / Z→A or asc/desc); sync to URL param `sortDir`
- [x] 4.3 Default to `sort=updatedAt&sortDir=desc` when params absent (preserve existing behavior)

## 5. Frontend — URL State Sync

- [x] 5.1 On page mount, initialize all filter/sort refs from current URL query params
- [x] 5.2 On any filter/sort change, call `router.replace` with updated query params (no full reload)
- [x] 5.3 Ensure folder sidebar state (`folderId`) coexists with new URL params without conflict

## 6. Frontend — Enriched List Rows

- [x] 6.1 Add status badge to each character list row (color-coded: green=alive, red=dead, amber=missing, gray=unknown)
- [x] 6.2 Add alignment text to each character list row (shown next to race/class, hidden if not set)
- [x] 6.3 Add location indicator to each character list row (📍 + location name, hidden if not set)
- [x] 6.4 Add primary organization badge to each character list row (hidden if no org membership)

## 7. CLI — Updated Characters List Command

- [x] 7.1 Add `--race <race>`, `--class <class>`, `--alignment <alignment>` flags to `aleph characters list`
- [x] 7.2 Add `--status <status>` flag (already may exist; confirm and align with API)
- [x] 7.3 Add `--sort <field>` and `--sort-dir <asc|desc>` flags
- [x] 7.4 Update `docs/claude-skill.md` to document new flags
- [x] 7.5 Update `.claude/skills/aleph-cli/SKILL.md` to mirror updated command surface

## 8. Tests (TDD)

### Integration Tests

- [x] 8.1 Test `GET /characters?race=Elf` returns only Elf characters
- [x] 8.2 Test `GET /characters?class=Wizard` returns only Wizard characters
- [x] 8.3 Test `GET /characters?alignment=Neutral+Good` returns only matching characters
- [x] 8.4 Test `GET /characters?status=dead` returns only dead characters
- [x] 8.5 Test `GET /characters?organizationId=<id>` returns only org members
- [x] 8.6 Test `GET /characters?sort=name&sortDir=asc` returns alphabetical order
- [x] 8.7 Test `GET /characters?sort=invalid` falls back to updatedAt desc
- [x] 8.8 Test `GET /characters` response includes `locationName` and `primaryOrg` fields
- [x] 8.9 Test `GET /characters/meta` returns distinct races, classes, alignments
- [x] 8.10 Test `GET /characters/meta` returns 403 for unauthenticated request

### Unit Tests

- [x] 8.11 Test URL param initialization: filter refs populated correctly from route query on mount
- [x] 8.12 Test debounce: search input does not trigger multiple fetches within 300ms window

### E2E Tests

- [x] 8.13 E2E: search input filters character list by name
- [x] 8.14 E2E: status filter shows only dead characters when "Dead" selected
- [x] 8.15 E2E: sort by name A→Z shows characters in alphabetical order
- [x] 8.16 E2E: filter state persists in URL and survives page reload
