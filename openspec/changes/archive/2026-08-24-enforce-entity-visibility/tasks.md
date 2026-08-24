## 1. Organization visibility: storage and API

- [x] 1.1 Add `visibility` to the org create Zod schema (`server/api/campaigns/[id]/organizations/index.post.ts`) and the org update Zod schema (`[slug]/index.put.ts`), same enum as characters/locations, defaulting to `'members'` when omitted
- [x] 1.2 Update `createOrganizationWithEntity` (`server/services/organizations.ts`) to write the provided `visibility` onto the `entities` insert instead of the hardcoded `'members'` literal
- [x] 1.3 Update `updateOrganizationWithEntity` to write `visibility` onto the `entities` row when provided in the patch
- [x] 1.4 Unit tests: creating an organization with an explicit visibility stores it on the mirror entity; omitting it defaults to `members`; updating visibility changes the mirror entity's value

## 2. Organization visibility: enforcement on read

- [x] 2.1 Add `buildVisibilityFilter` to `GET /api/campaigns/[id]/organizations` (join `organizations` to `entities` for the visibility/createdBy columns, matching the locations list endpoint's pattern)
- [x] 2.2 Add `canUserAccessEntity` check to `GET /api/campaigns/[id]/organizations/[slug]`, returning 404 (not 403) when the requester's role can't view it — matching the character/location detail endpoints
- [x] 2.3 Integration tests: player cannot list or fetch a `dm_only` organization; co_dm/dm can; a `private` organization is visible only to its creator (also fixed a latent CSRF bug in this test file's `join` helper calls, which were silently failing and masking whether the invited role actually took effect)

## 3. Organization visibility: UI

- [x] 3.1 Add a visibility `<select>` to the organization create form (`app/pages/campaigns/[id]/organizations/new.vue`), matching `CharacterForm.vue`/`LocationForm.vue`'s existing control (also added `organizations.visibility` i18n key to en/es, reusing `characters.visibility*` option labels per the existing `LocationForm.vue` convention; added `visibility` to `useCampaignApi`'s create/update org body types)
- [x] 3.2 Add the same visibility control to the organization edit form (`.../[slug]/edit.vue`), pre-filled with the organization's current visibility (detail GET route now also returns `visibility` for this to read)
- [x] 3.3 E2E test: DM creates an organization with `dm_only` visibility via the UI, then confirms (via a second, player-role session) it does not appear in the organization list

## 4. Organization visibility: CLI

- [x] 4.1 Add `--visibility <vis>` option to `organization create` and `organization edit` in `cli/src/commands/organization.js`, matching `location.js`'s existing flag (line 58/109) — also surfaced `visibility` in `list`/`show` output
- [x] 4.2 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` (bumped local skill's `version` 3.16 → 3.17) to document the new flag, per project convention for CLI-facing changes

## 5. Character list visibility fix

- [x] 5.1 Widen `server/api/campaigns/[id]/characters/index.get.ts`'s `conditions` array type from `ReturnType<typeof eq>[]` to `SQL[]` (matching the locations list endpoint)
- [x] 5.2 Read `role`/`userId` from `event.context` and call `buildVisibilityFilter(role, userId, conditions, entities.visibility, entities.createdBy)` before running the list query
- [x] 5.3 Integration test: a `dm_only` character and a `private` (non-owned) character are both excluded from a player's `GET /api/campaigns/:id/characters` response; included for co_dm/dm and, for the private one, its own creator. **Bonus fix found while writing this test**: `characters/index.post.ts`'s visibility enum was `['members', 'players', 'dm_only', 'public']` — missing `private`/`editors`/`specific_users` entirely (and containing an invalid `'players'` value not recognized by `VISIBILITY_MIN_ROLE` at all) — meaning a character could never be created as `private` via the API in the first place, even though the PUT route and the entity-permissions spec's own "Private entity visible only to creator" scenario assume characters support it. Fixed to match the PUT route's already-correct full enum.

## 6. Diagram/graph generation-time visibility filtering

- [x] 6.1 Thread `role: CampaignRole` and `userId` through `generateDiagram()`, `generateEntityGraph()`, `generateFactionWeb()`, `generateQuestTree()`, `generateSessionTimeline()` in `server/utils/diagram-generator.ts`
- [x] 6.2 Added `getVisibleEntityIds(db, campaignId, role, userId)` to `server/utils/permissions.ts` (reuses `buildVisibilityFilter`, one query returning every visible entity id regardless of type — sessions/quests/arcs/organizations are all mirror entities), filtered each generator's entity/character/organization/location lists (and the "expanded org" fetch in `generateEntityGraph` that bypasses the main query) against it
- [x] 6.3 Updated `server/api/campaigns/[id]/diagrams/generate.post.ts` to pass `role`/`userId` (already in scope) through to `generateDiagram`
- [x] 6.4 Extended `server/services/graph-builder.ts` (new `userId` param) with a final filter pass over `graphNodes`/`graphEdges` right before return — simpler and more robust than patching each of the ~10 separate node-adding sections individually, since it uniformly covers all of them
- [x] 6.5 Unit tests: fixed `tests/unit/diagram-generator.test.ts`'s hand-rolled call-count mocks (each generator now issues one extra leading query for the visibility check) and added `role`/`userId` args throughout — 13/13 passing
- [x] 6.6 Added a visibility test to `tests/integration/graph-api.test.ts`: player role excludes a `dm_only` character node and its edge; dm sees both. Also ran `tests/integration/diagram-api.test.ts` (19/19) to confirm no regression from the `generate.post.ts` signature change

## 7. Diagram view-time visibility filtering (already-generated snapshots)

- [x] 7.1 Confirm each entity-backed shape's metadata includes `entityId` — confirmed it lives at `props.entityId` (not `meta.entityId` as design.md originally assumed), set by the existing `toTldrawSnapshot()` for every entity-backed shape; arrow shapes carry no `entityId` but are linked to their endpoints via `binding:<id>-start`/`-end` records' `toId`
- [x] 7.2 `server/api/campaigns/[id]/diagrams/[diagramId]/snapshot.get.ts` now computes `getVisibleEntityIds(db, campaignId, role, userId)` and passes the parsed snapshot through a new `filterSnapshotByVisibility()` (`server/utils/diagram-generator.ts`) before returning — this drops any shape whose `props.entityId` isn't in the visible set, plus any arrow (and its two binding records) with an endpoint pointing at a dropped shape. Filtering happens on every fetch, so a snapshot generated once while an entity was visible is correctly re-filtered per viewer as visibility changes later, with no regeneration needed.
- [x] 7.3 Investigated: diagrams are **not** handled by `server/plugins/hocuspocus.ts` at all (its `VALID_DOC_TYPES = ['entity', 'session', 'quest']` excludes diagrams). Diagrams instead use a separate `@tldraw/sync` WebSocket route (`server/routes/api/tldraw-sync/[diagramId].ts` + `server/services/tldraw-rooms.ts`, a single shared `TLSocketRoom` per diagram with no per-connection state), gated behind `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` which defaults to `false` in both `nuxt.config.ts` and `.env.example`. That flag-gated room does seed its initial state from the same snapshot table this task already filters, so the only _active_ code path (single-user/default mode, and a new room's initial load) is fully covered.
- [x] 7.4 **Decision: out of scope, documented here rather than silently left undone.** Per-connection visibility filtering of a _live_ shared `TLSocketRoom` would require reworking the sync protocol's broadcast model (today it's one shared document state broadcast identically to every connected socket, with no concept of a per-viewer view) — substantial architectural work relative to a feature that ships disabled by default. Residual known limitation: if `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` is ever turned on, a player connected live to a diagram's collaborative room would see shapes for entities hidden from them after the room's initial load (new joiners still get the filtered initial snapshot; the gap is live updates while already connected). Should the multiplayer flag be enabled in the future, this needs its own follow-up change.
- [x] 7.5 Integration test added (`tests/integration/diagram-api.test.ts`, "Diagram snapshot — view-time visibility filtering"): a diagram generated while a character was `members`-visible, then set to `dm_only`, no longer shows that character's shape (or its arrow/binding records) to a player fetching the same diagram snapshot — without regenerating it. DM continues to see it.
- [x] 7.6 Integration test added (same block): reversing the above — setting the character back to `members`-visible — makes its shape and arrow reappear to the player on their next fetch, without regeneration. (Used a character rather than an organization since both are mirror-entity-backed the same way through `entities.visibility`; the underlying filter is entity-type-agnostic.)

## 8. Wrap-up

- [x] 8.1 Full unit suite: 1589/1589 passing (134 files). Full integration suite: 923/925 passing on the first concurrent run; the 2 failures (`rate-limiting.test.ts`, `admin-users.test.ts`) both reproduced as passing (16/16) when re-run isolated together — pre-existing rate-limiter state pollution from running 100+ integration files concurrently, unrelated to this change (neither test touches organizations/characters/diagrams/graph). No regressions found.
- [x] 8.2 Spot-checked manually against a local dev server (curl, DM + player accounts, mixed `members`/`dm_only` characters and organizations): player's org list excludes the `dm_only` org (DM's list shows both); fetching the hidden org's detail as player returns 404; player's character list excludes the `dm_only` character; the relationship graph excludes the hidden character's node for the player (present for DM); a generated `faction-web` diagram's snapshot shows both orgs' `factionCard` shapes to the DM but only the visible org's shape to the player — confirming the full path (list, detail, graph, diagram generation, diagram view-time filtering) end to end.
- [x] 8.3 Update `openspec/specs/entity-permissions/spec.md`, `openspec/specs/organization-management/spec.md`, and `openspec/specs/relationship-graph/spec.md` from this change's delta specs once archived via `/opsx:archive`
      **HECHO 2026-08-24 por el propio `openspec archive`**, que es quien aplica los deltas a los specs
      principales — la tarea describía el paso de archivado, no trabajo previo a él. Verificado antes de
      archivar que la implementación está viva y no solo con las casillas marcadas:
      `buildVisibilityFilter` presente en el listado de organizaciones y en el de personajes, y el
      endpoint responde 401 sin credenciales en producción.
