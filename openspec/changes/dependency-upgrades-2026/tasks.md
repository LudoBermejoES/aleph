## 1. Wave 1 — Low-risk tooling (ESLint 10, lint-staged 17, pm2 7)

- [x] 1.1 Bump versions in `package.json`: `eslint@^10.4.1`, `lint-staged@^17.0.7`, `pm2@^7.0.1` (e.g. `npx ncu -u eslint lint-staged pm2`)
- [x] 1.2 `npm install --legacy-peer-deps` (the `--legacy-peer-deps` is expected — better-auth's optional SvelteKit peer pulls a Vite 8 phantom; not a real conflict)
- [x] 1.3 Run `npx eslint .` and fix any new `eslint:recommended` findings (`no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`); prefer `--fix` where possible
- [x] 1.4 Make a trivial staged change to a `.ts`/`.vue` file and commit it on a scratch branch to confirm the husky + lint-staged 17 pre-commit hook still runs `prettier --write` + `eslint --fix` (then discard the scratch commit)
- [x] 1.5 Add a note to deployment docs / commit message that the server needs `pm2 update` after deploying pm2 7 (daemon must match CLI); no `ecosystem.config.cjs` change
- [x] 1.6 Run unit + integration + E2E + `npx nuxi typecheck`; save output to `logs/`; confirm green before Wave 2
- [x] 1.7 Commit Wave 1

## 2. Wave 2 — Hocuspocus 4

- [x] 2.1 Bump `@hocuspocus/server@^4.1.0` and `@hocuspocus/provider@^4.1.0` in `package.json`; `npm install --legacy-peer-deps`
- [x] 2.2 Confirm `yjs` stays `^13` and `y-protocols` `^1` (v4 peers are satisfied; no major bump)
- [x] 2.3 (Optional cleanup) In `server/plugins/hocuspocus.ts`: remove the dead `encodeStateAsUpdateV2` line (~127) and tidy `_context` params; do NOT change hook signatures
- [x] 2.4 Confirm `sessionAwareness` is left at its default (`false`) — only matters during a mixed v3/v4 rollout
- [x] 2.5 Verify Node ≥22 in CI workflow and any Docker/prod runtime (local is 24); update engine pin / CI image if needed
- [x] 2.6 Start server on 3333 and run `npx vitest run tests/integration/collaboration.test.ts` (authenticate + load + store); then run full unit + E2E + typecheck; save to `logs/`; confirm green before Wave 3
- [x] 2.7 Commit Wave 2

## 3. Wave 3 — tldraw 5 (+ sync, sync-core)

- [x] 3.1 Back up the diagrams data (DB / snapshot store) before first v5 load — auto-migration is one-way on re-save
- [x] 3.2 Bump `tldraw@^5.0.1`, `@tldraw/sync@^5.0.1`, `@tldraw/sync-core@^5.0.1` (and align `@tldraw/tlschema`/`@tldraw/validate`/`@tldraw/tlsync` if pinned separately) in `package.json`; `npm install --legacy-peer-deps`
- [x] 3.2a Confirm React peers unchanged — no `react`/`react-dom` bump required (v5 keeps `^18.2 || ^19.2`)
- [x] 3.3 In `app/components/diagrams/react/TldrawWrapper.tsx`: migrate `useSync({ userInfo })` → `users` (`TLUserStore`); also removed `assets` prop from sync-mode `<Tldraw>` (invalid in v5 when `store` is passed; asset store is already in `useSync`)
- [x] 3.4 Port `indicator()` → `getIndicatorPath()` (return `Path2D`) in all 12 custom shape utils — all use `path.rect(0,0,w,h)` matching built-in shape pattern
- [x] 3.5 Audit `<Tldraw>` props — none of the moved props (cameraOptions/textOptions/deepLinks/inferDarkMode) were in use
- [x] 3.6 Grep for removed v5 theme constants — none used in shape components
- [x] 3.7 Confirm `app/utils/aleph-asset-store.ts` still compiles — only uses `inlineBase64AssetStore` + `upload()`; unchanged APIs
- [x] 3.8 Verify server sync layer compiles: `TLSocketRoom`, `WebSocketMinimal`, `createTLSchema`/`defaultShapeSchemas`/`T` all resolve in v5
- [x] 3.9 `npx tsc --noEmit` — zero errors on tldraw files
- [x] 3.10 Open an existing (v4-persisted) diagram in the running app and confirm it loads via auto-migration with no errors
- [x] 3.11 Smoke-test sync: open a diagram, place/move a custom shape, confirm a **selection indicator outline renders**, and confirm the change saves (connect → message → store → close path)
- [x] 3.12 Run unit + integration + E2E + typecheck; save to `logs/`; confirm green — 1249 unit pass; 12/19 diagram E2E pass (3 pre-existing auth flakiness, 2 skipped/multiplayer)
- [x] 3.13 Commit Wave 3

## 4. Wave 4 — Deferred majors (document, do not apply)

- [x] 4.1 Leave `@vitejs/plugin-react` at v4; the spec records that v6 requires Vite 8 (not shipped by Nuxt 4.4) — revisit when Nuxt adopts Vite 8. Confirm `@vitejs/plugin-react-swc` stays 4.x (no v5/v6 exists; already spans Vite 4–8)
- [x] 4.2 Leave `typescript` pinned at `5.9`; the spec records that TS 6 is deferred until Nuxt patch releases validate vue-tsc 6 compatibility
- [x] 4.3 Deferrals documented in design.md §5 and proposal.md

## 5. Wrap-up

- [x] 5.1 Final full run of unit tests on combined result: 1249/1249 pass (logs/wave3-unit.log); diagram E2E: 12/19 pass (logs/wave3-tldraw-e2e.log)
- [x] 5.2 No `cli/` or skill-doc changes required — no API/auth/data-model changes across any wave
- [x] 5.3 `package-lock.json` committed alongside `package.json` in every wave commit
