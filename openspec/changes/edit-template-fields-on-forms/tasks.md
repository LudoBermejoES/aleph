## 1. Character API — accept templateId and fields

- [ ] 1.1 In `server/api/campaigns/[id]/characters/index.post.ts`, add `templateId: z.string().optional()` and `fields: z.record(z.string(), z.unknown()).optional()` to the Zod schema; write `templateId` to the entity insert and `fields` to `buildCharacterFrontmatter()`
- [ ] 1.2 In `server/services/characters.ts`, update `buildCharacterFrontmatter()` to accept a `fields` parameter and merge it into the frontmatter `fields` object
- [ ] 1.3 In `server/api/campaigns/[id]/characters/[slug]/index.put.ts`, add `templateId` and `fields` to the Zod schema; update the entity row's `templateId` and rewrite the frontmatter with merged fields
- [ ] 1.4 Write integration test: `POST /characters` with `templateId` and `fields` returns them in subsequent GET
- [ ] 1.5 Write integration test: `PUT /characters/{slug}` with `fields` updates stored values

## 2. Location API — accept templateId and fields

- [ ] 2.1 In `server/api/campaigns/[id]/locations/index.post.ts`, add `templateId: z.string().optional()` and `fields: z.record(z.string(), z.unknown()).optional()` to the Zod schema; write `templateId` to the entity insert and merge `fields` into frontmatter alongside `subtype`
- [ ] 2.2 In `server/api/campaigns/[id]/locations/[slug]/index.put.ts` (create if missing), add `templateId` and `fields` to the schema; rewrite frontmatter preserving `subtype`
- [ ] 2.3 Write integration test: `POST /locations` with `templateId` and `fields` returns them in subsequent GET
- [ ] 2.4 Write integration test: `PUT /locations/{slug}` with `fields` updates stored values and preserves `subtype`

## 3. TemplateFieldsForm component

- [ ] 3.1 Create `app/components/TemplateFieldsForm.vue` with props: `campaignId: string`, `templateId: string | null | undefined`, `modelValue: Record<string, unknown>`; emit `update:modelValue`
- [ ] 3.2 Fetch the template via `useCampaignApi().getTemplate()` when `templateId` changes; render nothing when `templateId` is null/undefined
- [ ] 3.3 Render `section` fields as a heading divider (no input)
- [ ] 3.4 Render `text` and `entity_reference` fields as `<input type="text">` (entity_reference gets a slug placeholder)
- [ ] 3.5 Render `textarea` fields as `<textarea>`
- [ ] 3.6 Render `number` fields as `<input type="number">`
- [ ] 3.7 Render `date` fields as `<input type="date">`
- [ ] 3.8 Render `select` fields as `<select>` with options parsed from `optionsJson`
- [ ] 3.9 Render `checkbox` fields as `<input type="checkbox">`
- [ ] 3.10 Pre-populate inputs from `modelValue` on mount and when `templateId` changes to an already-loaded template
- [ ] 3.11 Write unit tests for the component logic: each field type renders correct input, pre-population, null templateId, section skipped in emitted values

## 4. EntityForm — fix edit pre-population and use TemplateFieldsForm

- [ ] 4.1 In `app/components/forms/EntityForm.vue`, when `onTemplateChange()` loads the template during an edit, initialize `templateFieldValues` from `props.modelValue.templateFields` (existing stored values) instead of resetting to `{}`
- [ ] 4.2 Replace the inline template field rendering block (lines ~65–102) with `<TemplateFieldsForm>`, passing `templateId`, `campaignId`, and `v-model`
- [ ] 4.3 Ensure `onMounted` in the entity edit page passes `char.fields` (or `entity.fields`) as the initial `templateFields` in the form model so `EntityForm` receives them

## 5. CharacterForm — template selector and TemplateFieldsForm

- [ ] 5.1 In `app/components/forms/CharacterForm.vue`, load all campaign templates on mount and filter to those with `entityTypeSlug === 'character'`; add a template selector `<select>` to the form
- [ ] 5.2 Add `templateId` and `templateFields` to the `modelValue` prop type in `CharacterForm`
- [ ] 5.3 Add `<TemplateFieldsForm>` below the template selector, bound to `form.templateId` and `form.templateFields`
- [ ] 5.4 In `app/pages/campaigns/[id]/characters/new.vue`, add `templateId: ''` and `templateFields: {}` to the form ref; auto-select default template for `character` type on mount; pass `templateId` and `fields: templateFields` in the POST body
- [ ] 5.5 In `app/pages/campaigns/[id]/characters/[slug]/edit.vue`, load `char.templateId` and `char.fields` into the form ref on mount; pass `templateId` and `fields: templateFields` in the PUT body

## 6. Location create/edit — template selector and TemplateFieldsForm

- [ ] 6.1 In `app/pages/campaigns/[id]/locations/new.vue` (or the location form component), add a template selector filtered to `entityTypeSlug === 'location'`; auto-select default template on mount
- [ ] 6.2 Add `<TemplateFieldsForm>` for the selected template; include `templateId` and `fields` in the POST body
- [ ] 6.3 In `app/pages/campaigns/[id]/locations/[slug]/edit.vue`, load `location.templateId` and `location.fields` on mount; render `<TemplateFieldsForm>` pre-populated; include in PUT body

## 7. Organization create/edit — template selector and TemplateFieldsForm

- [ ] 7.1 In `app/pages/campaigns/[id]/organizations/new.vue` (or the org form component), add a template selector filtered to `entityTypeSlug === 'organization'`; auto-select default template on mount
- [ ] 7.2 Add `<TemplateFieldsForm>` for the selected template; include `templateId` and `fields` in the POST body
- [ ] 7.3 In `app/pages/campaigns/[id]/organizations/[slug]/edit.vue`, load `org.templateId` and `org.fields` on mount; render `<TemplateFieldsForm>` pre-populated; include in PUT body

## 8. E2E tests

- [ ] 8.1 E2E test: create a character with a template and field values; verify detail page shows Properties panel with correct values
- [ ] 8.2 E2E test: edit a character with existing template field values; verify values are pre-populated and can be updated
- [ ] 8.3 E2E test: create a location with a template and field values; verify detail page shows Properties panel
- [ ] 8.4 E2E test: create an organization with a template and field values; verify detail page shows Properties panel
- [ ] 8.5 E2E test: default template is auto-selected on the character create page when one exists

## 9. aleph-cli assessment

- [ ] 9.1 Confirm that existing `character create` and `character update` CLI commands still work after the API schema additions (new fields are optional — no breaking change); document in `docs/claude-skill.md` that `templateId` and `fields` can be passed via the API but are not exposed as CLI flags
