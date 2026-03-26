# Tasks: Project Setup

## 1. Nuxt 4 Scaffold

- [x] 1.1 Initialize Nuxt 4 project with minimal template (replace prototype/)
- [x] 1.2 Configure `nuxt.config.ts`: modules, Nitro experimental WebSocket, devtools
- [x] 1.3 Set up TypeScript with strict mode in `tsconfig.json`
- [x] 1.4 Configure ESLint with `@nuxt/eslint-config`
- [x] 1.5 Set up `.gitignore` (node_modules, .nuxt, .output, data/, content/campaigns/)

## 2. Database Setup

- [x] 2.1 Install better-sqlite3 and drizzle-orm
- [x] 2.2 Create `server/db/index.ts`: connection setup with WAL mode, foreign keys
- [x] 2.3 Create `drizzle.config.ts` for migration tooling
- [x] 2.4 Create initial schema files: `server/db/schema/users.ts`, `server/db/schema/campaigns.ts`
- [x] 2.5 Generate and apply first migration: users and campaigns tables
- [x] 2.6 Add server startup hook to run pending migrations automatically

## 3. UI Foundation

- [x] 3.1 Install and configure Tailwind CSS 4
- [x] 3.2 Install and configure shadcn-vue (button, input, card, dialog, dropdown, sidebar components)
- [x] 3.3 Create `app/layouts/default.vue`: sidebar + main content area shell
- [x] 3.4 Create `app/pages/index.vue`: landing/dashboard placeholder
- [x] 3.5 Add dark mode support via Tailwind

## 4. Testing Infrastructure

- [x] 4.1 Install vitest, @nuxt/test-utils, @vue/test-utils, @playwright/test
- [x] 4.2 Create `vitest.config.ts` using `defineVitestConfig` from @nuxt/test-utils/config
- [x] 4.3 Create test directory structure: `tests/unit/server/`, `tests/unit/components/`, `tests/integration/`, `tests/e2e/`
- [x] 4.4 Create `server/utils/db.ts` with dependency injection pattern (accept db instance, allow override in tests)
- [x] 4.5 Create `tests/helpers/db.ts`: test DB factory using `:memory:` SQLite + schema setup
- [x] 4.6 Create `tests/helpers/content.ts`: temp directory factory for markdown file tests
- [x] 4.7 Create `playwright.config.ts` with webServer pointing to nuxt preview
- [x] 4.8 Add npm scripts: `test`, `test:unit`, `test:integration`, `test:e2e`, `test:coverage`
- [x] 4.9 Write first test: `tests/unit/server/db.test.ts` -- verify SQLite connection, WAL mode, migrations run
- [x] 4.10 Verify CI-friendly: all tests pass with `npm test` in a clean environment

## 5. Deployment

- [x] 5.1 Create `Dockerfile`: Node.js 22 LTS, multi-stage build, volume mounts
- [x] 5.2 Create `docker-compose.yml`: single service with data/ and content/ volumes
- [x] 5.3 Add npm scripts: `dev`, `build`, `start`, `db:generate`, `db:migrate`
- [x] 5.4 Verify `nuxt build` produces working standalone server
