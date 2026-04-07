## Context

The tldraw diagram editor uses a Vue+React bridge: `diagramId.vue` (Vue page) wraps `TldrawCanvas.vue` which mounts a React `TldrawWrapper.tsx` containing the `<Tldraw>` component. Entity shapes (`npcToken`, `factionCard`, `locationPin`) store `entityId`, `slug`, and `campaignId` in their tldraw props.

The page already tracks selection state indirectly (for the entity popover) and has `editorInstance` available. The `syncRelations()` function fetches the graph API and creates tldraw arrows for known relationships. All relationship-mutation API endpoints exist and are fully functional.

Three distinct relationship storage mechanisms exist, each with its own API:

1. **Entity relations** (`entityRelations` table) — generic source→target with relation type, labels, attitude. API: `POST /api/campaigns/:id/relations`
2. **Organization membership** (`organizationMembers` table) — character belongs to org with optional role. API: `POST /api/campaigns/:id/organizations/:slug/members`
3. **Location links** — character's `locationEntityId` column (API: `PUT /api/campaigns/:id/characters/:slug`) and `organizationLocations` table (API: `POST /api/campaigns/:id/locations/:slug/organizations`)

## Goals / Non-Goals

**Goals:**

- Show a context-sensitive "Add Relationship" button when exactly one entity shape is selected
- Open a dialog that adapts its form fields based on the source and target entity types
- Persist relationships using existing API endpoints (no new server code)
- Draw the relationship arrow on canvas immediately after creation via `syncRelations()`
- Support all four relationship types: character↔character, character↔org, character↔location, org↔location

**Non-Goals:**

- Editing or deleting existing relationships from the diagram (future work)
- Creating new relation types from within the dialog (use the relation types management page)
- Bidirectional relationship creation in one step (user creates one direction; reverse is implicit for entity relations)
- Persisting the dialog state or selection across page reloads

## Decisions

### Decision 1: Dialog lives in Vue layer, not React

**Chosen:** `RelationshipDialog.vue` is a shadcn-vue Dialog rendered in `diagramId.vue`, positioned as a modal overlay. Communication between tldraw selection and Vue uses the existing `editorInstance` pattern — Vue code reads `editor.getSelectedShapes()` on selection change.

**Alternative considered:** React dialog inside the tldraw component tree. Rejected because all UI components (shadcn-vue) live in Vue; duplicating the design system in React adds complexity for no benefit. The existing EntityPopover and MapModal follow this same pattern.

### Decision 2: Selection tracking via editor store listener

**Chosen:** Add a store listener (`editor.store.listen(...)`) scoped to `{ source: 'user' }` that checks `editor.getSelectedShapes()`. When exactly one entity shape is selected, store its `entityId`, `type`, and `slug` in reactive Vue refs. The "Add Relationship" button's visibility is bound to this ref.

**Alternative considered:** Polling selection on an interval. Rejected — the store listener is event-driven, more efficient, and is already used for `placedEntitiesChange`.

### Decision 3: Type-adaptive form using a computed relationship mode

**Chosen:** The dialog computes a `relationshipMode` based on the `(sourceType, targetType)` pair:

| Source Type  | Target Type  | Mode                         | API Used                            |
| ------------ | ------------ | ---------------------------- | ----------------------------------- |
| character    | character    | `entity-relation`            | POST /relations                     |
| character    | organization | `org-member`                 | POST /organizations/:slug/members   |
| character    | location     | `char-location`              | PUT /characters/:slug               |
| organization | character    | `org-member` (swapped)       | POST /organizations/:slug/members   |
| organization | location     | `org-location`               | POST /locations/:slug/organizations |
| location     | character    | `char-location` (swapped)    | PUT /characters/:slug               |
| location     | organization | `org-location` (swapped)     | POST /locations/:slug/organizations |
| \*           | \*           | `entity-relation` (fallback) | POST /relations                     |

The form dynamically shows different fields per mode:

- `entity-relation`: relation type dropdown, forward/reverse labels, attitude slider (-100 to +100)
- `org-member`: role text input
- `char-location`: confirmation only (no extra fields — it's a "set location" action)
- `org-location`: confirmation only

**Why:** A single dialog component with mode switching is simpler than four separate dialogs. The mode is derived entirely from the entity types, requiring no user intervention.

### Decision 4: Entity picker searches all entity types via existing endpoint

**Chosen:** The target entity picker uses `$fetch('/api/campaigns/:id/diagrams/entities?q=...')` (the same endpoint used by EntityPanel) with debounced search input. Results are grouped by type (Characters, Locations, Organizations). The picker also shows entities already on the canvas with a badge, but all campaign entities are searchable — the target does not need to be on canvas.

**Alternative considered:** Restrict target selection to entities on the canvas only. Rejected — this is too limiting. Users should be able to create relationships with any entity, not just those already placed.

### Decision 5: Entity ID resolution for API calls

The APIs use different identifiers:

- Relations API: `sourceEntityId` / `targetEntityId` (entity UUIDs) — shapes already store `entityId`
- Org members API: `characterId` (character table UUID, not entity UUID) — requires a lookup
- Character update API: `slug` in URL path — shapes store `slug`
- Location-org API: `slug` in URL path + `organizationId` — shapes store `slug`, orgs store `entityId` which is `organizations.id`

**Chosen:** For org-member creation, the dialog fetches character data via a lightweight lookup: `GET /api/campaigns/:id/characters/:slug` returns the character record including its `id`. This avoids adding a new endpoint.

### Decision 6: Post-creation sync and feedback

**Chosen:** After a successful API call:

1. Show a brief success toast (using existing toast system if available, or a simple inline message)
2. Call `syncRelations()` to fetch the updated graph and draw new arrows
3. Close the dialog

**Why:** `syncRelations()` already handles arrow creation, deduplication, and color mapping. Calling it after relationship creation reuses all that logic without duplicating it.

## Risks / Trade-offs

- **Character ID lookup latency** → The org-member mode needs `character.id` from the entity's `slug`. This adds one extra API call. Mitigation: it's a single GET for a known slug; latency is negligible.
- **Selection flicker** → tldraw may fire multiple selection events during click. Mitigation: debounce the selection handler by ~50ms before updating Vue state.
- **Dialog blocks canvas interaction** → While the modal is open, the user can't interact with the canvas. This is intentional — it prevents accidental deselection.
- **syncRelations creates ALL matching arrows** → After creating one relationship, syncRelations may also draw arrows for other existing relationships not yet on canvas. This is acceptable behavior — it's what the "Sincronizar relaciones" button does too.
- **No new API endpoints** → This design deliberately avoids creating new endpoints. If future requirements need bulk relationship creation or a unified relationship API, that would be a separate change.

## Migration Plan

1. Add `RelationshipDialog.vue` component (additive, no impact on existing code)
2. Add selection tracking + button to `diagramId.vue` (additive — new refs and a store listener)
3. Add i18n keys for dialog labels (additive)
4. No database migrations required
5. No breaking changes to existing behavior
