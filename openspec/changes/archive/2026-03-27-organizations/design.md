## Context

Aleph already has a rich entity system (wiki entries, characters, sessions, quests, etc.) with a consistent pattern: a campaign-scoped resource has a DB table, CRUD API routes under `/api/campaigns/:id/<resource>/`, and matching frontend pages. Organizations follow this same pattern, with the addition of a many-to-many join table for membership.

Characters are stored in two tables: `entities` (name, slug, campaignId, visibility, content) and `characters` (character-specific fields). Organizations are simpler — they have no wiki content body — so they get a single standalone table rather than extending `entities`.

## Goals / Non-Goals

**Goals:**
- First-class `organizations` table with campaign scope, type/status enums, and slug-based identity
- Many-to-many `organization_members` join (characterId + organizationId + role text)
- Full CRUD API consistent with existing campaign resource endpoints
- Frontend pages following the existing page pattern (`index.vue`, `new.vue`, `[slug]/index.vue`, `[slug]/edit.vue`)
- Character detail page shows organization memberships (read-only)
- `aleph-cli` `organization` command group matching the API surface
- i18n for all new strings (en + es)

**Non-Goals:**
- Organizations do NOT extend the `entities` table — they are not wiki-searchable or mention-linkable in this iteration
- No visibility/permission model beyond the existing campaign role check (DMs manage, players view)
- No nested organizations or org hierarchy
- No org-scoped permissions for characters (future work)

## Decisions

### 1. Standalone table vs. entity extension

**Decision**: New standalone `organizations` table, not extending `entities`.

**Rationale**: The `entities` table provides wiki content (markdown body, mentions, tags, visibility rules) — organizations don't need any of that in this iteration. Extending `entities` adds migration complexity, requires the wiki renderer, and bloats the entity search index. A standalone table is simpler and follows the precedent set by `campaign_members`, `rolls`, and other non-entity resources.

**Alternative considered**: Extend `entities` (as characters do). Rejected because it drags in content/visibility infrastructure that organizations don't yet need.

### 2. Slug generation

**Decision**: Server generates the slug from the name (lowercased, hyphenated) at creation time, unique per campaign. Same approach as characters and entities.

**Alternative considered**: Client-supplied slug. Rejected for consistency with existing resource patterns.

### 3. Role field on organization_members

**Decision**: Free-text `role` field (e.g. "Ring-bearer", "Advisor", "Member") rather than an enum.

**Rationale**: TTRPG campaigns are infinitely varied — an enum would immediately be too restrictive. Free text matches how the rest of the system handles custom labels (abilities, stat definitions, etc.).

### 4. Auth / permission model

**Decision**: Use the existing campaign role check pattern already used by characters and entities:
- `dm`, `co_dm`, `editor`: full CRUD on organizations and members
- `player`, `visitor`: read-only (GET endpoints only)
- Unauthenticated: 401 for all endpoints (campaign data is always protected)

**Alternative considered**: Per-organization visibility (secret societies hidden from players). Deferred to a future iteration — the `status: secret` field on the organization itself signals intent, but enforcement of per-org visibility is out of scope here.

### 5. Member count on list endpoint

**Decision**: The `GET /api/campaigns/:id/organizations` response includes a `memberCount` field computed via a JOIN/subquery, to support the list page without N+1 queries.

### 6. CLI command structure

**Decision**: `aleph organization` command group with subcommands: `list`, `create`, `show`, `delete`, `member add`, `member remove`. Mirrors the `aleph character` command pattern.

## Risks / Trade-offs

- [Risk: Slug collisions on rename] If a PUT changes the name, the slug may collide with an existing org in the same campaign. → Mitigation: server validates uniqueness and returns 409 if conflict.
- [Risk: Orphaned member rows] If a character is deleted, `organization_members` rows referencing it become stale (no foreign key cascade if characters table uses entity cascade). → Mitigation: add `ON DELETE CASCADE` on `characterId` referencing `characters.id`.
- [Risk: Free-text role inconsistency] Typos or inconsistent casing in role names accumulate over time. → Accepted trade-off; a future iteration could add role suggestions based on existing values.

## Migration Plan

1. Add `server/db/schema/organizations.ts` and update `index.ts`
2. Generate and run Drizzle migration (`npx drizzle-kit generate`, `npx drizzle-kit migrate`)
3. Deploy API routes (no breaking changes to existing routes)
4. Deploy frontend pages (additive)
5. Deploy CLI update

Rollback: drop the two new tables and revert the schema/index files. No existing data is affected.

## Open Questions

- Should `status: secret` organizations be hidden from players on the list page, or shown with redacted details? Deferred — current scope treats all orgs as visible to all campaign members.
- Should organizations be linkable via `[[org-name]]` mentions in wiki content? Deferred to a future "entity extension" iteration.
