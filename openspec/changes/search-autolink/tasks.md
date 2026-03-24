# Tasks: Search & Auto-Linking

## 1. Global Search API

- [ ] 1.1 Implement search endpoint using FTS5 with BM25 ranking
- [ ] 1.2 Add permission filtering to search results based on user role
- [ ] 1.3 Return grouped results with entity type, snippet, and relevance score
- [ ] 1.4 Support optional type filter parameter

## 2. Command Palette UI

- [ ] 2.1 Create `CommandPalette.vue` modal component
- [ ] 2.2 Register Ctrl+K / Cmd+K keyboard shortcut globally
- [ ] 2.3 Implement debounced search input with API integration
- [ ] 2.4 Build result list with type icons, arrow key navigation, Enter to open
- [ ] 2.5 Store recent searches in localStorage
- [ ] 2.6 Add Escape to close and click-outside dismiss

## 3. Aho-Corasick Automaton

- [ ] 3.1 Implement automaton builder from entity names and aliases
- [ ] 3.2 Implement case-insensitive matching with longest-match-wins
- [ ] 3.3 Create server-side campaign automaton cache (Map<campaignId, Automaton>)
- [ ] 3.4 Add cache invalidation on entity create, rename, delete, alias change
- [ ] 3.5 Add word-boundary detection to prevent partial-word matches

## 4. Auto-Link Remark Plugin

- [ ] 4.1 Create remark plugin that walks text nodes and runs automaton
- [ ] 4.2 Implement exclusion zone detection (code, links, frontmatter, headings)
- [ ] 4.3 Replace matched spans with `:entity-link` MDC inline components
- [ ] 4.4 Insert plugin into the rendering pipeline (after secret stripping)
- [ ] 4.5 Verify source `.md` files remain unmodified

## 5. Retroactive Linking

- [ ] 5.1 Create `entity_mentions` schema and migration
- [ ] 5.2 On entity create/rename, scan all campaign markdown files for new mentions
- [ ] 5.3 Implement synchronous scanning for campaigns with <20 entities
- [ ] 5.4 Implement background Nitro task for campaigns with >=20 entities
- [ ] 5.5 Build "Referenced by" section on entity detail page using mention data

## 6. Mentions API

- [ ] 6.1 Implement mentions query endpoint for an entity
- [ ] 6.2 Return list of source entities that reference the target entity with counts

## 7. Tests (TDD)

### Unit Tests (Vitest)

- [ ] 7.1 Test Aho-Corasick automaton build: given entity names ["Elara", "Elara's Keep", "Orc"], automaton is constructed without error
- [ ] 7.2 Test case-insensitive matching: "elara" matches entity "Elara"; "ELARA" also matches
- [ ] 7.3 Test longest-match-wins: text "visited Elara's Keep" matches "Elara's Keep" (not just "Elara")
- [ ] 7.4 Test word-boundary detection: "Orc" matches "the Orc attacked" but not "Orca whale" or "Forceful"
- [ ] 7.5 Test exclusion zone detection: entity name inside code block (`` `Elara` ``) is not linked
- [ ] 7.6 Test exclusion zone detection: entity name inside existing `[link](url)` is not double-linked
- [ ] 7.7 Test exclusion zone detection: entity name inside frontmatter YAML is not linked
- [ ] 7.8 Test exclusion zone detection: entity name inside heading is not linked
- [ ] 7.9 Test remark plugin: input markdown with entity mention outputs markdown with `:entity-link` MDC component
- [ ] 7.10 Test remark plugin: source .md file content is not modified (linking is render-time only)
- [ ] 7.11 Test automaton cache invalidation: creating new entity invalidates campaign automaton; subsequent build includes new entity

### Integration Tests (@nuxt/test-utils)

- [ ] 7.12 Test retroactive linking on entity creation: create entity "Dragon", then create entity with body mentioning "Dragon" → mentions table records the reference
- [ ] 7.13 Test retroactive scan on entity rename: rename entity triggers re-scan; old name no longer matched, new name matched
- [ ] 7.14 Test mentions API: GET mentions for entity returns list of source entities with reference counts
- [ ] 7.15 Test search endpoint with type filter: searching with type=character returns only character entities
- [ ] 7.16 Test search permission filtering: search results exclude entities the user cannot access
