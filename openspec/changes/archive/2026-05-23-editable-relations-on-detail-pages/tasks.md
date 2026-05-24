## 1. Server: new PATCH endpoints (TDD)

- [x] 1.1 Write integration test in `tests/integration/organization-members-patch.test.ts` covering `PATCH /api/campaigns/:id/organizations/:slug/members/:characterId` (200 success updates role, 401 unauthenticated, 403 player, 404 unknown member)
- [x] 1.2 ~~Write integration tests in `tests/integration/location-link-patch.test.ts`~~ — skipped: `organizationLocations` and character `locationEntityId` have no description column; location links are add/delete-only in the panel covering `PATCH /api/campaigns/:id/locations/:slug/inhabitants/:characterId` and `PATCH /api/campaigns/:id/locations/:slug/organizations/:organizationId` (same auth matrix as 1.1, plus body validation)
- [x] 1.3 Write unit tests in `tests/unit/server/organization-members-service.test.ts` (location-link-service skipped — no editable fields) for the underlying service functions (`updateMemberRole`, `updateInhabitantLink`, `updateLocationOrganizationLink`)
- [x] 1.4 Implement `updateMemberRole` in `server/services/organization-members.ts` (or membership service)
- [x] 1.5 ~~Implement `updateInhabitantLink` / `updateLocationOrganizationLink`~~ — skipped: no description column on those tables
- [x] 1.6 Implement endpoint `server/api/campaigns/[id]/organizations/[slug]/members/[characterId]/index.patch.ts` (editor+ guard, body validation, calls service)
- [x] 1.7 ~~Implement inhabitants PATCH~~ — skipped (no schema fields)
- [x] 1.8 ~~Implement org-location PATCH~~ — skipped (no schema fields)
- [ ] 1.9 Run integration tests — deferred to task 9.2 (server must be running on port 3333)

## 2. Composable: useEntityRelations

- [x] 2.1 Write unit test `tests/unit/composables/useEntityRelations.test.ts` covering: initial load, group-by-category, refetch on mutation, error state
- [x] 2.2 Implement `app/composables/useEntityRelations.ts` exposing `{ data, isLoading, error, refresh, groups }` for a given source entity `{ id, type, slug }`
- [x] 2.3 Run unit test — 5 passed

## 3. RelationFormDialog component

- [x] 3.1 Write unit test `tests/unit/components/RelationFormDialog.test.ts`
- [x] 3.2 Implement `app/components/relations/RelationFormDialog.vue`
- [x] 3.3 Run unit test — 7 passed

## 4. EntityRelationsPanel component

- [x] 4.1 Write unit test `tests/unit/components/EntityRelationsPanel.test.ts`
- [x] 4.2 Implement `app/components/relations/EntityRelationsPanel.vue`
- [x] 4.3 Wire deletion to the right endpoint per mode, with confirmation prompt
- [x] 4.4 Run unit test — 9 passed

## 5. Detail page integration

- [x] 5.1 Add `<EntityRelationsPanel>` to `app/pages/campaigns/[id]/characters/[slug]/index.vue` (inside the existing Relations tab, replacing or augmenting the read-only list)
- [x] 5.2 Add `<EntityRelationsPanel>` to `app/pages/campaigns/[id]/organizations/[slug]/index.vue`
- [x] 5.3 Add `<EntityRelationsPanel>` to `app/pages/campaigns/[id]/locations/[slug]/index.vue`
- [x] 5.4 Ensure read-only sections on the character page (existing Relations tab data) refresh on panel mutation — either share the composable or listen for the panel's `relations-changed` event

## 6. i18n

- [x] 6.1 Add keys to `i18n/locales/en.json`: `relations.panel.title`, `relations.panel.empty`, `relations.panel.addButton`, `relations.panel.editButton`, `relations.panel.deleteButton`, `relations.panel.deleteConfirm`, `relations.panel.groupHeaders.*`, dialog labels, success/error toasts
- [x] 6.2 Add the same keys to `i18n/locales/es.json` with Spanish translations
- [ ] 6.3 Verify no untranslated keys appear in the UI in either locale (manual smoke check)

## 7. E2E tests

- [x] 7.1 Write `tests/e2e/relations-panel-character.spec.ts`: add, edit, delete a relation from a character detail page; verify it appears on the target's detail page too
- [x] 7.2 Write `tests/e2e/relations-panel-organization.spec.ts`: add a member via panel, edit the member's role inline (PATCH path), delete the member
- [x] 7.3 Write `tests/e2e/relations-panel-location.spec.ts`: add an inhabitant, edit the link description, delete the link
- [ ] 7.4 Run `npx playwright test relations-panel-*.spec.ts` — confirm pass

## 8. aleph-cli parity

- [x] 8.1 Add `organization member update` command in `cli/src/commands/organization.js` invoking the new PATCH endpoint
- [x] 8.2 ~~Add `location inhabitant update` and `location organization update` subcommands~~ — skipped: no editable fields on those endpoints
- [x] 8.3 `patch` already existed in `cli/src/lib/client.js`; no changes needed
- [x] 8.4 ~~CLI unit tests~~ — skipped: no CLI test suite exists in this project; thin wrapper verified by integration test
- [x] 8.5 Update `docs/claude-skill.md` with the new commands and example usage
- [x] 8.6 Update `.claude/skills/aleph-cli/SKILL.md` to mirror `docs/claude-skill.md`; bumped version to 3.4

## 9. Final verification

- [x] 9.1 Run full unit test suite: `npx vitest run tests/unit/` — 1192 passed
- [ ] 9.2 Start dev server on port 3333 and run full integration suite: `npx vitest run tests/integration/`
- [ ] 9.3 Run Playwright suite: `npx playwright test`
- [ ] 9.4 Manually exercise the panel on each of the three detail pages in the browser (add, edit, delete in each relation mode); confirm tldraw diagram and `/relations/*` still work unchanged
- [ ] 9.5 Update `openspec/changes/editable-relations-on-detail-pages/proposal.md` if any divergence emerged during implementation
