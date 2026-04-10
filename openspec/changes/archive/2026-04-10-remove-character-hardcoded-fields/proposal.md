## Why

The `race`, `class`, and `alignment` columns in the `characters` table hard-code D&D-specific assumptions into a system meant to serve any TTRPG. A Blades in the Dark campaign has no race; a Vampire: the Masquerade campaign has clans, not classes; an OSR game may not use alignment. These fields should be data — defined by each campaign's character templates — not permanent schema columns with dedicated UI. Now that the entity-templates system exists, there is a proper home for them.

## What Changes

- **BREAKING**: `race`, `class`, and `alignment` columns are dropped from the `characters` table via a Drizzle migration.
- **BREAKING**: `GET/POST/PUT /api/campaigns/:id/characters[/:slug]` no longer accept or return `race`, `class`, `alignment` top-level fields.
- **BREAKING**: `GET /api/campaigns/:id/characters/meta` — the `/meta` endpoint that returns distinct races/classes/alignments is removed.
- **BREAKING**: `GET /api/campaigns/:id/characters` no longer accepts `race`, `class`, `alignment` query-param filters.
- The `CharacterForm.vue` hardcoded race/class/alignment text inputs are removed.
- The race/class/alignment badges on the character detail page header are removed.
- `buildCharacterFrontmatter()` in `server/services/characters.ts` no longer includes these fields.
- `aleph-cli` `character list` loses `--race`, `--class`, `--alignment` filter flags and sort options that reference these fields.
- `aleph-cli` `character create` and `character update` lose `--race`, `--class`, `--alignment` options.
- Existing data: rows that currently have values in these columns retain those values in the entity's frontmatter `fields` object (which is already free-form), because `buildCharacterFrontmatter()` reads from the DB columns today — after the migration that path no longer exists, so any existing values must be copied into `entity_fields` rows (or the frontmatter file) during migration before the columns are dropped.
- `character-list-filters` spec is modified: race/class/alignment filter requirements are removed.
- `character-management` spec is modified: references to race/class/alignment in the list API requirement are removed.

## Capabilities

### New Capabilities

- `character-field-migration`: One-time data migration that copies `race`, `class`, `alignment` column values into the entity's `entity_fields` table (template-less free-form fields) before dropping the columns, preserving all existing data.

### Modified Capabilities

- `character-list-filters`: Remove the race, class, and alignment filter requirements (dropdowns, `/meta` endpoint, API filter params).
- `character-management`: Remove race/class/alignment from the character list API requirement (query params, response fields).

## Impact

- **DB schema**: `server/db/schema/characters.ts` — remove three column definitions; new Drizzle migration file.
- **Server service**: `server/services/characters.ts` — `buildCharacterFrontmatter()` no longer writes race/class/alignment.
- **Server API**: `server/api/campaigns/[id]/characters/index.post.ts`, `[slug]/index.get.ts`, `[slug]/index.put.ts`, `index.get.ts` (list), `meta.get.ts` (deleted).
- **Frontend**: `app/components/forms/CharacterForm.vue`, `app/pages/campaigns/[id]/characters/[slug]/index.vue`.
- **Tests**: Integration tests for character CRUD and list filters; E2E tests that fill or assert race/class/alignment.
- **aleph-cli**: `cli/src/commands/character.js` — remove flags and display columns; no auth or config shape change.
- **Skill files**: `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` must be updated to remove these options.
