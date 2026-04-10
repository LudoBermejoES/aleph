## Why

Entity templates define the fields that matter for a given entity type in a campaign (e.g., race, class, alignment for characters; subtype and status for locations), but currently none of the entity detail pages actually read or display those field values. Templates exist as an authoring tool for creation forms, but the information disappears from view once the entity is saved. This makes templates feel incomplete and forces DMs to repeat context in freeform notes rather than in structured, queryable fields.

## What Changes

- A new reusable `<TemplateFieldsDisplay>` component is created that accepts a `templateId` and a `fieldValues` object and renders the fields in a structured properties panel.
- The character detail page (`app/pages/campaigns/[id]/characters/[slug]/index.vue`) is updated to fetch `templateId` and `fields` from the API and pass them to the component, replacing the hardcoded race/class/alignment badges.
- The entity detail page (`app/pages/campaigns/[id]/entities/[slug]/index.vue`) is updated to render template fields when the entity has a `templateId`.
- The location detail page (`app/pages/campaigns/[id]/locations/[slug]/index.vue`) is updated to render template fields instead of the hardcoded `subtype` display.
- The organization detail page (`app/pages/campaigns/[id]/organizations/[slug]/index.vue`) is updated to render template fields instead of the hardcoded type/status display.
- The character GET API endpoint is updated to include `templateId` and `fields` (frontmatter fields object) in its response.
- Field rendering respects type: `section` renders as a heading divider, `entity_reference` renders as a link, `select` shows the human-readable option label, `checkbox` shows yes/no, all other types display their value as text.

## Capabilities

### New Capabilities

- `template-fields-display`: A reusable Vue component that fetches template field definitions and renders stored field values in a structured properties panel on entity detail pages.

### Modified Capabilities

- `entity-templates-ui`: Template fields are now displayed on detail pages (not just during creation). The spec gains read/display requirements for all four entity detail page types.

## Impact

- **Frontend**: `app/components/` (new `TemplateFieldsDisplay.vue`), `app/pages/campaigns/[id]/characters/[slug]/index.vue`, `app/pages/campaigns/[id]/entities/[slug]/index.vue`, `app/pages/campaigns/[id]/locations/[slug]/index.vue`, `app/pages/campaigns/[id]/organizations/[slug]/index.vue`
- **Server API**: Character GET endpoint (`server/api/campaigns/[id]/characters/[slug].get.ts` or equivalent) needs to expose `templateId` and `fields`
- **aleph-cli**: No CLI changes required — this is a display-only change on the frontend. No new API endpoints are added and no data model changes occur.
- **Tests**: New unit tests for the component, integration tests verifying the character API returns `templateId`/`fields`, and E2E tests covering template field display on each detail page.
