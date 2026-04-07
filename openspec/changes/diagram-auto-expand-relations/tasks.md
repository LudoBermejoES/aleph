## 1. Shared shape-building helpers

- [x] 1.1 Create `server/utils/diagram-helpers.ts` with `GeneratedShape` import from `diagram-generator.ts`
- [x] 1.2 Implement `buildNpcTokenShape(entity: {id, name, slug, portraitUrl?}, campaignId, x, y)` → `GeneratedShape` with npcToken type and correct props (characterName, portraitUrl, entityId, slug, campaignId, w, h)
- [x] 1.3 Implement `buildLocationPinShape(entity: {id, name, slug}, campaignId, x, y)` → `GeneratedShape` with locationPin type and correct props (locationName, entityId, slug, campaignId, w, h)
- [x] 1.4 Implement `buildFactionCardShape(org: {id, name, slug}, campaignId, x, y)` → `GeneratedShape` with factionCard type and correct props (factionName, entityId, slug, campaignId, w, h)
- [x] 1.5 Implement `radialLayout(centerX, centerY, count, radius)` → `Array<{x: number, y: number}>` that distributes positions evenly in a circle
- [x] 1.6 Export a client-compatible version of `radialLayout` from `app/utils/diagram-layout.ts` (same pure function, importable from Vue code for future use)

## 2. Faction-web: fetch members and locations per org

- [x] 2.1 In `generateFactionWeb()`, import `organizationMembers`, `organizationLocations` from organizations schema, `characters` and `entities` from their schemas
- [x] 2.2 For each org, query `organizationMembers` joined with `characters` joined with `entities` to get member entity data (entityId, name, slug, portraitUrl), capped at 10 per org
- [x] 2.3 For each org, query `organizationLocations` joined with `entities` to get linked location data (id, name, slug)

## 3. Faction-web: create member/location shapes with sub-cluster layout

- [x] 3.1 Use `buildNpcTokenShape()` and `buildLocationPinShape()` helpers to create shapes for each org's members and locations
- [x] 3.2 Use `radialLayout()` to position member/location shapes in a sub-cluster around each org (radius ~150px)
- [x] 3.3 Create arrow bindings from org shape to each member/location shape using `makeArrowBinding()`
- [x] 3.4 Increase the main radial layout radius proportionally when orgs have many related entities to reduce overlap

## 4. Entity-graph: add org membership, char-location, and org-location arrows

- [x] 4.1 In `generateEntityGraph()`, query `organizationMembers` joined with `characters` to get org→character membership pairs
- [x] 4.2 For orgs referenced by members that don't have a shape yet, use `buildFactionCardShape()` to create factionCard shapes (capped at 50 total expanded org shapes)
- [x] 4.3 Create arrow bindings for each org→member pair where both have shapes
- [x] 4.4 Query `characters` with non-null `locationEntityId` to get character→location pairs; create arrow bindings where both have shapes
- [x] 4.5 Query `organizationLocations` to get org→location pairs; create arrow bindings where both have shapes

## 5. Refactor existing generator to use helpers

- [x] 5.1 Refactor `generateFactionWeb()` to use `buildFactionCardShape()` for org shapes instead of inline shape construction
- [x] 5.2 Refactor `generateEntityGraph()` to use helpers for any new shapes it creates

## 6. Tests

- [x] 6.1 Unit test: `buildNpcTokenShape` returns correct shape structure with npcToken type and all expected props
- [x] 6.2 Unit test: `buildLocationPinShape` returns correct shape structure
- [x] 6.3 Unit test: `buildFactionCardShape` returns correct shape structure
- [x] 6.4 Unit test: `radialLayout` distributes N positions evenly in a circle at the given radius
- [x] 6.5 Unit test: `generateFactionWeb` creates npcToken shapes for org members and locationPin shapes for org locations with arrow bindings
- [x] 6.6 Unit test: `generateFactionWeb` caps members at 10 per org
- [x] 6.7 Unit test: `generateEntityGraph` creates arrow bindings for org membership, char-location, and org-location when both endpoints have shapes
- [x] 6.8 Unit test: `generateEntityGraph` creates factionCard shapes for orgs not already in the entity list
- [x] 6.9 Integration test: POST /api/campaigns/:id/diagrams/generate with type=faction-web returns shapeCount > orgCount (includes members)
