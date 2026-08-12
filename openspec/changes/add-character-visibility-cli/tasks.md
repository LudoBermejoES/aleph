## 1. Character CLI visibility flag

- [x] 1.1 Added `--visibility <vis>` option to `character create` in `cli/src/commands/character.js`, matching `organization create`'s existing option text, passed through as `body.visibility` when provided
- [x] 1.2 Added `--visibility <vis>` option to `character update`, matching `organization edit`'s existing option, passed through as `body.visibility` when provided; added it to the "at least one field" validation message
- [x] 1.3 Added `visibility` to `character list`'s non-JSON table output and `character show`'s non-JSON output (JSON output already returns the full object, including `visibility`, from the server)

## 2. Docs

- [x] 2.1 Updated `docs/claude-skill.md`'s `character create`/`character update` usage examples to document `--visibility`
- [x] 2.2 Updated `.claude/skills/aleph-cli/SKILL.md` the same way and bumped its frontmatter `version` 3.17 → 3.18

## 3. Verification

- [x] 3.1 Manually verified via a local dev server (using `ALEPH_URL`/`ALEPH_TOKEN` env overrides to avoid touching the production CLI config): `character create --visibility dm_only` created a character with that visibility; `character list`/`character show` displayed it; `character update --visibility private` changed it and `character show` reflected the new value
- [x] 3.2 `tests/integration/characters.test.ts` (12/12) and `npx eslint cli/src/commands/character.js` both pass — no regressions; no new tests needed since the server-side behavior is already covered by `enforce-entity-visibility`'s tests and this change is a pure CLI pass-through
