## Why

A 2026-09-01 triage of already-archived specs (`editable-relations-on-detail-pages`,
`api-keys`) found two open task items that are not paperwork — they are live defects, each
already fully described by a requirement this project already ships:

1. **`api-key-settings-ui`, "Revoke an API key"**: the button exists, the endpoint exists and is
   tested, but clicking "Revoke" in the real UI throws immediately and revokes nothing.
   `app/pages/settings/index.vue` called `useI18n()` inside the async `handleRevoke` handler
   instead of at the top of `<script setup>`. `useI18n()` (from `vue-i18n`) requires an active
   component instance and throws a "must be called at the top of a setup function" error
   otherwise — true here because that call is the first thing the handler does, before
   `confirm()` even runs. Measured in a real browser (2026-09-01, disposable Playwright spec):
   0 `confirm()` dialogs, 0 `DELETE` requests, the key still listed 4s later. A user who believes
   they revoked a leaked key has not.

2. **`entity-relations-panel`, "Delete relation from detail page"**: the delete-confirmation
   dialog opens, but the `role="alertdialog"` requested at
   `app/components/relations/EntityRelationsPanel.vue:190` never reaches the DOM.
   `app/components/ui/dialog/DialogContent.vue`'s only declared props come from reka-ui's
   `DialogContentProps`, which does not include `role`; it falls into `$attrs`, and the
   component's single template root is `<DialogPortal>` — a Teleport wrapper with no element of
   its own to receive a fallthrough attribute. The rendered dialog gets the reka-ui default
   `role="dialog"` instead. First-ever run of the three `relations-panel-*.spec.ts` files
   (2026-09-01) reproduced this independently: **4 failed / 9 passed**, all four failures the same
   assertion (`expect(page.locator('[role="alertdialog"]')).toBeVisible()`), each failing
   deterministically on both the initial attempt and the local retry.

Neither defect is a missing requirement — both scenarios ("Revoke with confirmation", "Editor
confirms deletion of an entity-relation") are already written down. This change fixes the
implementation to match the spec that already exists, and closes the real gap behind both: no
test rendered either path before today, which is exactly why a one-line regression on each
survived unnoticed (the API-keys one since 2026-03-27).

## What Changes

- `app/pages/settings/index.vue`: move `const { t } = useI18n()` to the top of `<script setup>`;
  `handleRevoke` calls `t(...)` instead of `useI18n().t(...)`.
- `app/components/ui/dialog/DialogContent.vue`: `defineOptions({ inheritAttrs: false })` and
  forward `$attrs` explicitly to the inner reka-ui `<DialogContent>`
  (`v-bind="{ ...forwarded, ...$attrs }"`) — the same pattern already used by
  `app/components/ui/sheet/SheetContent.vue`, so `role="alertdialog"` (and any other attribute a
  caller passes) actually lands on the rendered element.
- New unit test `tests/unit/components/settings-page.test.ts`: mounts the real settings page and
  exercises both "Revoke with confirmation" and "Revoke cancellation" from
  `api-key-settings-ui`'s existing spec, asserting on the observable outcome (was `DELETE` called?
  is the row gone?) rather than on "did an exception fire" — this fails for the right reason under
  the original bug AND under a hypothetical fix that skips the confirmation step.
- No change to the four `relations-panel-*.spec.ts` E2E files: they already assert the correct
  rule (`[role="alertdialog"]`); the fix makes the component honor it instead of loosening the
  assertion to `[role="dialog"]`, which the project has already logged multiple times as the
  "test that asserts the bug" anti-pattern.

## Impact

- **Affected files**: `app/pages/settings/index.vue`, `app/components/ui/dialog/DialogContent.vue`,
  new `tests/unit/components/settings-page.test.ts`.
- **No server/API/data-model change** — both endpoints (`DELETE /api/apikeys/:id`,
  `DELETE /api/campaigns/:id/relations/:relationId`) already work and are already tested from the
  server side. **No aleph-cli impact.**
- **No spec text changes needed for the rule itself** — both requirements
  (`api-key-settings-ui` § "Revoke an API key", `entity-relations-panel` § "Delete relation from
  detail page") already state the correct behavior; the deltas in this change only ADD the
  regression-shaped scenarios that were missing (page renders/mounts without throwing;
  `role="alertdialog"` is the element a reader/screen-reader actually receives), so the gap that
  let both bugs ship unnoticed cannot reopen silently.
- **`aleph/CLAUDE.md` correction**: its 2026-08-31 note recording "275 passed / 43 flaky / 0
  failed" for the full E2E suite is contradicted by today's measurement (4 deterministic failures
  in the same 4 tests, on code that has not changed since 2026-08-25) and by the fact that
  `DialogContent.vue` has been byte-identical — and therefore had this exact defect — since the
  project's very first commit (`bf402f5`). The "0 failed" figure is the wrong one; see `design.md`
  for the full reasoning. Corrected in the same commit as this change.
