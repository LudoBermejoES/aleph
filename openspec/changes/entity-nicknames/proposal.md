## Why

Entity names in Aleph are unique per campaign, but characters and locations are often known by multiple names (aliases, titles, shortened forms). The auto-link system that renders entity names as clickable links already supports aliases in its data model but has no way to store or manage them — the alias arrays are always empty. Adding database-backed nicknames makes aliases a first-class feature: editable from the UI, stored reliably, and fully wired into auto-linking so "Philip", "El hermético", and "Philip Holmes" all resolve to the same character.

## What Changes

- New DB table `entity_nicknames` stores per-entity aliases (one row per alias)
- API endpoints to list, add, and delete nicknames for any entity
- Auto-link render and mention-scanner load nicknames from DB, fulfilling the existing TODO
- UI panel on entity pages to manage nicknames inline
- CLI commands `entity nickname add/list/remove` for scriptable management

## Capabilities

### New Capabilities

- `entity-nicknames`: Stores and manages per-entity nicknames in the DB; exposes CRUD API; wires nicknames into auto-link rendering and mention scanning; provides UI management panel and CLI commands.

### Modified Capabilities

- `markdown-content`: The auto-link render pipeline (`autolink-render.ts`, `mention-scanner.ts`) will load nicknames from the DB instead of passing empty alias arrays. The frontmatter `aliases` field in `.md` files is rendered-but-ignored going forward — DB is the source of truth for aliases used in linking.

## Impact

**Server:**

- New DB migration: `entity_nicknames` table (id, entity_id FK → entities.id cascade, nickname, created_at)
- New API routes under `server/api/campaigns/[id]/entities/[slug]/nicknames/`
- `server/services/autolink-render.ts` — query nicknames and pass to `buildAutomaton`
- `server/services/mention-scanner.ts` — same; fulfills `// TODO: load from entity_names table`
- `server/services/autolink.ts` — no changes needed (aliases already supported)

**Frontend:**

- New `NicknamesPanel.vue` component rendered on entity pages
- Possibly reused on character, location, organization detail pages (they all share the entity underpinning)

**CLI (`cli/`):**

- New subcommands: `entity nickname list <slug>`, `entity nickname add <slug> <nickname>`, `entity nickname remove <slug> <nickname>`
- `cli/src/commands/entity.js` update
- Skill files: `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md`
