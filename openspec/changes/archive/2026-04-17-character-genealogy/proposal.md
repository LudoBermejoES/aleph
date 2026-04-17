## Why

Aleph already tracks rich relationships between characters via `entityRelations`, but there is no first-class way to capture and visualize genealogies (parent/child/spouse/sibling links with birth/death years) the way a Game Master typically thinks about NPC dynasties. DMs currently have to reconstruct family lines by scanning a flat list of relationships or by hand-drawing trees outside the app. This change adds a dedicated genealogy capability — demographic fields on characters, family link primitives on top of the existing relations system, a tldraw-based family tree view, API/CLI endpoints, and i18n — so that bloodlines become as queryable and visual as any other campaign data.

## What Changes

- Add demographic fields to `characters`: `birthYear` (integer, nullable), `deathYear` (integer, nullable), `gender` (text, nullable), with a Drizzle migration. Both API (`PUT /api/campaigns/[id]/characters/[slug]`) and the `character update` CLI command gain these fields.
- Introduce four builtin, reserved relation-type slugs — `parent_of`, `spouse_of`, `sibling_of` (and the implicit reverse `child_of` for `parent_of`) — seeded into `relationTypes` on campaign creation, with `isBuiltin=true` and locked forward/reverse labels.
- Add helper endpoints that wrap `entityRelations` with family-specific validation:
  - `POST /api/campaigns/[id]/characters/[slug]/family` (types: `parent`, `child`, `spouse`, `sibling`)
  - `DELETE /api/campaigns/[id]/characters/[slug]/family/[relationId]`
  - `GET /api/campaigns/[id]/characters/[slug]/genealogy?depth=N` — returns nodes/edges JSON for a tree centered on the character.
- Add a tldraw-based genealogy view at `/campaigns/[id]/characters/[slug]/genealogy` with automatic layered layout (ancestors above, descendants below, spouses adjacent) using a new `GenealogyNodeShape` and a computed snapshot that is editable and persistable as a `.tldr` file.
- Extend `aleph-cli`: new `character family-add`, `character family-remove`, `character genealogy` commands; `character update` accepts `--birth-year`, `--death-year`, `--gender`. Update both `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` (bump version).
- Add i18n keys under `characters.genealogy.*` and `characters.family.*` in `i18n/locales/en.json` and `i18n/locales/es.json` only.
- Enforce validation at the service layer: `birthYear < deathYear`, parent/child year coherence (soft-warn rather than hard-reject to accommodate adoptions and fantasy timelines), and strict acyclicity for `parent_of` (no character can be its own ancestor).
- Unit, integration, and E2E tests cover the feature end-to-end per the project's mandatory testing policy (CLAUDE.md).

## Capabilities

### New Capabilities

- `character-demographics`: Demographic fields on characters (birth year, death year, gender) with validation, migration, API, and CLI exposure.
- `character-family-links`: Family relationship primitives (parent, child, spouse, sibling) on top of the existing relation infrastructure, with builtin relation types, cycle detection, and helper endpoints.
- `character-genealogy-view`: Tldraw-based family tree visualization with automatic layered layout, gender-themed nodes, and snapshot persistence.
- `character-genealogy-cli`: CLI commands for managing family links and rendering genealogies in the terminal.

### Modified Capabilities

<!-- None. This change adds entirely new capabilities and does not alter the behavior contract of any existing spec. -->

## Impact

- **Database**: new columns on `characters` + a Drizzle migration in `server/db/migrations/`; seeded rows in `relationTypes` for the four builtin family slugs.
- **Server**: new route files under `server/api/campaigns/[id]/characters/[slug]/family/` and `.../genealogy.get.ts`; shared service module `server/services/genealogy.ts` for tree traversal, validation, and layout computation; the existing `PUT .../characters/[slug]` handler gains three fields.
- **Frontend**: new page `app/pages/campaigns/[id]/characters/[slug]/genealogy.vue`; new tldraw shape util `GenealogyNodeShape.tsx` under `app/components/diagrams/react/shapes/`; a "Ver genealogía / View genealogy" action on the character detail page; demographic inputs on the character edit form.
- **i18n**: new keys under `characters.genealogy.*` and `characters.family.*` in `i18n/locales/en.json` and `i18n/locales/es.json` (the canonical locale directory — never the stale `locales/` or `app/i18n/locales/` duplicates).
- **aleph-cli** (affected — server API, data model, and CLI surface all change): updates to `cli/src/commands/character.js` for the new subcommands and flags, plus possible helpers in `cli/src/lib/client.js`; both `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` must be updated in lockstep with a version bump on the latter.
- **Testing**: mandatory unit tests (`tests/unit/`), integration tests (`tests/integration/`, server on port 3333), and E2E tests (`tests/e2e/`) per CLAUDE.md.
- **Non-goals**: GEDCOM import/export, polyamorous/multiple concurrent spouse visualization beyond simple side-by-side pairing, automatic inference of sibling links from shared parents (we may add this later but it is out of scope here).
