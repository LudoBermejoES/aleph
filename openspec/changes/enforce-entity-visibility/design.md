## Context

`entities.visibility` (`public`/`members`/`editors`/`dm_only`/`private`/`specific_users`) and `VISIBILITY_MIN_ROLE`/`buildVisibilityFilter`/`canUserAccessEntity` in `server/utils/permissions.ts` are the existing, working access-control primitives. Character and location _detail_ routes already use them correctly. This change extends the same primitives to organizations, fixes the character _list_ endpoint (a same-shaped gap already present today, independent of organizations), and extends them to diagram/graph generation — without inventing a new access-control model.

Organizations are "mirror entities": each `organizations` row has a matching `entities` row (`organizations.entityId === entities.id === organizations.id`, the same shared-id pattern sessions/quests/arcs use — see `openspec/changes/archive/2026-08-10-add-semantic-search` for prior art on this pattern in the codebase). `entities.visibility` already exists and is queryable for organizations today; it's simply never set to anything but `'members'` and never read for filtering.

Diagrams are tldraw shape snapshots (Hocuspocus-synced, per `openspec/specs/diagram-sync/spec.md`), generated once by `generateDiagram()` and then hand-arranged/persisted — not live queries re-run on every view. Each entity-backed shape already carries `entityId` in its metadata (`server/utils/diagram-generator.ts:93,101` etc.), which is what makes view-time filtering of an already-generated snapshot feasible without redesigning the diagram format.

## Goals / Non-Goals

**Goals:**

- Organizations get a `visibility` field, stored on their mirror `entities` row — same values, same enforcement primitives as characters/locations. No new column, no migration.
- Organization list/detail reads, and the character list read, filter by the requester's role using the existing `buildVisibilityFilter`/`canUserAccessEntity` functions — not a parallel implementation.
- A diagram or relationship graph never presents a node (character, organization, or location) whose visibility the _viewing_ user's role doesn't meet — both for diagrams generated after this change, and for diagrams generated before it (existing stored snapshots), since visibility can change after generation (a DM might reveal or re-hide an organization at any time) and a diagram is a long-lived artifact, not a one-time render.

**Non-Goals:**

