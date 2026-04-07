## Context

The diagram generator (`server/utils/diagram-generator.ts`) produces tldraw snapshots for four diagram types. Two are relevant here:

- **`generateFactionWeb()`** queries the `organizations` table, creates factionCard shapes in a radial layout, and returns empty bindings. No members, no locations, no arrows.
- **`generateEntityGraph()`** queries the `entities` table and `entityRelations` table. Creates entityCard/factionCard shapes in a grid, with arrow bindings for entity relations only. Does not include org membership, character locations, or org-location links.

The DB already has the data needed:

- `organizationMembers` — `(organizationId, characterId, role)` — links orgs to characters
- `characters` — `locationEntityId` column — links characters to location entities
- `organizationLocations` — `(organizationId, locationEntityId)` — links orgs to locations
- `entities` — all entity data (name, slug, type, imageUrl)

The `toTldrawSnapshot()` function converts shapes and bindings into a tldraw store. Arrow bindings in the generated snapshot are converted to tldraw arrow shapes. The existing pattern uses `makeArrowBinding(fromShapeId, toShapeId)`.

## Goals / Non-Goals

**Goals:**

- Faction-web diagrams include member characters and linked locations around each org
- Entity-graph diagrams include org membership, character-location, and org-location arrows
- All relationships are represented as arrow bindings in the generated snapshot
- Layout remains readable with sub-clusters around orgs

**Non-Goals:**

- Changing manual entity drops (this is generator-only)
- Adding new diagram types
- Changing the generate API endpoint signature
- Real-time updates after generation (the snapshot is static)

## Decisions

### Decision 1: Faction-web sub-cluster layout

**Chosen:** For each organization in `generateFactionWeb()`, fetch its members and locations. Place each org at its current radial position (already implemented). Then place its members/locations in a smaller radial sub-cluster around the org, with radius ~150px. This creates a "hub and spoke" pattern per org.

**Alternative considered:** A single flat radial layout mixing orgs and characters. Rejected — it loses the visual grouping that makes faction-web useful.

### Decision 2: Entity-graph expansion

**Chosen:** In `generateEntityGraph()`, after building shapes for entities and relation edges, also:

1. Query `organizationMembers` joined with `characters` to get org→character membership
2. Query `characters` with non-null `locationEntityId` to get character→location links
3. Query `organizationLocations` to get org→location links
4. For each relationship, if both endpoints have shapes on the diagram, create an arrow binding
5. If an org is referenced but has no shape yet (because it's in the `organizations` table, not `entities`), create a factionCard shape for it

This reuses the existing `entityIdToShapeId` map pattern.

### Decision 3: Character shapes use npcToken, not entityCard

**Chosen:** When the generator creates shapes for member characters, use `npcToken` type (which shows portrait and name) rather than `entityCard`. This requires joining with the `characters` table to get `portraitUrl`. The existing entity-graph uses `entityCard` for all entities — but for characters specifically, `npcToken` is the richer visual.

For entity-graph, keep existing `entityCard` shapes for non-character entities. Only add npcToken for characters created via org-member expansion.

### Decision 4: Limit expansion to avoid overwhelming diagrams

**Chosen:** Cap member expansion at 10 characters per organization in faction-web, and 50 total expanded shapes in entity-graph. Organizations with many members show the first 10. This prevents a single large org from dominating the diagram.

### Decision 5: Shared shape-building helpers for future reuse

**Chosen:** Extract shape-creation and radial-layout logic into reusable helpers in a new shared utility file (`server/utils/diagram-helpers.ts`), separate from the generator. These helpers are pure functions that produce `GeneratedShape` descriptors:

- `buildNpcTokenShape(entity, campaignId, x, y)` → `GeneratedShape` with npcToken props
- `buildLocationPinShape(entity, campaignId, x, y)` → `GeneratedShape` with locationPin props
- `buildFactionCardShape(org, campaignId, x, y)` → `GeneratedShape` with factionCard props
- `radialLayout(centerX, centerY, count, radius)` → `Array<{x, y}>` positions

The generator calls these helpers. In the future, a client-side "expand related entities" button can import the same `radialLayout()` function (it's pure math, no DB dependency) and use the same shape-prop conventions when calling `editor.createShape()`. The `buildXxxShape()` functions document the canonical prop shape per entity type — the client can follow the same pattern.

**Why:** Shape creation is duplicated between the generator, `handleEntityDrop`, and future expand logic. A shared helper prevents drift between these and establishes a single source of truth for how each entity type maps to a tldraw shape.

## Risks / Trade-offs

- **Layout overlap** → Sub-clusters may overlap when organizations are close together. Mitigation: increase the main radial radius proportionally to member count.
- **Performance** → Additional DB queries (org members, locations) per generation. Mitigation: queries are simple joins on indexed columns, bounded by limits.
- **Snapshot size** → More shapes means larger snapshot JSON. Acceptable — even 200 shapes is small in tldraw terms.
