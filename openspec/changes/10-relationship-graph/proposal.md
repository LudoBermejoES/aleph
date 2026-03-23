# Proposal: Relationship Graph

## Why

TTRPGs generate complex webs of relationships -- alliances, rivalries, family ties, trade routes, and political hierarchies. DMs need to track these connections and visualize them as an interactive graph so they can quickly see how entities relate and discover emergent story opportunities. Players benefit from seeing the connections their characters know about.

## What Changes

- Implement entity relations CRUD for bidirectional connections between any two entities
- Provide 17 built-in relation types plus custom types with forward/reverse labels
- Add attitude scores (-100 to +100) with color-coded edge rendering
- Support relation metadata (description, arbitrary JSON fields)
- Integrate relation visibility with the existing permission system
- Build an entity-centered graph view using v-network-graph (Vue 3 SVG-based)
- Build a campaign-wide connection web with filtering by entity type and relation type
- Add interactive controls: zoom, pan, drag nodes, click to navigate
- Provide cytoscape.js fallback for graphs exceeding 500 nodes

## Scope

### In scope
- Entity relations CRUD API (create, update, delete bidirectional relations)
- 17 built-in relation types (ally, enemy, family, mentor, rival, vassal, trade partner, etc.)
- Custom relation types with configurable forward/reverse labels
- Attitude score per relation with heatmap edge coloring
- Relation metadata: description text and extensible JSON fields
- Visibility per relation (public, DM-only, player-specific) using existing RBAC
- Entity-centered graph view (show one entity and its connections)
- Campaign-wide graph view with entity type and relation type filters
- Interactive graph: zoom, pan, drag, click-to-navigate
- Performance fallback to cytoscape.js when node count exceeds 500

### Out of scope
- Automatic relationship inference from narrative content
- 3D graph rendering
- Relationship timeline/history tracking

## Dependencies
- 01-project-setup
- 02-auth-rbac
- 03-markdown-engine
- 04-wiki-core
