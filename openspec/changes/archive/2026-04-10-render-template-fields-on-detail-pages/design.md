## Context

The templates system (`entityTemplates` + `entityTemplateFields`) already exists in the DB schema and in the template editor UI. Entities have a `templateId` nullable column. Field values are stored as `fields` in the markdown frontmatter of each entity's file (key-value pairs). The entity GET endpoint already returns `fields: file.frontmatter.fields || {}`.

The character GET endpoint returns `...entity` (which includes `templateId`) and `frontmatter` (which contains `fields`), but does NOT currently surface a top-level `fields` property — making it slightly inconsistent with the entity endpoint.

The template detail endpoint `GET /api/campaigns/[id]/templates/[templateId]` already returns the full template with its ordered fields array.

Currently, no detail page reads `templateId` or renders template field values. The character page shows hardcoded `race`, `class`, `alignment` badges from dedicated DB columns; location and organization pages show hardcoded enum values for `subtype` and `type`/`status`.

## Goals / Non-Goals

**Goals:**

- Create a single reusable `<TemplateFieldsDisplay>` component that handles fetching the template definition and rendering values
- Render template fields on: entity detail, character detail, location detail, organization detail pages
- Support all field types: `text`, `textarea`, `number`, `date`, `checkbox`, `select`, `entity_reference`, `section`
- Gracefully handle missing values (show empty/placeholder, never crash)
- Keep the hardcoded badges (race/class for character, subtype for location, type/status for org) in place alongside template fields — removal of those columns is a separate change

**Non-Goals:**

- Editing field values inline on detail pages (editing happens on the edit page)
- Migrating existing race/class/alignment DB columns to template fields
- Adding a default-template auto-assignment mechanism (the entity already has `templateId` set at creation time if a template was selected)
- CLI changes (display-only, no new endpoints)

## Decisions

### Decision 1: Client-side template fetch vs. server-side embedding

**Options considered:**

- A) The component fetches the template definition via `useFetch` on the client using the existing `GET /api/campaigns/[id]/templates/[templateId]` endpoint.
- B) The entity/character API embeds the full template fields array in its response.

**Chosen: A (client-side fetch)**

Rationale: the template definition is stable and cacheable. Embedding it in every entity response adds payload size and server complexity for a feature that is optional (only entities with `templateId` need it). A composable `useFetch` call with `immediate: false` (skipped when no `templateId`) keeps the concern separate. The template endpoint is already public within the campaign.

### Decision 2: Component granularity

A single `<TemplateFieldsDisplay>` component receives:

- `campaignId: string`
- `templateId: string | null | undefined`
- `fieldValues: Record<string, unknown>`

It internally fetches the template, then loops over fields to render them. Field-type rendering logic is self-contained inside the component (no separate sub-component per type — the type set is small and the rendering is simple).

### Decision 3: entity_reference rendering

`entity_reference` fields store the referenced entity's slug as the value. The component renders it as a `<NuxtLink>` to `/campaigns/{campaignId}/entities/{slug}`. If the slug does not resolve, we show the raw value as plain text rather than a broken link.

### Decision 4: section fields

`section` fields have no value — they are purely structural dividers with a label. The component renders them as a `<h3>` or `<strong>` heading with a separator, breaking the properties grid into labeled groups.

### Decision 5: Character API — expose top-level `fields`

The character GET endpoint already returns `...entity` (which includes `templateId`) but surfaces frontmatter fields only under `frontmatter.fields`. To match the entity endpoint convention and simplify the component, the character endpoint is updated to also return a top-level `fields: file.frontmatter.fields || {}` property.

## Risks / Trade-offs

- **Extra HTTP request per page load**: The component makes one additional fetch when `templateId` is set. This is a minor cost for a detail page. Mitigation: use Nuxt's `useFetch` so the request is server-side rendered on first load (SSR) if applicable.
- **Template deleted after entity created**: If a template is deleted, `templateId` still points to a non-existent template. The component handles a 404 from the template endpoint by silently hiding the panel. This is acceptable behavior.
- **Field values out of sync with template**: Template fields can be added/removed over time; stored `fields` may have stale keys. The component renders only keys that exist in the current template definition, ignoring orphaned values. Missing values show as empty.

## Migration Plan

No DB migrations needed. No breaking API changes. The change is purely additive:

1. Add `fields` to character GET response (backward-compatible addition).
2. Create `TemplateFieldsDisplay.vue` component.
3. Add the component to each of the four detail pages.

Rollback: remove component usage from pages; no data is affected.

## Open Questions

- Should the template fields panel be hidden entirely when no fields have values (i.e., all values are empty)? Proposed default: hide the panel when `templateId` is null/undefined; show it (even if values are empty) when `templateId` is set, so users know fields exist to fill in.
