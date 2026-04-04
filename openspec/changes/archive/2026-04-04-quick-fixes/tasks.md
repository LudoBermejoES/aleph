## 1. Hocuspocus WebSocket URL

- [x] 1.1 Add `hocuspocusUrl` to `runtimeConfig.public` in `nuxt.config.ts` with default `ws://localhost:3334`
- [x] 1.2 Update `app/components/MarkdownEditor.client.vue` to read the URL from `useRuntimeConfig().public.hocuspocusUrl` instead of hardcoded string

## 2. Graph Node Click Navigation

- [x] 2.1 In `app/pages/campaigns/[id]/graph.vue`, implement the node-click handler to call `navigateTo(`/campaigns/${campaignId}/entities/${node.id}`)` replacing the TODO stub

## 3. CLI Roll Auth Fix

- [x] 3.1 In `cli/src/commands/roll.js`, change `config.token` to `config.apiKey` in the auth check (~line 42)

## 4. Replace alert() with Toast

- [x] 4.1 In `app/pages/campaigns/[id]/entities/[slug]/index.vue`, replace `alert()` calls with ErrorToast
- [x] 4.2 In `app/pages/campaigns/[id]/relations/[relationId]/edit.vue`, replace `alert()` calls with ErrorToast
- [x] 4.3 In `app/pages/campaigns/[id]/quests/[slug]/edit.vue`, replace `alert()` calls with ErrorToast
- [x] 4.4 In `app/pages/campaigns/[id]/inventories/index.vue` — already uses ErrorToast (no alert() found)
- [x] 4.5 In `app/pages/campaigns/[id]/session-groups/index.vue`, replace `alert()` calls with error.value

## 5. 404 Page i18n

- [x] 5.1 Add `errors.notFoundTitle` and `errors.notFoundBack` keys to `i18n/locales/en.json`
- [x] 5.2 Add matching keys to `i18n/locales/es.json`
- [x] 5.3 Update the 404 error page to use `$t()` for all hardcoded strings

## 6. Auth Layout i18n

- [x] 6.1 Add `auth.appTitle` key to `i18n/locales/en.json` and `i18n/locales/es.json`
- [x] 6.2 Update `app/layouts/auth.vue` to use `$t('auth.appTitle')` instead of hardcoded "TTRPG Campaign Manager"

## 7. .env.example

- [x] 7.1 Create `.env.example` at project root with documented variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NUXT_PUBLIC_BASE_URL`, `NUXT_PUBLIC_HOCUSPOCUS_URL`, and any other env vars found in the codebase

## 8. Remove Unused ora Dependency

- [x] 8.1 Verify no file in `cli/src/` imports `ora`
- [x] 8.2 Remove `ora` from `cli/package.json` dependencies
- [x] 8.3 Run `npm install` in `cli/` to update lockfile

## 9. Docker Compose env_file

- [x] 9.1 Add `env_file: .env` to the service definition in `docker-compose.yml`

## 10. CLI Session-Group Delete Confirmation

- [x] 10.1 In `cli/src/commands/session-group.js`, add a confirmation prompt using `@inquirer/prompts` before deleting
- [x] 10.2 Add `--yes` flag option that skips the confirmation prompt
- [x] 10.3 Update help text for the delete subcommand to mention the `--yes` flag

## 11. Skill Files

- [x] 11.1 Update `docs/claude-skill.md` — document `--yes` flag on `session-group delete`
- [x] 11.2 Mirror to `.claude/skills/aleph-cli/SKILL.md`, bump version to 2.4

## 12. Tests

- [x] 12.1 Unit test: verify `roll.js` uses `config.apiKey` for auth check
- [x] 12.2 Unit test: verify session-group delete confirmation prompt logic (confirms deletes, denial aborts, `--yes` skips)
- [x] 12.3 Unit test: verify Hocuspocus URL is read from runtime config (not hardcoded)
- [x] 12.4 E2E test: 404 page renders correctly in English
- [x] 12.5 E2E test: auth layout shows translated title
- [x] 12.6 E2E test: graph page loads without TODO stub
