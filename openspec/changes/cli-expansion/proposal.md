## Why

The Aleph CLI (`cli/`) currently covers 15 commands (campaign, character, entity, location, organization, session, session-group, member, relation, roll, search, login, logout, config, import-arcadia) but the server API surface has grown significantly -- maps, quests, calendars, timelines, inventories, items, shops, currencies, transactions, templates, tags, arcs, and chapters all have full REST endpoints with no CLI counterpart. This means roughly 40% of the API is unreachable from the terminal, forcing users to fall back to `curl` or the web UI for common DM operations like managing maps, tracking quests, or handling the economy system.

Additionally, the CLI has accumulated technical debt: it is written in plain JavaScript while the rest of the codebase is TypeScript, and interactive prompts use three different libraries (`@inquirer/prompts` in campaign.js, `readline.createInterface` in character.js, `process.stdin` reads in organization.js). This inconsistency makes the CLI harder to maintain and extend.

## What Changes

1. **TypeScript migration** -- Convert the CLI from JavaScript to TypeScript with incremental migration (new commands in TS, existing commands converted group by group).
2. **Prompt standardization** -- Replace all `readline` and raw `process.stdin` usage with `@inquirer/prompts` across every command file.
3. **New commands** -- Add CLI commands for all missing API areas: maps (CRUD, upload, pins), quests (CRUD, status updates), calendars & events, timelines & events, inventories (CRUD, add/transfer items), items (CRUD), shops (CRUD, stock, buy/sell), currencies (CRUD, convert), transactions (CRUD), templates (CRUD), tags (list, create), arcs (list, create), chapters (list, create), and a health check command.
4. **Skill file updates** -- Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` to reflect the full expanded command surface.

## Capabilities

### New Capabilities

- `cli-maps`: List, get, create, update, delete maps; upload map image; list/create/delete pins
- `cli-quests`: List, get, create, update quests with status management
- `cli-calendars`: List, get, create, update calendars; list/create events; advance date
- `cli-timelines`: List, get, create timelines; list/create timeline events
- `cli-inventories`: List, create inventories; add items to inventory; transfer items between inventories
- `cli-items`: List, create items with price support
- `cli-shops`: List, get, create shops; manage stock; buy/sell operations
- `cli-currencies`: List, create currencies; currency conversion lookup
- `cli-transactions`: List, create, update, delete transactions
- `cli-templates`: List, get, create, update, delete entity templates
- `cli-tags`: List, create tags
- `cli-arcs-chapters`: List, create arcs and chapters
- `cli-health`: Server health check command (`aleph health`)
- `cli-typescript`: TypeScript compilation and type safety for all CLI code
- `cli-prompts-standard`: Unified interactive prompt experience using `@inquirer/prompts`

### Modified Capabilities

- All 15 existing command files: migrated from `.js` to `.ts`, prompts standardized to `@inquirer/prompts`
- `cli/package.json`: TypeScript devDependencies added, build script configured
- `cli/src/lib/client.js` -> `client.ts`: typed request/response helpers

## Impact

- **CLI directory (`cli/`)**: Every file changes -- `.js` to `.ts` conversion, new command files, updated `package.json` with TypeScript tooling
- **No server changes**: All API endpoints already exist; this change is CLI-only
- **No DB migrations**: No schema changes needed
- **Skill files**: `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` must be updated with all new commands (bump version)
- **Tests**: New unit tests for command argument parsing and output formatting; new integration tests for each command group against the running server
- **i18n**: No impact (CLI is English-only)
- **Dependencies**: New devDependencies in `cli/package.json` -- `typescript`, `@types/node`, `tsx` (for development execution)
