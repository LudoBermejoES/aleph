## Why

The minor and patch dependency updates have already been applied (Nuxt 4.4.6, Vue 3.5.35, Vitest 4.1.8, Playwright 1.60, better-auth 1.6.13, shadcn-nuxt 2.7.3, zod 4.4.3, @nuxtjs/mdc 0.22, tldraw 4.5.12, etc.) and the full unit suite (1249 tests) passes against them. What remains is a set of **major-version** bumps that each carry breaking changes and must be evaluated and applied deliberately, not in one `ncu -u` sweep.

Outstanding majors (current → target):

- `@hocuspocus/provider` / `@hocuspocus/server` `3.4.4 → 4.1.0`
- `@tldraw/sync` / `@tldraw/sync-core` / `tldraw` `4.5.12 → 5.0.1`
- `eslint` `9.39.4 → 10.4.1`
- `lint-staged` `16.4.0 → 17.0.7`
- `pm2` `6.0.14 → 7.0.1`
- `@vitejs/plugin-react` `4.7.0 → 6.0.2`
- `typescript` `5.9 → 6.0`

A naive upgrade risks two real failure modes verified by research: tldraw v5 **silently stops rendering selection indicators** for all 12 custom shapes (the `indicator()` → `getIndicatorPath()` deprecation compiles but no-ops), and `@vitejs/plugin-react` v6 **requires Vite 8** which Nuxt 4.4 does not ship. This change sequences the upgrades by risk so the codebase stays green at every step.

## What Changes

The upgrades are grouped into **four waves**, applied and verified independently:

- **Wave 1 — Low-risk tooling (do now):** ESLint 10, lint-staged 17, pm2 7. No code changes expected; flat config already in use, Node 24 and Git 2.39 satisfy all new minimums, `ecosystem.config.cjs` format unchanged. Only follow-up is fixing any new `eslint:recommended` findings and running `pm2 update` on the server.
- **Wave 2 — Hocuspocus 4 (low risk, code-light):** Bump both packages to 4.1.0. yjs/y-protocols majors are unchanged and already satisfy v4 peers. Wire protocol is backward-compatible (v4 client ↔ v3 server) so server and client can roll independently. The only `onStoreDocument` payload break (`context`→`lastContext`, `transactionOrigin`→`lastTransactionOrigin`) touches fields our handler already ignores (`_context`). Requires Node ≥22 (we are on 24). Optional cleanup of dead `encodeStateAsUpdateV2` line.
- **Wave 3 — tldraw 5 (medium risk, the real work):** Bump `tldraw`, `@tldraw/sync`, `@tldraw/sync-core` to 5.0.1. Two mechanical but mandatory edits: migrate `useSync({ userInfo })` → `users`/`TLUserStore` in `TldrawWrapper.tsx`, and port `indicator()` → `getIndicatorPath()` (returning `Path2D`) in all 12 custom shape utils. Audit moved `<Tldraw>` props and removed theme constants. No React bump and no persisted-snapshot migration needed (snapshots are self-describing and auto-migrate on load). Server `TLSocketRoom` API is additive-only.
- **Wave 4 — Deferred (explicitly NOT done now):** `@vitejs/plugin-react` 6 (blocked on Vite 8, which Nuxt 4.4 doesn't ship) and `typescript` 6 (released March 2026; vue-tsc support is days old, ecosystem unproven). These are documented as deferred with the precondition for revisiting, not applied.

Every wave keeps `npx vitest run tests/unit/`, `npx playwright test`, and `npx nuxi typecheck` green before the next wave starts. Test output is captured to `logs/`.

## Capabilities

### New Capabilities

- `dependency-currency`: The project's third-party dependencies are kept current through a risk-sequenced upgrade process that verifies tests at each wave and records which majors are intentionally deferred and why.

## Impact

**Config** (`package.json`, `package-lock.json`): version bumps for the Wave 1–3 packages; Wave 4 packages left at current versions with a documented deferral.

**ESLint**: possible new `eslint:recommended` findings (`no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`) to fix; `@nuxt/eslint@1.15.2` already declares `eslint: "^9 || ^10"` so no module bump.

**tldraw React layer** (`app/components/diagrams/react/`): `TldrawWrapper.tsx` (useSync user prop), all 12 files under `shapes/` (`indicator()` → `getIndicatorPath()`), and an audit of `app/utils/aleph-asset-store.ts` (no signature change expected — only `upload` + `inlineBase64AssetStore` are used).

**Hocuspocus** (`server/plugins/hocuspocus.ts`, `app/composables/useCollaborationProvider.ts`, `app/components/MarkdownEditor.client.vue`): no required code change; optional dead-code cleanup.

**Deployment** (`ecosystem.config.cjs`): no format change; operational step `pm2 update` on the server after installing pm2 7.

**No server API endpoint, auth flow, or data-model change** — per CLAUDE.md, no `cli/` or skill-doc updates are required.

**Install note**: `better-auth` lists `@sveltejs/kit` as an optional peer (pulls a Vite 8 phantom peer); installs use `--legacy-peer-deps`, which is expected and not a real conflict.
