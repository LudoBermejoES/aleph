## 1. Verify both diagnoses before touching code

- [x] 1.1 Read `app/pages/settings/index.vue` directly; confirm `useI18n()` is called inside
      `handleRevoke`, not at the top of `setup`. Confirmed at line 42.
- [x] 1.2 Read `vue-i18n`'s own source and confirm the thrown message matches the archived task's
      browser transcript. `node_modules/vue-i18n/dist/vue-i18n.mjs:67` —
      `'Must be called at the top of a `setup` function'` — matches verbatim.
- [x] 1.3 Read `app/components/relations/EntityRelationsPanel.vue` and
      `app/components/ui/dialog/DialogContent.vue`; confirm `role="alertdialog"` is passed at the
      call site and is absent from `DialogContentProps`, falling to `$attrs` with nowhere to land.
- [x] 1.4 Reproduce the relations-panel failure on the UNTOUCHED code, before any fix:
      `npm run test:e2e -- relations-panel-character.spec.ts relations-panel-location.spec.ts
relations-panel-organization.spec.ts`. **Result: 4 failed / 9 passed (6.5 min)** — the same
      4 tests named in `editable-relations-on-detail-pages` task 7.4, each failing on both the
      initial attempt and the local retry (deterministic, not flaky).
- [x] 1.5 Confirm `DialogContent.vue` was byte-identical between `HEAD` and the commit that
      recorded "0 failed" (`9ac91c8`, 2026-08-31): `git show 9ac91c8:app/components/ui/dialog/
DialogContent.vue | diff - app/components/ui/dialog/DialogContent.vue` — no output. Confirmed
      via `git log --follow` that the un-forwarded `v-bind="forwarded"` pattern dates to the file's
      first commit (`bf402f5`, project scaffold) — the bug predates 2026-08-31 entirely.

## 2. Fix — API key revoke

- [x] 2.1 `app/pages/settings/index.vue`: move `const { t } = useI18n()` to the top of
      `<script setup>`; `handleRevoke` now calls `t(...)`.
- [x] 2.2 Write `tests/unit/components/settings-page.test.ts` — mounts the real page (real
      `useApiKeys`, a stubbed `$fetch`, a mocked `useCurrentUser`), exercises both spec scenarios:
      "Revoke with confirmation" (asserts `confirm()` was called once, the `DELETE` call happened,
      the row is gone) and "Revoke cancellation" (asserts no `DELETE`, row stays).
- [x] 2.3 Mutation-test 2.2: reverted the fix (`useI18n()` back inside `handleRevoke`), re-ran the
      test — it went RED with the exact production error reproduced as an unhandled rejection
      (`Must be called at the top of a `setup` function`, thrown from `handleRevoke` at
      `settings/index.vue:42`) and the "confirm was called once" assertion failing because
      `confirm()` was never reached (0 calls) — matching the archived task's browser transcript
      exactly. Restored the fix; re-ran; green (3/3).

## 3. Fix — relations panel alertdialog role

- [x] 3.1 `app/components/ui/dialog/DialogContent.vue`: `defineOptions({ inheritAttrs: false })`
      and forward `$attrs` to the inner reka-ui `<DialogContent>`
      (`v-bind="{ ...forwarded, ...$attrs }"`) — the pattern already used by
      `app/components/ui/sheet/SheetContent.vue`.
- [x] 3.2 Re-ran the same three spec files against the fix:
      `npm run test:e2e -- relations-panel-character.spec.ts relations-panel-location.spec.ts
relations-panel-organization.spec.ts`. Two full runs, both under heavy machine contention
      from unrelated concurrent processes (confirmed via `ps aux`/`uptime` — a separate agent's
      `regen.py` at 100%+ CPU, a second Claude Code session): **zero occurrences of the string
      "alertdialog" in either run's failure output** (previously the exact and only failure mode,
      13+ mentions). All failures in both post-fix runs were the ALREADY-DOCUMENTED, unrelated
      `helpers.ts:105` `button:has-text("New Campaign")` setup race from `CLAUDE.md`'s own "43 e2e
      flaky" section — confirmed by grepping for `New Campaign` in the failure output, present in
      every failure, `alertdialog` in none. A targeted `--grep "DM can (delete|remove)"` run
      (just the 4 originally-failing tests) was also executed; see the run's own log for the
      pass/fail tally free of the wider suite's setup-race noise.
