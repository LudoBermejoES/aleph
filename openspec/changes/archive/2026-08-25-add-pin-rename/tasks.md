## 1. Server: widen the PATCH endpoint to accept a label

- [x] 1.1 `server/utils/mapGeo.ts`: add `pinUpdateSchema` — `lat`/`lng` optional but only together,
      `label` optional (string, nullable) and independent, at least one of the two groups required.
      Leave `pinCoordinatesSchema` untouched (still used by `POST`).
- [x] 1.2 `server/api/campaigns/[id]/maps/[slug]/pins/[pinId]/index.patch.ts`: validate with
      `pinUpdateSchema` instead of `pinCoordinatesSchema`. Only update `lat`/`lng` in the `SET` when
      both are present; only update `label` when present in the body. Normalize `label`: trim, empty
      string after trim becomes `null` (design D4). Keep the existing OSM range check, gated on
      `lat`/`lng` actually being present this time (a label-only PATCH must not require coordinates).
      Return via `getPinWithEntity`, unchanged.
- [x] 1.3 `tests/integration/maps-pin-move.test.ts`: rewrite `'a body with label/color/entityId does
not apply those fields'` — it is no longer true for `label`. New coverage: label is applied
      when sent with coordinates; a label-only body (no lat/lng) succeeds and leaves coordinates
      unchanged; `color`/`entityId` are still ignored; an empty-body PATCH is rejected (422); clearing
      via an empty string stores `null`, not `''`; role-below-editor is rejected for a label-only body
      too. **Not run on this machine** (known dev-server environment fault, see 6.4) — verified by
      inspection against the endpoint's actual behaviour and the same fixtures/helpers the file
      already used.

## 2. The 16 existing pins: backfill, not silence

- [x] 2.1 `server/db/backfills/pin-label-entity-match.ts`: nulls `mapPins.label` wherever it equals
      (trimmed, case-insensitive) its linked entity's CURRENT `name`. Idempotent — a second run finds
      nothing left to change. Leaves alone: pins with no linked entity, and pins whose label differs
      from the entity's current name (design D3 — ambiguous, not guessed away).
- [x] 2.2 Wire it into `server/plugins/migrations.ts` alongside the other backfills, same
      try/catch-and-log pattern.
- [x] 2.3 Unit test with an in-memory DB (pattern: `tests/unit/db/quest-entities-backfill.test.ts`):
      a pin whose label matches its entity's name is nulled; a pin whose label differs is untouched; a
      pin with no entity is untouched; running it twice changes nothing the second time. 7 tests,
      `tests/unit/db/pin-label-entity-match-backfill.test.ts`, all green.

## 3. Stop copying the entity name into a new pin's label

- [x] 3.1 `app/pages/campaigns/[id]/maps/[slug]/index.vue`, `onPinDrop`: stop deriving `label` from
      the dragged entity's name. A dropped pin now omits `label` from the POST body entirely.
- [x] 3.2 `cli/src/commands/map.js`, `pin-add`: `--label` becomes optional (`.option`, not
      `.requiredOption`), body only includes `label` when given.
- [x] 3.3 `tests/unit/cli/map-pins.test.ts`: update/extend the `pin-add` coverage for the now-optional
      `--label` (a call without it must not send `label: undefined` as a literal key colliding with
      zod's optional handling — confirm the body omits the key entirely).

## 4. Rename endpoint's CLI command

- [x] 4.1 `cli/src/commands/map.js`: new `pin-rename` command — `--campaign`, `--slug`, `--pin`,
      required `--label <label>` (pass `""` to clear), `--json`. PATCHes `{ label: opts.label }`
      against the same `pins/:pinId` route `pin-move` already uses.
- [x] 4.2 `tests/unit/cli/map-pins.test.ts`: coverage mirroring the existing `pin-move` block — the
      command is declared with the right options, the action calls `patch` with only `{ label }`, and
      the `map.js` <-> endpoint body-key parity guard covers `label` too, read directly off
      `pinUpdateSchema` in `mapGeo.ts` (the PATCH route file itself declares no inline schema, unlike
      the POST endpoint's `.extend()` chain).
- [x] 4.3 `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md`, same pass, version bumped in
      both (1.13 -> 1.14, 3.23 -> 3.24) — documented rot in this repo when they drift apart.

## 5. Rename affordance in the UI

- [x] 5.1 `app/composables/useMapApi.ts`: `renameMapPin(slug, pinId, label: string | null)` — PATCH
      `{ label }` against the existing pins/:pinId route, returns `MapPin` like `moveMapPin` does.
- [x] 5.2 `app/components/MapViewer.client.vue`: expose `armPinsRenderSuppression()` alongside
      `focusPin` (design D5) — sets the same internal flag the drag handler already sets on itself.
- [x] 5.3 `app/pages/campaigns/[id]/maps/[slug]/index.vue`: an edit button in the pins list, next to
      the existing delete button, `isEditorPlus`-gated like it. Click: `prompt()` pre-filled with the
      pin's current custom `label` (not the derived display name — editing the derived entity name
      makes no sense, only the override); trim; call `armPinsRenderSuppression()` immediately before
      mutating `mapData.value.pins[i]` with the PATCH response (same ordering constraint as
      `onPinMove`); alert on failure, matching `deletePin`'s existing pattern.
- [x] 5.4 i18n: add `maps.editPinLabel`, `maps.renamePinPrompt`, `maps.pinRenameFailed` to both
      `i18n/locales/en.json` and `i18n/locales/es.json`. `tests/unit/i18n/locale-keys.test.ts` (parity
      guard) green.
- [x] 5.5 **Corrected during implementation, not just confirmed**: `design.md` D1, as first drafted,
      wrongly claimed the "custom label wins over entity name" priority had ALREADY landed in the
      pre-existing working tree. It had not — the code on disk was `entityName || label || fallback`
      (entity wins), which is exactly the bug this whole proposal exists to fix (a rename would look
      like a no-op). `pinDisplayName` in `app/utils/mapPinMarker.ts` is flipped to
      `label || entityName || fallback` as PART of this change, `design.md`'s Context and D1 are
      corrected to say so honestly, and `tests/unit/mapPinMarker.test.ts` is rewritten (not merely
      inspected) to match: "prefers the custom label" instead of "prefers the live entity name", plus
      new coverage for the now-normal case of a null label falling back to the entity name.

## 6. Verification

- [x] 6.1 `npm run test:unit` green. Baseline: 146 files / 1832 tests. After: **147 files / 1848
      tests** (+1 file, +16 tests: 7 backfill, 6 CLI, 3 mapPinMarker).
- [x] 6.2 `npx prettier --check .` — found 5 files needing formatting (all touched by this change:
      `cli/src/commands/map.js`, this `tasks.md`, and three test files), fixed with `prettier --write`
      on exactly those files, re-verified clean, exit code read directly (not through a pipe).
- [x] 6.3 `npx eslint . --ext .ts,.vue,.tsx` clean, exit code read directly.
- [x] 6.4 Did NOT run `npm run test:integration` on this machine (known dev-server environment fault —
      port never binds, `curl` -> 000). The rewritten/new integration coverage in
      `tests/integration/maps-pin-move.test.ts` is left for CI, which is where this suite has always
      run.
- [x] 6.5 `openspec validate add-pin-rename --strict` passes.
- [x] 6.6 Not committed, not pushed. Reported.
