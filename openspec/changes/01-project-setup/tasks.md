# Tasks: Project Setup

## 1. Nuxt 4 Scaffold

- [ ] 1.1 Initialize Nuxt 4 project with minimal template (replace prototype/)
- [ ] 1.2 Configure `nuxt.config.ts`: modules, Nitro experimental WebSocket, devtools
- [ ] 1.3 Set up TypeScript with strict mode in `tsconfig.json`
- [ ] 1.4 Configure ESLint with `@nuxt/eslint-config`
- [ ] 1.5 Set up `.gitignore` (node_modules, .nuxt, .output, data/, content/campaigns/)

## 2. Database Setup

- [ ] 2.1 Install better-sqlite3 and drizzle-orm
- [ ] 2.2 Create `server/db/index.ts`: connection setup with WAL mode, foreign keys
- [ ] 2.3 Create `drizzle.config.ts` for migration tooling
- [ ] 2.4 Create initial schema files: `server/db/schema/users.ts`, `server/db/schema/campaigns.ts`
- [ ] 2.5 Generate and apply first migration: users and campaigns tables
- [ ] 2.6 Add server startup hook to run pending migrations automatically

## 3. UI Foundation

- [ ] 3.1 Install and configure Tailwind CSS 4
- [ ] 3.2 Install and configure shadcn-vue (button, input, card, dialog, dropdown, sidebar components)
- [ ] 3.3 Create `app/layouts/default.vue`: sidebar + main content area shell
- [ ] 3.4 Create `app/pages/index.vue`: landing/dashboard placeholder
- [ ] 3.5 Add dark mode support via Tailwind

## 4. Testing Infrastructure

- [ ] 4.1 Install vitest, @nuxt/test-utils, @vue/test-utils, @playwright/test
- [ ] 4.2 Create `vitest.config.ts` using `defineVitestConfig` from @nuxt/test-utils/config
- [ ] 4.3 Create test directory structure: `tests/unit/server/`, `tests/unit/components/`, `tests/integration/`, `tests/e2e/`
- [ ] 4.4 Create `server/utils/db.ts` with dependency injection pattern (accept db instance, allow override in tests)
- [ ] 4.5 Create `tests/helpers/db.ts`: test DB factory using `:memory:` SQLite + schema setup
- [ ] 4.6 Create `tests/helpers/content.ts`: temp directory factory for markdown file tests
- [ ] 4.7 Create `playwright.config.ts` with webServer pointing to nuxt preview
- [ ] 4.8 Add npm scripts: `test`, `test:unit`, `test:integration`, `test:e2e`, `test:coverage`
- [ ] 4.9 Write first test: `tests/unit/server/db.test.ts` -- verify SQLite connection, WAL mode, migrations run
- [ ] 4.10 Verify CI-friendly: all tests pass with `npm test` in a clean environment

## 5. Deployment

- [ ] 5.1 Create `Dockerfile`: Node.js 22 LTS, multi-stage build, volume mounts
- [ ] 5.2 Create `docker-compose.yml`: single service with data/ and content/ volumes
- [ ] 5.3 Add npm scripts: `dev`, `build`, `start`, `db:generate`, `db:migrate`
- [ ] 5.4 Verify `nuxt build` produces working standalone server
