## 1. Extract useSecretReveals composable

- [x] 1.1 Create `app/composables/useSecretReveals.ts` that accepts `(contentRef: Ref<HTMLElement|null>, campaignId: string, entitySlug: string, isDm: Ref<boolean>)` and encapsulates: fetch revealed IDs, watch content changes, inject reveal/unreveal buttons, toggle via API
- [x] 1.2 Refactor `app/pages/campaigns/[id]/entities/[slug]/index.vue` to use `useSecretReveals` instead of inline logic (lines ~250-290)
- [x] 1.3 Verify entity page still works identically after refactor

## 2. Add secret UI to character detail page

- [x] 2.1 In `app/pages/campaigns/[id]/characters/[slug]/index.vue`: detect DM/Co-DM role from campaign data
- [x] 2.2 Add `EntityPreviewRoleSwitcher` component (visible only to DM/Co-DM)
- [x] 2.3 Add `EntitySecretNotes` component at bottom (visible only to DM/Co-DM)
- [x] 2.4 Wire `useSecretReveals` composable to the content ref
- [x] 2.5 Pass entity slug (same as character slug) to all secret components

## 3. Add secret UI to location detail page

- [x] 3.1 In `app/pages/campaigns/[id]/locations/[slug]/index.vue`: detect DM/Co-DM role
- [x] 3.2 Add `EntityPreviewRoleSwitcher` and `EntitySecretNotes` components
- [x] 3.3 Wire `useSecretReveals` composable (location slug = entity slug)

## 4. Add secret UI to session detail page

- [x] 4.1 In `app/pages/campaigns/[id]/sessions/[slug]/index.vue`: detect DM/Co-DM role
- [x] 4.2 Add `EntityPreviewRoleSwitcher` and `EntitySecretNotes` components
- [x] 4.3 Wire `useSecretReveals` composable (session slug = entity slug)

## 5. Add secret UI to quest detail page

- [x] 5.1 In `app/pages/campaigns/[id]/quests/[slug]/index.vue`: detect DM/Co-DM role
- [x] 5.2 Add `EntityPreviewRoleSwitcher` and `EntitySecretNotes` components
- [x] 5.3 Wire `useSecretReveals` composable (quest slug = entity slug)

## 6. Add secret UI to arc detail page

- [x] 6.1 In `app/pages/campaigns/[id]/arcs/[slug]/index.vue`: detect DM/Co-DM role
- [x] 6.2 Add `EntityPreviewRoleSwitcher` and `EntitySecretNotes` components
- [x] 6.3 Wire `useSecretReveals` composable (arc slug = entity slug)

## 7. Tests

- [x] 7.1 Unit test: useSecretReveals composable injects buttons into content with data-secret-id attributes
- [x] 7.2 E2E test: DM sees SecretNotes on character page, player does not
- [x] 7.3 Verify all existing unit and integration tests still pass
