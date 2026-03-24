# Tasks: Search & Auto-Linking

## 1. Service Layer (`server/services/autolink.ts`)

- [ ] 1.1 Implement `buildAutomaton(entityNames)` -- builds Aho-Corasick from name list
- [ ] 1.2 Implement `findMatches(text, automaton)` -- finds all matches in text
- [ ] 1.3 Implement `computeExclusionZones(markdown)` -- identifies code blocks, links, frontmatter
- [ ] 1.4 Implement `filterMatchesByExclusions(matches, zones)` -- removes matches in excluded zones
- [ ] 1.5 Implement `resolveOverlaps(matches)` -- longest-match-wins conflict resolution

## 2. Global Search API

- [ ] 2.1 Wire search endpoint using FTS5 with BM25 ranking
- [ ] 2.2 Add permission filtering to search results based on user role
- [ ] 2.3 Return grouped results with entity type, snippet, and relevance score
- [ ] 2.4 Support optional type filter parameter

## 3. Command Palette UI

- [ ] 3.1 Create `CommandPalette.vue` modal component
- [ ] 3.2 Register Ctrl+K / Cmd+K keyboard shortcut globally
- [ ] 3.3 Implement debounced search input with API integration
- [ ] 3.4 Build result list with type icons, arrow key navigation, Enter to open
- [ ] 3.5 Store recent searches in localStorage
- [ ] 3.6 Add Escape to close and click-outside dismiss

## 4. Aho-Corasick Automaton

- [ ] 4.1 Wire `buildAutomaton` service into automaton builder from entity names and aliases
- [ ] 4.2 Wire case-insensitive matching with `resolveOverlaps` for longest-match-wins
- [ ] 4.3 Create server-side campaign automaton cache (Map<campaignId, Automaton>)
- [ ] 4.4 Add cache invalidation on entity create, rename, delete, alias change
- [ ] 4.5 Add word-boundary detection to prevent partial-word matches

## 5. Auto-Link Remark Plugin

- [ ] 5.1 Create remark plugin that walks text nodes and runs automaton via `findMatches` service
- [ ] 5.2 Wire `computeExclusionZones` + `filterMatchesByExclusions` for exclusion zone detection
- [ ] 5.3 Replace matched spans with `:entity-link` MDC inline components
- [ ] 5.4 Insert plugin into the rendering pipeline (after secret stripping)
- [ ] 5.5 Verify source `.md` files remain unmodified

## 6. Retroactive Linking

- [ ] 6.1 Create `entity_mentions` schema and migration
- [ ] 6.2 On entity create/rename, scan all campaign markdown files using `findMatches` service
- [ ] 6.3 Implement synchronous scanning for campaigns with <20 entities
- [ ] 6.4 Implement background Nitro task for campaigns with >=20 entities
- [ ] 6.5 Build "Referenced by" section on entity detail page using mention data

## 7. Mentions API

- [ ] 7.1 Wire mentions query handler for an entity
- [ ] 7.2 Return list of source entities that reference the target entity with counts

## 8. Tests (TDD)

### Unit Tests -- Service Functions (Vitest)

- [ ] 8.1 Test `buildAutomaton`: given entity names ["Elara", "Elara's Keep", "Orc"], automaton is constructed without error
- [ ] 8.2 Test `findMatches`: case-insensitive matching -- "elara" matches entity "Elara"; "ELARA" also matches
- [ ] 8.3 Test `resolveOverlaps`: text "visited Elara's Keep" resolves to "Elara's Keep" (longest-match-wins, not just "Elara")
- [ ] 8.4 Test `findMatches` + word-boundary: "Orc" matches "the Orc attacked" but not "Orca whale" or "Forceful"
- [ ] 8.5 Test `computeExclusionZones`: identifies code blocks, inline code, links, frontmatter, and headings as exclusion zones
- [ ] 8.6 Test `filterMatchesByExclusions`: entity name inside code block (`` `Elara` ``) is excluded
- [ ] 8.7 Test `filterMatchesByExclusions`: entity name inside existing `[link](url)` is excluded (no double-linking)
- [ ] 8.8 Test `filterMatchesByExclusions`: entity name inside frontmatter YAML is excluded
- [ ] 8.9 Test `filterMatchesByExclusions`: entity name inside heading is excluded
- [ ] 8.10 Test remark plugin end-to-end: input markdown with entity mention outputs markdown with `:entity-link` MDC component
- [ ] 8.11 Test remark plugin: source .md file content is not modified (linking is render-time only)
- [ ] 8.12 Test automaton cache invalidation: creating new entity invalidates campaign automaton; subsequent build includes new entity

### Schema Tests (`:memory:` SQLite)

- [ ] 8.13 Test entity_mentions table: source_entity_id and target_entity_id FK constraints; cascade delete on entity removal
- [ ] 8.14 Test entity_mentions table: unique constraint on (source_entity_id, target_entity_id) pair

### Integration Tests (API)

- [ ] 8.15 Test retroactive linking on entity creation: create entity "Dragon", then create entity with body mentioning "Dragon" → mentions table records the reference
- [ ] 8.16 Test retroactive scan on entity rename: rename entity triggers re-scan; old name no longer matched, new name matched
- [ ] 8.17 Test mentions API: GET mentions for entity returns list of source entities with reference counts
- [ ] 8.18 Test search endpoint with type filter: searching with type=character returns only character entities
- [ ] 8.19 Test search permission filtering: search results exclude entities the user cannot access
