# developer-experience Specification

## Purpose

The repository's baseline developer tooling: a `.env.example` documenting every environment variable, Prettier configuration with `format` scripts, a Husky pre-commit hook running lint-staged, a CI pipeline that runs integration and E2E tests alongside unit tests before deploying, and Docker Compose loading its environment from `.env`.

## Requirements

### Requirement: .env.example documents all environment variables

A `.env.example` file SHALL exist at the project root, listing every required and optional environment variable with a comment describing its purpose and an example (non-secret) value.

#### Scenario: New developer discovers required variables

GIVEN a developer clones the Aleph repository for the first time
WHEN they look for environment configuration guidance
THEN `.env.example` exists at the project root
AND it lists `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NITRO_PORT`, `NITRO_HOST`, and `NUXT_PUBLIC_HOCUSPOCUS_URL` with descriptions

#### Scenario: Copying .env.example creates a working base config

GIVEN a developer copies `.env.example` to `.env`
WHEN they review the file
THEN all variables have safe placeholder values (no real secrets)
AND comments explain which variables are required vs optional

#### Scenario: .env.example is not gitignored

GIVEN the `.gitignore` contains `!.env.example`
WHEN `.env.example` is committed
THEN it is tracked by Git and available to all contributors

---

### Requirement: Prettier enforces consistent code formatting

A `.prettierrc` configuration file SHALL exist at the project root, and `format` / `format:check` npm scripts SHALL be available.

#### Scenario: Developer checks formatting

GIVEN the developer runs `npm run format:check`
WHEN there are files that do not match the Prettier config
THEN the command exits with a non-zero code
AND lists the files that need formatting

#### Scenario: Developer auto-formats code

GIVEN the developer runs `npm run format`
WHEN there are files that do not match the Prettier config
THEN those files are rewritten to match the configured style
AND the command exits with a zero code

#### Scenario: Prettier config matches project conventions

GIVEN the `.prettierrc` file exists
WHEN its settings are inspected
THEN `semi` is `false`
AND `singleQuote` is `true`
AND `tabWidth` is `2`

---

### Requirement: Pre-commit hooks run formatting and linting on staged files

Husky SHALL install a pre-commit hook that runs lint-staged, which applies Prettier and ESLint fixes to staged files before the commit is created.

#### Scenario: Committing unformatted code triggers auto-fix

GIVEN a developer has staged a `.vue` file with inconsistent formatting
WHEN they run `git commit`
THEN the pre-commit hook runs lint-staged
AND Prettier reformats the staged file
AND ESLint fixes auto-fixable issues
AND the commit proceeds with the fixed content

#### Scenario: Committing code with unfixable lint errors blocks commit

GIVEN a developer has staged a `.ts` file with an ESLint error that cannot be auto-fixed
WHEN they run `git commit`
THEN the pre-commit hook runs lint-staged
AND the commit is blocked with an error message

#### Scenario: Husky installs automatically on npm install

GIVEN a developer runs `npm install` in the project root
WHEN the `prepare` script executes
THEN Husky is set up and the `.husky/pre-commit` hook is installed

---

### Requirement: CI pipeline runs integration and E2E tests

The GitHub Actions workflow SHALL run integration tests (with a running Nuxt server) and E2E tests (with Playwright) in addition to unit tests, before deploying.

#### Scenario: Integration tests run in CI with a server

GIVEN a push to the `master` branch triggers the CI pipeline
WHEN the integration test job starts
THEN a Nuxt dev server is started on port 3333
AND `vitest run tests/integration/` executes against it
AND the job fails if any integration test fails

#### Scenario: E2E tests run in CI with Playwright

GIVEN the integration test job has passed
WHEN the E2E test job starts
THEN Playwright browsers are installed
AND a Nuxt dev server is started
AND `npx playwright test` executes
AND test artifacts (screenshots, traces) are uploaded on failure

#### Scenario: Unit test failure prevents integration and E2E from running

GIVEN a push to `master` with a failing unit test
WHEN the CI pipeline runs
THEN the unit test job fails
AND the integration and E2E test jobs do not start
AND the deploy job does not start

#### Scenario: Pipeline passes all stages before deploying

GIVEN all tests pass (unit, integration, E2E)
WHEN the CI pipeline reaches the deploy job
THEN deployment proceeds as before

---

### Requirement: Docker Compose loads environment from .env file

The `docker-compose.yml` SHALL include an `env_file: .env` directive on the `aleph` service so that environment variables are loaded automatically.

#### Scenario: Container starts with variables from .env

GIVEN a `.env` file exists at the project root with `BETTER_AUTH_SECRET=somesecret`
WHEN `docker compose up` is run
THEN the `aleph` container has `BETTER_AUTH_SECRET` set to `somesecret`
AND no manual `-e` flags are required

#### Scenario: Container starts without .env file

GIVEN no `.env` file exists at the project root
WHEN `docker compose up` is run
THEN the container starts using the inline `environment` values from `docker-compose.yml`
AND no error is raised about the missing env file

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
