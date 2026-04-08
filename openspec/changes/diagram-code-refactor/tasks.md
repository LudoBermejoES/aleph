## 1. Shared client-side shape utilities

- [ ] 1.1 Create `app/utils/diagram-shapes.ts` with `ENTITY_TYPE_TO_SHAPE_TYPE` mapping (character→npcToken, location→locationPin, quest→questNode, organization→factionCard, wiki→entityCard) and derived `ENTITY_SHAPE_TYPES` array
- [ ] 1.2 Add `buildShapeProps(entityType, entity, campaignId)` function that returns the correct props for each shape type (w, h, entityId, campaignId, slug, plus type-specific: characterName/portraitUrl, locationName, questTitle/status, factionName, entityName/entityType)
- [ ] 1.3 Add `getShapeType(entityType)` convenience function that returns the tldraw shape type string with fallback to 'entityCard'
- [ ] 1.4 Unit tests for `buildShapeProps` (all entity types) and `getShapeType` (known + unknown types)

## 2. Graph API N+1 query fix + service extraction

- [ ] 2.1 Create `server/services/graph-builder.ts` with `buildGraphForCampaign(db, campaignId, role)` function
- [ ] 2.2 Move entity relation edge building from graph endpoint into `buildEntityRelationEdges(db, campaignId, role)` → returns `{ nodes, edges }`
- [ ] 2.3 Move org membership edge building into `buildOrgMembershipEdges(db, charIdRows, orgMemberRows)` — receives pre-fetched data, no queries
- [ ] 2.4 Fix character→location N+1: batch-fetch all character locations in one `inArray()` query, build edges from result set
- [ ] 2.5 Fix org→location N+1: batch-fetch all org-location links in one `inArray()` query, build edges from result set
- [ ] 2.6 Refactor `graph/index.get.ts` to call `buildGraphForCampaign()` and return its result
- [ ] 2.7 Run integration tests to verify graph API returns identical data

## 3. Extract useEditorSelection composable

- [ ] 3.1 Create `app/composables/useEditorSelection.ts` that accepts the editor instance and returns `{ selectedEntityId, selectedEntityType, selectedEntitySlug, selectedEntityName }` refs
- [ ] 3.2 Move the store listener logic from `diagramId.vue` (selection tracking, debounce, entity type resolution) into the composable
- [ ] 3.3 Use `ENTITY_SHAPE_TYPES` from `diagram-shapes.ts` instead of inline array
- [ ] 3.4 Update `diagramId.vue` to use `useEditorSelection` — replace inline refs and listener

## 4. Extract useArrowDimming composable

- [ ] 4.1 Create `app/composables/useArrowDimming.ts` that accepts editor instance and watches a selected shape ID ref
- [ ] 4.2 Move `highlightRelatedArrows()` and `restoreArrowOpacities()` functions and the `EditorWithBindings` type into the composable
- [ ] 4.3 The composable should watch the selected shape ID and call highlight/restore automatically
- [ ] 4.4 Include the `isUpdatingOpacity` guard to prevent re-entrant store listener loops
- [ ] 4.5 Update `diagramId.vue` to use `useArrowDimming` — remove inline arrow functions and listener logic

## 5. Extract useSyncRelations composable

- [ ] 5.1 Create `app/composables/useSyncRelations.ts` that accepts editor instance and campaignId, exports `syncRelations()` async function
- [ ] 5.2 Move `syncRelations()`, `relationTypeToColor()`, and `translateEdgeLabel()` from `diagramId.vue` into the composable
- [ ] 5.3 Import `radialLayout` dependency inside composable (not at page level)
- [ ] 5.4 Update `diagramId.vue` to use `useSyncRelations` — replace inline function and all callers

## 6. Extract useEntityExpansion composable

- [ ] 6.1 Create `app/composables/useEntityExpansion.ts` that accepts editor instance and campaignId, exports `expandRelatedEntities()` async function
- [ ] 6.2 Move `expandRelatedEntities()` from `diagramId.vue` into the composable, using `buildShapeProps` from `diagram-shapes.ts`
- [ ] 6.3 The composable should call `syncRelations()` after expansion (accept it as dependency or use the sync composable)
- [ ] 6.4 Update `diagramId.vue` to use `useEntityExpansion` — replace inline function

## 7. Extract EntitySearchInput component

- [ ] 7.1 Create `app/components/diagrams/EntitySearchInput.vue` with props `campaignId`, `excludeIds` (string[]), emits `select(entity)`
- [ ] 7.2 Move debounced search, grouped results rendering, and selection logic from RelationshipDialog into EntitySearchInput
- [ ] 7.3 Update `RelationshipDialog.vue` to use `EntitySearchInput` instead of inline search

## 8. Update diagramId.vue to use all composables

- [ ] 8.1 Replace inline shape creation in `handleEntityDrop` with `buildShapeProps` + `getShapeType` from `diagram-shapes.ts`
- [ ] 8.2 Wire all composables: `useEditorSelection`, `useArrowDimming`, `useSyncRelations`, `useEntityExpansion`
- [ ] 8.3 Verify the page is ~350 lines or less (template + lifecycle + composable wiring)
- [ ] 8.4 Run full test suite: all unit, integration, and E2E tests pass unchanged

## 9. Cleanup and verification

- [ ] 9.1 Remove any dead code left in `diagramId.vue` after extraction
- [ ] 9.2 Run `npx eslint` on all new/modified files — zero errors
- [ ] 9.3 Run `npx prettier --check` on all new/modified files
- [ ] 9.4 Run full unit test suite (940+ tests)
- [ ] 9.5 Run integration tests (12 tests)
- [ ] 9.6 Run E2E tests (7 tests)
