## Context

Current state: `server/services/search.ts` maintains one FTS5 virtual table (`entities_fts`) over `name`/`aliases`/`tags`/`body`, queried by `server/api/campaigns/[id]/search.get.ts`. This is purely lexical. It was already scoped for classical-IR improvements (BM25 field-weighting, phrase/`NEAR` syntax, diacritic folding, trigram-based typo tolerance) in an earlier iteration of this proposal, before confirming production hardware could support local embeddings.

**Correction made during implementation**: BM25 field-weighting and diacritic-insensitive matching turned out to already be implemented (`bm25(entities_fts, 10.0, 8.0, 2.0, 1.0)`, `unicode61` already folds diacritics bidirectionally) — this design's original "current state" section was wrong on those two points, from only having read part of `search.ts` during initial research. What was genuinely missing and has now been implemented: safe phrase/`NEAR` query pass-through (the old query builder had a real bug — prefix `*` only applied to the trailing token — and no protection against FTS5 special-character/column-filter injection) and the trigram-based typo-tolerant fallback (`entity_trigrams` table, added as a plain SQL table via the existing `initFTS5()` startup-init function, not a new Drizzle migration as originally planned — see tasks.md section 2 for full detail). These lexical improvements remain the "lexical arm" of the hybrid search below, not discarded — pure semantic search is worse than hybrid for exact-name lookups (searching "Otto" should trivially surface "Otto Von Grugger" via exact match; embedding similarity alone doesn't reliably guarantee that ranks #1).

Production hardware (confirmed via direct inspection, 2026-08-10): 4-core ARM Neoverse-N1, 24GB RAM (21GB available), 100GB free disk, Ubuntu 24.04 aarch64. This rules out running a full LLM for interactive per-request use (CPU-only inference on ARM would be slow for generation), but comfortably supports a small embedding model — these do a single forward pass per text (no autoregressive token-by-token generation), typically completing in tens of milliseconds even on CPU for short-to-medium text, and the model weights themselves are 100-500MB depending on choice, trivial against 21GB free RAM.

Campaign content is predominantly Spanish-language narrative prose (character bios, session summaries, arc write-ups), so the embedding model must handle Spanish well — general English-only embedding models are a poor fit.

## Goals / Non-Goals

**Goals:**

- Semantic (meaning-based) retrieval that finds relevant entities even when the query and the content use different words for the same concept.
- Fully local: no external API calls, no per-query cost, no data leaving the server.
- Hybrid ranking that keeps lexical search's strength (exact names, typos via trigram fallback, phrase search) while adding semantic recall.
- Embeddings stay in sync with entity content automatically (create/update/delete).
- Acceptable latency on the confirmed production hardware for interactive search (target: sub-200ms added latency for the semantic path on a typical query).

**Non-Goals:**

- Any LLM/generative-model call or answer synthesis (chat-style Q&A over the campaign) — this is retrieval only. A future change could add a synthesis layer on top of this one's output.
- Any external/paid embedding API — the model runs in-process on the existing server.
- GPU acceleration — not available on this hardware, not required for the model sizes under consideration.
- Real-time embedding of every edit keystroke — embeddings regenerate on save/publish, not on every autosave tick.

## Decisions

### 1. Embedding model: small multilingual sentence-embedding model, run via `@huggingface/transformers`

**Decision**: use a compact multilingual sentence-embedding model — `multilingual-e5-small` (~118M params, ~120MB quantized) or `paraphrase-multilingual-MiniLM-L12-v2` (~470MB) — run in-process via `@huggingface/transformers` (the actively maintained successor to `@xenova/transformers`), which provides an ONNX runtime in pure JS/WASM/native bindings with no Python dependency. Final model choice to be validated in task 1 (benchmark both for retrieval quality against real campaign content and for load time/memory on the actual ARM hardware) before committing.

**Alternatives considered**:

