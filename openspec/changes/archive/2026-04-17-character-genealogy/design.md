## Context

Aleph's `entities` table is polymorphic; characters are a subtype with a `characters` row carrying character-specific fields (status, portrait, folder, companion, location). Relationships between any two entities are captured by `entityRelations` rows typed via `relationTypes` — campaign-scoped, with forward/reverse labels and an `isBuiltin` flag. Visualization happens on tldraw (v2) via `TldrawWrapper.tsx` with custom shape utils (`NPCTokenShape`, `EntityCardShape`, `RelationshipArrowShape`, etc.), with real-time sync powered by Hocuspocus and an asset store that converts uploaded images to WebP.

Characters today carry no birth/death year and no gender. Relationship types are not seeded with family semantics, so a DM who wants a family tree has to create ad-hoc relation types per campaign and then render the graph as a generic relationship graph — which lays things out as a force-directed blob rather than a layered genealogy.

The mandatory testing policy (CLAUDE.md) requires unit tests for pure logic, integration tests for any API endpoint (server must be running on port 3333), and E2E tests for any user-facing flow. The `aleph-cli` tool must stay in sync with the server, and both skill files (`docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md`) must be updated whenever CLI commands change.

Stakeholders: Game Masters building NPC dynasties; players exploring generational arcs; the CLI user who wants to script bulk genealogy setup.

## Goals / Non-Goals

**Goals:**

- Capture demographic data (birth year, death year, gender) on characters with minimum friction and without imposing a gender model.
- Capture family links (parent/child/spouse/sibling) using primitives that integrate cleanly with the rest of the relationship infrastructure (tldraw graph, campaign-scoped relation types, `entityRelations` queries).
- Render a layered, readable family tree centered on a chosen character, with ancestors above, descendants below, spouses side-by-side, and siblings grouped under their parent pair.
- Keep the rendered tree editable as a regular tldraw scene — the layout algorithm produces a snapshot that can be hand-tuned and saved.
- Keep parity across the three surfaces (API, frontend, CLI) and the two locales.
- Enforce invariants that matter (no self-ancestry, `birthYear ≤ deathYear`) while being permissive about fantasy edge cases (e.g., parent younger than child is a warning, not an error, because resurrections, adoptions, and time-travel plots exist).

**Non-Goals:**

- GEDCOM import/export.
- Full polyamory modeling beyond side-by-side adjacent pairing. Multiple spouses are representable as multiple `spouse_of` relations, but the layout algorithm will only keep the primary pair adjacent; additional spouses render as extra nodes at the same level. We explicitly do not design a universal poly layout.
- Automatic sibling-link inference from shared parents. A spec item notes this as a future enhancement.
- Date modeling beyond a single integer year and an optional free-text date label. In-campaign calendars with custom month systems are out of scope — that is a job for the (existing) calendar capability, not genealogy.
- Marriage/divorce event history as first-class objects. Spouse relations are point-in-time.

## Decisions

### Decision 1: Reuse `entityRelations` (Option A) rather than a dedicated `characterFamilyLinks` table (Option B)

**Chosen:** Option A — reuse `entityRelations` with builtin reserved relation-type slugs (`parent_of`, `spouse_of`, `sibling_of`, and the reverse `child_of` exposed through `relationTypes.reverseLabel`).

**Alternatives considered:**

- **Option B — dedicated `characterFamilyLinks` table:** A tighter schema with columns like `parentCharacterId`/`childCharacterId`/`spouseAId`/`spouseBId`. Simpler query patterns for tree traversal (single table, strict semantics). But it duplicates the typed-directional-relationship machinery we already have, introduces a second source of truth the UI must reconcile on the generic relationship graph, and forces us to rebuild permissions/visibility/pinning/audit fields that `entityRelations` already has.
- **Option C — hybrid:** both, with `characterFamilyLinks` as the write path and `entityRelations` auto-mirrored. Doubles storage, doubles write paths, and every write gets a consistency risk we do not need.

**Why Option A wins:**

- Zero duplicated infrastructure — visibility, audit columns (createdByUserId/updatedByUserId), `metadataJson`, and pinning all come for free.
- `RelationshipArrowShape` on the generic relationship graph already renders these links; family links are visible in existing views without extra code.
- Traversal is a bounded BFS over `entityRelations` filtered by `relationTypeId IN (familySlugIds)` — fast in SQLite with the existing `(sourceEntityId, targetEntityId)` index.
- Integrity is enforced via service-layer helpers (`createFamilyLink`, `deleteFamilyLink`) rather than new table constraints, which is where our cycle check has to live anyway.

