## Why

New contributors face unnecessary friction when setting up the project: there is no `.env.example` to document required environment variables, no shared formatting configuration, and no pre-commit hooks to enforce code quality. Meanwhile, the CI pipeline only runs unit tests, leaving integration and E2E test suites unexercised in automated checks. The Docker Compose file also lacks an `env_file` directive, forcing manual environment variable management for container deployments.

Addressing these gaps as a batch reduces onboarding time, prevents formatting drift, and catches regressions earlier in the pipeline.

## What Changes

- **`.env.example`**: Add a documented file listing all required and optional environment variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NITRO_PORT`, `NITRO_HOST`, `DATABASE_URL`, `NUXT_PUBLIC_HOCUSPOCUS_URL`, etc.) with comments and example values.
- **Prettier configuration**: Add `.prettierrc` with project-wide formatting rules and a `format` / `format:check` npm script. Configure for Vue, TypeScript, and JSON files.
- **Husky + lint-staged**: Install Husky for Git hooks and lint-staged to run Prettier and ESLint on staged files before each commit.
- **CI pipeline expansion**: Add integration test and E2E test stages to `.github/workflows/deploy.yml`, using `start-server-and-test` for the integration tests (which require a running server) and Playwright for E2E.
- **Docker Compose `env_file`**: Add `env_file: .env` to the service definition so environment variables are loaded automatically.

## Capabilities

### New Capabilities

- `env-documentation`: `.env.example` provides a single source of truth for all environment variables, their purpose, and default values.
- `code-formatting`: Prettier config ensures consistent formatting across the codebase regardless of individual IDE settings.
- `pre-commit-quality`: Husky + lint-staged automatically format and lint staged files before commit, preventing style drift.

### Modified Capabilities

- `ci-pipeline`: GitHub Actions workflow expanded from unit-tests-only to include integration tests (with server startup) and E2E tests (with Playwright).
- `docker-deployment`: Docker Compose loads environment from `.env` automatically via `env_file` directive.

## Impact

- `.env.example` (new) — documented environment variable template
- `.prettierrc` (new) — Prettier configuration
- `.husky/pre-commit` (new) — pre-commit hook running lint-staged
- `.lintstagedrc` or `package.json` lint-staged config — staged file formatting/linting
- `package.json` — new `devDependencies` (prettier, husky, lint-staged), new scripts (`format`, `format:check`, `prepare`)
- `.github/workflows/deploy.yml` — add integration and E2E test jobs
- `docker-compose.yml` — add `env_file: .env`
- **CLI impact**: None. No API endpoints, auth flows, or data models are changed. The CLI does not need updates.
