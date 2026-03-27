## Context

Both `relation list` and `character connections` currently show raw UUID columns. The entity list endpoint (`GET /api/campaigns/<id>/entities`) returns all entities with `id`, `name`, and `slug`. A single prefetch of this list can be used to build an id→name map before rendering the table.

## Goals / Non-Goals

**Goals:**
- Replace UUID columns with names in human-readable table output
- Keep `--json` output unchanged (raw IDs, for scripting)

**Non-Goals:**
- Paginating large entity lists
- Caching across commands

## Decisions

**Fetch entity list once per command invocation** when not in `--json` mode. Build an `id → name` map. Substitute names in the table rows. This adds one HTTP request per command invocation — acceptable for a CLI used interactively.

**Column rename**: `targetEntityId` → `target`, `source`/`target` UUID columns → entity names. Keep column headers short.

## Risks / Trade-offs

- Extra GET request per invocation. Negligible for interactive CLI use.
- If an entity was deleted after the connection was made, fall back to the UUID.
