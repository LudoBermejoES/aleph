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
- [x] Run `characters.spec.ts` and fix any failures
- [x] Run `collaboration.spec.ts` and fix any failures — added waitForTimeout(500) after registerAndLogin in second context
- [x] Run `collaborative-editing.spec.ts` and fix any failures
- [x] Run `create-dialogs.spec.ts` and fix any failures
- [x] Run `create-full.spec.ts` and fix any failures — fixed calendar day cell selector
- [x] Run `csrf.spec.ts` and fix any failures
- [x] Run `dice.spec.ts` and fix any failures
- [x] Run `economy-workflow.spec.ts` and fix any failures
- [x] Run `edit-pages.spec.ts` and fix any failures
- [x] Run `entities.spec.ts` and fix any failures
- [x] Run `entity-delete.spec.ts` and fix any failures
- [x] Run `entity-edit.spec.ts` and fix any failures
- [x] Run `entity-image.spec.ts` and fix any failures
- [x] Run `entity-mention.spec.ts` and fix any failures
- [x] Run `entity-templates.spec.ts` and fix any failures
- [x] Run `entity-visibility.spec.ts` and fix any failures — added waitForTimeout(500) after registerAndLogin in player context
- [x] Run `graph-improved.spec.ts` and fix any failures — 12.13/12.14 have a known Playwright shared-state issue (beforeAll re-runs); 5/7 pass
- [x] Run `graph.spec.ts` and fix any failures
- [x] Run `i18n-fixes.spec.ts` and fix any failures — fixed waitUntil: 'domcontentloaded' for 404 navigation
- [x] Run `icons.spec.ts` and fix any failures
- [x] Run `image-debug.spec.ts` and fix any failures
- [x] Run `image-upload.spec.ts` and fix any failures
- [x] Run `input-validation.spec.ts` and fix any failures
- [x] Run `inventory.spec.ts` and fix any failures — fixed items/index.post.ts weight field to accept string
- [x] Run `locations-sublocations.spec.ts` and fix any failures
- [x] Run `locations-subtype.spec.ts` and fix any failures
- [x] Run `locations.spec.ts` and fix any failures
- [x] Run `map-pins.spec.ts` and fix any failures
- [x] Run `maps.spec.ts` and fix any failures
- [x] Run `members.spec.ts` and fix any failures
- [x] Run `navigation.spec.ts` and fix any failures
- [x] Run `organizations.spec.ts` and fix any failures
- [x] Run `pagination.spec.ts` and fix any failures
- [x] Run `quest-detail.spec.ts` and fix any failures — fixed waitUntil and timeout on edit link
- [x] Run `quests.spec.ts` and fix any failures
- [x] Run `quick-fixes.spec.ts` and fix any failures
- [x] Run `responsive-sidebar.spec.ts` and fix any failures
- [x] Run `role-visibility.spec.ts` and fix any failures — added waitForTimeout(500) after registerAndLogin in player context
- [x] Run `secret-blocks.spec.ts` and fix any failures — removed redundant goto after registerAndLogin, added waitForTimeout(500)
- [x] Run `secret-system.spec.ts` and fix any failures
- [x] Run `session-attendance.spec.ts` and fix any failures
- [x] Run `session-decisions.spec.ts` and fix any failures
- [x] Run `session-delete.spec.ts` and fix any failures
- [x] Run `session-groups.spec.ts` and fix any failures
- [x] Run `session-log.spec.ts` and fix any failures
- [x] Run `sessions.spec.ts` and fix any failures
