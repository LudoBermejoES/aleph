## Why

A project-wide analysis surfaced several small bugs, hardcoded strings, and missing configuration that individually are low-effort but collectively degrade the developer and player experience. Fixing them in one batch avoids context-switching overhead for ten separate changes.

## What Changes

- **Hocuspocus WebSocket URL**: `MarkdownEditor.client.vue` hardcodes `ws://localhost:3334`. Replace with a runtime-config value so the editor connects correctly in production.
- **Graph node click navigation**: The graph page has a TODO stub at the node-click handler. Implement navigation to the clicked entity's detail page.
- **CLI `roll.js` auth check**: The roll command checks `config.token` (legacy) instead of `config.apiKey`, so server-side roll recording silently fails. Fix to use `config.apiKey`.
- **Replace `alert()` calls with toast**: Several pages use raw `alert()` for error feedback. Replace with the project's toast/ErrorToast pattern for consistent UX.
- **404 page i18n**: The 404 error page has hardcoded English strings. Extract to `$t()` keys.
- **Auth layout i18n**: The auth layout hardcodes "TTRPG Campaign Manager". Extract to `$t()` key.
- **`.env.example`**: Add a documented `.env.example` so new developers know which variables to set.
- **Remove unused `ora` dependency**: CLI `package.json` lists `ora` but it is never imported. Remove it.
- **`docker-compose.yml` env_file**: Add `env_file: .env` so the container picks up environment variables without manual `-e` flags.
- **CLI session-group delete confirmation**: The CLI deletes session groups without prompting. Add a confirmation prompt (with `--yes` bypass flag).

## Capabilities

### Modified Capabilities

- `collaborative-editing`: Hocuspocus WebSocket URL driven by runtime config instead of hardcoded localhost.
- `relationship-graph`: Node clicks navigate to the entity detail page.
- `cli-dice-tools`: Roll command uses the correct auth key for server recording.
- `entity-detail-ui`: Error feedback via toast instead of `alert()`.
- `error-pages`: 404 page fully internationalized.
- `auth-ui`: Auth layout title internationalized.
- `cli-session-management`: Session-group delete requires confirmation.

### New Capabilities

- `env-example`: Documented `.env.example` at project root.

## Impact

- `app/components/MarkdownEditor.client.vue` — replace hardcoded WS URL with `useRuntimeConfig().public.hocuspocusUrl`
- `app/pages/campaigns/[id]/graph.vue` — implement node-click handler
- `cli/src/commands/roll.js` — fix `config.token` to `config.apiKey`
- `app/pages/campaigns/[id]/entities/[entityId].vue`, `app/pages/campaigns/[id]/relations/edit.vue`, `app/pages/campaigns/[id]/quests/edit.vue`, `app/pages/campaigns/[id]/inventories/create.vue`, session-group pages — replace `alert()` with toast
- `app/error.vue` (or 404 page) — use `$t()` keys
- `app/layouts/auth.vue` — use `$t()` key for title
- `.env.example` — new file
- `cli/package.json` — remove `ora`
- `docker-compose.yml` — add `env_file: .env`
- `cli/src/commands/session-group.js` — add confirmation prompt to delete
- `i18n/locales/en.json` + `es.json` — new keys for 404 page and auth layout
- `docs/claude-skill.md` + `.claude/skills/aleph-cli/SKILL.md` — document `--yes` flag on session-group delete
