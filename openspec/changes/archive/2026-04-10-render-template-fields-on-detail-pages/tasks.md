## 1. Server API — Character endpoint

- [x] 1.1 Add `fields: file.frontmatter.fields || {}` to the return value of `server/api/campaigns/[id]/characters/[slug]/index.get.ts`
- [x] 1.2 Write integration test: `GET /api/campaigns/{id}/characters/{slug}` returns top-level `fields` object when frontmatter has fields
- [x] 1.3 Write integration test: `GET /api/campaigns/{id}/characters/{slug}` returns `fields: {}` when no frontmatter fields exist

## 2. TemplateFieldsDisplay component

- [x] 2.1 Create `app/components/TemplateFieldsDisplay.vue` with props: `campaignId: string`, `templateId: string | null | undefined`, `fieldValues: Record<string, unknown>`
- [x] 2.2 Implement `useFetch` inside the component to load the template from `GET /api/campaigns/{campaignId}/templates/{templateId}` — skip when `templateId` is falsy
- [x] 2.3 Render `section` fields as a heading divider (no value column)
- [x] 2.4 Render `checkbox` fields as "Yes" / "No"
- [x] 2.5 Render `select` fields by displaying the stored option value (option labels are the values stored, so display as-is)
- [x] 2.6 Render `entity_reference` fields as a NuxtLink to `/campaigns/{campaignId}/entities/{slug}`
- [x] 2.7 Render `text`, `textarea`, `number`, `date` fields as plain text values
- [x] 2.8 Return nothing (render nothing) when `templateId` is null/undefined
- [x] 2.9 Handle template 404 gracefully — hide the panel silently
- [x] 2.10 Show each non-section field as a label + value row; show empty string for missing values
- [x] 2.11 Write unit tests for the component covering: each field type, null templateId, 404 template response, missing values

## 3. Character detail page

- [x] 3.1 In `app/pages/campaigns/[id]/characters/[slug]/index.vue`, read `character.templateId` and `character.fields` from the API response
- [x] 3.2 Add `<TemplateFieldsDisplay :campaign-id="campaignId" :template-id="character.templateId" :field-values="character.fields || {}" />` in the character detail layout, below the header section
- [x] 3.3 Write E2E test: character with a template and stored field values shows the "Properties" panel with correct values on the detail page

## 4. Entity detail page

- [x] 4.1 In `app/pages/campaigns/[id]/entities/[slug]/index.vue`, confirm `entity.templateId` and `entity.fields` are available (entity GET already returns both)
- [x] 4.2 Add `<TemplateFieldsDisplay :campaign-id="campaignId" :template-id="entity.templateId" :field-values="entity.fields || {}" />` in the entity detail layout, below the header section
- [x] 4.3 Write E2E test: entity with a template and stored field values shows the "Properties" panel on the detail page

## 5. Location detail page

- [x] 5.1 Check whether the location GET API response includes `templateId` and `fields` — add them if missing
- [x] 5.2 In `app/pages/campaigns/[id]/locations/[slug]/index.vue`, add `<TemplateFieldsDisplay>` with `templateId` and `fieldValues` from the location response
- [x] 5.3 Write E2E test: location with a template shows the "Properties" panel on the detail page

## 6. Organization detail page

- [x] 6.1 Check whether the organization GET API response includes `templateId` and `fields` — add them if missing
- [x] 6.2 In `app/pages/campaigns/[id]/organizations/[slug]/index.vue`, add `<TemplateFieldsDisplay>` with `templateId` and `fieldValues` from the organization response
- [x] 6.3 Write E2E test: organization with a template shows the "Properties" panel on the detail page
