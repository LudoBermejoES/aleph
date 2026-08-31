## 1. Measure the defect before touching anything

- [x] 1.1 Reproduce with port 3333 free and `nuxt dev` the only process: `/api/health`,
      `/api/me` and `/api/campaigns` all answer HTTP 500 with the message
      "Module did not self-register", naming `onnxruntime_binding.node`. Capture the full stack —
      it points at `onnxruntime-node/dist/binding.js:10`, a SECOND compile of that CJS module.

- [x] 1.2 Disprove the note the two archived changes copied: `ss -ltn` shows the server
      LISTENing on `0.0.0.0:3333`. It opens the port. (`nuxt dev` announces 3000 when 3333 is
      already taken — that is what was being seen.)
- [x] 1.3 Count the real backlog on this database: 7,492 entities, 5,837 embedded, **1,560
      pending with a file**. Confirm the plugin makes no progress for ten minutes and writes
      nothing (`entity_vec_map` flat, WAL 0 bytes) while every request answers 503.
- [x] 1.4 Verify that merely importing the package loads the addon:
      `/proc/self/maps` gains `onnxruntime_binding.node` after a bare
      `await import('@huggingface/transformers')`, with no pipeline created.

## 2. The escape hatch

- [x] 2.1 `server/utils/startup-backfills.ts` — `startupBackfillsEnabled(env = process.env)`,
      `env.STARTUP_BACKFILLS_ENABLED !== 'false'`, matching `SEARCH_SEMANTIC_ENABLED`'s shape.
- [x] 2.2 `server/plugins/watcher.ts` — gate all three backfills on it; leave `initFTS5` and
      `initVecTable` ungated; log a `warn` when it is engaged.
- [x] 2.3 Measure the hatch ALONE: still `500 Module did not self-register`. Recorded in
      design.md D1 — this is what proves the hatch is not the fix.

## 3. The root fix

- [x] 3.1 `server/services/embeddings.ts` — move `import { pipeline, env }` inside
      `getEmbedder()` as a dynamic import; move `env.cacheDir` / `env.allowRemoteModels` with
      it; keep `FeatureExtractionPipeline` as a type-only import.
- [x] 3.2 Verify the resolved specifier is still the NODE build, not the web/WASM one:
      `.nuxt/dev/index.mjs` imports `@huggingface/transformers/dist/transformers.node.mjs`.
- [x] 3.3 Verify the addon is loaded exactly once, in the Nitro child process, and only after a
      search has run.

## 4. Convergence

- [x] 4.1 `server/db/backfills/entity-embeddings.ts` — `entity_embedding_failures` created with
      `CREATE TABLE IF NOT EXISTS` in the file itself; `MAX_ATTEMPTS = 3`; a new
      `skippedFailedPermanently` counter; clear the record on success and on `skippedExisting`.

## 5. Documentation

- [x] 5.1 `.env.example` — commented-out `STARTUP_BACKFILLS_ENABLED`, with the production warning.
- [x] 5.2 `docs/development.md` — a section that tells the two failure modes apart, the recovery
      SQL, and why the flag is deliberately not in the `test:integration` script.
- [x] 5.3 Correct the wrong diagnosis in `openspec/changes/enforce-map-visibility/tasks.md` (7.3)
      and `openspec/changes/show-entity-map-pins/tasks.md` (5.3), in place, so a third change
      does not inherit it.

## 6. Tests

- [x] 6.1 `tests/unit/server/startup-backfills.test.ts` — table-driven over the env value,
      including the four near-misses that must NOT disable it; plus a source-level guard that
      every backfill call in `watcher.ts` sits inside the gate.
- [x] 6.2 `tests/unit/db/entity-embeddings-backfill.test.ts` — six convergence scenarios built on
      a new `withFile: 'missing'` fixture (an entity row pointing at a file that is not there),
      because that is the shape this project's database actually contains.
- [x] 6.3 Mutation-test each guard and require it to go red: - loosening the env comparison to `?.toLowerCase().trim() !== 'false'` → 2 failures - ungating one backfill in `watcher.ts` → 1 failure - never giving up (`if (false && …)`) → 3 failures - not clearing the record on success → 1 failure
- [x] 6.4 Verify `nuxt dev` serves `200 application/json` on `/api/health`, survives a Nitro
      reload, and that semantic search returns results through the lazy import.
