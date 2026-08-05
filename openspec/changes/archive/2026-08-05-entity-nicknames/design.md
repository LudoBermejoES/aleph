## Context

Aleph's auto-link pipeline (`autolink.ts`, `autolink-render.ts`, `mention-scanner.ts`) already has full alias support in its data model — every `EntityNameEntry` carries an `aliases: string[]` field, and `buildAutomaton` registers them alongside the primary name. Both call sites that build the automaton pass `aliases: []` with a `// TODO: load from entity_names table` comment in the scanner.

The frontmatter of `.md` entity files also has an `aliases` field (defined in the `markdown-content` spec), but it is not currently read into the DB or the auto-link pipeline. Making the DB the authoritative source for aliases (and providing UI/API/CLI to manage them) is a clean, contained change.

## Goals / Non-Goals

**Goals:**

- Store nicknames in a dedicated `entity_nicknames` DB table scoped to an entity
- Expose CRUD API routes under each entity's existing URL namespace
- Wire the nickname loader into `autolink-render.ts` and `mention-scanner.ts`
- Provide a UI panel to manage nicknames on any entity page
- Add CLI subcommands for scripted management

**Non-Goals:**

- Migrating or reading existing frontmatter `aliases` values (those are per-file metadata that can be cleaned up later; they are not currently used by auto-linking)
- Ranked or fuzzy nickname matching (exact case-insensitive word-boundary match, same as primary name)
- Per-nickname visibility or access control (nicknames inherit entity visibility)
- Synonym deduplication or conflict warnings across entities (two entities can share an alias)

## Decisions

### Decision: Separate `entity_nicknames` table (not a JSON column)

A separate table (one row per alias) allows indexed lookups, clean deletes without JSON parsing, and avoids a migration to alter the `entities` table. It also keeps per-entity queries simple: `SELECT nickname FROM entity_nicknames WHERE entity_id = ?`.

Alternative considered: store aliases as a JSON array in `entities.aliases`. Rejected because it requires deserializing on every automaton build and makes row-level deletes awkward.

### Decision: Load nicknames at automaton build time, not per-render

Both `autolink-render.ts` and `mention-scanner.ts` already query all campaign entities once and pass the result to `buildAutomaton`. We extend that single query with a left join (or a separate batch query) to fetch all nicknames for the campaign in one round-trip, then attach them to their entity entries before calling `buildAutomaton`. This avoids N+1 queries.

Alternative considered: load nicknames lazily per entity. Rejected because we already pay the cost of a full entity scan; a join is cheaper than N separate queries.

### Decision: API routes nested under `/api/campaigns/[id]/entities/[slug]/nicknames`

This follows the existing URL pattern for entity sub-resources (e.g. `/entities/[slug]/images`). Nicknames are a property of an entity, so nesting is semantically correct and keeps auth middleware consistent (same campaign-member check).

### Decision: Invalidate automaton cache on nickname change

The existing `invalidateAutomatonCache(campaignId)` function in `autolink.ts` must be called whenever nicknames are created or deleted, so the next render picks up the change. This is already the pattern used when entity names change.

## Risks / Trade-offs

- **Stale automaton cache after nickname edit** — mitigated by calling `invalidateAutomatonCache` in all nickname mutation handlers (create, delete)
- **Performance on large campaigns** — loading all nicknames for a campaign on every automaton build adds one extra query. Acceptable for current scale; if it becomes a bottleneck the automaton cache already amortises it across requests
- **Frontmatter aliases diverge from DB aliases** — frontmatter `aliases` are metadata visible to git but not used by auto-linking after this change. Risk is confusion if someone manually edits frontmatter. Mitigation: document in the spec that DB is authoritative; a future cleanup task can sync frontmatter from DB

## Migration Plan

1. Generate and apply Drizzle migration for `entity_nicknames` table
2. Deploy server changes (new API routes + updated render/scanner)
3. Frontend and CLI changes are additive; no data migration required
4. No rollback complexity — the table can be dropped cleanly if needed, restoring original behaviour (empty aliases)

## Open Questions

- Should nicknames be exported/imported as part of campaign export/import? (Out of scope for this change; worth a follow-up)
- Should the UI show nickname suggestions based on existing frontmatter `aliases`? (Future enhancement)
