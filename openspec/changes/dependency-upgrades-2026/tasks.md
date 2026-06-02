## 1. Wave 1 — Low-risk tooling (ESLint 10, lint-staged 17, pm2 7)

- [x] 1.1 Bump versions in `package.json`: `eslint@^10.4.1`, `lint-staged@^17.0.7`, `pm2@^7.0.1` (e.g. `npx ncu -u eslint lint-staged pm2`)
- [x] 1.2 `npm install --legacy-peer-deps` (the `--legacy-peer-deps` is expected — better-auth's optional SvelteKit peer pulls a Vite 8 phantom; not a real conflict)
- [x] 1.3 Run `npx eslint .` and fix any new `eslint:recommended` findings (`no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`); prefer `--fix` where possible
- [x] 1.4 Make a trivial staged change to a `.ts`/`.vue` file and commit it on a scratch branch to confirm the husky + lint-staged 17 pre-commit hook still runs `prettier --write` + `eslint --fix` (then discard the scratch commit)
- [x] 1.5 Add a note to deployment docs / commit message that the server needs `pm2 update` after deploying pm2 7 (daemon must match CLI); no `ecosystem.config.cjs` change
- [x] 1.6 Run unit + integration + E2E + `npx nuxi typecheck`; save output to `logs/`; confirm green before Wave 2
- [x] 1.7 Commit Wave 1

## 2. Wave 2 — Hocuspocus 4

- [ ] 2.1 Bump `@hocuspocus/server@^4.1.0` and `@hocuspocus/provider@^4.1.0` in `package.json`; `npm install --legacy-peer-deps`
- [ ] 2.2 Confirm `yjs` stays `^13` and `y-protocols` `^1` (v4 peers are satisfied; no major bump)
- [ ] 2.3 (Optional cleanup) In `server/plugins/hocuspocus.ts`: remove the dead `encodeStateAsUpdateV2` line (~127) and tidy `_context` params; do NOT change hook signatures
- [ ] 2.4 Confirm `sessionAwareness` is left at its default (`false`) — only matters during a mixed v3/v4 rollout
- [ ] 2.5 Verify Node ≥22 in CI workflow and any Docker/prod runtime (local is 24); update engine pin / CI image if needed
- [ ] 2.6 Start server on 3333 and run `npx vitest run tests/integration/collaboration.test.ts` (authenticate + load + store); then run full unit + E2E + typecheck; save to `logs/`; confirm green before Wave 3
- [ ] 2.7 Commit Wave 2

## 3. Wave 3 — tldraw 5 (+ sync, sync-core)

- [ ] 3.1 Back up the diagrams data (DB / snapshot store) before first v5 load — auto-migration is one-way on re-save
- [ ] 3.2 Bump `tldraw@^5.0.1`, `@tldraw/sync@^5.0.1`, `@tldraw/sync-core@^5.0.1` (and align `@tldraw/tlschema`/`@tldraw/validate`/`@tldraw/tlsync` if pinned separately) in `package.json`; `npm install --legacy-peer-deps`
- [ ] 3.2a Confirm React peers unchanged — no `react`/`react-dom` bump required (v5 keeps `^18.2 || ^19.2`)
- [ ] 3.3 In `app/components/diagrams/react/TldrawWrapper.tsx`: migrate `useSync({ userInfo })` → `users` (`TLUserStore`); audit `editor.user.updateUserPreferences()` against the v5 `TLUserPreferences` split
- [ ] 3.4 Port `indicator()` → `getIndicatorPath()` (return `Path2D | TLIndicatorPath`) in all 12 custom shape utils under `app/components/diagrams/react/shapes/`: EntityCardShape, NPCTokenShape, LocationPinShape, FactionCardShape, RegionBoxShape, AnchorTokenShape, MapTokenShape, StickyNoteShape, CanvasLabelShape, GenealogyNodeShape, QuestNodeShape, RelationshipArrowShape (the last needs its arrow path expressed as `Path2D`)
- [ ] 3.5 Audit `<Tldraw>` props in `TldrawWrapper.tsx` for v5 moves (`cameraOptions`/`textOptions`/`deepLinks` → `options`; `inferDarkMode` → `colorScheme`); fix if any are passed
- [ ] 3.6 Grep the shape components for removed v5 theme constants (`getDefaultColorTheme`, `DefaultColorThemePalette`, `FONT_SIZES`, `LABEL_FONT_SIZES`, `TEXT_PROPS`, `STROKE_SIZES`, `useIsDarkMode`); replace any usages
- [ ] 3.7 Confirm `app/utils/aleph-asset-store.ts` still compiles (only `inlineBase64AssetStore` + custom `upload()` are used; the changed `getAssetInfo`/`notifyIfFileNotAllowed`/`assetValidator` signatures are not referenced)
- [ ] 3.8 Verify the server sync layer compiles unchanged: `server/services/tldraw-rooms.ts` (`TLSocketRoom`), `server/routes/api/tldraw-sync/[diagramId].ts` (`WebSocketMinimal`), `server/services/tldraw-shape-schemas.ts` (`createTLSchema`/`defaultShapeSchemas`/`defaultBindingSchemas`/`T`)
- [ ] 3.9 `npx nuxi typecheck` — resolve any tldraw type errors
- [ ] 3.10 Open an existing (v4-persisted) diagram in the running app and confirm it loads via auto-migration with no errors
- [ ] 3.11 Smoke-test sync: open a diagram, place/move a custom shape, confirm a **selection indicator outline renders**, and confirm the change saves (connect → message → store → close path)
- [ ] 3.12 Run unit + integration + E2E + typecheck; save to `logs/`; confirm green
- [ ] 3.13 Commit Wave 3

## 4. Wave 4 — Deferred majors (document, do not apply)

- [ ] 4.1 Leave `@vitejs/plugin-react` at v4; the spec records that v6 requires Vite 8 (not shipped by Nuxt 4.4) — revisit when Nuxt adopts Vite 8. Confirm `@vitejs/plugin-react-swc` stays 4.x (no v5/v6 exists; already spans Vite 4–8)
- [ ] 4.2 Leave `typescript` pinned at `5.9`; the spec records that TS 6 is deferred until Nuxt patch releases validate vue-tsc 6 compatibility
- [ ] 4.3 (Optional) Add a short note in the repo (e.g. a `docs/` line or the next maintenance issue) listing the two deferred majors and their unblock conditions

## 5. Wrap-up

- [ ] 5.1 Final full run of unit + integration + E2E + typecheck on the combined result; save to `logs/`
- [ ] 5.2 Confirm no `cli/` or skill-doc changes were needed (no API/auth/data-model change); note this explicitly
- [ ] 5.3 Update `package-lock.json` is committed alongside `package.json` for every wave
