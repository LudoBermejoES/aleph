## Why

`aleph character` has `create`, `show`, and `upload-portrait` but no `update` command. The server PUT endpoint already exists. Without a CLI update command, editing character data (name, race, class, alignment, status, content) requires manual API calls.

## What Changes

- **New CLI subcommand** `aleph character update` — sends a PATCH-style PUT to `PUT /api/campaigns/[id]/characters/[slug]` with any provided fields
- Supports all editable fields: `--name`, `--race`, `--class`, `--alignment`, `--status`, `--content`, `--stdin` (pipe markdown content)

## Capabilities

### New Capabilities

- `character-update-cli`: CLI command to update character fields and content

### Modified Capabilities

## Impact

- `cli/src/commands/character.js` — new `update` subcommand
- `docs/claude-skill.md` — add `character update` to command reference
- `.claude/skills/aleph-cli/SKILL.md` — same, bump version
