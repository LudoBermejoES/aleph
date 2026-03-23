# Proposal: Character Management

## Why

Characters are the most frequently accessed entities in any campaign. Both PCs and NPCs need structured data beyond what a generic entity provides -- stats, abilities, connections, and codex views tailored to how DMs and players actually use character information during play. This change extends the entity system with character-specific features.

## What Changes

- Build character profiles for PCs and NPCs on top of the entity system
- Add character-specific fields: race, class, alignment, status, current location
- Implement customizable stat groups with per-template stat definitions and secret/private toggle
- Build an abilities system with types, descriptions, and tags
- Support character connections to other entities (distinct from the relationship graph)
- Build NPC codex: filterable list with search, folders, and duplicate functionality
- Build PC codex: player-owned characters with mount/companion support
- Implement player-owned character editing (limited to own characters)

## Scope

### In scope
- Character entity subtype with additional structured fields
- Stat groups: customizable per template, secret stats hidden from players
- Abilities CRUD with type categorization and tag filtering
- Character connections (lightweight links to other entities)
- NPC codex page with search, folder organization, duplicate
- PC codex page with player ownership and mount/companion linking
- Player self-service editing for owned characters (name, description, stats allowed by DM)

### Out of scope
- Inventory and item management (change 09)
- Relationship graph visualization (change 10)
- Character sheet PDF export (future)
- Game system-specific automation (Aleph is system-agnostic)

## Dependencies
- 01-project-setup
- 02-auth-rbac
- 03-markdown-engine
- 04-wiki-core
