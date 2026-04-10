## Why

The templates system exists and templates can be assigned to entities, but the create/edit forms for characters, locations, and organizations don't render or save template field values. Users who assign a default template to a character type see nothing editable — the fields only appear read-only on the detail page after the fact, and only if values were somehow stored. The gap is that template fields cannot be filled in during creation or editing for most entity types.

## What Changes

- Extract the existing template field editing block from `EntityForm.vue` into a reusable `TemplateFieldsForm.vue` component that supports all field types including `date`, `section`, and `entity_reference`
- Fix the existing `EntityForm` editing gap: pre-populate template field values when editing an existing entity (currently resets to `{}`)
- Add `templateId` and `fields` to character POST/PUT API endpoints and `buildCharacterFrontmatter()`
- Add `templateId` and `fields` to location POST/PUT API endpoints
- Wire `TemplateFieldsForm` into `CharacterForm.vue` with template selector
- Wire `TemplateFieldsForm` into location and organization edit/create pages
- Auto-apply default templates on create: when a default template exists for the entity type being created, pre-select it automatically

## Capabilities

### New Capabilities

- `template-fields-editing`: Reusable editable form component for template fields; wired into character, location, and organization create/edit forms with auto-default-template selection

### Modified Capabilities

- `character-management`: Character POST/PUT API now accepts `templateId` and `fields`; character create/edit form renders template fields
- `location-management`: Location POST/PUT API now accepts `templateId` and `fields`; location create/edit form renders template fields
- `entity-templates-ui`: EntityForm pre-populates existing field values on edit; `TemplateFieldsForm` replaces the inline template block

## Impact

- `server/api/campaigns/[id]/characters/index.post.ts` — add `templateId`, `fields` to schema and insert
- `server/api/campaigns/[id]/characters/[slug]/index.put.ts` — add `templateId`, `fields` to schema and update frontmatter
- `server/services/characters.ts` — `buildCharacterFrontmatter()` must accept and merge template fields
- `server/api/campaigns/[id]/locations/index.post.ts` — add `templateId`, `fields` to schema
- `server/api/campaigns/[id]/locations/[slug]/index.put.ts` — add `templateId`, `fields` to schema
- `app/components/TemplateFieldsForm.vue` — new shared editable component
- `app/components/forms/CharacterForm.vue` — add template selector + TemplateFieldsForm
- `app/components/forms/EntityForm.vue` — fix edit pre-population, use TemplateFieldsForm
- Location and organization new/edit pages
- **aleph-cli**: `character create` and `character update` commands should accept `--template-id` and `--field key=value` flags if practical; at minimum, the API change must not break existing CLI calls
