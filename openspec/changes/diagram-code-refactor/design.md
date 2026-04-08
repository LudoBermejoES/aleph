## Context

The diagram editor started as a simple tldraw wrapper with entity drag-and-drop. Over successive feature additions (entity popover, sync relations, type filtering, reflow, relationship dialog, expand button, arrow dimming), `diagramId.vue` grew to 983 lines with 15+ responsibilities. Shape creation logic was written inline each time a new feature needed it, resulting in 3 separate implementations. The graph API endpoint grew similarly, accumulating per-entity queries that should be batched.

All behavior is currently working and tested (940+ unit tests, 12 integration tests, 7 E2E tests pass). This refactor must preserve all behavior while improving structure.

## Goals / Non-Goals

**Goals:**

- Reduce `diagramId.vue` from ~983 lines to ~350 by extracting composables
- Eliminate shape creation duplication with a shared client-side utility
- Fix N+1 queries in graph API (potential 300+ queries → ~6 queries)
- Extract entity search into a reusable component
- All existing tests continue to pass without modification
- New composables are independently testable

**Non-Goals:**

- Changing any user-facing behavior
- Adding new features
- Modifying API contracts or response shapes
- Rewriting the Vue↔React bridge (separate future work)
- Refactoring test helpers (separate concern)

## Decisions

### Decision 1: Composables, not Pinia stores

**Chosen:** Extract logic into Vue composables (`useXxx()` functions) that accept the editor instance and return reactive state + methods. Each composable encapsulates a single concern.

**Alternative considered:** Pinia stores for diagram state. Rejected — the editor instance is not serializable, and composables are simpler for component-scoped logic that doesn't need cross-component sharing.

### Decision 2: Composables receive editor as parameter, not injected

**Chosen:** Each composable takes the editor instance as a parameter: `useArrowDimming(editor, selectedShapeId)`. The page component passes the editor after it's ready.

**Why:** The editor is only available after `onEditorReady` fires. Injection would require a provide/inject pattern with nullable types. Direct parameter passing is clearer and more testable.

### Decision 3: Shared shape utility mirrors server-side helpers

**Chosen:** `app/utils/diagram-shapes.ts` exports:

- `ENTITY_TYPE_TO_SHAPE_TYPE` — the canonical mapping
- `ENTITY_SHAPE_TYPES` — derived list of shape type strings
- `buildShapeProps(entityType, entity, campaignId)` — returns the props object for `editor.createShape()`

These mirror the server-side `diagram-helpers.ts` conventions (same prop names, same dimensions) but work with the editor API (`createShape`) instead of producing `GeneratedShape` objects.

**Why:** Having both client and server use the same shape prop conventions prevents drift. The client version doesn't need `randomUUID()` or `x/y` positions (the caller handles those).

### Decision 4: Graph builder as a service module

**Chosen:** Extract graph edge-building from the API endpoint into `server/services/graph-builder.ts` with functions:

- `buildEntityRelationEdges(db, campaignId)` → edges + entity nodes
- `buildOrgMembershipEdges(db, entityIds, charIdRows)` → edges + org nodes
- `buildLocationEdges(db, charIdRows, orgIds)` → edges + location nodes

Each function does its own batched queries and returns `{ nodes, edges }` fragments that the endpoint merges.

**Why:** Separates query logic from HTTP handling. Each builder can be tested independently. Batching is encapsulated within each builder.

### Decision 5: Entity search as a standalone component

**Chosen:** Extract the searchable entity dropdown from `RelationshipDialog.vue` into `EntitySearchInput.vue` with props `campaignId`, `excludeIds`, and emits `select`. The parent provides the campaign ID and excluded IDs, the component handles debounced search, grouping, and rendering.

**Why:** The same entity search pattern will likely be needed in other contexts (entity linking, cross-referencing). Making it a standalone component prepares for reuse.

### Decision 6: Refactor in order — utilities first, then composables, then components

**Chosen:** Implementation order:

1. `diagram-shapes.ts` (shared utility) — no dependencies
2. Graph builder service + N+1 fixes — server-side, independent
3. Composables (selection, dimming, sync, expansion) — depend on diagram-shapes
4. Update `diagramId.vue` to use composables — depends on all above
5. EntitySearchInput + RelationshipDialog update — independent

**Why:** This order minimizes merge conflicts. Each step produces a working state where all tests pass.

## Risks / Trade-offs

- **Refactor regressions** → Mitigation: all existing tests must pass after each step. Run full test suite between steps.
- **Composable API design** → If the API is wrong, callers become awkward. Mitigation: design composable signatures first, validate against current usage patterns.
- **Import complexity** → More files means more imports. Acceptable — smaller files are easier to reason about than one 983-line file.
- **Performance of batched queries** → SQLite handles `inArray()` with 100+ IDs well. No concern.
