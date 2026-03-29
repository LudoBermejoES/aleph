# Tasks: Character List Filters

## 1. API — Extended Filters and Sort

- [ ] 1.1 Add `race`, `class`, `alignment`, `locationEntityId` filter params to `server/api/campaigns/[id]/characters/index.get.ts` (server-side WHERE clauses)
- [ ] 1.2 Add `organizationId` filter param with inner-join on `organizationMembers` table
- [ ] 1.3 Add `sort` param support: resolve field name to Drizzle column (`name → entities.name`, `updatedAt → entities.updatedAt`, `status → characters.status`, `race → characters.race`, `class → characters.class`); fall back to `updatedAt desc` for unknown values
- [ ] 1.4 Add `sortDir` param (`asc` / `desc`); default `desc`
- [ ] 1.5 Left-join `organizationMembers` + `organizations` to include `primaryOrg: { name, role }` (first membership) in each character row
- [ ] 1.6 Left-join `entities` on `characters.locationEntityId` to include `locationName` in each character row

## 2. API — Meta Endpoint

- [ ] 2.1 Create `server/api/campaigns/[id]/characters/meta.get.ts` returning `{ races: string[], classes: string[], alignments: string[] }` (distinct non-null values for campaign)
- [ ] 2.2 Require authenticated campaign member (visitor+) for meta endpoint

## 3. Frontend — Filter Bar Component

- [ ] 3.1 Add debounced (300ms) text search input to character list page; sync value to URL param `search`
- [ ] 3.2 Add status filter buttons (All / Alive / Dead / Missing / Unknown); sync to URL param `status`
- [ ] 3.3 Add race dropdown populated from `/characters/meta`; sync to URL param `race`
- [ ] 3.4 Add class dropdown populated from `/characters/meta`; sync to URL param `class`
- [ ] 3.5 Add alignment dropdown (hardcoded standard values + "All"); sync to URL param `alignment`
- [ ] 3.6 Add organization dropdown populated from active campaign orgs with members; sync to URL param `org`
- [ ] 3.7 Add location dropdown populated from locations currently assigned to characters; sync to URL param `location`
- [ ] 3.8 Add "Include companions" toggle; sync to URL param `companions` (default: show all)

## 4. Frontend — Sort Controls

- [ ] 4.1 Add sort field selector (Name, Recently Updated, Status, Race, Class); sync to URL param `sort`
- [ ] 4.2 Add sort direction toggle (A→Z / Z→A or asc/desc); sync to URL param `sortDir`
- [ ] 4.3 Default to `sort=updatedAt&sortDir=desc` when params absent (preserve existing behavior)

## 5. Frontend — URL State Sync

- [ ] 5.1 On page mount, initialize all filter/sort refs from current URL query params
- [ ] 5.2 On any filter/sort change, call `router.replace` with updated query params (no full reload)
- [ ] 5.3 Ensure folder sidebar state (`folderId`) coexists with new URL params without conflict

## 6. Frontend — Enriched List Rows

- [ ] 6.1 Add status badge to each character list row (color-coded: green=alive, red=dead, amber=missing, gray=unknown)
- [ ] 6.2 Add alignment text to each character list row (shown next to race/class, hidden if not set)
- [ ] 6.3 Add location indicator to each character list row (📍 + location name, hidden if not set)
- [ ] 6.4 Add primary organization badge to each character list row (hidden if no org membership)

## 7. CLI — Updated Characters List Command

- [ ] 7.1 Add `--race <race>`, `--class <class>`, `--alignment <alignment>` flags to `aleph characters list`
- [ ] 7.2 Add `--status <status>` flag (already may exist; confirm and align with API)
- [ ] 7.3 Add `--sort <field>` and `--sort-dir <asc|desc>` flags
- [ ] 7.4 Update `docs/claude-skill.md` to document new flags
- [ ] 7.5 Update `.claude/skills/aleph-cli/SKILL.md` to mirror updated command surface

## 8. Tests (TDD)

### Integration Tests

- [ ] 8.1 Test `GET /characters?race=Elf` returns only Elf characters
- [ ] 8.2 Test `GET /characters?class=Wizard` returns only Wizard characters
- [ ] 8.3 Test `GET /characters?alignment=Neutral+Good` returns only matching characters
- [ ] 8.4 Test `GET /characters?status=dead` returns only dead characters
- [ ] 8.5 Test `GET /characters?organizationId=<id>` returns only org members
- [ ] 8.6 Test `GET /characters?sort=name&sortDir=asc` returns alphabetical order
- [ ] 8.7 Test `GET /characters?sort=invalid` falls back to updatedAt desc
- [ ] 8.8 Test `GET /characters` response includes `locationName` and `primaryOrg` fields
- [ ] 8.9 Test `GET /characters/meta` returns distinct races, classes, alignments
- [ ] 8.10 Test `GET /characters/meta` returns 403 for unauthenticated request

### Unit Tests

- [ ] 8.11 Test URL param initialization: filter refs populated correctly from route query on mount
- [ ] 8.12 Test debounce: search input does not trigger multiple fetches within 300ms window

### E2E Tests

- [ ] 8.13 E2E: search input filters character list by name
- [ ] 8.14 E2E: status filter shows only dead characters when "Dead" selected
- [ ] 8.15 E2E: sort by name A→Z shows characters in alphabetical order
- [ ] 8.16 E2E: filter state persists in URL and survives page reload
