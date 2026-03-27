## Why

The `aleph relation list` and `aleph character connections` commands output raw entity UUIDs in the source/target/targetEntityId columns. This makes the output unreadable — users have to cross-reference IDs manually to understand who is related to whom. Name resolution should happen transparently in the CLI.

## What Changes

- `relation list` output: replace `source` and `target` UUID columns with entity names (fetched from the entity list)
- `character connections` output: replace `targetEntityId` UUID column with the entity name
- `--json` output is unchanged — raw IDs remain for programmatic use

## Capabilities

### New Capabilities

- `cli-relation-display`: Human-readable names in relation list and character connections tabular output

### Modified Capabilities

- `aleph-cli`: `relation list` and `character connections` display improvements

## Impact

- `cli/src/commands/relation.js` — resolve entity names before printing table
- `cli/src/commands/character.js` — resolve target entity names before printing connections table
- No server changes needed — entity list endpoint already exists
