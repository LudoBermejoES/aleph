## Why

Aleph stores entity relationships and character-to-entity links in the database, but the CLI has no way to create them. Campaign creators and DMs need to express "character X is a member of faction Y" or "the Red Dragon is the nemesis of the party's paladin" without opening a browser. Enabling this from the CLI completes the world-building workflow that already supports characters, locations, and organizations.

## What Changes

- Add `aleph character connect` CLI command — links a character to any entity with a directional label and optional description
- Add `aleph relation create` CLI command — creates a bidirectional entity-to-entity relation with forward/reverse labels, attitude score, and optional description
- Add `aleph relation list` and `aleph relation delete` CLI commands for managing entity relations
- Add `aleph character connections` CLI command to list a character's outgoing connections

## Capabilities

### New Capabilities

- `character-connections-cli`: CLI commands for creating and listing character→entity directional connections
- `entity-relations-cli`: CLI commands for creating, listing, and deleting bidirectional entity relations

### Modified Capabilities

- `aleph-cli`: New `character connect`, `character connections`, `relation create`, `relation list`, `relation delete` subcommands added to the CLI surface

## Impact

- `cli/src/commands/character.js` — add `connect` and `connections` subcommands
- `cli/src/commands/relation.js` — new file with `create`, `list`, `delete` subcommands
- `cli/bin/aleph.js` — register the `relation` command
- `docs/claude-skill.md` — update shareable skill (bump version)
- `.claude/skills/aleph-cli/SKILL.md` — update local skill (bump version)
- Server API endpoints used: `POST /api/campaigns/[id]/characters/[slug]/connections`, `GET /api/campaigns/[id]/characters/[slug]/connections`, `POST /api/campaigns/[id]/relations`, `GET /api/campaigns/[id]/relations`, `DELETE /api/campaigns/[id]/relations/[id]`
- No DB schema changes — these endpoints already exist on the server