**What we seed:** four builtin `relationTypes` rows per campaign at campaign creation: `parent_of` (forward "parent of", reverse "child of"), `spouse_of` (symmetric; both labels "spouse of"), `sibling_of` (symmetric; both labels "sibling of"). They are marked `isBuiltin=true` so the UI hides their delete button and the slug is reserved. A migration backfills existing campaigns.

### Decision 2: "Child" is not a separate relation type — it is the reverse of `parent_of`

To avoid two rows per parent/child edge, we store one `parent_of` row (source=parent, target=child) and the reverse label is exposed by `relationTypes.reverseLabel` ("child of"). The API accepts `type: 'parent' | 'child' | 'spouse' | 'sibling'` as a client convenience and normalizes `child` into a `parent_of` row with source/target swapped.

### Decision 3: Spouse and sibling are symmetric and stored as a single row

`spouse_of` and `sibling_of` are symmetric. We store exactly one row per pair and canonicalize by ordering source/target by `entityId` at insert time. Clients that query "who are X's spouses" must `OR` on source and target. The service helper does this; clients should not touch the raw rows.

### Decision 4: Demographic fields live on `characters`, not on `entities`

Gender and birth/death years only make sense for characters. Putting them on the polymorphic `entities` table would pollute it for locations, organizations, items, etc. We add three nullable columns to `characters`: `birthYear` (integer), `deathYear` (integer), `gender` (text). Gender is a free-form lowercase string (e.g., `male`, `female`, `nonbinary`, `unknown`) — we do not enum-constrain it at the DB level but the UI offers presets and the tldraw node maps known values to a color (blue/pink/gray) and falls back to gray for everything else.

### Decision 5: Genealogy layout algorithm — layered Walker-style, computed server-side

The server endpoint `GET .../genealogy?depth=N` returns `{ nodes: [...], edges: [...] }` with precomputed `x, y` coordinates for each node. Clients render these on tldraw without further layout logic. Rationale:

- Layout must be deterministic so that two players looking at the same tree see the same thing and so E2E tests are stable.
- tldraw is great for hand-editing but does not ship a genealogy layout algorithm; inventing one client-side doubles the logic we have to test.
- Server-side layout lets the CLI render ASCII trees using the same node/edge payload.

**Algorithm** (kept simple — it is not Tree-of-Life scale):

1. BFS from the focus character up through `parent_of` edges (up to `depth` generations), down through `parent_of` reverse edges, and laterally through `spouse_of` edges.
2. Assign each node to a **generation row** (focus = 0, parents = -1, children = +1, grandparents = -2, etc.). Spouses inherit their partner's generation unless they themselves have a known parent in the tree (in which case their own generation wins — this handles step-relationships).
3. Within each row, group by "sibling unit under a parent pair" and order units by the birthYear of the eldest child (unknowns last). Within a unit, order by birthYear.
4. Spouses are placed adjacent to their partner.
5. `x` is computed as a packed layout: each subtree takes the minimum horizontal space its descendants require. Classic Reingold–Tilford/Walker's algorithm adapted so that spouse pairs are treated as a single "super-node" when positioning children.
6. `y` = `generationRow * ROW_HEIGHT` (e.g., 160 px). `ROW_HEIGHT` and node width are constants the client respects.

**Why not force-directed or d3-hierarchy?** Force-directed is non-deterministic. `d3-hierarchy` is strict-tree-only and does not handle spouse pairs or DAG merges (siblings sharing two parents). We implement the small amount we need; ~200 lines of testable pure TypeScript.

### Decision 6: Validation — hard vs. soft

Hard rejections (400):

- `birthYear` and `deathYear` both present and `deathYear < birthYear`.
- `parent_of` where source == target (self-parent).
- Any `parent_of` link whose insertion would create a cycle (A is ancestor of B is ancestor of A). The service runs a DFS from the proposed child up through existing ancestors before committing.
- `spouse_of` or `sibling_of` where source == target.
- Duplicate link of the same type between the same two entities.

Soft warnings (surfaced in response `warnings: []`, but insertion succeeds):

