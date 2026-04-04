## Group: .env.example

### Task 1: Create .env.example at project root

Create `.env.example` with all known environment variables, grouped by subsystem, with comments and safe placeholder values.

**Files:**
- `.env.example` (new)

**Variables to include:**
```
# Auth (required)
BETTER_AUTH_SECRET=change-me-to-a-random-string
BETTER_AUTH_URL=http://localhost:3000

# Server
NITRO_PORT=3000
NITRO_HOST=0.0.0.0
NODE_ENV=development

# Database (SQLite — path is convention-based, no URL needed unless overridden)
# DATABASE_URL=file:./data/aleph.db

# Hocuspocus (real-time collaboration)
NUXT_PUBLIC_HOCUSPOCUS_URL=ws://localhost:3334

# Public base URL
NUXT_PUBLIC_BASE_URL=http://localhost:3000
```

Review `nuxt.config.ts`, `server/` code, and deployment scripts for any additional variables.

---

## Group: Prettier setup

### Task 2: Add Prettier config and npm scripts

Install `prettier` as a devDependency. Create `.prettierrc` with project-aligned settings. Add `format` and `format:check` scripts to `package.json`.

**Files:**
- `package.json` — add devDependency, add scripts
- `.prettierrc` (new)

**Prettier config:**
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "vueIndentScriptAndStyle": false
}
```

**Scripts:**
```json
{
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

### Task 3: Add .prettierignore

Create `.prettierignore` to skip generated/vendored directories.

**Files:**
- `.prettierignore` (new)

**Contents:**
```
.output
.nuxt
.data
node_modules
dist
data
server/db/migrations
```

---

## Group: Husky + lint-staged

### Task 4: Install and configure Husky

Install `husky` as a devDependency. Add `prepare` script to `package.json`. Initialize `.husky/` directory with a pre-commit hook.

**Files:**
- `package.json` — add devDependency, add `"prepare": "husky"` script
- `.husky/pre-commit` (new) — contains `npx lint-staged`

### Task 5: Install and configure lint-staged

Install `lint-staged` as a devDependency. Add config to `package.json`.

**Files:**
- `package.json` — add devDependency, add `lint-staged` config

**Config:**
```json
{
  "lint-staged": {
    "*.{js,ts,vue,json,css,md}": "prettier --write",
    "*.{js,ts,vue}": "eslint --fix"
  }
}
```

---

## Group: CI pipeline updates

### Task 6: Add integration test job to GitHub Actions

Add an `integration-test` job to `.github/workflows/deploy.yml` that depends on the `test` (unit) job. The job starts a Nuxt dev server on port 3333 and runs integration tests.

**Files:**
- `.github/workflows/deploy.yml`

**Job outline:**
```yaml
integration-test:
  needs: test
  runs-on: ubuntu-latest
  steps:
    - Checkout
    - Setup Node.js 22
    - npm ci
    - Run integration tests via start-server-and-test
```

Use the existing `test:integration` script from `package.json` which already handles server startup.

### Task 7: Add E2E test job to GitHub Actions

Add an `e2e-test` job that depends on `integration-test`. Installs Playwright browsers, starts the server, runs E2E tests, and uploads artifacts on failure.

**Files:**
- `.github/workflows/deploy.yml`

**Job outline:**
```yaml
e2e-test:
  needs: integration-test
  runs-on: ubuntu-latest
  steps:
    - Checkout
    - Setup Node.js 22
    - npm ci
    - Install Playwright browsers (npx playwright install --with-deps)
    - Run E2E tests (npm run test:e2e)
    - Upload Playwright report (on failure, uses actions/upload-artifact)
```

### Task 8: Update deploy job dependencies

Update the `deploy` job's `needs` to depend on all test jobs (`test`, `integration-test`, `e2e-test`) so deployment only proceeds after all tests pass.

**Files:**
- `.github/workflows/deploy.yml` — change `needs: test` to `needs: [test, integration-test, e2e-test]`

---

## Group: Docker Compose fix

### Task 9: Add env_file to docker-compose.yml

Add `env_file: .env` to the `aleph` service in `docker-compose.yml`. Use `required: false` (Compose v2.24+) so the container starts even if `.env` does not exist.

**Files:**
- `docker-compose.yml`

**Change:**
```yaml
services:
  aleph:
    build: .
    env_file:
      - path: .env
        required: false
    ports:
      ...
```

---

## Group: Testing

### Task 10: Unit tests for .env.example and config files

Write unit tests that verify:
- `.env.example` exists and contains expected variable names
- `.prettierrc` exists and contains expected keys
- `package.json` has `format`, `format:check`, and `prepare` scripts
- `docker-compose.yml` contains `env_file`

**Files:**
- `tests/unit/devops/config-files.test.ts` (new)

### Task 11: Verify Prettier format:check passes

After initial formatting (if applied), add a CI step or test that confirms `npm run format:check` exits cleanly. This can be a step in the unit test job or a standalone check.

**Files:**
- `.github/workflows/deploy.yml` — optionally add `npm run format:check` step in the `test` job

---

## Group: Verification

### Task 12: Run full test suite and verify pipeline

Run `npm run test:unit` to confirm unit tests pass. Run `npm run format:check` to confirm formatting. Verify the GitHub Actions YAML is valid. Confirm `docker compose config` validates the updated compose file.

**Files:** (no file changes, verification only)
