## Why

Quests, sessions, and arcs became relatable (via `quest-relations`, `session-relations`, `arc-relations`) and a real-play population pass created hundreds of relations across them, but no page rendered those relations — the `EntityRelationsPanel` was wired only into character, organization, and location detail pages. Users had no way to see or manage relations involving a quest, session, or arc. While wiring the panel into the new pages, the "Add Relation" flow was also found to be broken end-to-end whenever no relation type is selected from the dropdown (the common path, since forward/reverse labels are typically typed by hand): the dialog sends `null` for the optional `relationTypeId`/`description` fields, but the API schemas only accepted a string or a missing key, so every such submission failed with a 422. This affected all entity types, not just the new ones, and is fixed alongside the UI expansion since it blocks verifying the feature at all.

## What Changes

- Render `EntityRelationsPanel` on the quest, session, and arc detail pages, matching the existing character/organization/location placement and behavior.
- Widen the `EntityType` union (`useEntityRelations.ts`) and the panel's `entityType` prop to accept `'quest' | 'session' | 'arc'` in addition to the existing types.
- Add the missing `entities.types.arc` i18n key (`en`/`es`) used by the relation dialog's type labels.
- **Bug fix**: `POST /api/campaigns/:id/relations` and `PUT /api/campaigns/:id/relations/:relationId` now accept an explicit `null` for `relationTypeId`/`description`, matching what `RelationFormDialog` actually sends when those optional fields are left blank.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `entity-relations-panel`: the "Relations panel on entity detail pages" requirement now covers quest, session, and arc detail pages in addition to character, organization, and location. The "Add relation from detail page" requirement's submit scenario is corrected to reflect that a relation with no type selected is a valid submission (not a validation error).

## Impact

- `app/composables/useEntityRelations.ts`, `app/components/relations/EntityRelationsPanel.vue` — widened `EntityType`.
- `app/pages/campaigns/[id]/quests/[slug]/index.vue`, `.../sessions/[slug]/index.vue`, `.../arcs/[slug]/index.vue` — panel added.
- `i18n/locales/en.json`, `i18n/locales/es.json` — `entities.types.arc` key.
- `server/api/campaigns/[id]/relations/index.post.ts`, `.../relations/[relationId]/index.put.ts` — schema fix.
- No `aleph-cli` impact: purely frontend UI plus a request-validation fix on an existing endpoint, no new endpoints, no CLI command surface changes.
- Tests: new E2E spec `tests/e2e/relations-panel-quest-session-arc.spec.ts`; new integration regression tests in `tests/integration/relations.test.ts` covering the null-payload fix.
