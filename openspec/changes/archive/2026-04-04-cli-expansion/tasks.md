# Tasks: CLI Expansion

## 3. Maps Commands

- [x] 3.1 Create `cli/src/commands/map.ts` with `makeMapCommand()` exporting a Commander command
- [x] 3.2 Implement `map list --campaign <id> [--json]` -- GET `/api/campaigns/:id/maps`
- [x] 3.3 Implement `map get --campaign <id> --slug <slug> [--json]` -- GET `/api/campaigns/:id/maps/:slug`
- [x] 3.4 Implement `map create --campaign <id> --name <name> [--description <desc>]` -- POST `/api/campaigns/:id/maps`
- [x] 3.5 Implement `map update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]` -- PUT `/api/campaigns/:id/maps/:slug`
- [x] 3.6 Implement `map delete --campaign <id> --slug <slug>` with confirmation -- DELETE `/api/campaigns/:id/maps/:slug`
- [x] 3.7 Implement `map upload --campaign <id> --slug <slug> --file <path>` -- POST multipart to `/api/campaigns/:id/maps/:slug/upload`, validate file exists before sending
- [x] 3.8 Implement `map pins --campaign <id> --slug <slug> [--json]` -- GET `/api/campaigns/:id/maps/:slug/pins`
- [x] 3.9 Implement `map pin-add --campaign <id> --slug <slug> --label <label> --x <x> --y <y> [--entity <slug>]` -- POST `/api/campaigns/:id/maps/:slug/pins`
- [x] 3.10 Implement `map pin-delete --campaign <id> --slug <slug> --pin <pinId>` -- DELETE `/api/campaigns/:id/maps/:slug/pins/:pinId`
- [x] 3.10a Implement `map layer-update --campaign <id> --slug <slug> --layer <layerId> [--name <name>] [--opacity <n>]` -- PUT `/api/campaigns/:id/maps/:slug/layers/:layerId`
- [x] 3.10b Implement `map layer-delete --campaign <id> --slug <slug> --layer <layerId> [--yes]` -- DELETE `/api/campaigns/:id/maps/:slug/layers/:layerId`
- [x] 3.10c Implement `map region-update --campaign <id> --slug <slug> --region <regionId> [--name <name>]` -- PUT `/api/campaigns/:id/maps/:slug/regions/:regionId`
- [x] 3.10d Implement `map region-delete --campaign <id> --slug <slug> --region <regionId> [--yes]` -- DELETE `/api/campaigns/:id/maps/:slug/regions/:regionId`
- [x] 3.11 Register `makeMapCommand()` in CLI entry point

## 4. Quests Commands

- [x] 4.1 Create `cli/src/commands/quest.ts` with `makeQuestCommand()`
- [x] 4.2 Implement `quest list --campaign <id> [--status <status>] [--json]` -- GET `/api/campaigns/:id/quests`
- [x] 4.3 Implement `quest create --campaign <id> --name <name> [--status <status>] [--description <desc>]` -- POST `/api/campaigns/:id/quests`
- [x] 4.4 Implement `quest update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>]` -- PUT `/api/campaigns/:id/quests/:slug`
- [x] 4.5 Implement `quest delete --campaign <id> --slug <slug> [--yes]` with confirmation -- DELETE `/api/campaigns/:id/quests/:slug`
- [x] 4.6 Register `makeQuestCommand()` in CLI entry point

## 5. Calendar & Timeline Commands

