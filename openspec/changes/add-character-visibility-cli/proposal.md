## Why

The server already accepts and enforces a `visibility` field on characters (`POST`/`PUT /api/campaigns/[id]/characters`, full enum `public`/`members`/`editors`/`dm_only`/`private`/`specific_users`, confirmed as part of `enforce-entity-visibility`), and the organization CLI commands already expose `--visibility` on create/edit. The character CLI commands never got the same flag, so a DM working from the terminal cannot set or change a character's visibility at all — the only way today is through the web UI. This is a plain CLI gap, not a backend gap.

## What Changes

- Add `--visibility <vis>` to `character create` (`cli/src/commands/character.js`), matching `organization create`'s existing flag.
- Add `--visibility <vis>` to `character update`, matching `organization edit`'s existing flag (including `""`-to-clear semantics is not applicable here since visibility always has a default, so an explicit valid enum value is required, not an empty-string clear).
- Surface `visibility` in `character list` and `character show` output, matching what `organization list`/`show` already display.
- Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` (bump the local skill's `version`) to document the new flag, per this project's standing convention for CLI-facing changes.

## Capabilities

### New Capabilities

(none — this extends an existing capability)

### Modified Capabilities

- `aleph-cli`: adds a `--visibility` option to the `character create`/`character update` commands and surfaces `visibility` in `character list`/`character show` output, closing the parity gap with the organization CLI commands.

## Impact

- `cli/src/commands/character.js` — add the flag to `create`/`update`, add the field to `list`/`show` output.
- `docs/claude-skill.md`, `.claude/skills/aleph-cli/SKILL.md` — document the new flag; bump local skill `version`.
- No server, database, or API changes — the backend already supports this fully (`server/api/campaigns/[id]/characters/index.post.ts` and `[slug]/index.put.ts` already validate the full visibility enum).
