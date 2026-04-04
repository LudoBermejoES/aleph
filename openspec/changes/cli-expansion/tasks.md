# Tasks: CLI Expansion & TypeScript Migration

## 1. TypeScript Setup for CLI

- [ ] 1.1 Add `typescript`, `@types/node`, and `tsx` as devDependencies in `cli/package.json`
- [ ] 1.2 Create `cli/tsconfig.json` with `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `outDir: dist`, `rootDir: src`, `strict: true`, `allowJs: true` (for incremental migration)
- [ ] 1.3 Add `build` script (`tsc`) and `dev` script (`tsx`) to `cli/package.json`
- [ ] 1.4 Update `cli/bin/aleph.js` entry point to import from `dist/` (compiled output) with fallback to `tsx` registration for development
- [ ] 1.5 Convert `cli/src/lib/client.js` to `client.ts` -- add typed `request<T>()` generic, typed `get<T>()`, `post<T>()`, `put<T>()`, `del<T>()`, `postMultipart<T>()` helpers
- [ ] 1.6 Convert `cli/src/lib/config.js` to `config.ts` -- add `AlephConfig` interface
- [ ] 1.7 Convert `cli/src/lib/output.js` to `output.ts` -- add typed `print()` and `success()` functions
- [ ] 1.8 Verify `node cli/bin/aleph.js --help` works after lib conversion

## 2. Standardize Prompts

- [ ] 2.1 Audit all command files for non-`@inquirer/prompts` usage: `character.js` uses `readline.createInterface`, `organization.js` reads `process.stdin`
- [ ] 2.2 Replace `readline.createInterface` in `character.js` with `input()` / `select()` from `@inquirer/prompts`
- [ ] 2.3 Replace raw `process.stdin` reads in `organization.js` with `input()` from `@inquirer/prompts`
- [ ] 2.4 Verify all remaining command files use only `@inquirer/prompts` for interactive input
- [ ] 2.5 Convert `campaign.js` to `campaign.ts` (already uses `@inquirer/prompts`, straightforward conversion)
- [ ] 2.6 Convert `character.js` to `character.ts`
- [ ] 2.7 Convert `organization.js` to `organization.ts`
- [ ] 2.8 Convert remaining command files to `.ts`: `entity.ts`, `location.ts`, `session.ts`, `session-group.ts`, `member.ts`, `relation.ts`, `roll.ts`, `search.ts`, `login.ts`, `logout.ts`, `config.ts`, `import-arcadia.ts`
- [ ] 2.9 Update the main `cli/src/index.js` (or create `index.ts`) to import all commands from `.ts` files
- [ ] 2.10 Verify full CLI help and all existing commands still work after conversion

## 3. Maps Commands

- [ ] 3.1 Create `cli/src/commands/map.ts` with `makeMapCommand()` exporting a Commander command
- [ ] 3.2 Implement `map list --campaign <id> [--json]` -- GET `/api/campaigns/:id/maps`
- [ ] 3.3 Implement `map get --campaign <id> --slug <slug> [--json]` -- GET `/api/campaigns/:id/maps/:slug`
- [ ] 3.4 Implement `map create --campaign <id> --name <name> [--description <desc>]` -- POST `/api/campaigns/:id/maps`
- [ ] 3.5 Implement `map update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]` -- PUT `/api/campaigns/:id/maps/:slug`
- [ ] 3.6 Implement `map delete --campaign <id> --slug <slug>` with confirmation -- DELETE `/api/campaigns/:id/maps/:slug`
- [ ] 3.7 Implement `map upload --campaign <id> --slug <slug> --file <path>` -- POST multipart to `/api/campaigns/:id/maps/:slug/upload`, validate file exists before sending
- [ ] 3.8 Implement `map pins --campaign <id> --slug <slug> [--json]` -- GET `/api/campaigns/:id/maps/:slug/pins`
- [ ] 3.9 Implement `map pin-add --campaign <id> --slug <slug> --label <label> --x <x> --y <y> [--entity <slug>]` -- POST `/api/campaigns/:id/maps/:slug/pins`
- [ ] 3.10 Implement `map pin-delete --campaign <id> --slug <slug> --pin <pinId>` -- DELETE `/api/campaigns/:id/maps/:slug/pins/:pinId`
- [ ] 3.11 Register `makeMapCommand()` in CLI entry point

## 4. Quests Commands

- [ ] 4.1 Create `cli/src/commands/quest.ts` with `makeQuestCommand()`
- [ ] 4.2 Implement `quest list --campaign <id> [--status <status>] [--json]` -- GET `/api/campaigns/:id/quests`
- [ ] 4.3 Implement `quest create --campaign <id> --name <name> [--status <status>] [--description <desc>]` -- POST `/api/campaigns/:id/quests`
- [ ] 4.4 Implement `quest update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>]` -- PUT `/api/campaigns/:id/quests/:slug`
- [ ] 4.5 Register `makeQuestCommand()` in CLI entry point

## 5. Calendar & Timeline Commands

- [ ] 5.1 Create `cli/src/commands/calendar.ts` with `makeCalendarCommand()`
- [ ] 5.2 Implement `calendar list --campaign <id> [--json]` -- GET `/api/campaigns/:id/calendars`
- [ ] 5.3 Implement `calendar get --campaign <id> --calendar <calendarId> [--json]` -- GET `/api/campaigns/:id/calendars/:calendarId`
- [ ] 5.4 Implement `calendar create --campaign <id> --name <name>` -- POST `/api/campaigns/:id/calendars`
- [ ] 5.5 Implement `calendar update --campaign <id> --calendar <calendarId> [--name <name>]` -- PUT `/api/campaigns/:id/calendars/:calendarId`
- [ ] 5.6 Implement `calendar advance --campaign <id> --calendar <calendarId> --days <n>` -- PATCH `/api/campaigns/:id/calendars/:calendarId/advance`
- [ ] 5.7 Implement `calendar events --campaign <id> --calendar <calendarId> [--json]` -- GET `/api/campaigns/:id/calendars/:calendarId/events`
- [ ] 5.8 Implement `calendar event-add --campaign <id> --calendar <calendarId> --name <name> --day <day>` -- POST `/api/campaigns/:id/calendars/:calendarId/events`
- [ ] 5.9 Create `cli/src/commands/timeline.ts` with `makeTimelineCommand()`
- [ ] 5.10 Implement `timeline list --campaign <id> [--json]` -- GET `/api/campaigns/:id/timelines`
- [ ] 5.11 Implement `timeline get --campaign <id> --slug <slug> [--json]` -- GET `/api/campaigns/:id/timelines/:slug`
- [ ] 5.12 Implement `timeline create --campaign <id> --name <name>` -- POST `/api/campaigns/:id/timelines`
- [ ] 5.13 Implement `timeline event-add --campaign <id> --slug <slug> --name <name>` -- POST `/api/campaigns/:id/timelines/:slug/events`
- [ ] 5.14 Register both commands in CLI entry point

## 6. Economy Commands (Items, Shops, Currencies, Transactions, Inventories)

- [ ] 6.1 Create `cli/src/commands/item.ts` with `makeItemCommand()`
- [ ] 6.2 Implement `item list --campaign <id> [--json]` -- GET `/api/campaigns/:id/items`
- [ ] 6.3 Implement `item create --campaign <id> --name <name> [--price <json>] [--description <desc>]` -- POST `/api/campaigns/:id/items`
- [ ] 6.4 Create `cli/src/commands/shop.ts` with `makeShopCommand()`
- [ ] 6.5 Implement `shop list --campaign <id> [--json]` -- GET `/api/campaigns/:id/shops`
- [ ] 6.6 Implement `shop get --campaign <id> --slug <slug> [--json]` -- GET `/api/campaigns/:id/shops/:slug`
- [ ] 6.7 Implement `shop create --campaign <id> --name <name> [--description <desc>]` -- POST `/api/campaigns/:id/shops`
- [ ] 6.8 Implement `shop stock --campaign <id> --slug <slug> --item <itemId> --quantity <n>` -- POST `/api/campaigns/:id/shops/:slug/stock`
- [ ] 6.9 Implement `shop buy --campaign <id> --slug <slug> --item <itemId> --quantity <n> --buyer <inventoryId>` -- POST `/api/campaigns/:id/shops/:slug/buy`
- [ ] 6.10 Implement `shop sell --campaign <id> --slug <slug> --item <itemId> --quantity <n> --seller <inventoryId>` -- POST `/api/campaigns/:id/shops/:slug/sell`
- [ ] 6.11 Implement `shop till --campaign <id> --slug <slug> [--json]` -- GET `/api/campaigns/:id/shops/:slug/till`
- [ ] 6.12 Implement `shop withdraw --campaign <id> --slug <slug> --amounts <json>` -- POST `/api/campaigns/:id/shops/:slug/withdraw`
- [ ] 6.13 Create `cli/src/commands/currency.ts` with `makeCurrencyCommand()`
- [ ] 6.14 Implement `currency list --campaign <id> [--json]` -- GET `/api/campaigns/:id/currencies`
- [ ] 6.15 Implement `currency create --campaign <id> --name <name> --symbol <symbol> --value <n>` -- POST `/api/campaigns/:id/currencies`
- [ ] 6.16 Implement `currency convert --campaign <id> --amount <n> --from <symbol> --to <symbol>` -- GET `/api/campaigns/:id/currencies/convert`
- [ ] 6.17 Create `cli/src/commands/transaction.ts` with `makeTransactionCommand()`
- [ ] 6.18 Implement `transaction list --campaign <id> [--json]` -- GET `/api/campaigns/:id/transactions`
- [ ] 6.19 Implement `transaction create --campaign <id> --type <type> [--from <entityId>] [--to <entityId>] --amounts <json> [--notes <text>]` -- POST `/api/campaigns/:id/transactions`
- [ ] 6.20 Implement `transaction update --campaign <id> --id <txId> [--notes <text>] [--amounts <json>]` -- PUT `/api/campaigns/:id/transactions/:txId`
- [ ] 6.21 Implement `transaction delete --campaign <id> --id <txId>` with confirmation -- DELETE `/api/campaigns/:id/transactions/:txId`
- [ ] 6.22 Create `cli/src/commands/inventory.ts` with `makeInventoryCommand()`
- [ ] 6.23 Implement `inventory list --campaign <id> [--json]` -- GET `/api/campaigns/:id/inventories`
- [ ] 6.24 Implement `inventory create --campaign <id> --owner-type <type> --owner-id <id>` -- POST `/api/campaigns/:id/inventories`
- [ ] 6.25 Implement `inventory add-item --campaign <id> --inventory <id> --item <itemId> --quantity <n>` -- POST `/api/campaigns/:id/inventories/:inventoryId/items`
- [ ] 6.26 Implement `inventory transfer --campaign <id> --from <inventoryId> --to <inventoryId> --item <itemId> --quantity <n>` -- POST `/api/campaigns/:id/inventories/:inventoryId/transfer`
- [ ] 6.27 Register all economy commands in CLI entry point

## 7. Template & Tag Commands

- [ ] 7.1 Create `cli/src/commands/template.ts` with `makeTemplateCommand()`
- [ ] 7.2 Implement `template list --campaign <id> [--json]` -- GET `/api/campaigns/:id/templates`
- [ ] 7.3 Implement `template get --campaign <id> --id <templateId> [--json]` -- GET `/api/campaigns/:id/templates/:templateId`
- [ ] 7.4 Implement `template create --campaign <id> --name <name> --entityType <type> [--content <json>]` -- POST `/api/campaigns/:id/templates`
- [ ] 7.5 Implement `template update --campaign <id> --id <templateId> [--name <name>] [--content <json>]` -- PUT `/api/campaigns/:id/templates/:templateId`
- [ ] 7.6 Implement `template delete --campaign <id> --id <templateId>` with confirmation -- DELETE `/api/campaigns/:id/templates/:templateId`
- [ ] 7.7 Create `cli/src/commands/tag.ts` with `makeTagCommand()`
- [ ] 7.8 Implement `tag list --campaign <id> [--json]` -- GET `/api/campaigns/:id/tags`
- [ ] 7.9 Implement `tag create --campaign <id> --name <name> [--color <hex>]` -- POST `/api/campaigns/:id/tags`
- [ ] 7.10 Register both commands in CLI entry point

## 8. Arc & Chapter Commands

- [ ] 8.1 Create `cli/src/commands/arc.ts` with `makeArcCommand()`
- [ ] 8.2 Implement `arc list --campaign <id> [--json]` -- GET `/api/campaigns/:id/arcs`
- [ ] 8.3 Implement `arc create --campaign <id> --name <name>` -- POST `/api/campaigns/:id/arcs`
- [ ] 8.4 Create `cli/src/commands/chapter.ts` with `makeChapterCommand()`
- [ ] 8.5 Implement `chapter list --campaign <id> [--json]` -- GET `/api/campaigns/:id/chapters`
- [ ] 8.6 Implement `chapter create --campaign <id> --name <name> [--arc <arcId>]` -- POST `/api/campaigns/:id/chapters`
- [ ] 8.7 Register both commands in CLI entry point

## 9. Health Check Command

- [ ] 9.1 Create `cli/src/commands/health.ts` with `makeHealthCommand()`
- [ ] 9.2 Implement `health` (no subcommands) -- GET `/api/health`, display server status; handle connection errors gracefully
- [ ] 9.3 Register `makeHealthCommand()` in CLI entry point

## 10. Skill File Updates

- [ ] 10.1 Update `docs/claude-skill.md` to document all new commands: `map`, `quest`, `calendar`, `timeline`, `item`, `shop`, `currency`, `transaction`, `inventory`, `template`, `tag`, `arc`, `chapter`, `health`
- [ ] 10.2 Update `.claude/skills/aleph-cli/SKILL.md` to mirror `docs/claude-skill.md` with local path (`node /Users/ludo/code/aleph/cli/bin/aleph.js`); bump `version` in frontmatter

## 11. Testing

### Unit Tests

- [ ] 11.1 Unit tests for TypeScript build: verify `tsc` compiles `cli/src/` to `cli/dist/` without errors
- [ ] 11.2 Unit tests for `client.ts`: typed request helper constructs correct URLs, headers, handles errors
- [ ] 11.3 Unit tests for `output.ts`: `print()` formats tables and JSON correctly
- [ ] 11.4 Unit tests for command argument validation: each new command rejects missing required options (e.g., `--campaign` is required)

### Integration Tests

- [ ] 11.5 Integration test: `map list` returns maps for a campaign (server on port 3333)
- [ ] 11.6 Integration test: `map create` + `map get` + `map delete` lifecycle
- [ ] 11.7 Integration test: `quest list` + `quest create` + `quest update` lifecycle
- [ ] 11.8 Integration test: `calendar list` + `calendar create` + `calendar advance` lifecycle
- [ ] 11.9 Integration test: `timeline list` + `timeline create` + `timeline event-add` lifecycle
- [ ] 11.10 Integration test: `item create` + `shop create` + `shop stock` + `shop buy` lifecycle
- [ ] 11.11 Integration test: `currency create` + `currency convert` lifecycle
- [ ] 11.12 Integration test: `transaction create` + `transaction list` + `transaction delete` lifecycle
- [ ] 11.13 Integration test: `inventory create` + `inventory add-item` + `inventory transfer` lifecycle
- [ ] 11.14 Integration test: `template create` + `template get` + `template delete` lifecycle
- [ ] 11.15 Integration test: `tag list` + `tag create` lifecycle
- [ ] 11.16 Integration test: `arc create` + `chapter create` lifecycle
- [ ] 11.17 Integration test: `health` returns server status
- [ ] 11.18 Integration test: unauthenticated requests return proper error messages

### E2E Tests

- [ ] 11.19 E2E: no new E2E tests needed -- CLI commands are not user-facing browser flows (document this reasoning)

### Verification

- [ ] 11.20 Run `cd cli && npm run build` -- TypeScript compiles without errors
- [ ] 11.21 Run `npx vitest run tests/unit/` -- all pass
- [ ] 11.22 Run `npx vitest run tests/integration/` -- all pass (server on port 3333)
- [ ] 11.23 Run `node cli/bin/aleph.js --help` -- all commands listed
- [ ] 11.24 Manually verify 3 representative commands against the remote server: `aleph map list`, `aleph quest list`, `aleph health`
