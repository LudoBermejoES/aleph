## 1. Character Connect & Connections Commands

- [x] 1.1 Add `connect <slug>` subcommand to `cli/src/commands/character.js`: resolves `--target` slug to entity UUID via `GET /api/campaigns/<id>/entities/<slug>`, then POSTs to `/api/campaigns/<id>/characters/<slug>/connections` with `{ targetEntityId, label, description }`
- [x] 1.2 Add `connections <slug>` subcommand to `cli/src/commands/character.js`: GETs `/api/campaigns/<id>/characters/<slug>/connections` and prints table or JSON

## 2. Relation Command Module

- [x] 2.1 Create `cli/src/commands/relation.js` with `create`, `list`, and `delete` subcommands
- [x] 2.2 Implement `relation create`: resolve `--source` and `--target` slugs to entity UUIDs, POST to `/api/campaigns/<id>/relations` with `{ sourceEntityId, targetEntityId, forwardLabel, reverseLabel, attitude, description }`
- [x] 2.3 Implement `relation list`: GET `/api/campaigns/<id>/relations` with optional `?entity_id=<uuid>` (resolve `--entity` slug if provided), print table or JSON
- [x] 2.4 Implement `relation delete <relationId>`: prompt confirmation unless `--yes`, DELETE `/api/campaigns/<id>/relations/<id>`

## 3. Register Relation Command

- [x] 3.1 Import and register the `relation` command in `cli/bin/aleph.js`

## 4. Slug Resolution Helper

- [x] 4.1 Add a `resolveEntitySlug(campaignId, slug)` helper in `cli/src/lib/client.js` (or in the command files) that calls `GET /api/campaigns/<id>/entities/<slug>` and returns the entity `id`, throwing an error if not found

## 5. Update Skill Documentation

- [x] 5.1 Update `docs/claude-skill.md`: add `character connect`, `character connections`, `relation create`, `relation list`, `relation delete` to the command reference; bump version to 1.6
- [x] 5.2 Update `.claude/skills/aleph-cli/SKILL.md` to mirror `docs/claude-skill.md`; bump version to 1.7
