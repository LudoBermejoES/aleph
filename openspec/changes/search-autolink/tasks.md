# Tasks: Search & Auto-Linking

## 1. Service Layer (`server/services/autolink.ts`)

- [x] 1.1 Implement `buildAutomaton(entityNames)` -- builds pattern matcher from names + aliases
- [x] 1.2 Implement `findMatches(text, automaton)` -- case-insensitive with word boundaries
- [x] 1.3 Implement `computeExclusionZones(markdown)` -- code blocks, links, frontmatter, headings
- [x] 1.4 Implement `filterMatchesByExclusions(matches, zones)` -- removes matches in excluded zones
- [x] 1.5 Implement `resolveOverlaps(matches)` -- longest-match-wins

## 2. Global Search API

- [x] 2.1 Wire search endpoint using FTS5 with BM25 (already done in markdown-engine)
- [x] 2.2 Add permission filtering (already done)
- [x] 2.3 Return results with entity type, snippet, relevance score
- [ ] 2.4 Support optional type filter parameter

## 3. Command Palette UI

- [x] 3.1 Create `SearchCommand.vue` (already done in markdown-engine)
- [x] 3.2 Register Ctrl+K keyboard shortcut
- [x] 3.3 Debounced search with API integration
- [ ] 3.4 Arrow key navigation in result list
- [ ] 3.5 Store recent searches in localStorage
- [x] 3.6 Escape to close

## 4. Automaton Cache

- [x] 4.1 Build automaton from entity names + aliases
- [x] 4.2 Case-insensitive + longest-match-wins
- [x] 4.3 Campaign automaton cache (Map<campaignId, Automaton>)
- [x] 4.4 Cache invalidation function
- [x] 4.5 Word-boundary detection

## 5. Auto-Link Remark Plugin

- [ ] 5.1 Create remark plugin that runs automaton on text nodes
- [ ] 5.2 Wire exclusion zone detection
- [ ] 5.3 Replace matched spans with `:entity-link` MDC components
- [ ] 5.4 Insert into rendering pipeline
- [ ] 5.5 Verify source .md files remain unmodified

## 6. Retroactive Linking

- [ ] 6.1 Create `entity_mentions` schema + migration
- [ ] 6.2 Scan campaign markdown on entity create/rename
- [ ] 6.3 Synchronous for <20 entities
- [ ] 6.4 Background task for >=20 entities
- [ ] 6.5 "Referenced by" section on entity detail

## 7. Mentions API

- [ ] 7.1 Wire mentions query for entity
- [ ] 7.2 Return source entities with reference counts

## 8. Tests (TDD)

### Unit Tests -- Service Functions

- [x] 8.1 Test buildAutomaton: constructs from names + aliases
- [x] 8.2 Test findMatches: case-insensitive
- [x] 8.3 Test resolveOverlaps: longest-match-wins
- [x] 8.4 Test findMatches: word-boundary (Orc vs Orca)
- [x] 8.5 Test computeExclusionZones: code, inline code, links, frontmatter
- [x] 8.6 Test filterMatchesByExclusions: inside zone excluded
- [x] 8.7 Test filterMatchesByExclusions: outside zone kept

### Integration Tests (API)

- [ ] 8.8 Test retroactive linking on entity creation
- [ ] 8.9 Test mentions API
- [x] 8.10 Test search with type filter
- [x] 8.11 Test search permission filtering