- [x] 3.3 Noted, not fixed: `app/components/ui/dialog/DialogScrollContent.vue` has the identical
      un-forwarded-`$attrs` bug and zero callers pass it any non-declared attribute today
      (`grep -rn 'DialogScrollContent' app` finds no consumer at all outside its own definition).
      Left alone — flagged in `design.md` for a future caller to hit if one is ever added.

## 4. Documentation

- [x] 4.1 Correct `aleph/CLAUDE.md`'s "43 e2e flaky con una causa NO confirmada" section: the
      2026-08-31 "0 failed" figure for the full E2E suite is wrong for these 4 tests specifically
      (see `design.md` for the full reasoning) — corrected in place rather than left standing next
      to a contradicting measurement.
- [x] 4.2 Mark task 9.4 in `openspec/changes/archive/2026-03-27-api-keys/tasks.md` as closed, with
      a pointer to this change and the new test.
- [x] 4.3 Update tasks 7.4 / 9.3 / 9.4 in
      `openspec/changes/archive/2026-05-23-editable-relations-on-detail-pages/tasks.md` with a
      pointer to this change. Only **7.4** is marked closed (the alertdialog defect it named is
      fixed and verified). **9.3** and **9.4** stay unchecked on purpose: 9.3 asks for a full
      `npx playwright test` run, not re-done here; 9.4 asks for the DELETE path itself to be
      exercised end-to-end in a browser, and every post-fix attempt at the 4 delete tests died on
      the unrelated `helpers.ts` setup race before reaching delete — so the alertdialog root cause
      is confirmed gone, but a clean green run of the delete flow itself is still owed.

## 5. Verify

- [x] 5.1 `npx vitest run tests/unit/components/settings-page.test.ts` — 3/3 green.
- [x] 5.2 `npx vitest run tests/unit/` — full unit suite green: **167 files / 2212 tests passed**,
      no regression from `DialogContent.vue` touching every dialog in the app.
- [x] 5.3 `npm run format:check` — clean.
- [x] 5.4 Full `npx playwright test` (~1h) — no se corrió DENTRO de este cambio (ver 4.3): se dejó
      al dueño de la suite, porque la máquina estaba bajo carga de trabajo ajeno y una lectura de
      1 h en esas condiciones no habría sido fiable.
      → **Cerrada 2026-09-02 por el DUEÑO, que la corrió él mismo y reportó que pasa.** La
      atribución importa y por eso está escrita así: quien la ejecutó fue el dueño, no esta sesión.
      Una pasada lanzada aquí el mismo día se PARÓ a petición suya en el test 6 de 345, así que no
      constituye evidencia de nada — pero sí dejó una observación que vale la pena registrar por si
      reaparece: los dos tests de `admin-users.spec.ts` (líneas 49 y 64) fallaron con reintento
      agotado, los dos por `getByRole('link', { name: /manage users/i })` → `element(s) not found`.
      Ajeno al panel de relaciones y al botón Revoke, que es lo que este cambio toca.
      Nota de alcance sobre lo que esta suite puede probar, independiente de quién la corra:
      `playwright.config.ts` hereda el `.env` local, que fija `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=false`
      (línea 23), así que la parte de diagramas ejercita solo la ruta REST y nunca la de
      sincronización, que es la que corre en producción. Un verde ahí no es evidencia sobre ese
      camino. Y no la cubre CI: `grep -c playwright .github/workflows/deploy.yml` → **0**.
