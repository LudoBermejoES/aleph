## Context

The `GET /api/campaigns/:id/characters` endpoint already handles `type`, `status`, `search`, `folderId`, and `companionOf` params with JS-side post-filtering on a full table scan. The list page only uses `type` and `folderId`. All filtering data (`race`, `class`, `alignment`, `locationEntityId`) lives on the `characters` table; organization membership lives in an `organizationMembers` junction table. The `entities` table holds `name`, `slug`, and `updatedAt` (joined via `characters.entityId`). No schema changes are needed.

## Goals / Non-Goals

**Goals:**
- Expose server-side filtering for race, class, alignment, status, org membership, and location
- Add user-controlled sort (field + direction) with server-side execution
- Add `/characters/meta` endpoint for distinct filter values (races, classes, alignments)
- Enrich list rows with status, alignment, location, and primary org badges
- Sync all filter/sort state to URL query params (no extra store needed)
- Update aleph-cli `characters list` command with new flags

**Non-Goals:**
- Saved/named filter presets
- Full-text content search (searching character markdown body)
- Bulk actions on filtered results
- Any changes to the character detail page, create, or edit forms
- Pagination (dataset size doesn't warrant it yet)

## Decisions

### Server-side filtering over client-side
The existing endpoint does JS post-filtering on the full list. For `race`/`class`/`alignment` this is fine at small scale, but `organizationId` requires a join that can't be done client-side cheaply. All new filters will be applied server-side in the Drizzle query.

**Alternative considered**: Keep client-side filtering and just return more data. Rejected — joining `organizationMembers` server-side is cleaner and avoids sending org data for all characters on every load.

### Sorting in SQL, not JS
Drizzle supports `orderBy` with dynamic fields. Sort will be resolved server-side via a field map: `{ name: entities.name, updatedAt: entities.updatedAt, status: characters.status, race: characters.race, class: characters.class }`. Default: `desc(entities.updatedAt)` (preserves existing behavior).

### `/characters/meta` as a separate endpoint
Distinct race/class/alignment values are needed to populate filter dropdowns but are expensive to derive client-side. A dedicated `GET /characters/meta` endpoint runs `SELECT DISTINCT race, class, alignment` grouped by field. Keeping it separate avoids bloating the list response and allows independent caching.

### URL query param persistence (no Pinia store)
Nuxt's `useRoute` / `useRouter` make URL sync straightforward. Filters and sort are encoded as `?search=&status=&race=&class=&alignment=&org=&location=&sort=updatedAt&sortDir=desc`. On mount, state is initialized from the current URL; each change pushes a new history entry via `router.replace`. This gives deep-linking and browser back for free.

### Enriched list rows via joined response
The list endpoint will join `entities` (already done), `characters`, and left-join `organizationMembers` + `organizations` for the first org. Location name is resolved by looking up `locationEntityId` in the entities table. This adds one left-join per character to the existing query — acceptable at campaign scale.

### Debounced search input
Search triggers a server fetch. A 300ms debounce on the input prevents a request per keystroke. The `search` param is passed as-is to the existing server-side `ilike` filter.

## Risks / Trade-offs

- **org join complexity**: Left-joining `organizationMembers` to get the first org adds query complexity. For campaigns with many orgs per character, only the first result is shown — this is cosmetic-only. → Mitigation: `LIMIT 1` on the org subquery; list shows "org name" only as an indicator, not a full membership list.
- **"distinct values" staleness**: `/characters/meta` reflects what's in the DB now. If a user types a new race into a character form, the filter dropdown won't show it until the meta endpoint is re-fetched. → Acceptable trade-off; meta is fetched on list page mount.
- **URL state and folder sidebar**: The folder sidebar (NPC-only) already uses local state. URL params add `folderId` alongside the new filters — these coexist without conflict.
- **aleph-cli flag additions**: Adding flags is non-breaking. Existing CLI commands without the flags continue to work as before.

## Migration Plan

No DB migrations needed. The change is additive (new query params, new endpoint, UI additions). Deployment is a standard code push. Rollback: revert the API file and page; no data is affected.

## Open Questions

- Should the organization filter show all orgs in the campaign, or only orgs that have at least one character member? (Recommendation: only orgs with members — less noise.)
- Should the location filter show all location entities, or only those currently set on at least one character? (Recommendation: only assigned locations.)
