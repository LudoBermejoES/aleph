# Proposal: Search & Auto-Linking

## Why

As a campaign wiki grows to hundreds of entities, two problems emerge: finding content quickly and maintaining cross-references between entities. A global search with instant results solves the first; an automatic linking engine that detects entity mentions in markdown and converts them to clickable links solves the second -- without requiring DMs to manually link every reference.

## What Changes

- Build a global search UI with Ctrl+K command palette and instant filtered results
- Ensure search results respect the existing permission system
- Implement an auto-linking engine using an Aho-Corasick automaton built from entity names and aliases
- Support case-insensitive matching with longest-match-wins disambiguation
- Define exclusion zones: code blocks, existing links, frontmatter, headings
- Add retroactive linking: when a new entity is created, scan all existing documents for mentions
- Implement incremental processing: synchronous for small batches (<20 docs), background queue for larger
- Render auto-links at display time (transform during markdown rendering, not stored in source files)
- Maintain a campaign-level automaton cache in memory with <10ms rebuild time

## Scope

### In scope
- Global search UI (Ctrl+K command palette)
- Search across entity names, aliases, tags, and FTS5-indexed content
- Permission-filtered search results
- Aho-Corasick automaton construction from entity names + aliases
- Case-insensitive matching with longest-match-wins
- Exclusion zones in markdown AST (code, links, frontmatter, headings)
- Retroactive mention scanning on entity create/rename
- Incremental batch processing with background queue for >20 docs
- Render-time link injection (source `.md` files remain untouched)
- In-memory automaton cache per campaign

### Out of scope
- Full-text search across file attachments (PDFs, images)
- Fuzzy/typo-tolerant matching
- Cross-campaign search

## Dependencies
- 01-project-setup
- 02-auth-rbac
- 03-markdown-engine
- 04-wiki-core