- [x] 5.1 Create `cli/src/commands/calendar.ts` with `makeCalendarCommand()`
- [x] 5.2 Implement `calendar list --campaign <id> [--json]` -- GET `/api/campaigns/:id/calendars`
- [x] 5.3 Implement `calendar get --campaign <id> --calendar <calendarId> [--json]` -- GET `/api/campaigns/:id/calendars/:calendarId`
- [x] 5.4 Implement `calendar create --campaign <id> --name <name>` -- POST `/api/campaigns/:id/calendars`
- [x] 5.5 Implement `calendar update --campaign <id> --calendar <calendarId> [--name <name>]` -- PUT `/api/campaigns/:id/calendars/:calendarId`
- [x] 5.6 Implement `calendar advance --campaign <id> --calendar <calendarId> --days <n>` -- PATCH `/api/campaigns/:id/calendars/:calendarId/advance`
- [x] 5.7 Implement `calendar events --campaign <id> --calendar <calendarId> [--json]` -- GET `/api/campaigns/:id/calendars/:calendarId/events`
- [x] 5.8 Implement `calendar event-add --campaign <id> --calendar <calendarId> --name <name> --day <day>` -- POST `/api/campaigns/:id/calendars/:calendarId/events`
- [x] 5.8a Implement `calendar delete --campaign <id> --calendar <calendarId> [--yes]` with confirmation -- DELETE `/api/campaigns/:id/calendars/:calendarId`
- [x] 5.8b Implement `calendar event-delete --campaign <id> --calendar <calendarId> --event <eventId> [--yes]` -- DELETE `/api/campaigns/:id/calendars/:calendarId/events/:eventId`
- [x] 5.9 Create `cli/src/commands/timeline.ts` with `makeTimelineCommand()`
- [x] 5.10 Implement `timeline list --campaign <id> [--json]` -- GET `/api/campaigns/:id/timelines`
- [x] 5.11 Implement `timeline get --campaign <id> --slug <slug> [--json]` -- GET `/api/campaigns/:id/timelines/:slug`
- [x] 5.12 Implement `timeline create --campaign <id> --name <name>` -- POST `/api/campaigns/:id/timelines`
- [x] 5.13 Implement `timeline event-add --campaign <id> --slug <slug> --name <name>` -- POST `/api/campaigns/:id/timelines/:slug/events`
- [x] 5.13a Implement `timeline update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]` -- PUT `/api/campaigns/:id/timelines/:slug`
- [x] 5.13b Implement `timeline delete --campaign <id> --slug <slug> [--yes]` with confirmation -- DELETE `/api/campaigns/:id/timelines/:slug`
- [x] 5.13c Implement `timeline event-delete --campaign <id> --slug <slug> --event <eventId> [--yes]` -- DELETE `/api/campaigns/:id/timelines/:slug/events/:eventId`
- [x] 5.14 Register both commands in CLI entry point

## 6. Economy Commands (Items, Shops, Currencies, Transactions, Inventories)

- [x] 6.1 Create `cli/src/commands/item.ts` with `makeItemCommand()`
- [x] 6.2 Implement `item list --campaign <id> [--json]` -- GET `/api/campaigns/:id/items`
- [x] 6.3 Implement `item create --campaign <id> --name <name> [--price <json>] [--description <desc>]` -- POST `/api/campaigns/:id/items`
- [x] 6.3a Implement `item update --campaign <id> --id <itemId> [--name <name>] [--rarity <rarity>] [--description <desc>]` -- PUT `/api/campaigns/:id/items/:itemId`
- [x] 6.3b Implement `item delete --campaign <id> --id <itemId> [--yes]` with confirmation -- DELETE `/api/campaigns/:id/items/:itemId`
- [x] 6.4 Create `cli/src/commands/shop.ts` with `makeShopCommand()`
- [x] 6.5 Implement `shop list --campaign <id> [--json]` -- GET `/api/campaigns/:id/shops`
- [x] 6.6 Implement `shop get --campaign <id> --slug <slug> [--json]` -- GET `/api/campaigns/:id/shops/:slug`
- [x] 6.7 Implement `shop create --campaign <id> --name <name> [--description <desc>]` -- POST `/api/campaigns/:id/shops`
- [x] 6.8 Implement `shop stock --campaign <id> --slug <slug> --item <itemId> --quantity <n>` -- POST `/api/campaigns/:id/shops/:slug/stock`
- [x] 6.9 Implement `shop buy --campaign <id> --slug <slug> --item <itemId> --quantity <n> --buyer <inventoryId>` -- POST `/api/campaigns/:id/shops/:slug/buy`
- [x] 6.10 Implement `shop sell --campaign <id> --slug <slug> --item <itemId> --quantity <n> --seller <inventoryId>` -- POST `/api/campaigns/:id/shops/:slug/sell`
- [x] 6.11 Implement `shop till --campaign <id> --slug <slug> [--json]` -- GET `/api/campaigns/:id/shops/:slug/till`
- [x] 6.12 Implement `shop withdraw --campaign <id> --slug <slug> --amounts <json>` -- POST `/api/campaigns/:id/shops/:slug/withdraw`
- [x] 6.12a Implement `shop update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]` -- PUT `/api/campaigns/:id/shops/:slug`
- [x] 6.12b Implement `shop delete --campaign <id> --slug <slug> [--yes]` with confirmation -- DELETE `/api/campaigns/:id/shops/:slug`
- [x] 6.13 Create `cli/src/commands/currency.ts` with `makeCurrencyCommand()`
- [x] 6.14 Implement `currency list --campaign <id> [--json]` -- GET `/api/campaigns/:id/currencies`
- [x] 6.15 Implement `currency create --campaign <id> --name <name> --symbol <symbol> --value <n>` -- POST `/api/campaigns/:id/currencies`
- [x] 6.16 Implement `currency convert --campaign <id> --amount <n> --from <symbol> --to <symbol>` -- GET `/api/campaigns/:id/currencies/convert`
- [x] 6.16a Implement `currency update --campaign <id> --id <currencyId> [--name <name>] [--symbol <symbol>] [--value <n>]` -- PUT `/api/campaigns/:id/currencies/:currencyId`
- [x] 6.16b Implement `currency delete --campaign <id> --id <currencyId> [--yes]` with confirmation -- DELETE `/api/campaigns/:id/currencies/:currencyId`
- [x] 6.17 Create `cli/src/commands/transaction.ts` with `makeTransactionCommand()`
- [x] 6.18 Implement `transaction list --campaign <id> [--json]` -- GET `/api/campaigns/:id/transactions`
- [x] 6.19 Implement `transaction create --campaign <id> --type <type> [--from <entityId>] [--to <entityId>] --amounts <json> [--notes <text>]` -- POST `/api/campaigns/:id/transactions`
- [x] 6.20 Implement `transaction update --campaign <id> --id <txId> [--notes <text>] [--amounts <json>]` -- PUT `/api/campaigns/:id/transactions/:txId`
- [x] 6.21 Implement `transaction delete --campaign <id> --id <txId>` with confirmation -- DELETE `/api/campaigns/:id/transactions/:txId`
- [x] 6.22 Create `cli/src/commands/inventory.ts` with `makeInventoryCommand()`
- [x] 6.23 Implement `inventory list --campaign <id> [--json]` -- GET `/api/campaigns/:id/inventories`
- [x] 6.24 Implement `inventory create --campaign <id> --owner-type <type> --owner-id <id>` -- POST `/api/campaigns/:id/inventories`
- [x] 6.25 Implement `inventory add-item --campaign <id> --inventory <id> --item <itemId> --quantity <n>` -- POST `/api/campaigns/:id/inventories/:inventoryId/items`
- [x] 6.26 Implement `inventory transfer --campaign <id> --from <inventoryId> --to <inventoryId> --item <itemId> --quantity <n>` -- POST `/api/campaigns/:id/inventories/:inventoryId/transfer`
- [x] 6.26a Implement `inventory delete --campaign <id> --id <inventoryId> [--yes]` with confirmation -- DELETE `/api/campaigns/:id/inventories/:inventoryId`
- [x] 6.26b Implement `inventory item-delete --campaign <id> --inventory <inventoryId> --item <itemId> [--yes]` -- DELETE `/api/campaigns/:id/inventories/:inventoryId/items/:itemId`
- [x] 6.27 Register all economy commands in CLI entry point

