# Proposal: Wiki Core

## Why

The wiki is Aleph's central knowledge system -- every piece of campaign lore, every NPC, every location lives here as a typed entity. This change builds the entity CRUD layer, the type/template system, and the browsing UI that all other features (maps, sessions, characters) depend on to store and display their data.

## What Changes

- Implement entity CRUD API (metadata in SQLite, content body in `.md` files)
- Build the entity type system with 8 built-in types (character, location, faction, item, event, lore, quest, note) plus user-created custom types
- Create entity templates with custom field definitions (text, number, checkbox, select, date, entity_reference, section)
- Add entity tagging system for flexible categorization
- Support hierarchical nesting via parent_id for tree-structured entities
- Build entity list page with filtering by type, tag, and visibility
- Build entity detail page with frontmatter field display and MDC-rendered content

## Scope

### In scope
- Entity CRUD API endpoints (create, read, update, delete)
- Entity types table with built-in seed data and custom type creation
- Entity templates with ordered custom field definitions
- Tag CRUD and entity-tag many-to-many association
- Hierarchical parent_id with breadcrumb navigation
- Entity list page with type/tag/visibility filters and search
- Entity detail page rendering frontmatter fields + markdown body
- Slug generation and uniqueness enforcement per campaign

### Out of scope
- Character-specific fields and stat blocks (change 08)
- Auto-linking of entity mentions (change 11)
- Collaborative editing (change 12)
- Relationship graph between entities (change 10)

## Dependencies
- 01-project-setup
- 02-auth-rbac
- 03-markdown-engine
