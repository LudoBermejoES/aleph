## Context

Aleph is a Nuxt 4.4.6 SPA (Vue 3, Vite 7.3.x bundled by Nuxt) on Node v24.4.1, Git 2.39.5. Minor/patch updates are already applied and the unit suite (1249 tests) is green. The remaining work is seven major-version bumps with genuinely breaking changes. This design records the verified breaking-change surface for each (researched against official changelogs and cross-checked against actual codebase usage) and sequences them so the tree stays green.

Key codebase facts established during research:

- **tsconfig already sets `strict: true`** (root + all `.nuxt/tsconfig.*.json`), neutralizing TS 6's biggest gotcha (the strict-default flip).
- **12 custom tldraw shape utils** under `app/components/diagrams/react/shapes/` each override `indicator()` returning JSX.
- **`app/utils/aleph-asset-store.ts`** uses only `inlineBase64AssetStore` + a custom `upload()` — it does **not** call the v5-changed `getAssetInfo`/`notifyIfFileNotAllowed`/`assetValidator` signatures.
- **Hocuspocus server handler** (`server/plugins/hocuspocus.ts`) destructures `_context` (ignored) and never reads `context`/`transactionOrigin`, so the v4 `onStoreDocument` payload break does not touch it.
- **React integration** in `nuxt.config.ts` uses `@vitejs/plugin-react-swc@4.3.1` as primary (which already declares `vite: ^4||^5||^6||^7||^8`); `@vitejs/plugin-react@4.7.0` is a secondary devDep capped at Vite 7.
- **`@nuxt/eslint@1.15.2`** already declares `eslint: "^9.0.0 || ^10.0.0"`.

## Goals / Non-Goals

**Goals:**

- Apply every safely-applicable major bump, in risk order, with tests green at each wave boundary.
- Make the two mandatory tldraw v5 edits (useSync user prop; 12× `getIndicatorPath`) so selection indicators don't silently vanish.
- Document the two deferred majors (plugin-react 6, TypeScript 6) with the explicit precondition for revisiting.

**Non-Goals:**

