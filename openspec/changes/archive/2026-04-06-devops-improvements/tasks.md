# DevOps Improvements — Tasks

## 1. Environment variables

- [x] 1.1 Create `.env.example` at project root with all known variables grouped by subsystem (auth, server, database, Hocuspocus, public base URL) with comments and safe placeholder values — review `nuxt.config.ts` and `server/` for any additional vars

## 2. Prettier

- [x] 2.1 Install `prettier` as devDependency; create `.prettierrc` with project settings (`semi: false`, `singleQuote: true`, `trailingComma: all`, `printWidth: 100`, `tabWidth: 2`, `vueIndentScriptAndStyle: false`); add `format` and `format:check` scripts to `package.json`
- [x] 2.2 Create `.prettierignore` excluding `.output`, `.nuxt`, `.data`, `node_modules`, `dist`, `data`, `server/db/migrations`

## 3. Husky + lint-staged

- [x] 3.1 Install `husky` as devDependency; add `"prepare": "husky"` script to `package.json`; create `.husky/pre-commit` hook running `npx lint-staged`
- [x] 3.2 Install `lint-staged` as devDependency; add `lint-staged` config to `package.json` — run Prettier on `*.{js,ts,vue,json,css,md}` and ESLint fix on `*.{js,ts,vue}`

## 4. CI pipeline

- [x] 4.1 Add `integration-test` job to `.github/workflows/deploy.yml` — depends on `test`, starts Nuxt dev server on port 3333, runs `test:integration`
- [x] 4.2 Add `e2e-test` job — depends on `integration-test`, installs Playwright browsers, runs `test:e2e`, uploads Playwright report artifact on failure
- [x] 4.3 Update `deploy` job `needs` to `[test, integration-test, e2e-test]`

## 5. Docker Compose

- [x] 5.1 Add `env_file: [{ path: .env, required: false }]` to the `aleph` service in `docker-compose.yml`

## 6. Testing

- [x] 6.1 Add `tests/unit/devops/config-files.test.ts` — verify `.env.example`, `.prettierrc`, `package.json` scripts, and `docker-compose.yml` contain expected keys/values
- [x] 6.2 Add `npm run format:check` step to the `test` job in `.github/workflows/deploy.yml`

## 7. Verification

- [x] 7.1 Run `npm run test:unit` — all unit tests pass
- [x] 7.2 Run `npm run format:check` — no formatting issues
- [x] 7.3 Run `docker compose config` — validates updated compose file
- [x] 7.4 Verify GitHub Actions YAML is valid (`actionlint` or push to branch)