## 7. Template & Tag Commands

- [x] 7.1 Create `cli/src/commands/template.ts` with `makeTemplateCommand()`
- [x] 7.2 Implement `template list --campaign <id> [--json]` -- GET `/api/campaigns/:id/templates`
- [x] 7.3 Implement `template get --campaign <id> --id <templateId> [--json]` -- GET `/api/campaigns/:id/templates/:templateId`
- [x] 7.4 Implement `template create --campaign <id> --name <name> --entityType <type> [--content <json>]` -- POST `/api/campaigns/:id/templates`
- [x] 7.5 Implement `template update --campaign <id> --id <templateId> [--name <name>] [--content <json>]` -- PUT `/api/campaigns/:id/templates/:templateId`
- [x] 7.6 Implement `template delete --campaign <id> --id <templateId>` with confirmation -- DELETE `/api/campaigns/:id/templates/:templateId`
- [x] 7.7 Create `cli/src/commands/tag.ts` with `makeTagCommand()`
- [x] 7.8 Implement `tag list --campaign <id> [--json]` -- GET `/api/campaigns/:id/tags`
- [x] 7.9 Implement `tag create --campaign <id> --name <name> [--color <hex>]` -- POST `/api/campaigns/:id/tags`
- [x] 7.10 Register both commands in CLI entry point

## 8. Arc & Chapter Commands

- [x] 8.1 Create `cli/src/commands/arc.ts` with `makeArcCommand()`
- [x] 8.2 Implement `arc list --campaign <id> [--json]` -- GET `/api/campaigns/:id/arcs`
- [x] 8.3 Implement `arc create --campaign <id> --name <name>` -- POST `/api/campaigns/:id/arcs`
- [x] 8.3a Implement `arc update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>]` -- PUT `/api/campaigns/:id/arcs/:slug`
- [x] 8.3b Implement `arc delete --campaign <id> --slug <slug> [--yes]` with confirmation -- DELETE `/api/campaigns/:id/arcs/:slug`
- [x] 8.4 Create `cli/src/commands/chapter.ts` with `makeChapterCommand()`
- [x] 8.5 Implement `chapter list --campaign <id> [--json]` -- GET `/api/campaigns/:id/chapters`
- [x] 8.6 Implement `chapter create --campaign <id> --name <name> [--arc <arcId>]` -- POST `/api/campaigns/:id/chapters`
- [x] 8.6a Implement `chapter update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]` -- PUT `/api/campaigns/:id/chapters/:slug`
- [x] 8.6b Implement `chapter delete --campaign <id> --slug <slug> [--yes]` with confirmation -- DELETE `/api/campaigns/:id/chapters/:slug`
- [x] 8.7 Register both commands in CLI entry point

