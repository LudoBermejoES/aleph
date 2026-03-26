# Design: Search & Auto-Linking

## Technical Approach

### Global Search

- Uses the FTS5 index built in change 03 (entities_fts)
- Search endpoint: `GET /api/campaigns/:id/search?q=term&type=character&limit=20`
- BM25 ranking with field weights: name (10x), aliases (8x), tags (2x), body (1x)
- Results filtered server-side by user permissions before returning
- Returns: entity slug, name, type, snippet (FTS5 snippet function), relevance score

### Command Palette UI

- `Ctrl+K` (or `Cmd+K` on Mac) opens a modal command palette
- Debounced input (200ms) triggers search API call
- Results grouped by entity type with type icons
- Arrow key navigation, Enter to open, Escape to close
- Recent searches stored in localStorage for quick re-access

### Aho-Corasick Auto-Linking Engine

**Automaton Construction:**
- Built from all entity names + aliases for a campaign
- Each pattern maps to `{ entityId, slug, name }`
- Case-insensitive: patterns lowercased, input lowercased for matching, but original casing preserved in output
- Longest-match-wins: when "King Aldric" and "Aldric" both match, "King Aldric" wins
- Library: `ahocorasick` npm package (or custom implementation, ~200 lines)

**Automaton Cache:**
- One automaton per campaign, stored in a server-side `Map<campaignId, Automaton>`
- Rebuilt when: entity created, entity renamed, entity deleted, alias changed
- Rebuild is fast (<10ms for ~1000 entities) -- no persistence needed

### Exclusion Zones

Auto-linking operates on the markdown AST (after remark parsing). Nodes skipped:
- `code` and `inlineCode` nodes
- `link` nodes (existing links)
- `yaml` node (frontmatter)
- `heading` nodes
- Content inside `:::secret` directives (already handled by remark)

Only `text` and `paragraph` nodes are scanned for matches.

### Render-Time Injection

- Auto-linking is a **remark plugin** inserted into the rendering pipeline (after secret stripping, before MDC compilation)
- The plugin walks text nodes, runs the automaton, and replaces matched spans with `:entity-link[matched text]{slug="entity-slug"}` MDC inline components
- Source `.md` files are **never modified** -- links exist only in the rendered output
- This means auto-links update automatically when entities are renamed or deleted

### Retroactive Linking

When a new entity is created (or renamed):
1. Rebuild the campaign automaton (includes the new name/alias)
2. Scan all entity `.md` files in the campaign for mentions of the new name
3. Record mention locations in `entity_mentions` table: `id, source_entity_id, target_entity_id, count`
4. Mention data used for "Referenced by" sections on entity detail pages

**Batch Processing:**
- If campaign has <20 entities: scan all synchronously during the create request
- If campaign has >=20 entities: queue a background Nitro task for scanning
- Background task processes files in batches of 50 with yielding between batches

### Service Layer (TDD)

Business logic extracted into `server/services/autolink.ts` -- pure functions tested in isolation:

- `buildAutomaton(entityNames)` -- builds Aho-Corasick from name list
- `findMatches(text, automaton)` -- finds all matches in text
- `computeExclusionZones(markdown)` -- identifies code blocks, links, frontmatter
- `filterMatchesByExclusions(matches, zones)` -- removes matches in excluded zones
- `resolveOverlaps(matches)` -- longest-match-wins conflict resolution

Architecture: Write unit tests first (TDD red phase), then implement service functions (green phase), then refactor API handlers to call services. API handlers stay thin -- they call services + DB, return results.

Test layers:
1. **Unit tests**: service functions in isolation (no DB, no server)
2. **Schema tests**: DB constraints and cascades (`:memory:` SQLite)
3. **Integration tests**: API contracts against running server

### API Endpoints

```
GET /api/campaigns/:id/search?q=&type=&limit=
GET /api/campaigns/:id/entities/:slug/mentions    # entities that mention this one
```
