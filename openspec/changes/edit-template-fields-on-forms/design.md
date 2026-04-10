## Context

The templates system (`entityTemplates` + `entityTemplateFields`) is complete in the DB and in the template editor UI. The read-only `TemplateFieldsDisplay` component now renders template field values on all detail pages.

However:

- **EntityForm** already has an inline template field editing block, but it has two bugs: (1) it resets `templateFieldValues` to `{}` when the template is loaded during edit, losing existing stored values; (2) it handles only `text`, `number`, `textarea`, `select`, `checkbox` — missing `date`, `section`, and `entity_reference`.
- **CharacterForm** has no template selector or field inputs at all. The character POST/PUT API doesn't accept `templateId` or `fields`.
- **Location form/API** have no template support at all.
- **Organization API** now accepts `templateId`/`fields` (added in previous change) but the edit/create pages don't render template field inputs.
- `isDefault` flag exists on `entityTemplates` but nothing auto-applies it on create.

Field values for entity-backed types (entity, character, location) are stored in the `.md` frontmatter under `fields:`. For organizations (not entity-backed) they are stored in a `fields_json` column.

## Goals / Non-Goals

**Goals:**

- Create a reusable `TemplateFieldsForm.vue` component that handles all 7 field types as editable inputs
- Fix `EntityForm` to pre-populate existing field values when editing; replace inline block with `TemplateFieldsForm`
- Add `templateId` and `fields` to character POST/PUT API + `buildCharacterFrontmatter()`
- Add `templateId` and `fields` to location POST/PUT API
- Wire `TemplateFieldsForm` + template selector into `CharacterForm`, location new/edit pages, and organization new/edit pages
- Auto-apply default template on create for all entity types

**Non-Goals:**

- Building a custom entity reference picker (use a plain text input with the slug for `entity_reference` fields — a proper picker is a future enhancement)
- Required field validation beyond displaying the asterisk (server-side validation is not implemented for template fields today)
- Template field editing in the CLI (assess impact but don't implement for this change)
- Moving organization field storage from `fields_json` column to frontmatter

## Decisions

### Decision 1: Shared `TemplateFieldsForm.vue` component

Extract the inline template field block from `EntityForm` into `app/components/TemplateFieldsForm.vue`.

Props: `templateId: string | null | undefined`, `campaignId: string`, `modelValue: Record<string, unknown>`

The component fetches the template (same as `TemplateFieldsDisplay`), renders editable inputs per field type, and emits `update:modelValue` with the current field values. The parent passes in the current stored values as `modelValue` on mount — this is how edit pre-population works.

This avoids duplicating field-rendering logic across 4 forms.

### Decision 2: `entity_reference` field uses a plain text input (slug)

A proper entity-search picker requires a dedicated combobox component and an entity search API call. For this change, render `entity_reference` fields as a plain `<input type="text">` with a placeholder indicating "entity slug". A proper picker can be added later as a drop-in replacement.

### Decision 3: `section` fields render as a heading-only divider in the form (no input)

Same treatment as `TemplateFieldsDisplay`: section fields are structural dividers with a label but no input. The component skips them when computing field values to emit.

### Decision 4: `date` fields use `<input type="date">`

The browser native date input serializes to ISO 8601 (`YYYY-MM-DD`) which is what we store. No external date picker library needed.

### Decision 5: Auto-default template applied on create via composable, not API

When a new character/entity/location/org create form mounts, it calls `GET /api/campaigns/{id}/templates` (already available), filters for the default template matching the entity type, and pre-selects it. This is purely client-side and has no API changes. The user can still override it before saving.

### Decision 6: Character `templateId` stored on the entity row, not the character row

`entities.templateId` already exists. Characters are backed by an entity row, so the `templateId` already propagates through `...entity` in the character GET response. The character POST must write `templateId` to the `entities` insert (which it already does via the entity creation step), and the PUT must update it on the entity row.

## Risks / Trade-offs

- **Extra fetch on form mount**: `TemplateFieldsForm` fetches the template definition when `templateId` changes. This is one additional request but the template is small and typically cached by the browser.
- **`entity_reference` plain-text UX**: Users must know the slug. This is acceptable short-term but confusing for non-technical users. Mitigation: add placeholder text explaining the format.
- **Organization fields_json vs frontmatter inconsistency**: Organizations store fields differently from other entity types. The form layer abstracts this away (both read/write via the same API shape), but the backend serialization differs. Acceptable for now.
- **Template change on edit loses existing values**: If a user changes the template on an existing entity, previous field values not in the new template are lost. Current behavior — not changing it here.

## Migration Plan

No DB migrations needed. All changes are additive:

- Character and location API changes: backward-compatible additions (new optional fields in POST/PUT)
- New component: additive
- Form changes: additive (existing form fields unchanged)

Rollback: remove `TemplateFieldsForm` usage from forms; no data is affected.
