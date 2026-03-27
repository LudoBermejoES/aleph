## Context

The server already has all necessary API endpoints:
- `POST /api/campaigns/[id]/characters/[slug]/connections` — body: `{ targetEntityId, label?, description?, sortOrder? }`
- `GET /api/campaigns/[id]/characters/[slug]/connections` — returns array of connection objects
- `POST /api/campaigns/[id]/relations` — body: `{ sourceEntityId, targetEntityId, forwardLabel?, reverseLabel?, attitude?, description?, visibility? }`
- `GET /api/campaigns/[id]/relations?entity_id=<id>` — returns relations for an entity
- `DELETE /api/campaigns/[id]/relations/[relationId]` — deletes a relation

The challenge is that the CLI user-facing interface uses **slugs** (e.g., `diana`, `red-dragon`), but the server APIs for relations require **entity UUIDs**. Character connections use character slug in the URL (server resolves internally), but the `targetEntityId` body field still requires a UUID. Entity relations require both `sourceEntityId` and `targetEntityId` as UUIDs.

## Goals / Non-Goals

**Goals:**
- Allow CLI users to connect a character to an entity using slugs
- Allow CLI users to create bidirectional entity relations using slugs
- Allow CLI users to list connections for a character
- Allow CLI users to list and delete relations
- Slug-to-ID resolution happens transparently in the CLI via the entity show endpoint

**Non-Goals:**
- UI changes — this is CLI-only
- Creating new relation types via CLI (CRUD for relation-types is out of scope)
- Updating existing connections or relations

## Decisions

**Slug resolution strategy**: The CLI will resolve slugs to entity IDs by calling `GET /api/campaigns/[id]/entities/[slug]` before making the actual API call. This keeps the user interface clean (slugs everywhere) without requiring server-side changes.

**`character connect` command signature**:
```
aleph character connect <slug> --campaign <id> --target <entity-slug> [--label <text>] [--description <text>] [--json]
```

**`character connections` command signature**:
```
aleph character connections <slug> --campaign <id> [--json]
```

**`relation create` command signature**:
```
aleph relation create --campaign <id> --source <entity-slug> --target <entity-slug> [--forward <label>] [--reverse <label>] [--attitude <-100..100>] [--description <text>] [--json]
```

**`relation list` command signature**:
```
aleph relation list --campaign <id> [--entity <entity-slug>] [--json]
```

**`relation delete` command signature**:
```
aleph relation delete <relationId> --campaign <id> [--yes]
```

**New `relation` top-level command**: Added as a new command module `cli/src/commands/relation.js`, registered in `cli/bin/aleph.js` alongside existing commands.

## Risks / Trade-offs

- Slug resolution adds an extra HTTP round-trip per slug. For a 2-slug relation create, that's 2 extra GETs. Acceptable for a CLI tool used interactively.
- Entity slugs must be unique per campaign — the server enforces this so no collision risk.
- `relation delete` requires the relation UUID (not a slug) since relations have no slug. The list command shows IDs so the user can find the right one.
