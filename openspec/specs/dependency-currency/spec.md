# dependency-currency Specification

## Purpose

TBD - created by archiving change dependency-upgrades-2026. Update Purpose after archive.

## Requirements

### Requirement: Low-risk tooling majors are upgraded

The build/dev tooling SHALL be upgraded to ESLint 10, lint-staged 17, and pm2 7, with the test suites remaining green and no change to the pm2 ecosystem file format.

#### Scenario: ESLint 10 lints with no config migration

- **WHEN** ESLint is upgraded to `^10` and `npx eslint .` is run
- **THEN** the existing `@nuxt/eslint`-generated flat config loads without error and any new `eslint:recommended` findings are resolved

#### Scenario: lint-staged 17 still runs on commit

- **WHEN** lint-staged is upgraded to `^17` and a staged `.ts`/`.vue` file is committed
- **THEN** the husky pre-commit hook runs `prettier --write` and `eslint --fix` on the staged files exactly as before

#### Scenario: pm2 7 reads the existing ecosystem file

- **WHEN** pm2 is upgraded to `^7`
- **THEN** `ecosystem.config.cjs` is consumed without format changes and the documented `pm2 update` step is recorded for the server

### Requirement: Hocuspocus is upgraded to v4

`@hocuspocus/server` and `@hocuspocus/provider` SHALL be upgraded to `^4.1.0` with no required application code change and with realtime collaboration still functioning.

#### Scenario: Collaboration still works after the bump

- **WHEN** both Hocuspocus packages are at `^4.1.0` and the server is running
- **THEN** the collaboration integration test (`tests/integration/collaboration.test.ts`) passes — a provider authenticates, loads, and stores a document

#### Scenario: yjs major is unchanged

- **WHEN** Hocuspocus v4 is installed
- **THEN** `yjs` remains on `^13` and `y-protocols` on `^1`, satisfying the v4 peer ranges without a major bump

### Requirement: tldraw is upgraded to v5 without losing functionality

`tldraw`, `@tldraw/sync`, and `@tldraw/sync-core` SHALL be upgraded to `^5.0.1`, with custom-shape selection indicators still rendering and persisted diagrams loading correctly.

#### Scenario: Custom shape selection indicators render

- **WHEN** tldraw is at v5 and a custom shape (e.g. an entity card or NPC token) is selected on the canvas
- **THEN** a selection indicator outline is drawn, confirming the `indicator()` → `getIndicatorPath()` migration was applied to all 12 custom shape utils

#### Scenario: useSync user identity is provided via the v5 API

- **WHEN** a synced diagram is opened with a logged-in user
- **THEN** `useSync` receives user identity via the v5 `users`/`TLUserStore` mechanism (not the removed `userInfo` option) and presence/attribution works

#### Scenario: Existing v4 diagrams auto-migrate on load

- **WHEN** a diagram whose snapshot was persisted under tldraw v4 is opened in v5
- **THEN** it loads without error via tldraw's automatic snapshot migration, with no manual re-write of stored snapshots

#### Scenario: Sync server path is intact

- **WHEN** a client connects to the `tldraw-sync` WebSocket route under v5
- **THEN** `TLSocketRoom` handles connect/message/close/error and snapshot persistence as before (the v5 `TLSocketRoom` changes are additive)

### Requirement: High-risk majors are explicitly deferred

Upgrades that are blocked by an unmet precondition SHALL be left at their current version and documented with the condition for revisiting, rather than applied.

#### Scenario: plugin-react 6 is deferred pending Vite 8

- **WHEN** the upgrade is performed
- **THEN** `@vitejs/plugin-react` stays at v4 and the change records that v6 requires Vite 8 (not shipped by Nuxt 4.4), to be revisited when Nuxt adopts Vite 8

#### Scenario: TypeScript 6 is deferred pending ecosystem validation

- **WHEN** the upgrade is performed
- **THEN** `typescript` stays pinned at `5.9` and the change records that TS 6 is deferred until Nuxt patch releases validate vue-tsc 6 compatibility

### Requirement: Each wave is verified before proceeding

The upgrade SHALL be applied in waves, and the unit, integration, E2E, and typecheck checks SHALL pass at each wave boundary before the next wave begins, with output captured to `logs/`.

#### Scenario: A wave is not advanced on red

- **WHEN** any of `npx vitest run tests/unit/`, `npx vitest run tests/integration/`, `npx playwright test`, or `npx nuxi typecheck` fails after a wave's bumps
- **THEN** the failure is fixed (or the wave reverted) before the next wave's packages are installed, and the test output is saved under `logs/`