- **Ollama running a local embedding model** (e.g. `nomic-embed-text`), called over HTTP from the Nitro server. Pro: process isolation, easy model swapping without redeploying the app, well-supported on aarch64. Con: a second long-running service to install, monitor, and keep alive alongside the app — more moving parts on a server the deploy pipeline already treats carefully (pm2-managed single app, documented cross-compile fragility for `better-sqlite3`). Rejected for v1 in favor of minimizing new infrastructure; revisit if in-process embedding proves awkward operationally.
- **A Python microservice with `sentence-transformers`**: rejected — adds a second language runtime, its own dependency/venv management, and cross-architecture wheel concerns on ARM, for no benefit over the pure-JS option given the project is already Node/Nitro end-to-end.
- **English-only embedding models**: rejected outright — would perform poorly on the dominant Spanish content.

### 2. Vector storage: `sqlite-vec` loaded as a `better-sqlite3` extension

**Decision**: use `sqlite-vec` (ships prebuilt native binaries including `linux-arm64`, loadable via `better-sqlite3`'s `.loadExtension()`), storing embeddings in a `vec0` virtual table keyed by entity/campaign, queried via its built-in KNN (`MATCH`) operator for cosine/L2 distance.

**Risk carried over from prior investigation**: `.loadExtension()` support can be disabled in some prebuilt `better-sqlite3` binaries for security. **Mitigation**: verify explicitly in task 1 against the exact `better-sqlite3` version and platform binary already in use (12.10.0, per `package.json`) before committing further design; `sqlite-vec`'s own documentation confirms tested support with `better-sqlite3` specifically, which is a materially lower-risk starting point than the previously-considered `spellfix1` (not distributed as an npm package with prebuilt binaries at all).

### 3. Embedding granularity: one embedding per entity to start, chunking as a follow-up

**Decision**: for v1, compute a single embedding per searchable entity from a concatenation of `name` + a length-capped excerpt of `body`/`content` (cap chosen to fit the embedding model's max token window, e.g. ~512 tokens for most small multilingual models). This is simpler to index, update, and query, and matches the existing FTS5 model of one row per entity.

**Known limitation, accepted for v1**: a long multi-section entity (e.g. a 90-session arc write-up or a character with years of cumulative history) compressed into one vector loses fine-grained matching — a query about one specific session buried in a character's history file may not surface strongly. **Follow-up**: chunk long fields (e.g. per-`##`-heading section) into multiple embeddings per entity, each tagged back to the parent entity, if v1 testing shows this is a real problem in practice. Flagged as an Open Question, not built now, to avoid over-engineering before real usage data exists.

### 4. Hybrid ranking: run both paths, fuse with weighted Reciprocal Rank Fusion (RRF)

**Decision**: for a given query, run the lexical FTS5 (BM25-weighted, per prior design) and semantic (`sqlite-vec` KNN) paths independently, then combine using Reciprocal Rank Fusion — `score(entity) = Σ 1/(k + rank_in_list)` across both ranked lists, with `k` a tunable constant (standard starting value: 60) — rather than trying to normalize and directly compare BM25 scores against cosine distances, which are on incompatible scales. RRF is simple, requires no score calibration between the two systems, and is the standard approach for combining lexical and vector search.

**Alternative considered**: weighted linear combination of normalized scores. Rejected — normalizing BM25 and cosine-similarity scores onto a comparable scale is fragile and requires ongoing tuning; RRF sidesteps this by only using rank position.

### 5. Indexing pipeline: synchronous on write, with a batch backfill migration

**Decision**: generate/update an entity's embedding synchronously within the same request that creates or updates its content (mirroring how `indexEntity()` already updates `entities_fts` today), accepting the added latency (expected tens-to-low-hundreds of ms) on write operations, which are far less frequent and less latency-sensitive than search reads. A one-time batch backfill script embeds all existing entities across all campaigns post-migration, run manually per this project's established production-ops convention (deploys don't auto-migrate; migrations are applied by hand).

**Alternative considered**: background/async job queue for embedding generation. Rejected for v1 — adds queue infrastructure (and a way to know embedding hasn't caught up yet) for a latency cost that's likely imperceptible in practice on this hardware; revisit only if write-path latency proves to be a real problem.

## Risks / Trade-offs

- **[Risk]** `better-sqlite3` extension loading may be restricted on the deployed binary. → **Mitigation**: verify first (task 1), before any other implementation work; `sqlite-vec` explicitly documents this combination as supported, unlike the previously-considered `spellfix1`.
- **[Risk]** Model download/caching at deploy time needs disk space and network egress from the production server the first time it runs. → **Mitigation**: vendor the model file into the deploy artifact (download once during CI/build, ship it in the tarball) rather than relying on a first-request download in production, avoiding a cold-start network dependency.
- **[Trade-off]** One-embedding-per-entity loses granularity on very long entities (see Decision 3) — accepted for v1, chunking deferred until real usage shows it's needed.
- **[Trade-off]** Synchronous embedding generation adds latency to entity save operations — accepted given search reads are far more frequent/latency-sensitive than the occasional DM edit.
- **[Risk]** RRF's `k` constant and any per-arm weighting are tuned by intuition initially, not measured against real query logs (none exist yet). → **Mitigation**: ship with standard defaults (`k=60`, equal arm weighting), keep them as named, easily adjustable constants, revisit once real usage/feedback exists.
- **[Risk]** Embedding model quality on Spanish TTRPG-specific vocabulary and proper nouns (character names, invented place names) is unverified — general-purpose multilingual models aren't trained on this specific domain. → **Mitigation**: the hybrid design means lexical FTS5 remains the safety net for exact proper-noun matches regardless of how well the embedding model handles them; semantic search only needs to add value on top, not replace lexical matching for names.
- **[Risk, materialized during rollout]** The model's ~800MB RSS footprint wasn't checked against the production process's existing resource limits before deploying. `ecosystem.config.cjs`'s `max_memory_restart` was `512M` (sized before this change existed) — the app restart-looped in production immediately after the first deploy until this was raised to `1500M`. → **Lesson**: when a change adds a persistent, non-trivial memory footprint to a long-running process, check _that process's own_ configured resource limits (PM2/systemd/container memory caps), not just the host's total available RAM — a change can be well within system capacity and still be killed by a stale per-process cap sized for the old baseline.
- **[Risk]** The cosine-distance cutoff gating the semantic arm (`SEMANTIC_MAX_DISTANCE` in `server/services/embeddings.ts`) has no threshold with comfortable margin on both "real match" and "gibberish" sides given this model's actual score distribution on this project's content — confirmed empirically (see tasks.md section 4), not just theorized. A weak-but-genuine match landing just above this line is silently dropped with no user-visible signal. → **Mitigation**: none beyond the task 5.4 spot-check and ongoing monitoring; flagged here as an accepted, unresolved limitation of the chosen model/threshold approach, not a solved problem.

## Migration Plan

1. Verify `sqlite-vec` loads correctly under the production `better-sqlite3` version/platform (spike, no code committed yet if it fails — fall back path would need re-evaluation).
2. Ship lexical-search improvements (BM25 weighting, phrase syntax, diacritics, trigram typo fallback) first and independently — these need no new native dependency and provide immediate value regardless of the semantic work's timeline.
3. Add the `sqlite-vec` virtual table via migration; vendor the chosen embedding model file into the build artifact.
4. Wire embedding generation into entity create/update paths; run the one-time backfill script manually post-deploy.
5. Enable the hybrid (RRF-fused) query path only after backfill completes and spot-checking result quality against known campaign content (e.g. verify "corrupted children" surfaces the `la-busqueda-de-otto` sessions despite that exact phrase not appearing there).
6. Rollback: hybrid fusion and the semantic arm are additive; disabling is a config flag to fall back to lexical-only, with no destructive change to `entities_fts` or other tables. The `sqlite-vec` table can be dropped independently if needed.

## Open Questions

- Final embedding model choice (`multilingual-e5-small` vs `paraphrase-multilingual-MiniLM-L12-v2` vs others) — to be settled by a small benchmark against real campaign content, not decided speculatively here.
- Whether to chunk long entities (Decision 3 follow-up) — deferred until v1 usage shows a real gap.
- Whether RRF weighting should favor lexical or semantic arms differently per entity type (e.g. character names might want lexical-heavy weighting, long session prose might want semantic-heavy) — deferred, not blocking v1.
- Whether an async/queued embedding pipeline becomes necessary if write-path latency proves noticeable in practice — deferred, not blocking v1.
