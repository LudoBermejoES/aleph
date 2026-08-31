## ADDED Requirements

### Requirement: The development server boots and serves API routes

A checkout with dependencies installed SHALL be able to run `npm run dev` and receive a JSON
response from `/api/health`. No module SHALL import `@huggingface/transformers` (and therefore
`onnxruntime-node`'s native addon) at module-evaluation scope; the import SHALL be deferred to
the point an embedding is first needed.

#### Scenario: A fresh dev server answers an API route

GIVEN port 3333 is free and `npm run dev -- --port 3333` is the only server running
WHEN a client requests `GET /api/health`
THEN the response is `200` with `content-type: application/json`
AND it is not `500 Module did not self-register: .../onnxruntime_binding.node`

#### Scenario: The dev server keeps serving after it reloads

GIVEN a dev server that has already served a request
WHEN the Nitro dev server reloads its server bundle
THEN `GET /api/health` still answers `200 application/json`

#### Scenario: The embedding model still loads when it is actually used

GIVEN a running server
WHEN a request reaches the semantic arm of search for the first time
THEN the embedding pipeline loads and the search returns results
AND the model cache directory is still the project-root `models/` directory

---

### Requirement: Boot-time index backfills can be skipped locally

The one-time index backfills in `server/plugins/watcher.ts` SHALL run by default. Setting the
environment variable `STARTUP_BACKFILLS_ENABLED` to exactly the string `false` SHALL skip all of
them for that process, and SHALL NOT skip the index initialisation (`initFTS5`, `initVecTable`)
that creates the tables and completes the role-scoped lexical migration. The variable SHALL be
documented in `.env.example` and `docs/development.md`, commented out, with a warning against
setting it in production.

#### Scenario: Unset means the backfills run

GIVEN `STARTUP_BACKFILLS_ENABLED` is not set
WHEN the server boots
THEN every backfill in `server/plugins/watcher.ts` runs exactly as before

#### Scenario: A developer skips the backfills to get a usable dev server

GIVEN a database with thousands of entities still lacking an embedding
WHEN the server is started with `STARTUP_BACKFILLS_ENABLED=false`
THEN the server logs that it is skipping the backfills
AND it accepts requests without waiting for them
AND the FTS5 and vector tables are still initialised

#### Scenario: Only the exact string disables it

GIVEN `STARTUP_BACKFILLS_ENABLED` is set to `0`, `no`, `FALSE`, `' false'`, or the empty string
WHEN the server boots
THEN the backfills run, because none of those values is the string `false`

#### Scenario: The integration-test script keeps exercising the default boot

GIVEN the `test:integration` npm script
WHEN it is inspected
THEN it does not set `STARTUP_BACKFILLS_ENABLED`, so CI boots the server the way production does
