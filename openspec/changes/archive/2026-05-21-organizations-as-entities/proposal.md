## Why

Organizations live in their own `organizations` table, completely outside the `entities` table that powers characters, locations, sessions, and wiki pages. The `entityRelations` system validates that both `sourceEntityId` and `targetEntityId` exist in `entities`, so organizations cannot participate in relations at all. Trying to create a relation like "Los Señores del Tigre arrasó La Pequeña Flor" via the CLI or UI returns `404 Entity not found`, even though the `relationship-graph` spec already promises connections "between any two entities". Promoting organizations to be entities closes this gap and gives them everything entities already have: relations, auto-linking in markdown, board summaries, content-hash tracking, the unified entity image pipeline, and CLI slug resolution.

## What Changes

- **BREAKING (schema)**: Every row in `organizations` SHALL have a corresponding row in `entities` with `type = 'organization'`. A migration backfills existing organizations and the FK is enforced going forward.
- **`POST /api/campaigns/:id/organizations`** also inserts the matching `entities` row in the same transaction. **`PUT /api/campaigns/:id/organizations/:slug`** keeps the entity row's `name`/`slug`/`visibility` in sync. **`DELETE`** removes both rows in the same transaction.
- **`GET /api/campaigns/:id/entities/:slug`** resolves organization slugs in addition to character/location/session/wiki slugs, returning the entity row with `type: 'organization'`.
- **`POST /api/campaigns/:id/relations`** accepts organization entity IDs as source or target — no change to the endpoint itself, just gained behavior because organizations now have entity rows.
- **CLI**: `aleph relation create` works with organization slugs without any code change (`resolveEntitySlug` calls `/entities/:slug` which now resolves orgs).
- **CLI docs**: `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` are updated to reflect that orgs participate in relations.
- **Non-goal**: We do not migrate `organizations` data into the `entities` table. Both tables coexist; the entity row is a thin pointer that mirrors `name`, `slug`, `visibility`. The org-specific fields (`description`, `type`, `status`, `fieldsJson`) stay on `organizations`.

## Capabilities

### New Capabilities

(none — this is a cross-capability refactor)

### Modified Capabilities

- `organization-management`: organization create/update/delete SHALL maintain a paired row in `entities`. Slug lookups via the entity endpoint resolve organizations.
- `relationship-graph`: organizations are valid source and target for entity relations. The spec's existing "between any two entities" phrasing now reflects implementation reality.
- `aleph-cli`: `relation create` works with organization slugs through the existing `resolveEntitySlug` path; documented in the public skill files.

## Impact

- **DB schema**: new `entities` rows for every existing organization (migration); new FK/coupling between the two tables.
- **Server**: `server/api/campaigns/[id]/organizations/index.post.ts`, `index.put.ts`, `index.delete.ts` (paired entity row maintenance); `server/api/campaigns/[id]/entities/[slug]/index.get.ts` and any slug resolver (extend to orgs); `server/services/content.ts` if `slugify` collisions need handling across the two tables.
- **Migration**: `server/db/migrations/0028_organizations_as_entities.sql` — backfills entity rows for existing orgs.
- **CLI impact (per CLAUDE.md)**: no command code changes needed; `cli/src/lib/client.js#resolveEntitySlug` already calls `/entities/:slug` and will start returning org rows transparently. `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` must be updated together to document that `relation create --source/--target` accepts org slugs.
- **Tests**: integration tests for org create/update/delete asserting the entity row is in sync; integration test for `relation create` with an org source/target; unit test for `resolveEntitySlug` resolving an org slug.
- **Auto-linking**: org names will start auto-linking in markdown content because the linker scans entities — desirable, but flagged so it isn't a surprise.
