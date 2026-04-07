## Why

The diagram generator creates faction-web diagrams with only organization shapes and no arrows, and entity-graph diagrams without organization members or location links. When a DM generates a faction-web diagram, they expect to see each organization surrounded by its members and locations with relationship arrows — not just a ring of org cards with no connections. The same applies to location-heavy diagrams: locations should include their resident characters and linked organizations.

Currently `generateFactionWeb()` places org shapes in a radial layout with empty bindings. `generateEntityGraph()` includes entity relation edges but ignores org membership, character locations, and org-location links.

## What Changes

- **`generateFactionWeb()`** enhanced: for each organization, also create npcToken shapes for member characters and locationPin shapes for linked locations, positioned in a sub-cluster around the org. Create arrow bindings for all org→member and org→location relationships.
- **`generateEntityGraph()`** enhanced: in addition to entity relation edges, also include org membership arrows (org→character), character→location arrows, and org→location arrows. Create factionCard shapes for organizations referenced by members if not already present.
- Arrow bindings in the generated snapshot connect orgs to their members/locations so the relationships are visible immediately on diagram load (no need to manually sync).

## Capabilities

### New Capabilities

- `diagram-auto-expand`: Diagram generator includes related characters and locations when generating organization (faction-web) and entity (entity-graph) diagrams, with arrow bindings for membership, location, and org-location relationships

### Modified Capabilities

## Impact

- **server/utils/diagram-generator.ts** — modify `generateFactionWeb()` and `generateEntityGraph()` to query org members, character locations, org-location links, and create additional shapes + bindings
- **server/db/schema/organizations.ts** — import `organizationMembers` and `organizationLocations` (already exist)
- **server/db/schema/characters.ts** — import `characters` for `locationEntityId` lookup
- **No new API endpoints** — changes are server-side in the generator utility
- **No frontend changes** — the generated snapshot already renders correctly with existing shape utils
- **No CLI impact** — the generate endpoint body/response is unchanged
- **No schema/migration changes**