- Parent's `birthYear` ≥ child's `birthYear`.
- Parent already had `deathYear` before child's `birthYear`.

Soft because: adoption, fantasy resurrection, time-shenanigans. The GM should not be blocked.

### Decision 7: Frontend surface — dedicated genealogy page, not a tab

`/campaigns/[id]/characters/[slug]/genealogy` is a full-page tldraw view. The character detail page gets a button "View genealogy". We do this rather than an embedded tab because (a) the tree can grow large, (b) the full-page canvas is the UX that works, and (c) the URL is shareable.

The genealogy page persists the tldraw snapshot via the same mechanism used by existing canvas pages. First visit runs the server layout and writes the initial snapshot; subsequent visits load the saved snapshot. A "Recompute layout" button re-runs the server algorithm and overwrites the saved snapshot (with confirmation).

### Decision 8: CLI `character genealogy` ASCII format

The CLI prints an indented text tree by default (deeper generations indented; spouse shown on same line prefixed with `=`). `--format json` emits the raw node/edge payload so users can pipe into jq. We do not implement a Unicode box-drawing tree in v1 — indentation is enough.

## Risks / Trade-offs

- [Risk: Option A means `entityRelations` can contain rows where the source is a non-character entity cast as a "parent"] → Mitigation: service-layer helpers refuse to create family links where either end is not a character. The raw generic "add relation" UI can still create arbitrary relations (including family-typed ones) on non-character entities; we accept this as pre-existing flexibility and simply don't render such rows in the genealogy view.
- [Risk: Cycle detection on every parent write is O(depth) per insert] → Mitigation: depth is bounded by data and in practice tiny (<20). We cap traversal at 200 hops defensively.
- [Risk: Layered layout can overlap with very wide trees (many siblings)] → Mitigation: horizontal packing with per-subtree width; scale the canvas viewport to fit. Edge cases (hundreds of siblings) are acceptable to overlap and can be hand-edited.
- [Risk: Deleting a character leaves dangling family rows] → Mitigation: `entityRelations` already cascades on `entities.id` delete; we add an integration test asserting this works for family rows too.
- [Risk: Seeding builtin relation types into existing campaigns via migration can collide with user-created slugs of the same name] → Mitigation: migration uses `INSERT ... ON CONFLICT DO NOTHING` keyed on `(campaignId, slug)`; if a collision exists we skip and log, and the existing row is promoted by setting `isBuiltin=true` only if it is not already.
- [Risk: Gender as free-text allows inconsistent capitalization breaking the color mapping] → Mitigation: server lowercases and trims on write. Unknown values render gray.
- [Trade-off: Family links show up on the generic relationship graph] → We accept this. A future spec can add a filter to hide/show them.
- [Trade-off: Server-side layout means CLI and web share the algorithm but cannot offer offline re-layout in the browser] → Acceptable for v1; re-layout is a single API call.

## Migration Plan

1. Drizzle migration: add `birth_year INTEGER`, `death_year INTEGER`, `gender TEXT` columns to `characters`. All nullable. No backfill — existing characters simply have `NULL`.
2. Drizzle migration (second file, same change): for every existing campaign in `campaigns`, insert the three builtin relation types (`parent_of`, `spouse_of`, `sibling_of`) with `isBuiltin=true`, using `ON CONFLICT (campaign_id, slug) DO UPDATE SET is_builtin=1` so that any pre-existing user rows of those slugs get promoted (and thus protected from deletion).
3. Update campaign-creation code path to seed these three types for new campaigns.
4. Deploy: run migrations, then app. No downtime required — the new columns are nullable and existing `entityRelations` queries are unaffected.
5. Rollback: drop the three columns via a reverse migration; delete rows where `is_builtin=1 AND slug IN ('parent_of','spouse_of','sibling_of')` (demote is also acceptable if we want to keep user data).

## Open Questions

- Should we auto-create sibling links when two children share both parents? Current answer: no in v1, but we log a TODO. The layout algorithm visually groups siblings under the same parent pair anyway.
- Should the character edit form show a mini genealogy preview? Probably nice, but out of scope for v1.
- Should `gender` have a preset vocabulary that i18n can translate, or stay free-text? Start free-text with UI presets; revisit if inconsistency becomes a support burden.
- Do we need pagination/depth limits on `/genealogy` to prevent DoS on pathological trees? Hard cap `depth` at 10 (config constant) for v1.
