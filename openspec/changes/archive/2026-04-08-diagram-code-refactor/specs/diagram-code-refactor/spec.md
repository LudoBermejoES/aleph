## ADDED Requirements

### Requirement: Shared entity type to shape type mapping

A single canonical mapping from entity types to tldraw shape types SHALL exist in `app/utils/diagram-shapes.ts`. All code that maps entity types to shape types SHALL use this mapping.

#### Scenario: Mapping is consistent across all consumers

- **WHEN** the mapping is imported in `diagramId.vue`, `expandRelatedEntities`, `handleEntityDrop`, or any composable
- **THEN** the same mapping is used: character→npcToken, location→locationPin, quest→questNode, organization→factionCard, wiki/other→entityCard

#### Scenario: Adding a new entity type

- **WHEN** a new entity type needs a shape type
- **THEN** only `diagram-shapes.ts` needs to be updated (single source of truth)

---

### Requirement: Client-side shape prop builder

`app/utils/diagram-shapes.ts` SHALL export a `buildShapeProps(entityType, entity, campaignId)` function that returns the correct props object for `editor.createShape()`.

#### Scenario: Building npcToken props

- **WHEN** `buildShapeProps('character', { id, name, slug, portraitUrl }, campaignId)` is called
- **THEN** it returns `{ w: 140, h: 160, entityId: id, campaignId, slug, characterName: name, portraitUrl }`

#### Scenario: Building factionCard props

- **WHEN** `buildShapeProps('organization', { id, name, slug }, campaignId)` is called
- **THEN** it returns `{ w: 180, h: 100, entityId: id, campaignId, slug, factionName: name }`

---

### Requirement: Composable useEditorSelection

`app/composables/useEditorSelection.ts` SHALL track the currently selected entity shape and expose reactive refs for the selected entity's ID, type, slug, and name.

#### Scenario: Single entity shape selected

- **WHEN** the user selects exactly one npcToken shape with entityId
- **THEN** `selectedEntityId`, `selectedEntityType`, `selectedEntitySlug`, `selectedEntityName` refs are populated

#### Scenario: Nothing selected

- **WHEN** no shapes are selected
- **THEN** all selected entity refs are empty strings

---

### Requirement: Composable useArrowDimming

`app/composables/useArrowDimming.ts` SHALL dim unrelated arrows when an entity shape is selected and restore them on deselection.

#### Scenario: Entity selected dims unrelated arrows

- **WHEN** an entity shape is selected
- **THEN** arrows not bound to the selected shape have opacity set to 0.15
- **AND** arrows bound to the selected shape remain at opacity 1

#### Scenario: Deselection restores arrows

- **WHEN** all shapes are deselected
- **THEN** all arrows are restored to opacity 1

---

### Requirement: Composable useSyncRelations

`app/composables/useSyncRelations.ts` SHALL encapsulate the logic for fetching the graph API and creating tldraw arrows with bindings for entity relationships on canvas.

#### Scenario: Sync creates arrows for matching edges

- **WHEN** `syncRelations()` is called with entities on canvas that have matching graph edges
- **THEN** arrow shapes with bindings are created for each matching edge
- **AND** duplicate arrows are not created

---

### Requirement: Composable useEntityExpansion

`app/composables/useEntityExpansion.ts` SHALL encapsulate the logic for expanding related entities around a selected org or location.

#### Scenario: Expand organization

- **WHEN** `expandRelatedEntities()` is called with an organization selected
- **THEN** member characters and linked locations are created as shapes in radial layout around the org

---

### Requirement: Graph API N+1 query elimination

The graph API endpoint SHALL use batched queries (`inArray()`) instead of per-entity loops for character location lookups and org-location lookups.

#### Scenario: Campaign with 50 characters and 20 orgs

- **WHEN** the graph API is called
- **THEN** character locations are fetched in a single batched query (not 50 individual queries)
- **AND** org-location links are fetched in a single batched query (not 20 individual queries)

---

### Requirement: EntitySearchInput component

`app/components/diagrams/EntitySearchInput.vue` SHALL provide a searchable entity dropdown with debounced search, grouped results, and entity selection.

#### Scenario: Search for entity

- **WHEN** the user types a search query
- **THEN** results are fetched from the diagrams/entities endpoint with 300ms debounce and grouped by type

#### Scenario: Select entity

- **WHEN** the user clicks an entity in the dropdown
- **THEN** a `select` event is emitted with the entity data

---

### Requirement: Behavior preservation

All refactoring SHALL preserve existing user-facing behavior. All existing unit, integration, and E2E tests SHALL pass without modification.

#### Scenario: Full test suite passes

- **WHEN** all refactoring is complete
- **THEN** all 940+ unit tests, 12 integration tests, and 7 E2E tests pass unchanged
