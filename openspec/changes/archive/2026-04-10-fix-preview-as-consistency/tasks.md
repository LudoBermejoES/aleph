## 1. Server — Add secret stripping to arc and quest GET endpoints

- [x] 1.1 In `server/api/campaigns/[id]/arcs/index.get.ts`, import `stripSecretBlocks` and strip `description` on each arc before returning; support `preview_as` for DM/Co-DM
- [x] 1.2 In `server/api/campaigns/[id]/quests/index.get.ts`, import `stripSecretBlocks` and strip `description` on each quest before returning; support `preview_as`
- [x] 1.3 In `server/api/campaigns/[id]/quests/[slug]/index.get.ts`, import `stripSecretBlocks` and strip the `description` field; support `preview_as`

## 2. Server — Sessions render endpoint

- [x] 2.1 Create `server/api/campaigns/[id]/sessions/[slug]/render.get.ts` that reads the session log file, strips secret blocks for the effective role, and returns `{ content, previewMode, effectiveRole }` — mirror the entity render endpoint structure

## 3. Frontend — Replace plain text viewers with MDC

- [x] 3.1 In `app/pages/campaigns/[id]/arcs/[slug]/index.vue`, replace `{{ arc.description }}` plain text with `<MDC :value="arc.description">` and replace the arc description `<textarea>` with `<MarkdownEditor>`
- [x] 3.2 In `app/pages/campaigns/[id]/arcs/[slug]/index.vue`, replace `{{ chapter.description }}` plain text with `<MDC :value="chapter.description">` and replace the chapter `<textarea>` with `<MarkdownEditor>`
- [x] 3.3 In `app/pages/campaigns/[id]/quests/[slug]/index.vue`, replace `{{ quest.description }}` plain text with `<MDC :value="quest.description">`
- [x] 3.4 In `app/pages/campaigns/[id]/locations/[slug]/index.vue`, replace the `v-html` + `renderedContent` computed with `<MDC :value="location.content">`; remove the `renderedContent` computed property
- [x] 3.5 In `app/pages/campaigns/[id]/organizations/[slug]/index.vue`, replace `{{ org.description }}` plain text with `<MDC :value="org.description">`
- [x] 3.6 In `app/components/forms/ItemForm.vue`, replace the description `<textarea>` with `<MarkdownEditor>` and ensure the item display view uses `<MDC>` if it exists

## 4. Frontend — Wire PreviewRoleSwitcher with route watchers

- [x] 4.1 In `app/pages/campaigns/[id]/arcs/[slug]/index.vue`, add `watch(route.query.preview_as, () => load())` so switching the combobox reloads arc content; ensure `load()` forwards `preview_as` to the API call
- [x] 4.2 In `app/pages/campaigns/[id]/quests/[slug]/index.vue`, add `watch(route.query.preview_as, () => load())` and forward `preview_as` in the API call
- [x] 4.3 In `app/pages/campaigns/[id]/locations/[slug]/index.vue`, add `watch(route.query.preview_as, () => load())` (location GET already strips server-side)

## 5. Frontend — Quest form already uses MarkdownEditor; verify display is consistent

- [x] 5.1 Confirm `app/components/forms/QuestForm.vue` MarkdownEditor is wired correctly (no change needed if already correct — just verify)

## 6. Tests — E2E tests for preview_as reactivity on each page

- [x] 6.1 Add E2E test in `tests/e2e/` for arcs: DM switches combobox to player → secret block disappears without page reload
- [x] 6.2 Add E2E test for quests: same pattern
- [x] 6.3 Add E2E test for locations: same pattern
- [x] 6.4 Add E2E test for sessions: DM calls render endpoint → `preview_as=player` returns stripped content

## 7. Tests — Integration tests for new/updated server endpoints

- [x] 7.1 Add integration test: `GET /api/campaigns/:id/arcs` with player role strips secret blocks from descriptions
- [x] 7.2 Add integration test: `GET /api/campaigns/:id/quests/:slug` with player role strips secret blocks
- [x] 7.3 Add integration test: `GET /api/campaigns/:id/sessions/:slug/render?preview_as=player` returns stripped content
