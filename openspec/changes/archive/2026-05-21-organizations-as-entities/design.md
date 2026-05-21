## Context

The `entities` table is the central registry for everything that participates in the wiki / relations / auto-linking / board summary subsystems. It has rows for characters, locations, sessions, and arbitrary wiki entries. Each row carries `id`, `campaignId`, `type`, `name`, `slug`, `filePath`, `visibility`, `contentHash`, `parentId`, and `boardSummary`.

Organizations were introduced later in their own `organizations` table with overlapping fields (`id`, `campaignId`, `name`, `slug`, `description`, `type`, `status`, `templateId`, `fieldsJson`) but no row in `entities`. That separation cleanly isolated org-specific data (membership, type/status badges) but cut organizations off from every entity-keyed feature.

`entityRelations.sourceEntityId` and `entityRelations.targetEntityId` are validated against `entities.id`. The CLI's `resolveEntitySlug` calls `GET /api/campaigns/:id/entities/:slug` which only looks at `entities`. Both fail for org slugs.

## Goals / Non-Goals

**Goals:**

- Make organizations participate in `entityRelations` as either source or target without code branching at the relation layer.
- Make organization slugs resolve through the same `/entities/:slug` endpoint the CLI already uses.
- Keep the change minimally invasive: do not migrate organization fields into `entities`, keep `organizations` as the source of truth for org-specific data.

**Non-Goals:**

- Merging `organizations` into `entities` (deleting one table). The two tables intentionally cover different concerns.
- Auto-linking organization names in markdown — that falls out for free once entity rows exist, but is not the driver of this change.
- Touching `organization_members` semantics, the membership UI, the org type/status badges, or the org list page.

## Decisions

### Add a paired `entities` row, keep `organizations` as the data row

When a new organization is created, write two rows in the same transaction:

1. `entities` row with `type = 'organization'`, mirroring `name`, `slug`, `visibility`. `filePath` is `null` (organizations don't have a markdown file on disk like wiki entries — they live in the DB only).
2. `organizations` row as today, with an added `entityId` column that references `entities.id`.

The `entities.id` for an organization equals its `organizations.entityId`. Anywhere that needs to relate, link, or auto-resolve an org uses the `entities.id`.

**Alternative considered**: collapse into a single table by moving all org fields onto `entities`. Rejected — `entities` is intentionally generic (no `type`/`status`/`description`), and org-specific lookups (badges, members) become awkward when mixed with everything else.

**Alternative considered**: polymorphic source/target in `entityRelations` (a `sourceType` discriminator). Rejected — every query that joins relations to an "entity" would need a CASE/UNION, every CLI/UI consumer would need to branch, and the relationship-graph spec's "any two entities" promise stays half-true.

### Backfill via migration

Migration `0028_organizations_as_entities.sql`:

1. `ALTER TABLE organizations ADD COLUMN entity_id TEXT REFERENCES entities(id)`.
2. For every existing organization, insert an `entities` row with a fresh UUID and `type = 'organization'`, then update the org's `entity_id` to that UUID.
3. Index on `organizations.entity_id` for joins.

The slug field on `entities` already has a per-campaign uniqueness constraint. Org slugs may collide with existing entity slugs in the same campaign (e.g., a character and an org both called "Black Hand"). The migration must detect collisions and append `-org` to the org's entity row slug (the org's own `organizations.slug` stays untouched). This is a one-time concern; new org creation goes through a unified slug check.

### Slug resolution

`GET /api/campaigns/:id/entities/:slug` already does the right thing once an entity row exists for the org. No code change needed inside the handler. The CLI's `resolveEntitySlug` benefits automatically.

For ambiguity (org-row slug ≠ entity-row slug after a collision rename), the org-list endpoint continues to return `slug` as the org's preferred display slug, while `entityId` and `entitySlug` are exposed on the org payload so callers can reach the entity row.

### Sync on update and delete

`PUT /api/campaigns/:id/organizations/:slug` — if `name` changes, recompute slug; sync `entities.name`, `entities.slug`, `entities.visibility` in the same transaction. If a slug collision arises, fall back to the `-org` suffix on the entity row only.

`DELETE /api/campaigns/:id/organizations/:slug` — delete the `entities` row in the same transaction. The `entityRelations` rows that reference it cascade via existing FK (verify the FK has `ON DELETE CASCADE`; if not, drop relations explicitly before deleting the entity).

## Risks / Trade-offs

- **Slug collision at backfill** → existing data may have an org and a non-org entity sharing a slug. Mitigation: migration detects and renames the org's entity-row slug only (append `-org`); the org's user-visible `slug` is untouched. Document in the migration comment.
- **Two rows to keep in sync** → org updates now touch two tables. Mitigation: every write goes through a single helper (`createOrganizationEntity`, `updateOrganizationEntity`, `deleteOrganizationEntity`) inside a transaction. No direct `db.insert(organizations)` outside the helper.
- **Org names start auto-linking in markdown** → likely desirable, but a behavioral surprise. Mitigation: call it out in release notes; no opt-out needed unless a user reports noise.
- **CLI consumers assuming `/entities/:slug` returns wiki/character only** → the return shape gains `type: 'organization'`. Mitigation: the CLI only reads `id` from the response, so no breakage; document in the skill files.
- **Relation FK cascade for orgs** → if `entities` delete doesn't cascade to `entityRelations`, deleting an org via the org endpoint could leave orphan rows. Mitigation: verify cascade in current schema; if missing, add it in the same migration.

## Migration Plan

1. Ship migration `0028_organizations_as_entities.sql` (adds column, backfills, indexes). On startup, drizzle applies it via `server/plugins/migrations.ts`.
2. Deploy server with the updated org create/update/delete endpoints and the helper functions. The endpoints work with the new column from the moment the migration runs.
3. CLI requires no code change. Skill files (`docs/claude-skill.md`, `.claude/skills/aleph-cli/SKILL.md`) are updated in the same PR.

**Rollback**: drop the `entity_id` column, drop the inserted `entities` rows of `type = 'organization'`. Relations referencing those rows would need to be deleted manually — acceptable since this feature was not previously usable.

## Open Questions

- Should the org's `entities` row store the org's `description` in a sync field, for board summary previews? Decision deferred — `entities.boardSummary` is independently editable, and org descriptions are surfaced via the org payload. Not blocking this change.
