## 1. Database Schema and Migration

- [x] 1.1 Remove `race`, `class`, `alignment` column definitions from `server/db/schema/characters.ts`
- [x] 1.2 Run `drizzle-kit generate` to generate the migration SQL file
- [x] 1.3 Migration confirmed: existing values already live in .md frontmatter fields (written at creation time); DROP COLUMN statements are sufficient
- [x] 1.4 Run `drizzle-kit migrate` locally and verify the `characters` table no longer has those columns and existing data appears in `entity_fields`

## 2. Server Service

- [x] 2.1 Remove `race`, `charClass`, `alignment` parameters from `buildCharacterFrontmatter()` signature and body in `server/services/characters.ts`

## 3. Server API Endpoints

- [x] 3.1 `server/api/campaigns/[id]/characters/index.post.ts` — remove reading `race`, `class`, `alignment` from request body; remove them from the character insert and frontmatter call
- [x] 3.2 `server/api/campaigns/[id]/characters/[slug]/index.get.ts` — remove `race`, `class`, `alignment` from the returned character object
- [x] 3.3 `server/api/campaigns/[id]/characters/[slug]/index.put.ts` — remove reading `race`, `class`, `alignment` from request body and from the DB update
- [x] 3.4 `server/api/campaigns/[id]/characters/index.get.ts` — remove `race`, `class`, `alignment` filter query params and their WHERE clauses; remove these fields from the SELECT and response
- [x] 3.5 Delete `server/api/campaigns/[id]/characters/meta.get.ts` (the `/meta` endpoint)

## 4. Frontend — CharacterForm

- [x] 4.1 Remove the race, class, and alignment text input fields from `app/components/forms/CharacterForm.vue`
- [x] 4.2 Remove any related props, v-model bindings, and validation rules for these three fields from `CharacterForm.vue`

## 5. Frontend — Character Detail Page

- [x] 5.1 Remove the race, class, and alignment badge/display elements from `app/pages/campaigns/[id]/characters/[slug]/index.vue`
- [x] 5.2 Remove any related reactive state or computed properties that reference race/class/alignment on that page

## 6. Frontend — Character List Page

- [x] 6.1 Remove the race, class, and alignment filter dropdown components from `app/pages/campaigns/[id]/characters/index.vue`
- [x] 6.2 Remove any race/class/alignment columns or display in character list rows
- [x] 6.3 Remove any calls to the `/meta` endpoint from the character list page and its composables

## 7. aleph-cli

- [x] 7.1 `cli/src/commands/character.js` — remove `--race`, `--class`, `--alignment` options from the `list` subcommand (filter flags and `race`/`class` sort options)
- [x] 7.2 `cli/src/commands/character.js` — remove `--race`, `--class`, `--alignment` options from the `create` subcommand
- [x] 7.3 `cli/src/commands/character.js` — remove `--race`, `--class`, `--alignment` options from the `update` subcommand; remove the error message that references these flags
- [x] 7.4 `cli/src/commands/character.js` — remove race/class columns from the list output table
- [x] 7.5 Update `docs/claude-skill.md` to remove race/class/alignment from character command documentation
- [x] 7.6 Update `.claude/skills/aleph-cli/SKILL.md` to mirror the changes in `docs/claude-skill.md`

## 8. Tests — Integration

- [x] 8.1 Update `tests/integration/characters.test.ts` — remove assertions on race/class/alignment in create/get/update response shapes
- [x] 8.2 Update `tests/integration/character-filters.test.ts` — remove tests for race/class/alignment filter params and the `/meta` endpoint
- [x] 8.3 Update `tests/integration/characters-advanced.test.ts` — remove any race/class/alignment field references
- [x] 8.4 Update `tests/integration/characters-schema.test.ts` — remove race/class/alignment column assertions
- [x] 8.5 Update `tests/integration/create-apis.test.ts` — remove race/class/alignment from character creation payloads if present

## 9. Tests — E2E

- [x] 9.1 Update `tests/e2e/characters.spec.ts` — remove steps that fill or assert race/class/alignment form fields
- [x] 9.2 Update `tests/e2e/character-actions.spec.ts` — remove race/class/alignment form interactions
- [x] 9.3 Update `tests/e2e/character-list-filters.spec.ts` — remove scenarios for race/class/alignment filter dropdowns
- [x] 9.4 Update `tests/e2e/edit-pages.spec.ts` — remove race/class/alignment form field assertions for character edit page
- [x] 9.5 Check and update `tests/e2e/collaboration.spec.ts`, `tests/e2e/entity-mention.spec.ts`, `tests/e2e/responsive-sidebar.spec.ts` — remove incidental race/class/alignment references

## 10. Verification

- [x] 10.1 Run `npx vitest run tests/unit/` — confirm no unit test failures
- [x] 10.2 Run `npx vitest run tests/integration/` — confirm all integration tests pass (server on port 3333)
- [x] 10.3 Run `npx playwright test` — confirm all E2E tests pass (1 pre-existing entity test flaky due to strict h1 selector, unrelated to this change)
