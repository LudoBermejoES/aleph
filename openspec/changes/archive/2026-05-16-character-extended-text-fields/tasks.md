## 1. Database Schema & Migration

- [x] 1.1 Add `backstory`, `history`, `current_status` nullable text columns to `server/db/schema/characters.ts`
- [x] 1.2 Generate Drizzle migration: `npx drizzle-kit generate`
- [x] 1.3 Verify migration SQL adds three nullable TEXT columns with no default

## 2. Server API — PUT endpoint

- [x] 2.1 Add `backstory`, `history`, `currentStatus` (string or null, optional) to the Zod schema in `server/api/campaigns/[id]/characters/[slug]/index.put.ts`
- [x] 2.2 Persist the three new fields to the `characters` table row (alongside existing `charUpdates`)
- [x] 2.3 Write integration test: PUT sets `backstory`, GET returns it
- [x] 2.4 Write integration test: omitted fields are not overwritten
- [x] 2.5 Write integration test: passing `null` clears a field

## 3. Server API — GET endpoint

- [x] 3.1 Locate character GET handler (`server/api/campaigns/[id]/characters/[slug]/index.get.ts` or equivalent) and include `backstory`, `history`, `currentStatus` in the response (mapped from DB columns)
- [x] 3.2 Write integration test: GET returns all four narrative fields with correct values

## 4. Frontend — Character detail page

- [x] 4.1 Add i18n keys to `i18n/locales/en.json`: `character.description`, `character.backstory`, `character.history`, `character.currentStatus`
- [x] 4.2 Add same keys to `i18n/locales/es.json` (Spanish labels: Descripción, Historia de origen, Historia, Estado actual)
- [x] 4.3 Update character detail page to display four separate MarkdownEditor sections for `description`, `backstory`, `history`, `currentStatus`
- [x] 4.4 Each section saves independently via PUT (only sending that field's key)
- [x] 4.5 Write E2E test: DM edits backstory and verifies it persists on reload

## 5. CLI — character update command

- [x] 5.1 Add `--backstory <text>`, `--history <text>`, `--current-status <text>` options to `character update` in `cli/src/commands/character.js`
- [x] 5.2 Add `--backstory-stdin`, `--history-stdin`, `--current-status-stdin` flags; each reads from stdin (mutually exclusive with the corresponding text flag)
- [x] 5.3 Map options to `body.backstory`, `body.history`, `body.currentStatus` in the action handler
- [x] 5.4 Update the "provide at least one field" error message to include the new flags
- [x] 5.5 Update `cli/src/commands/character.js` error message and option list
- [x] 5.6 Update `.claude/skills/aleph-cli/SKILL.md` — add new flags to `character update` signature
- [x] 5.7 Update `docs/claude-skill.md` — mirror the same changes

## 6. Tests

- [x] 6.1 Write unit test for CLI: new flags present in `character update` command definition
- [x] 6.2 Write integration test: CLI `character update --backstory "..."` sends correct body to server
