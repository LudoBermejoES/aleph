## 1. Composable: add character expansion logic

- [x] 1.1 In `useEntityExpansion.ts`, add a `character` branch in `expandRelatedEntities` that collects all edges where `edge.source === entityId || edge.target === entityId`, extracts the opposite endpoint, and excludes IDs already on canvas
- [x] 1.2 Write unit tests for the character expansion logic in `tests/unit/composables/useEntityExpansion.test.ts`

## 2. UI: show expand button for character shapes

- [x] 2.1 In `app/pages/campaigns/[id]/diagrams/[diagramId].vue`, update the expand button `v-if` condition to also include `selectedEntityType === 'character'`
