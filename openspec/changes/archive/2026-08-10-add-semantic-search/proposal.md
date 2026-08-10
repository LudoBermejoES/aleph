## Why

Aleph's current search (`server/services/search.ts`, a single SQLite FTS5 table over `name`/`aliases`/`tags`/`body`) is purely lexical: it can only find content that shares actual words with the query. Campaigns here run 90+ sessions of long narrative prose where the same fact gets described differently every time (a character's alias changes spelling across years, an antagonist reappears under a different name, a plot thread is described in completely different words session to session) — exactly the pattern this project's own campaign content has repeatedly hit in practice. Keyword search structurally cannot answer "which sessions involve children being corrupted" if the word "corrupted" never appears, or connect an alias like "Christopher" back to the character "Timon Sauerbeck" without a human having manually cross-referenced it.

Production runs on a 4-core ARM (Neoverse-N1) server with 24GB RAM — comfortably enough to run a small local text-embedding model (well under 1GB RAM, CPU-only, no GPU needed) entirely in-process, with no ongoing external API cost and no generative-model inference (no LLM call) anywhere in the search path. This makes semantic (meaning-based) retrieval practical now without the cost/latency/hardware concerns that ruled out a full RAG-with-answer-synthesis approach.

## What Changes

- Add a **local text-embedding pipeline**: generate vector embeddings for entity content (name + body + relevant fields) using a small multilingual embedding model running in-process on the Nitro server (no external API calls, no LLM).
- Add **`sqlite-vec`** as the vector index/storage layer, loaded as a `better-sqlite3` extension, storing one (or more, see design.md) embedding vector per searchable entity per campaign.
- Implement **hybrid search**: combine the existing lexical FTS5 path (kept and improved with BM25 field-weighting and phrase support, per prior investigation) with the new semantic vector path, fusing both result sets into a single ranked list — lexical remains authoritative for exact name/typo matches, semantic catches paraphrased/conceptual matches lexical search misses entirely.
- Add an **embedding indexing pipeline**: generate/update an entity's embedding whenever it's created or edited, plus a one-time batch backfill for existing entities.
- **Explicitly no answer synthesis / no LLM call**: this remains a _retrieval_ improvement — search returns ranked entities and snippets, not a generated natural-language answer. A future RAG-with-synthesis layer could build on this but is out of scope here.

## Capabilities

### New Capabilities

- `search`: Hybrid lexical + semantic full-text search over campaign entities — FTS5 (BM25-weighted, phrase-capable) combined with local-embedding-based vector similarity via `sqlite-vec`, fused into one ranked result set, with no external AI service and no generative-model inference.

### Modified Capabilities

_None — no existing `openspec/specs/` capability currently covers search._

## Impact

- **Affected code**: `server/services/search.ts` (rewritten to add embedding generation + hybrid query/fusion logic), `server/api/campaigns/[id]/search.get.ts`, `server/db/migrations/` (new `sqlite-vec` virtual table + migration), `tests/unit/server/search.test.ts` and a new integration test suite for hybrid ranking.
- **New dependencies**: `sqlite-vec` (npm package with prebuilt native binaries, including linux-arm64) for the vector index; `@huggingface/transformers` (pure JS/ONNX runtime, no Python) for running the local embedding model in-process. Both are CPU-only, no GPU dependency.
- **Infrastructure**: production server (`141.253.193.126`, 4-core ARM/Neoverse-N1, 24GB RAM) has confirmed headroom for this; no hardware changes needed. First embedding-model load will download/cache the model file (~100-500MB depending on model choice) at deploy/first-run time — needs disk space and network access accounted for in deployment.
- **aleph-cli impact**: `aleph search <query>` calls the same endpoint — no new command needed, but response shape may gain fields (e.g. which path — lexical/semantic/both — produced each result) that CLI output formatting should account for.
- **Performance**: embedding generation adds CPU work on entity create/update (one inference call, expected low-hundreds-of-ms on this hardware) and a one-time backfill cost proportional to total entity count across all campaigns.
- **Explicitly out of scope**: any LLM/generative-model call, any external/paid embedding API (the model runs locally), and answer-synthesis UX (chat-style Q&A) — this change only makes retrieval smarter.