## 9. Character Abilities, Folders & Entity Types

- [x] 9.0a Add `character ability-delete <slug> <abilityId> --campaign <id> [--yes]` to `character.js/ts` -- DELETE `/api/campaigns/:id/characters/:slug/abilities/:abilityId`
- [x] 9.0b Add `character folder-update <folderId> --campaign <id> [--name <name>]` to `character.js/ts` -- PUT `/api/campaigns/:id/character-folders/:folderId`
- [x] 9.0c Add `character folder-delete <folderId> --campaign <id> [--yes]` to `character.js/ts` -- DELETE `/api/campaigns/:id/character-folders/:folderId`
- [x] 9.0d Add `entity type-update <typeId> --campaign <id> [--name <name>]` to `entity.js/ts` -- PUT `/api/campaigns/:id/entity-types/:typeId`
- [x] 9.0e Add `entity type-delete <typeId> --campaign <id> [--yes]` to `entity.js/ts` -- DELETE `/api/campaigns/:id/entity-types/:typeId`

## 10a. Health Check Command

- [x] 9.1 Create `cli/src/commands/health.ts` with `makeHealthCommand()`
- [x] 9.2 Implement `health` (no subcommands) -- GET `/api/health`, display server status; handle connection errors gracefully
- [x] 9.3 Register `makeHealthCommand()` in CLI entry point

## 10. Skill File Updates

- [x] 10.1 Update `docs/claude-skill.md` to document all new commands: `map`, `quest`, `calendar`, `timeline`, `item`, `shop`, `currency`, `transaction`, `inventory`, `template`, `tag`, `arc`, `chapter`, `health`
- [x] 10.2 Update `.claude/skills/aleph-cli/SKILL.md` to mirror `docs/claude-skill.md` with local path (`node /Users/ludo/code/aleph/cli/bin/aleph.js`); bump `version` in frontmatter

## 11. Testing

### Unit Tests

- [x] 11.1 Unit tests for TypeScript build: verify `tsc` compiles `cli/src/` to `cli/dist/` without errors
- [x] 11.2 Unit tests for `client.ts`: typed request helper constructs correct URLs, headers, handles errors
- [x] 11.3 Unit tests for `output.ts`: `print()` formats tables and JSON correctly
- [x] 11.4 Unit tests for command argument validation: each new command rejects missing required options (e.g., `--campaign` is required)

### Integration Tests

- [x] 11.5 Integration test: `map list` returns maps for a campaign (server on port 3333)
- [x] 11.6 Integration test: `map create` + `map get` + `map delete` lifecycle
- [x] 11.7 Integration test: `quest list` + `quest create` + `quest update` lifecycle
- [x] 11.8 Integration test: `calendar list` + `calendar create` + `calendar advance` lifecycle
- [x] 11.9 Integration test: `timeline list` + `timeline create` + `timeline event-add` lifecycle
- [x] 11.10 Integration test: `item create` + `shop create` + `shop stock` + `shop buy` lifecycle
- [x] 11.11 Integration test: `currency create` + `currency convert` lifecycle
- [x] 11.12 Integration test: `transaction create` + `transaction list` + `transaction delete` lifecycle
- [x] 11.13 Integration test: `inventory create` + `inventory add-item` + `inventory transfer` lifecycle
- [x] 11.14 Integration test: `template create` + `template get` + `template delete` lifecycle
- [x] 11.15 Integration test: `tag list` + `tag create` lifecycle
- [x] 11.16 Integration test: `arc create` + `chapter create` lifecycle
- [x] 11.17 Integration test: `health` returns server status
- [x] 11.18 Integration test: unauthenticated requests return proper error messages

### E2E Tests

- [x] 11.19 E2E: no new E2E tests needed -- CLI commands are not user-facing browser flows (document this reasoning)

### Verification

- [x] 11.20 Run `cd cli && npm run build` -- TypeScript compiles without errors
- [x] 11.21 Run `npx vitest run tests/unit/` -- all pass
- [x] 11.22 Run `npx vitest run tests/integration/` -- all pass (server on port 3333)
- [x] 11.23 Run `node cli/bin/aleph.js --help` -- all commands listed
- [x] 11.24 Manually verify 3 representative commands against the remote server: `aleph map list`, `aleph quest list`, `aleph health`
