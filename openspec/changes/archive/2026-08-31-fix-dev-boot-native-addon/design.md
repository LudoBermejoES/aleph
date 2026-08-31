## Context

Three things had to be told apart before anything could be fixed, because the visible symptom of
all three is "the dev server is broken".

Measured, in this order:

1. `nuxt dev --port 3333` **does** bind 3333 (`ss -ltn` shows it LISTENing, `curl` gets a reply).
   The "announces 3333 and never opens it" note in two archived task lists is wrong. What people
   saw was `nuxt dev` announcing **3000** — which is what it does when 3333 is already taken.
2. For the first minutes the reply is `503 Dev server is unavailable`. That is the boot block:
   `watcher.ts` awaits its backfills and Nitro serves nothing until the plugin resolves.
3. After that, every route — `/api/health` included — answers `500 Module did not self-register`.

## Decisions

### D1. Fix the double `dlopen` by deferring the import, not by moving the backfill

The first thing tried was the escape hatch alone: skip every backfill, boot, curl. **Still 500.**
That measurement is what settles the design — the fault is in the module GRAPH, not in the
backfill running. `server/services/embeddings.ts` imported `@huggingface/transformers` at module
scope, and merely importing it loads the addon (verified directly: `/proc/self/maps` gains
`onnxruntime_binding.node` after a bare `await import('@huggingface/transformers')`, before any
pipeline is created).

So the import moves inside `getEmbedder()`, which was already the lazy accessor. `env.cacheDir`
and `env.allowRemoteModels` move with it — they must still be set before `pipeline()` and now
are, in the same function, one statement earlier.

Rejected: pinning the addon into a single shared graph via an alias or a Nitro `external` entry.
It would have depended on Nitro's bundling internals to keep a native module's identity stable,
which is exactly the kind of thing that silently changes under a minor upgrade.

### D2. `STARTUP_BACKFILLS_ENABLED`, not `ALEPH_SKIP_BACKFILLS`

The repo already has this exact shape in `nuxt.config.ts`:
`semanticEnabled: process.env.SEARCH_SEMANTIC_ENABLED !== 'false'`. Matching it means one idiom
instead of two, and it defaults the SAFE way round: the variable names what is on, unset means
on, and only the exact string `'false'` turns it off. A typo (`0`, `no`, `FALSE`, `' false'`)
leaves production's backfills running rather than silently disabling them — the table in
`tests/unit/server/startup-backfills.test.ts` exists for that one property.

A skip-shaped name (`SKIP_BACKFILLS=true`) inverts the risk: the failure mode of a typo becomes
"the migration quietly stopped happening", which is invisible until someone notices an index has
been incomplete for months.

### D3. The escape hatch gates the backfills, never the init

`initFTS5()` and `initVecTable()` still run. They create tables and complete the role-scoped
lexical migration, which the file's own comment identifies as the security-critical half — a
boot that skipped it would be a boot with a different visibility model, which is not something a
convenience switch may do. With the hatch on, a boot differs from a normal one in exactly one
way: an index that was already incomplete stays incomplete.

### D4. It is NOT baked into `npm run test:integration`

Tempting, and rejected. CI runs that script against a fresh database where the backfills are
milliseconds, and it is the only place the default boot path is exercised end to end. Putting
the flag in the script would mean nothing ever runs `watcher.ts` the way production runs it.
`docs/development.md` tells a local developer to prefix the command instead.

### D5. Convergence by attempt count, in a table this subsystem owns

`entity_embedding_failures` is created with `CREATE TABLE IF NOT EXISTS` inside the backfill, the
same raw-SQL startup-init idiom `entity_vec_map` already uses in `initVecTable()` and for the
same reason: it belongs to the embedding subsystem's own bootstrap, not to the application
schema, and nothing outside that one file reads it. No Drizzle migration, so no `_journal.json`
ordering hazard.

Three attempts, not one: a genuine transient (a file rewritten as the pass walks past it, a model
load that lost a race with a shutdown) deserves another go, and three boots is cheap. Recovery is
one statement, documented in both the code and `docs/development.md`:
`DELETE FROM entity_embedding_failures WHERE entity_id = '<id>'`.

A success clears the record — including on the `skippedExisting` path, so an entity re-indexed by
the watcher after its file came back does not keep a stale failure row.

## Risks

- **Deferring the import moves where a transformers.js load error surfaces**: from boot to the
  first embedding. In production that is the same moment the model was already being loaded, so
  the observable change is nil; a missing vendored model still fails loudly on first use, which
  `env.allowRemoteModels = false` is there to guarantee.
- **A `STARTUP_BACKFILLS_ENABLED=false` that escapes into production** would freeze the indexes
  where they are, silently. Mitigated by the naming (D2) and by it being commented out in
  `.env.example` with the warning attached, not by any runtime check — a runtime "are we in
  production" override would defeat the switch on a production-like local box.
- **Giving up after three attempts is a real behaviour change**: an entity with a genuinely flaky
  file could end up permanently unembedded where before it would have been retried for ever. It
  is recorded rather than dropped, and the recovery is one SQL statement.
