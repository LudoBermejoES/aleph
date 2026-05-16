## Context

Characters have one narrative text field today: `content`, stored as the markdown body of the entity file (`entity.filePath`). This file has YAML frontmatter (`type`, `name`, `aliases`, `tags`, `visibility`, `fields`) and a freeform markdown body that is read/written via `readEntityFile` / `writeEntityFile` in `server/services/content`.

The `characters` table stores structured, indexed character data (status, type, birthYear, gender, etc.) but has no narrative text columns. The entity file is the canonical store for narrative content.

Three new narrative fields are needed — `backstory`, `history`, `current_status` — each potentially long (multiple paragraphs of markdown).

## Goals / Non-Goals

**Goals:**

- Add `backstory`, `history`, `current_status` as independent markdown fields
- Keep all four narrative fields editable separately from UI, API, and CLI
- Maintain backwards compatibility: existing `content` field is unchanged
- Zero data loss on deploy (additive-only change)

**Non-Goals:**

- Real-time collaborative editing for the new fields (Hocuspocus collaboration remains scoped to the main entity content only)
- Search indexing of the new fields (full-text search continues to index only `content`)
- Displaying new fields to players (visibility/secrets on new fields are out of scope; DM-only for now)

## Decisions

### Decision 1: Store new fields in the `characters` table, not the entity file

**Chosen**: Add `backstory TEXT`, `history TEXT`, `current_status TEXT` nullable columns to the `characters` table in SQLite.

**Alternative considered**: Store as top-level frontmatter keys in the entity file (alongside existing `name`, `tags`, etc.).

**Rationale**: Entity files are designed for a short frontmatter header + long markdown body. Putting multiple large text blocks in YAML frontmatter creates parsing issues with multi-line strings, YAML escaping, and file bloat. The `characters` table already stores character-specific data that doesn't belong in the generic entity model — this is a natural fit. It also means the API reads one DB row instead of parsing a file for common display operations.

### Decision 2: Rename `content` to `description` in the API surface only

**Chosen**: The API accepts/returns both `content` (old, still accepted for backwards compat) and `description` as aliases. The DB column and file format remain unchanged (`content`). Internally, `description` maps to the entity file body.

**Alternative considered**: Rename the column and file key everywhere.

**Rationale**: Breaking the existing API contract for existing CLI users and integrations has no benefit at this stage. The semantic rename is documentation-level; the alias approach costs one line of code and avoids a migration.

### Decision 3: No separate Hocuspocus rooms for new fields

**Chosen**: New fields are saved via regular REST PUT, not the collaborative WebSocket channel.

**Rationale**: The main entity content field gets real-time collaboration because it's the "wiki page" body edited by multiple people simultaneously. The new fields (backstory, history, current status) are typically updated by the DM alone, often in bulk after a session. Adding three new Hocuspocus rooms per character would add significant complexity for little gain.

## Risks / Trade-offs

- **Migration**: Additive schema change (new nullable columns, default NULL) — zero risk of data loss or existing row breakage. Rollback is dropping the columns.
- **File vs. DB split**: Having `content`/description in the entity file while `backstory`/`history`/`current_status` live in the DB adds a conceptual split. Mitigated by clear API documentation and consistent GET response shape.
- **Search gap**: The new fields are not full-text indexed. A DM searching for a character by a detail mentioned in backstory won't find it. Acceptable for now; search indexing can be extended in a follow-up.

## Migration Plan

1. Generate Drizzle migration adding three nullable text columns to `characters`
2. Deploy server (no downtime — additive schema change)
3. No data migration needed — all new fields start as NULL
4. Rollback: drop the three columns (no data loss since they start NULL)

## Open Questions

- Should `history` support append-only semantics (auto-prepend new entry with date) or be fully freeform? **Decided: fully freeform** — the DM writes whatever markdown they want, including their own date headers.
- Should any of the new fields be player-visible? **Deferred** — current_status is the most likely candidate but scoping it to DM-only keeps this change simpler. Player visibility can be addressed in a future `content-visibility` extension.
