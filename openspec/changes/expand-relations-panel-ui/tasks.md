## 1. Widen relation panel types

- [x] 1.1 Widen `EntityType` in `app/composables/useEntityRelations.ts` to include `'quest' | 'session' | 'arc'`
- [x] 1.2 Widen the `entityType` prop in `app/components/relations/EntityRelationsPanel.vue` to `EntityType`
- [x] 1.3 Add the missing `entities.types.arc` key to `i18n/locales/en.json` and `i18n/locales/es.json`

## 2. Wire the panel into the three pages

- [x] 2.1 Add `EntityRelationsPanel` to `app/pages/campaigns/[id]/quests/[slug]/index.vue`
- [x] 2.2 Add `EntityRelationsPanel` to `app/pages/campaigns/[id]/sessions/[slug]/index.vue`
- [x] 2.3 Add `EntityRelationsPanel` to `app/pages/campaigns/[id]/arcs/[slug]/index.vue`

## 3. Fix the null-payload validation bug

- [x] 3.1 Allow `relationTypeId`/`description` to be `null` in `POST /api/campaigns/:id/relations`
- [x] 3.2 Allow `description` to be `null` in `PUT /api/campaigns/:id/relations/:relationId`

## 4. Tests

- [x] 4.1 Add `tests/e2e/relations-panel-quest-session-arc.spec.ts` (empty state + add relation, one spec per entity type)
- [x] 4.2 Add integration regression tests in `tests/integration/relations.test.ts` for POST/PUT with explicit `null`
- [x] 4.3 Run full unit suite, relevant integration suites, and the new + existing relation E2E specs

## 5. Deploy

- [x] 5.1 Typecheck (`vue-tsc --noEmit`) clean
- [ ] 5.2 Commit, push to `master`, verify the GitHub Actions deploy succeeds
