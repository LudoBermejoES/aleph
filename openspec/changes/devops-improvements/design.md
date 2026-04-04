## Context

Aleph is a full-stack Nuxt 4 application deployed via GitHub Actions to a remote server using PM2. The project already has ESLint (via `@nuxt/eslint`), Vitest for unit and integration tests, and Playwright for E2E tests. However, the CI pipeline only runs unit tests, there is no shared formatting tool, no Git hooks, and no `.env.example` to guide new developers.

The project uses `start-server-and-test` for local integration testing (spinning up Nuxt on port 3333), and Playwright is configured for E2E. These tools are already wired into `package.json` scripts (`test:integration`, `test:e2e`, `test:all`) but are not exercised in CI.

The `.gitignore` already excludes `.env` and `.env.*` but explicitly allows `.env.example`.

## Goals / Non-Goals

**Goals:**
- New developers can clone the repo, copy `.env.example` to `.env`, and have a working configuration
- All code is formatted consistently via Prettier, enforced at commit time
- CI catches integration and E2E regressions before deployment, not just unit test failures
- Docker Compose picks up environment variables from `.env` automatically
- Pre-commit hooks prevent committing unformatted or lint-failing code

**Non-Goals:**
- No changes to the application code, features, or database schema
- No migration to a different CI provider (staying with GitHub Actions)
- No Docker image rebuild or Dockerfile changes
- No enforcement of Prettier on existing codebase in a single commit (initial formatting is a separate optional step)
- No changes to the aleph-cli tool

## Decisions

**Decision 1: Prettier config as `.prettierrc` (JSON)**
Use a simple JSON `.prettierrc` file at project root. Key choices:
- `semi: false` — aligns with the existing codebase style (no semicolons in Vue/TS files)
- `singleQuote: true` — matches current convention
- `trailingComma: "all"` — modern default, prevents noisy diffs
- `printWidth: 100` — slightly wider than default 80, suits component templates
- `tabWidth: 2` — matches existing indentation
- `vueIndentScriptAndStyle: false` — keeps script/style blocks at root indent level, consistent with current files

**Decision 2: CI integration test strategy**
Integration tests require a running Nuxt server. In CI, use the existing `start-server-and-test` approach:
1. Start the dev server on port 3333 in the background
2. Wait for the server to be ready
3. Run `vitest run tests/integration/`

This runs as a separate job after the unit test job passes, to keep failure isolation clean. The integration job needs to build/start the server, so it has a longer timeout.

**Decision 3: CI E2E test strategy**
E2E tests run in a separate job after integration tests. The job installs Playwright browsers, starts the Nuxt dev server, and runs `npx playwright test`. Playwright test artifacts (screenshots, traces) are uploaded as GitHub Actions artifacts on failure for debugging.

**Decision 4: Husky + lint-staged setup**
- Husky v9+ (modern, uses `.husky/` directory with simple shell scripts)
- `prepare` script in `package.json` runs `husky` to set up hooks on `npm install`
- lint-staged config in `package.json` under `"lint-staged"` key (avoids extra config file)
- Pre-commit hook runs lint-staged, which runs Prettier `--write` and ESLint `--fix` on staged files
- File patterns: `*.{js,ts,vue,json,css,md}` for Prettier, `*.{js,ts,vue}` for ESLint

**Decision 5: `.env.example` variable inventory**
Document all variables the app reads, grouped by subsystem:
- **Auth**: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- **Server**: `NITRO_PORT`, `NITRO_HOST`, `NODE_ENV`
- **Database**: `DATABASE_URL` (if applicable, or note that SQLite path is convention-based)
- **Hocuspocus**: `NUXT_PUBLIC_HOCUSPOCUS_URL`
- **Nuxt public**: `NUXT_PUBLIC_BASE_URL`

Each variable includes a comment with its purpose and a safe example value (no real secrets).

**Decision 6: Docker Compose `env_file` placement**
Add `env_file: .env` directly under the `aleph` service. This is the simplest approach and matches Docker Compose conventions. The `.env` file is already gitignored, so no secrets leak.

## Risks / Trade-offs

- [Risk] Running integration/E2E tests in CI increases pipeline duration by several minutes -> Mitigation: run them in parallel jobs after unit tests; they only block deployment, not the feedback loop for unit tests
- [Risk] Husky hooks may frustrate developers if Prettier/ESLint rules conflict with existing code -> Mitigation: run initial formatting pass as first task; lint-staged only touches staged files so existing unformatted code is not affected
- [Risk] `start-server-and-test` in CI may be flaky if the server takes too long to start -> Mitigation: configure a generous timeout and health-check URL; the existing `package.json` script already uses this pattern successfully for local dev
- [Risk] Playwright browser install in CI adds time and disk usage -> Mitigation: cache Playwright browsers using the standard `actions/cache` pattern with the Playwright version as cache key
