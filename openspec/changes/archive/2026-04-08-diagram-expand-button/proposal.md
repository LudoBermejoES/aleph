## Why

The diagram generator now creates full org/location sub-clusters server-side, but users who build diagrams manually have no equivalent. When a DM drops "La Fuerza Oculta" onto a blank canvas, they still need to manually drag each member character one by one. An "Expand" button on the toolbar — visible when an org or location is selected — would fetch and place all related entities in one click, using the same `radialLayout` and shape conventions the generator uses.

## What Changes

- An **"Expand"** button appears in the diagram toolbar when exactly one organization (factionCard) or location (locationPin) shape is selected
- Clicking it:
  - Fetches the graph API to find related entities (org→members + locations, location→characters + orgs)
  - Filters out entities already on canvas
  - Creates shapes (npcToken, locationPin, factionCard) in a radial layout around the selected shape
  - Calls `syncRelations()` to draw all arrows
- The button is hidden for character shapes (too many potential relations) and when nothing or multiple shapes are selected

## Capabilities

### New Capabilities

- `diagram-expand-button`: Toolbar button to expand related entities (members, locations, organizations) around a selected org or location shape on the diagram canvas

### Modified Capabilities

## Impact

- **app/pages/campaigns/[id]/diagrams/[diagramId].vue** — add "Expand" button visibility logic (reuses existing `selectedEntityType` ref), implement `expandRelatedEntities()` function
- **app/utils/diagram-layout.ts** — already exists, `radialLayout()` is reused as-is
- **No new API endpoints** — uses existing graph API for relationship data
- **No server-side changes**
- **No schema/migration changes**
- **No CLI impact**
- **i18n** — new key `diagrams.expand` in en.json and es.json
