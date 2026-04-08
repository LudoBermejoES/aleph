## 1. Expand button in toolbar

- [x] 1.1 Add "Expand" button in the diagram toolbar, visible when `selectedEntityType` is `organization` or `location`, with `data-testid="expand-entity-btn"`
- [x] 1.2 Add i18n keys `diagrams.expand` in en.json ("Expand") and es.json ("Expandir")

## 2. Expand function implementation

- [x] 2.1 Create `expandRelatedEntities()` async function in `diagramId.vue`
- [x] 2.2 Read the selected shape's position from `editor.getShape(shapeId)` to get center x/y
- [x] 2.3 Fetch graph data from `/api/campaigns/:id/graph`
- [x] 2.4 For organization: scan edges for `org-member:*` (org is source → target is character entity) and `org-location:*` (org is source → target is location entity) where the selected entity's ID matches the org
- [x] 2.5 For location: scan edges for `char-location:*` (location is target → source is character entity) and `org-location:*` (location is target → source is org) where the selected entity's ID matches the location
- [x] 2.6 Filter out entity/org IDs that already have shapes on canvas (scan `editor.getCurrentPageShapes()` for matching `entityId` props)
- [x] 2.7 Get entity data (name, slug, type, image/portraitUrl) from `graphData.nodes[id]` for each entity to expand
- [x] 2.8 Use `radialLayout()` from `app/utils/diagram-layout.ts` to compute positions around the selected shape (radius ~250px)
- [x] 2.9 Create shapes using `editor.createShape()` with the correct type/props per entity type (npcToken for characters, locationPin for locations, factionCard for orgs)
- [x] 2.10 Call `syncRelations()` after all shapes are created

## 3. Wire button to function

- [x] 3.1 Connect "Expand" button click to `expandRelatedEntities()`

## 4. Tests

- [x] 4.1 Unit test: expand logic identifies correct related entity IDs for an org (members + locations)
- [x] 4.2 Unit test: expand logic identifies correct related entity IDs for a location (characters + orgs)
- [x] 4.3 Unit test: entities already on canvas are filtered out
- [x] 4.4 E2E test: select org shape → "Expand" button visible; select character shape → "Expand" button hidden
