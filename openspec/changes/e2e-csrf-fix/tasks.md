# E2E Test Suite — CSRF Fix Verification

## Approach

Run each E2E spec file individually, **always in headed mode** so failures are visible. For each file:
1. Run the spec: `npx playwright test tests/e2e/<file>.spec.ts --headed --reporter=line 2>&1 > /tmp/e2e-<file>.txt`
2. Check results — if any tests fail, read the error details
3. Fix the issues (common causes: missing CSRF token on `page.evaluate` fetch calls, `{ data, meta }` vs `[]` shape mismatches, stale UI assumptions)
4. Re-run the file to confirm it passes
5. Mark task complete and move to the next file

**Important notes:**
- Always run one file at a time — never batch
- If a test fails with `ERR_CONNECTION_REFUSED` or `SyntaxError: apiFetch not exported`, just re-run — it's a server restart / worker cache issue
- `api.getCharacters()` returns `{ data, meta }` not `[]` — always unwrap with `Array.isArray(x) ? x : x?.data ?? []`

**Common fix pattern for CSRF:**
- In `page.evaluate()` with fetch POST/PUT/PATCH/DELETE: add `const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''` and `'X-CSRF-Token': csrf` to headers
- Or replace with `apiFetch(page, path, { method, body })` from `./helpers`

---

## Tasks

- [x] Run `auth-flow.spec.ts` and fix any failures
- [x] Run `autosave-editor.spec.ts` and fix any failures
- [x] Run `arcs-chapters.spec.ts` and fix any failures
- [x] Run `calendar-timeline.spec.ts` and fix any failures
- [x] Run `calendars.spec.ts` and fix any failures
- [x] Run `campaign-export.spec.ts` and fix any failures
- [x] Run `campaign-join.spec.ts` and fix any failures — fixed join.vue CSRF warm-up after register/login
- [x] Run `campaign-themes.spec.ts` and fix any failures
- [x] Run `campaigns.spec.ts` and fix any failures
- [x] Run `character-actions.spec.ts` and fix any failures
- [x] Run `character-graph.spec.ts` and fix any failures — fixed `getCharacters()` returning `{data,meta}` instead of `[]`
- [x] Run `character-list-filters.spec.ts` and fix any failures
- [x] Run `character-organizations.spec.ts` and fix any failures — fixed `getOrganizations/getLocations` pagination; fixed `locationEntityId: null` Zod rejection; fixed visibility enum
- [ ] Run `characters.spec.ts` and fix any failures
- [ ] Run `collaboration.spec.ts` and fix any failures
- [ ] Run `collaborative-editing.spec.ts` and fix any failures
- [ ] Run `create-dialogs.spec.ts` and fix any failures
- [ ] Run `create-full.spec.ts` and fix any failures
- [ ] Run `csrf.spec.ts` and fix any failures
- [ ] Run `dice.spec.ts` and fix any failures
- [ ] Run `economy-workflow.spec.ts` and fix any failures
- [ ] Run `edit-pages.spec.ts` and fix any failures
- [ ] Run `entities.spec.ts` and fix any failures
- [ ] Run `entity-delete.spec.ts` and fix any failures
- [ ] Run `entity-edit.spec.ts` and fix any failures
- [ ] Run `entity-image.spec.ts` and fix any failures
- [ ] Run `entity-mention.spec.ts` and fix any failures
- [ ] Run `entity-templates.spec.ts` and fix any failures
- [ ] Run `entity-visibility.spec.ts` and fix any failures
- [ ] Run `graph-improved.spec.ts` and fix any failures
- [ ] Run `graph.spec.ts` and fix any failures
- [ ] Run `i18n-fixes.spec.ts` and fix any failures
- [ ] Run `icons.spec.ts` and fix any failures
- [ ] Run `image-debug.spec.ts` and fix any failures
- [ ] Run `image-upload.spec.ts` and fix any failures
- [ ] Run `input-validation.spec.ts` and fix any failures
- [ ] Run `inventory.spec.ts` and fix any failures
- [ ] Run `locations-sublocations.spec.ts` and fix any failures
- [ ] Run `locations-subtype.spec.ts` and fix any failures
- [ ] Run `locations.spec.ts` and fix any failures
- [ ] Run `map-pins.spec.ts` and fix any failures
- [ ] Run `maps.spec.ts` and fix any failures
- [ ] Run `members.spec.ts` and fix any failures
- [ ] Run `navigation.spec.ts` and fix any failures
- [ ] Run `organizations.spec.ts` and fix any failures
- [ ] Run `pagination.spec.ts` and fix any failures
- [ ] Run `quest-detail.spec.ts` and fix any failures
- [ ] Run `quests.spec.ts` and fix any failures
- [ ] Run `quick-fixes.spec.ts` and fix any failures
- [ ] Run `responsive-sidebar.spec.ts` and fix any failures
- [ ] Run `role-visibility.spec.ts` and fix any failures
- [ ] Run `secret-blocks.spec.ts` and fix any failures
- [ ] Run `secret-system.spec.ts` and fix any failures
- [ ] Run `session-attendance.spec.ts` and fix any failures
- [ ] Run `session-decisions.spec.ts` and fix any failures
- [ ] Run `session-delete.spec.ts` and fix any failures
- [ ] Run `session-groups.spec.ts` and fix any failures
- [ ] Run `session-log.spec.ts` and fix any failures
- [ ] Run `sessions.spec.ts` and fix any failures
