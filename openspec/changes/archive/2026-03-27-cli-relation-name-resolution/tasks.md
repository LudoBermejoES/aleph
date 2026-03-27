## 1. Relation List Name Resolution

- [x] 1.1 In `relation list` action in `cli/src/commands/relation.js`: when not in `--json` mode, fetch entity list via `GET /api/campaigns/<id>/entities`, build `id→name` map, replace source/target UUIDs with names in the printed table (fall back to UUID if not found)

## 2. Character Connections Name Resolution

- [x] 2.1 In `character connections` action in `cli/src/commands/character.js`: when not in `--json` mode, fetch entity list, build `id→name` map, replace `targetEntityId` UUID with name in the printed table
