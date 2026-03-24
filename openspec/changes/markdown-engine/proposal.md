# Proposal: Markdown Content Engine

## Why

Aleph's core architectural differentiator is markdown-first content storage. All entity content lives as `.md` files on the filesystem, not in the database. This change builds the engine that reads, writes, indexes, and renders those files -- the foundation for the wiki, sessions, and every content-bearing feature.

## What Changes

- Implement the markdown file read/write service with YAML frontmatter (gray-matter + Zod validation)
- Set up @nuxtjs/mdc for runtime markdown rendering with Vue components
- Implement chokidar filesystem watcher for external edit detection
- Build the SQLite FTS5 search index with incremental sync
- Create the content directory management utilities
- Implement server-side secret block stripping (AST-based permission filtering)

## Scope

### In scope
- Markdown file CRUD (create, read, update, delete `.md` files)
- YAML frontmatter schema with Zod validation
- Campaign directory structure management
- @nuxtjs/mdc integration for rendering markdown with Vue components
- Custom MDC components: `::secret`, `:entity-link`
- chokidar filesystem watcher with debouncing
- FTS5 index creation, incremental sync (content hash based)
- FTS5 search API with BM25 ranking and snippets
- Server-side AST stripping of `:::secret` blocks based on user role

### Out of scope
- Tiptap editor integration (part of change 12-collaboration)
- Auto-linking engine (change 11)
- Git versioning (future enhancement)

## Dependencies
- 01-project-setup
- 02-auth-rbac (for permission-filtered rendering)
