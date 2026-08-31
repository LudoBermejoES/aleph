## Why

`nuxt dev` does not work in this checkout, and it has not for long enough that two changes
worked around it and wrote the workaround down wrong.

Measured on 2026-08-30, port 3333 free, `nuxt dev` the only process: **every** API route answers

```
500 Module did not self-register:
  '.../node_modules/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node'
```

Not just search — `/api/health` too. `onnxruntime-node`'s addon is not context-aware, so Node
refuses a second `dlopen` of it in one process, and `server/services/embeddings.ts` imports
`@huggingface/transformers` at **module scope**. That puts the addon in the module graph of
everything that touches the file, including `server/plugins/watcher.ts`, which every boot
evaluates; the Nitro bundle loads it once and the request-time graph loads it again.

Underneath it there is a second, independent problem. `watcher.ts` `await`s its one-time
backfills, and a Nitro plugin's `await` runs **before the server accepts a request**. On this
project's own database that is 1,560 entities still lacking an embedding — minutes of boot with
nothing served. The file already carries the scar: its own comment records that awaiting the
_filtered-vector_ backfill "held a live campaign's site at HTTP 500 for over a minute", and the
two remaining backfills were never given the same treatment.

The cost is not hypothetical. `npm run test:integration` cannot run here, and
`openspec/changes/enforce-map-visibility` (task 7.3) and `openspec/changes/show-entity-map-pins`
(task 5.3) both skip the integration level for it — **both with the same wrong diagnosis**,
"the dev server announces port 3333 and never opens it". It does open it. A third change would
have copied the note.

And the embedding backfill **never terminates**. An entity whose `filePath` points at a file
that no longer exists (`ENOENT entities/the-tavern.md` here) raises, is counted in `failed`, and
is left with no `entity_vec_map` row — which is exactly the condition that selects it again on
the next boot, and the one after, for ever.

## What Changes

- **The transformers.js import becomes lazy.** `getEmbedder()` loads `@huggingface/transformers`
  on first use instead of at module scope, so the native addon is `dlopen`'d once, by whichever
  graph actually needs an embedding. This is the root fix; behaviour is unchanged in production,
  where the pipeline was already lazy.
- **An escape hatch for the boot-time backfills.** `STARTUP_BACKFILLS_ENABLED=false` skips them
  for that process. Unset — the default, and what production runs — nothing changes.
- **The embedding backfill converges.** An entity that cannot be embedded is retried at most
  three times across boots, then recorded in `entity_embedding_failures` and left alone.
- **The two wrong notes are corrected in place**, so the next change does not inherit them.

## Non-Goals

- Not making the backfills non-blocking. Detaching them the way the filtered-vector migration is
  detached would move the addon load off the boot path but into a background task racing the
  request path — the opposite of what this change is for. The escape hatch is a local switch,
  not a change to how production boots.
- No new dependency, no schema migration, no change to what gets embedded or how.
- Not a fix for `onnxruntime-node` itself. The addon still cannot be loaded twice; this change
  makes sure nothing loads it twice.

## Impact

- `server/services/embeddings.ts`, `server/plugins/watcher.ts`,
  `server/db/backfills/entity-embeddings.ts`, `server/utils/startup-backfills.ts` (new).
- `.env.example`, `docs/development.md`.
- **No aleph-cli impact.** No endpoint, auth flow or data model changes: the CLI talks HTTP and
  every route keeps its contract. The new `entity_embedding_failures` table is internal to the
  embedding subsystem and is not exposed anywhere.
