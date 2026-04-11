## 1. i18n — add missing confirmation message keys

- [x] 1.1 In `i18n/locales/en.json`, add `"confirmDeleteMessage": "Are you sure you want to delete this entity? This action cannot be undone."` to the `"entities"` section
- [x] 1.2 In `i18n/locales/en.json`, add `"confirmDeleteMessage": "Are you sure you want to delete this character? This action cannot be undone."` to the `"characters"` section
- [x] 1.3 In `i18n/locales/en.json`, add `"confirmDeleteMessage": "Are you sure you want to delete this map? This action cannot be undone."` to the `"maps"` section
- [x] 1.4 Mirror the same three keys in `i18n/locales/es.json` with Spanish translations

## 2. Entity (wiki) detail page — add delete button

- [x] 2.1 In `app/pages/campaigns/[id]/entities/[slug]/index.vue`, add a Delete button (`variant="destructive" size="sm"`) near the existing Edit button, gated with `v-if="isDm"`
- [x] 2.2 Add a `confirmDelete()` async function: `if (!confirm(t('entities.confirmDeleteMessage'))) return` → `await api.deleteEntity(slug)` → `router.push(`/campaigns/${campaignId}/entities`)`

## 3. Character detail page — add delete button

- [x] 3.1 In `app/pages/campaigns/[id]/characters/[slug]/index.vue`, add a Delete button gated with `v-if="isDm"` near the Edit button
- [x] 3.2 Add a `confirmDelete()` function: confirm → `await api.deleteCharacter(slug)` → redirect to `/campaigns/${campaignId}/characters`

## 4. Map detail page — add delete button

- [x] 4.1 In `app/pages/campaigns/[id]/maps/[slug]/index.vue`, add a Delete button gated with `v-if="isDm"` near the Edit button (or in the map toolbar)
- [x] 4.2 Add a `confirmDelete()` function: confirm → `await api.deleteMap(slug)` → redirect to `/campaigns/${campaignId}/maps`

## 5. Organization detail page — add delete button

- [x] 5.1 In `app/pages/campaigns/[id]/organizations/[slug]/index.vue`, add a Delete button gated with `v-if="isDm"` near the Edit button
- [x] 5.2 Add a `confirmDelete()` function: confirm → `await api.deleteOrganization(slug)` → redirect to `/campaigns/${campaignId}/organizations`

## 6. E2E tests

- [x] 6.1 E2E test: DM can delete an entity from the detail page; verify redirect to entity list and entity no longer accessible
- [x] 6.2 E2E test: DM can delete a character from the detail page; verify redirect and 404 on detail
- [x] 6.3 E2E test: DM can delete an organization from the detail page; verify redirect and 404 on detail
- [x] 6.4 E2E test: editor does not see delete button on entity detail page