- No change to the visibility _model_ itself (no new visibility levels, no per-user ACL beyond the existing `specific_users`/creator-only `private` handling).
- No retroactive re-generation of existing diagrams — view-time filtering (see Decision 3) makes regeneration unnecessary for correctness.
- No change to relation-_edge_ visibility (`relationship-graph/spec.md`'s existing "Connection visibility" requirement) — this change is about node/entity inclusion, which is a separate, currently-unaddressed axis.
- `specific_users` visibility is out of scope for list-level filtering (see Decision 1) — this matches existing behavior for characters/locations today, not a regression introduced here.

## Decisions

### 1. Organization visibility lives on the mirror `entities` row, not a new `organizations.visibility` column

**Decision**: add `visibility` to the org create/edit Zod schemas, write it to the `entities` insert/update in `createOrganizationWithEntity`/`updateOrganizationWithEntity` (replacing the hardcoded `'members'`), exactly mirroring how character/location visibility already flows into `entities.visibility`. Organization list/detail queries filter using `buildVisibilityFilter`/`canUserAccessEntity` against that same column, joining `organizations` to `entities` where needed (list) or reading the mirror row directly (detail, since the org's own `id` is the shared id).

**Alternative considered**: add a new `organizations.visibility` column. Rejected — would require a migration, a second source of truth to keep in sync with `entities.visibility`, and duplicated enforcement logic. The mirror-entity pattern already exists precisely to avoid this for sessions/quests/arcs; reusing it for visibility keeps organizations consistent with every other entity type.

**Known pre-existing limitation carried over unchanged**: `buildVisibilityFilter`'s `visibleLevels` computation only includes keys present in `VISIBILITY_MIN_ROLE`, which does not include `specific_users` — entities with that visibility are already excluded from every list endpoint's filter (characters, locations) regardless of the viewer, relying instead on per-user overrides checked only at detail-read time via `canUserAccessEntity`. Organizations inherit this same (pre-existing, out-of-scope-to-fix-here) behavior for consistency.

### 2. Character list fix: reuse `buildVisibilityFilter`, not a new filter

**Decision**: `server/api/campaigns/[id]/characters/index.get.ts` gets the same two additions the locations list endpoint already has: read `role`/`userId` from `event.context`, and call `buildVisibilityFilter(role, userId, conditions, entities.visibility, entities.createdBy)` before running the query. The route's `conditions` array is currently typed `ReturnType<typeof eq>[]`, narrower than the `SQL[]` `buildVisibilityFilter` expects (locations' route already uses `SQL[]`) — widen the type to match, no behavior change beyond that.

**Alternative considered**: none seriously — this is a direct bug fix restoring parity with the pattern already used three other places (entities, locations, and characters' _own_ detail route). No design question here beyond "match the existing pattern."

### 3. Diagram/graph visibility: filter at generation time AND at view/serve time

**Decision**: this needs both, not either:

- **Generation time**: thread `role`/`userId` through `generateDiagram()` → `generateEntityGraph()`/`generateFactionWeb()`/`generateQuestTree()`/`generateSessionTimeline()` (all four, for consistency — quests already carry `dm_only` visibility via `isSecret`, sessions inherit entity visibility too) and `server/services/graph-builder.ts` (which already threads `role` through for edge-visibility — extend the same parameter to filter the `allCampaignCharRows`/`allOrgs` node queries too, not just `filterPinsByVisibility`'s edges). This prevents a lower-role user from ever _generating_ a diagram that includes content above their role.
- **View/serve time**: `[diagramId]/snapshot.get.ts` (and the equivalent Hocuspocus real-time document load path, per `diagram-sync`) must also filter shapes by the _current viewer's_ role against each shape's `meta.entityId`'s _current_ visibility, before returning the snapshot — not just trust that generation-time filtering was sufficient. This is required because a diagram is a persisted artifact a DM generates once and players view repeatedly over the campaign's lifetime, and visibility can change after generation (a DM revealing or re-hiding an organization must take effect for future views without needing to regenerate the diagram).

**Alternative considered**: generation-time filtering only. Rejected — it only protects the _generating_ user's own role at the moment of generation; a diagram generated by a DM (who can see everything) and later viewed by a player would still show every node, since nothing re-checks the stored snapshot against the viewer's role. This is exactly the same class of defect (`visibility` set correctly but not enforced on read) that motivates this whole change — solving it only at generation time would reintroduce it one layer up.

**Alternative considered for view-time enforcement**: redact matching shapes' labels/portraits in place (show a generic "Hidden" placeholder node) vs. omit them entirely (return a snapshot with those shapes removed). Omitting is simpler and matches how hidden characters/organizations behave everywhere else in the app (they don't appear at all, not as a redacted stub) — no placeholder-node design needed. **Decision: omit.**

### 4. CLI

**Decision**: `cli/src/commands/organization.js`'s create/edit commands (if they expose flags matching the API body) get a `--visibility` option, matching whatever pattern `character`/`location` commands already use — confirm exact current flag surface during `tasks.md` by reading the CLI source directly, since the proposal's Impact section flagged this as needing confirmation, not assumed already in place.

## Risks / Trade-offs

- **[Risk]** View-time diagram filtering adds a per-request join/lookup (shape's `entityId` → current `entities.visibility`) on every snapshot fetch and every Hocuspocus document load, where today it's a static blob. → **Mitigation**: diagrams are per-campaign, bounded in entity count (`generateEntityGraph` already caps at 50, `generateFactionWeb` at 20 orgs); a single batched lookup of visibility for the shape's entity-id set is cheap at this scale — no caching layer needed for v1.
- **[Risk]** Extending `graph-builder.ts` to filter nodes (not just edges) may change relationship-graph results for existing DMs/co-DMs who currently see everything regardless — but `hasMinRole(role, 'co_dm')` already short-circuits `buildVisibilityFilter` to a no-op for co_dm+, so DM-facing behavior is unaffected; only lower roles (editor and below) see fewer nodes than before, which is the intended fix, not a regression.
- **[Trade-off]** Organizations previously always visible to every campaign member (hardcoded `'members'`) may now be hidden from `player`/`visitor` roles once a DM sets a stricter visibility — this is the entire point of the change, but worth flagging explicitly since it's a behavior change for existing campaigns' players the moment a DM starts using the new field (not a bug, an intentional new capability being exercised).
- **[Risk]** If diagram shapes for hidden entities are omitted at view time but the diagram's _layout_ (positions of visible shapes relative to now-hidden ones) was arranged assuming all shapes present, a player's view may look sparser/differently laid out than the DM's — accepted as an inherent trade-off of omission over redaction (Decision 3); not a correctness issue, purely cosmetic.

## Migration Plan

1. No schema migration required (reuses `entities.visibility`).
2. Ship organization visibility (schema + UI + list/detail filtering) and the character list fix together — both are additive/corrective, no rollback complexity beyond a normal revert.
3. Ship diagram/graph generation-time filtering next — affects only newly-generated diagrams.
4. Ship diagram/graph view-time filtering last, since it's the piece that touches every _existing_ stored diagram's serve path — verify against a manually-generated diagram containing a mix of visibility levels before considering this change complete, since this is the step that actually closes the "already-generated snapshot" gap described in Decision 3.
5. Rollback: each piece is independently revertible (feature is additive filtering, not destructive); reverting view-time filtering alone is safe and simply restores today's behavior (all nodes visible to all viewers) without needing to touch anything else.

## Open Questions

- Exact current CLI organization command flag surface (create/edit) — confirm during tasks, per Decision 4.
- Whether Hocuspocus's real-time diagram document load path (as opposed to the one-shot `snapshot.get.ts`) needs its own filtering hook or can share the same filter function — resolve during tasks by reading `server/plugins/hocuspocus.ts`'s diagram-document handling (parallel to how it already handles entity documents).
