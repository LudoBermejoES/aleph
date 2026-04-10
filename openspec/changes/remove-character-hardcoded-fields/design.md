## Context

The `characters` table currently has three columns — `race`, `class`, `alignment` — that encode D&D-specific vocabulary into the schema. The entity-templates system (already shipped) provides a generic mechanism for campaign-specific fields. This change removes the hardcoded columns, their API surface, and their UI, while preserving all existing data by migrating values into entity fields before dropping the columns.

## Goals / Non-Goals

**Goals:**

- Drop `race`, `class`, `alignment` from the `characters` DB schema.
- Preserve existing data: any row with a non-null value in these columns gets an `entity_fields` row created before the columns are dropped.
- Remove these fields from all API request/response shapes, the `CharacterForm`, the character detail header, the list filters, and the CLI.
- Remove the `/meta` endpoint that returned distinct races/classes/alignments.
- Update specs (`character-list-filters`, `character-management`) to reflect the new world.

**Non-Goals:**

- Replacing these fields with a new system (templates already handle this).
- Migrating existing values into a specific named template (the migration creates template-less `entity_fields` rows so data is visible if/when a matching template field is added).
- Changing `characterType` or `status` — these are system fields and stay.
- Any UI to manage the migrated free-form field values (that is the existing entity-templates flow).

## Decisions

### Decision: Migrate data via a SQL migration script, not a runtime handler

**Choice**: The Drizzle migration SQL file performs both the data copy (INSERT INTO entity_fields SELECT ...) and the column drop (ALTER TABLE ... DROP COLUMN) in one transaction.

**Rationale**: SQLite supports `ALTER TABLE ... DROP COLUMN` since 3.35 (2021). A single migration file keeps the change atomic and reversible. A runtime migration handler would need special bootstrapping and could run multiple times.

**Alternative considered**: A one-off Node.js migration script. Rejected — requires manual execution and doesn't integrate with Drizzle's migration tracking.

### Decision: entity_fields rows use template_field_id = NULL

**Choice**: Migrated rows in `entity_fields` have `template_field_id = NULL` and use the column name (`race`, `class`, `alignment`) as the `name` field, `field_type = 'text'`.

**Rationale**: `template_field_id` is nullable in the schema (entity fields can be free-form). Setting it to NULL means the data is accessible without requiring a template. DMs who want structured fields create a template; the free-form rows don't conflict.

**Alternative considered**: Creating a synthetic "Legacy D&D Fields" template. Rejected — assumes D&D intent, creates clutter in every campaign, and is hard to undo.

### Decision: Remove /meta endpoint entirely (no deprecation period)

**Choice**: `GET /api/campaigns/:id/characters/meta` is deleted.

**Rationale**: Its only purpose was to supply race/class/alignment dropdown options. With those filters gone, the endpoint has no consumers. A deprecation window would add complexity for a feature being fully replaced by templates.

### Decision: CLI flags are removed, not aliased

**Choice**: `--race`, `--class`, `--alignment` flags are removed from `aleph-cli character list/create/update`. No backward-compat aliases.

**Rationale**: The CLI is a developer/admin tool, not a published public API. Removing flags immediately is simpler; the CHANGELOG / skill docs communicate the change.

## Risks / Trade-offs

- **Data loss if migration is skipped**: Any campaign that has race/class/alignment values and bypasses the migration (e.g., manual DB edits) could lose that data. Mitigation: the migration runs in the standard `drizzle-kit migrate` flow and is atomic — no partial runs.
- **Existing integrations break**: Any external tool or script that passes `race`/`class`/`alignment` to the API will get unexpected behavior (the field is silently ignored on write, absent on read). Mitigation: documented as a breaking change in the proposal; server API routes simply ignore unknown body fields.
- **Filter functionality gap**: Users who relied on race/class/alignment filters lose them. Mitigation: templates + entity_fields provide a generic filter path (future work); this is explicitly out of scope here.
- **SQLite DROP COLUMN atomicity**: SQLite rewrites the entire table when dropping columns. On a large dataset this could be slow. Mitigation: this is a development-phase app; production data volumes are small. The migration is still guarded in a transaction.

## Migration Plan

1. Run `drizzle-kit generate` after updating `server/db/schema/characters.ts` to produce the SQL migration.
2. Hand-edit the generated migration to prepend the `INSERT INTO entity_fields ...` statements for each of the three columns (selecting only rows where the value IS NOT NULL).
3. Run `drizzle-kit migrate` (or the app's auto-migrate on startup) to apply.
4. Rollback: SQLite does not support `ADD COLUMN ... DEFAULT NULL` without a full table rewrite; rollback would require restoring from backup. Given nullable columns, data risk is low, but a pre-migration backup is recommended for production.

**Open Questions:**

- Does the `entity_fields` schema require a `sort_order` for free-form rows? (Current schema has `sort_order integer not null default 0` — migration can set 0 for all.)
- Are there any third-party integrations that hit `/meta` which need a different deprecation timeline? (Currently no known external consumers.)
