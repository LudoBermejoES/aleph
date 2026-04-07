## Why

The tldraw diagram editor can display entity relationships (via "Sincronizar relaciones"), but there is no way to **create** relationships from within the diagram. Users must leave the diagram, navigate to an entity's page, and manually add relations there. This breaks flow — the diagram is the natural place to see and create connections between entities. Adding an in-canvas relationship creator closes this gap, making the diagram a first-class editing surface for campaign relationships.

## What Changes

- A context-sensitive **"Add Relationship"** button appears in the diagram toolbar when the user selects exactly one entity shape (npcToken, factionCard, locationPin)
- Clicking the button opens a **Vue dialog** (not React) that:
  - Shows the selected entity as "source"
  - Provides a searchable entity picker for the "target" (using the existing diagrams/entities search endpoint)
  - Dynamically adapts the form based on the source→target entity type pair:
    - **Character ↔ Character**: relation type picker (from campaign's `relation_types`), labels, attitude slider
    - **Character → Organization**: adds character as org member with optional role
    - **Character → Location**: sets character's `locationEntityId`
    - **Organization → Location**: creates org-location link
    - Reverse combinations are handled by swapping source/target internally
  - Calls the appropriate existing API endpoint to persist the relationship
  - After success, calls `syncRelations()` to draw the arrow on canvas immediately

## Capabilities

### New Capabilities

- `diagram-relationship-dialog`: In-canvas dialog for creating relationships between entities of any type (character, organization, location) directly from the tldraw diagram editor

### Modified Capabilities

## Impact

- **app/pages/campaigns/[id]/diagrams/[diagramId].vue** — selection tracking, button visibility, dialog integration, syncRelations call after creation
- **New component: app/components/diagrams/RelationshipDialog.vue** — the dialog UI with entity picker, type-adaptive form, and API calls
- **Existing API endpoints used (no changes):**
  - `POST /api/campaigns/:id/relations` — character↔character relations
  - `GET /api/campaigns/:id/relation-types` — fetch available relation types
  - `POST /api/campaigns/:id/organizations/:slug/members` — add character to org
  - `POST /api/campaigns/:id/locations/:slug/organizations` — link org to location
  - `PUT /api/campaigns/:id/characters/:slug` — update character locationEntityId
  - `GET /api/campaigns/:id/diagrams/entities` — entity search for target picker
- **No new API endpoints required** — all mutations use existing endpoints
- **No schema/migration changes** — all tables already exist
- **No CLI impact** — this is purely a frontend feature using existing APIs
- **i18n** — new keys needed for dialog labels, button text, relation type labels
