## Why

The "Expand related entities" button on the tldraw diagram canvas currently only works for `organization` and `location` entity types. Character entities (npcToken, genealogyNode shapes) are excluded, even though characters are the most common entity type users want to explore. Users want to select a character on the canvas and auto-place all their related entities with one click.

## What Changes

- The expand button becomes visible when a character entity shape is selected (`npcToken` or `genealogyNode`)
- `useEntityExpansion` composable handles character entity expansion the same way it handles org/location expansion: fetches the relation graph, identifies missing related entities, places them in a radial layout, and calls `syncRelations()` to draw arrows
- The character expansion path resolves related entities of any type (other characters, locations, organizations) from the `/api/campaigns/{id}/graph` endpoint

## Capabilities

### New Capabilities

- `character-expansion`: Expand related entities from a selected character shape on the tldraw diagram canvas

### Modified Capabilities

- `diagram-sync`: The "Expand related entities" trigger condition now includes character entity types in addition to organization and location

## Impact

- `app/composables/useEntityExpansion.ts` — add character entity type handling
- `app/pages/campaigns/[id]/diagrams/[diagramId].vue` — widen the `v-if` condition on the expand button to include character types
- No API changes needed — the `/api/campaigns/{id}/graph` endpoint already supports the use case
- No CLI impact