- Migrating to Vite 8 / Rolldown (out of scope; it's the gate for plugin-react 6).
- Adopting TypeScript 6 now.
- Re-writing persisted tldraw snapshots (auto-migration handles this).
- Touching the CLI or skill docs (no API/auth/data-model change).

## Decisions

### 1. Four waves, verified independently, in this order

Order is chosen so the riskiest change (tldraw) lands last and alone, and so a failure in any wave is isolated:

1. **Wave 1 — ESLint 10 + lint-staged 17 + pm2 7.** Pure tooling; no runtime/app code. Bundled because they share zero surface with each other and each is low risk.
2. **Wave 2 — Hocuspocus 4.** Transport layer; backward-compatible wire protocol means it can't break a half-upgraded deploy. Code-light.
3. **Wave 3 — tldraw 5 (+ sync, sync-core).** The only wave with substantial code edits; isolated so its 13-file diff is reviewable on its own.
4. **Wave 4 — Deferred.** plugin-react 6 and TypeScript 6 are documented, not applied.

Each wave ends with: `npx vitest run tests/unit/`, server up on 3333 + `npx vitest run tests/integration/`, `npx playwright test`, `npx nuxi typecheck`. Output saved to `logs/`. Do not start wave N+1 until wave N is green.

### 2. tldraw v5: the two mandatory edits

**`useSync` user prop (1 file).** `app/components/diagrams/react/TldrawWrapper.tsx` passes `userInfo:` to `useSync`. v5 removed `userInfo` in favor of `users: TLUserStore`. Migrate to construct a `TLUserStore` (identity/presence) from the existing `userInfo` object; audit the `editor.user.updateUserPreferences()` call (preferences now flow through `TLUserPreferences`, split from identity).

**`indicator()` → `getIndicatorPath()` (12 files).** In v5 the indicator method no longer returns JSX; it returns `Path2D | TLIndicatorPath`. The old `indicator()` is kept as a type-checkable stub but **renders nothing**, so selection outlines disappear silently if not ported. Each of the 12 shapes must convert its JSX `<rect>`/`<path>` indicator into a `Path2D`. For the common `BaseBoxShapeUtil` rectangle case this is a small helper (`const p = new Path2D(); p.rect(0,0,w,h); return p`). `RelationshipArrowShape` (custom SVG path) needs its path geometry expressed as `Path2D`.

**Audits (no edit expected, but verify):** moved `<Tldraw>` props (`cameraOptions`/`textOptions`/`deepLinks`→`options`, `inferDarkMode`→`colorScheme`); removed theme constants (`getDefaultColorTheme`, `FONT_SIZES`, `TEXT_PROPS`, etc.) — grep the shape components; `aleph-asset-store.ts` asset signatures (already confirmed unaffected).

**No snapshot migration.** tldraw snapshots embed `store.schema.serialize()`; `loadSnapshot()` auto-runs the migration chain on load. Persisted v4 diagrams upgrade transparently. Take a DB backup before first load as a precaution; re-saving writes the v5 schema version (one-way).

### 3. Hocuspocus v4: bump-only

No required code change. Optional: remove the dead `encodeStateAsUpdateV2` reference (`server/plugins/hocuspocus.ts:127`, currently `undefined : undefined`) and rename `_context` params for clarity while in the file. Keep the v4 provider option `sessionAwareness` at its default (`false`) — only relevant during a mixed v3/v4 rollout. Verify Node ≥22 in CI/Docker/prod (we are on 24 locally; CI must match).

### 4. Wave 1 specifics

- **ESLint 10:** flat config already generated by `@nuxt/eslint`; eslintrc removal is a no-op for us. Run `npx eslint .` after bump and fix any new `eslint:recommended` findings (`no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`) — auto-fixable or quick.
- **lint-staged 17:** `--shell` removed (we don't use it); execa→nano-spawn spawn engine — verify a real commit still runs `prettier --write` + `eslint --fix`. Husky integration unchanged.
- **pm2 7:** no `ecosystem.config.cjs` format change. Operational: after `npm install`, run `pm2 update` on the server so the daemon matches the new CLI.

### 5. Wave 4: explicit deferral with preconditions

- **`@vitejs/plugin-react` 6** requires **Vite 8**; Nuxt 4.4.6 bundles Vite 7.3.x. Revisit only after Nuxt ships Vite 8. Our primary `@vitejs/plugin-react-swc@4.3.1` already supports Vite 8, so no action is needed there; the secondary `@vitejs/plugin-react` is the only blocker and is deferred with it.
- **TypeScript 6.0** is released (Mar 2026) but vue-tsc 6-compat (3.3.3) is days old and Nuxt historically lags new TS majors. `strict` is already set so the default-flip is moot, but adopt only after one or two Nuxt 4.x patch releases validate TS 6. Keep `typescript` pinned at `5.9`.

These deferrals are recorded in the spec so the next person doesn't re-discover them.

## Risks / Trade-offs

- **tldraw indicators vanishing silently** — the headline risk. Mitigated by the explicit 12-file `getIndicatorPath` task plus a Playwright/manual check that selecting a custom shape shows an outline.
- **lint-staged spawn-engine swap** — low but real edge-case risk; mitigated by a real test commit.
- **Hocuspocus mixed-version window** — mitigated by the backward-compatible wire protocol; if deploying server and client separately, keep `sessionAwareness: false`.
- **`--legacy-peer-deps`** — required due to better-auth's optional SvelteKit peer pulling a Vite 8 phantom; this is cosmetic, not a real resolution problem. Documented so it isn't mistaken for breakage.
- **tldraw official migration skill** exists (`github.com/tldraw/tldraw/blob/main/skills/tldraw-migrate`) and may automate much of Wave 3; optional to use.

## Migration Plan

1. **Wave 1:** `ncu -u eslint lint-staged pm2` → `npm install --legacy-peer-deps` → `npx eslint .` (fix findings) → run all test suites → commit.
2. **Wave 2:** bump `@hocuspocus/server`+`@hocuspocus/provider` to `^4.1.0` → install → optional dead-code cleanup → integration test (collaboration.test.ts) + full suites → commit.
3. **Wave 3:** bump `tldraw`+`@tldraw/sync`+`@tldraw/sync-core` to `^5.0.1` → install → fix `useSync` user prop → port 12× `getIndicatorPath` → audit props/constants/asset-store → typecheck → load an existing diagram (auto-migration check) + smoke-test sync connect/edit/save → full suites → commit.
4. **Wave 4:** no install; record deferral of plugin-react 6 and TypeScript 6 in the spec.
5. Capture each wave's test output under `logs/` and confirm green before proceeding.
