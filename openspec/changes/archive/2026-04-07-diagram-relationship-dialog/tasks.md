## 1. Selection tracking and button visibility

- [x] 1.1 Add reactive refs for selected entity state (`selectedEntityId`, `selectedEntityType`, `selectedEntitySlug`, `selectedEntityName`) in `diagramId.vue`
- [x] 1.2 Add a tldraw store listener in `onEditorReady` that watches selection changes via `editor.getSelectedShapes()`, debounced at 50ms, and updates the refs when exactly one entity shape is selected (npcToken, factionCard, locationPin)
- [x] 1.3 Add the "Add Relationship" button to the diagram toolbar, bound to `selectedEntityId` for visibility, with `data-testid="add-relationship-btn"`
- [x] 1.4 Add i18n keys `diagrams.addRelationship` in en.json ("Add Relationship") and es.json ("Añadir relación")

## 2. RelationshipDialog component — structure and entity picker

- [x] 2.1 Create `app/components/diagrams/RelationshipDialog.vue` as a shadcn-vue Dialog with props: `visible`, `campaignId`, `sourceEntityId`, `sourceEntityType`, `sourceEntitySlug`, `sourceEntityName`, emits: `close`, `created`
- [x] 2.2 Implement the target entity picker: searchable combobox/input that fetches from `/api/campaigns/:id/diagrams/entities?q=<query>` with 300ms debounce, results grouped by type (Characters, Locations, Organizations)
- [x] 2.3 Compute `relationshipMode` from `(sourceType, targetType)` pair: `entity-relation`, `org-member`, `char-location`, `org-location`, with automatic source/target swapping for reversed combinations
- [x] 2.4 Disable the "Create" button when no target is selected or source === target

## 3. RelationshipDialog — type-adaptive forms

- [x] 3.1 Entity-relation mode (character↔character): fetch relation types from `GET /api/campaigns/:id/relation-types`, show dropdown, auto-fill forward/reverse labels on selection, add attitude slider (-100 to +100)
- [x] 3.2 Org-member mode (character↔org): show optional "Role" text input
- [x] 3.3 Char-location mode (character↔location): show confirmation message "Set [character]'s location to [location]"
- [x] 3.4 Org-location mode (org↔location): show confirmation message "Link [org] to [location]"

## 4. RelationshipDialog — API submission

- [x] 4.1 Entity-relation submission: call `POST /api/campaigns/:id/relations` with `{ sourceEntityId, targetEntityId, relationTypeId, forwardLabel, reverseLabel, attitude }`
- [x] 4.2 Org-member submission: resolve character slug to characterId via `GET /api/campaigns/:id/characters/:slug`, then call `POST /api/campaigns/:id/organizations/:orgSlug/members` with `{ characterId, role }`
- [x] 4.3 Char-location submission: call `PUT /api/campaigns/:id/characters/:charSlug` with `{ locationEntityId }`
- [x] 4.4 Org-location submission: call `POST /api/campaigns/:id/locations/:locSlug/organizations` with `{ organizationId }`
- [x] 4.5 On success: emit `created`, close dialog. On error: display error message in dialog, do not close.

## 5. Integration with diagram page

- [x] 5.1 Wire RelationshipDialog into `diagramId.vue`: open on button click, pass source entity props, listen to `created` event
- [x] 5.2 On `created` event, call `syncRelations()` to draw the new arrow on canvas
- [x] 5.3 Add all i18n keys for dialog labels, form fields, buttons, error messages, and confirmation text in both en.json and es.json

## 6. Tests

- [x] 6.1 Unit tests: relationship mode computation (source/target type pairs → correct mode with swapping logic)
- [x] 6.2 Unit tests: form validation (disabled button when no target, same-entity prevention)
- [x] 6.3 Integration tests: verify that the existing relation/member/location APIs accept the payloads the dialog will send
- [x] 6.4 E2E test: select entity shape → "Add Relationship" button visible → click → dialog opens with source name
- [x] 6.5 E2E test: button hidden when no entity selected or multiple shapes selected
