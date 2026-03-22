# Proposal: Campaign Manager Study

## Intent

Conduct a comprehensive study of the TTRPG campaign management tool landscape to define the requirements, architecture, and feature set for **Aleph** -- a modern, self-hosted web application that consolidates the best capabilities from existing tools into a unified, role-based platform.

## Background

The TTRPG campaign management space is fragmented. After analyzing 10+ existing tools (Amsel Suite, Kanka.io, World Anvil, LegendKeeper, Chronica, Obsidian Portal, Scabard, Campaign Logger, Notebook.ai, YARPS), several recurring pain points emerge:

- **No single tool does everything well.** Chronica excels at session/party management but lacks wiki. LegendKeeper has great wiki/maps but weaker session tools. World Anvil has breadth but complexity.
- **Auto-linking is the holy grail.** Realm Works set the standard for automatic entity linking (case-insensitive, retroactive, alias-aware). No current tool fully replicates this.
- **Player access vs. DM control** is critical. Selective information revelation (secrets, visibility tiers) is a top priority for GMs.
- **Subscription fatigue.** Per-campaign costs and rising prices frustrate users. One-time or self-hosted options are highly valued.
- **Offline capability** is wanted but rarely delivered in web tools.

## Goals

1. **Feature audit**: Catalog every feature across all studied tools, grouped by domain (worldbuilding, session management, maps, etc.)
2. **Requirements definition**: Define MUST/SHOULD/MAY requirements for Aleph based on feature analysis
3. **Role & permission model**: Design a comprehensive RBAC system (Admin, Dungeon Master, Editor, Player, Visitor, and additional roles)
4. **Tech stack validation**: Confirm Node.js + Vue.js 3 + SQLite as the foundation; evaluate Nuxt.js vs Express/Fastify for the backend
5. **Architecture outline**: High-level system architecture suited for self-hosted deployment
6. **Differentiation strategy**: Identify what Aleph will do better than existing tools

## Scope

### In scope
- Feature analysis and requirements for all core domains:
  - Worldbuilding wiki (entities, templates, auto-linking)
  - Maps (interactive, pins, layers, nested)
  - Campaign/session management (arcs, scenes, session logs)
  - Character management (PCs, NPCs, sheets, stats)
  - Calendar & timeline systems
  - Inventory & economy (items, shops, currencies)
  - Dice rolling
  - Collaboration & permissions (RBAC, secrets, visibility)
  - Organization tools (tags, search, filtering)
  - Import/export & data portability
- Role-based access control design
- Tech stack evaluation and recommendation
- Data model conceptual design

### Out of scope
- Implementation code
- UI/UX mockups or wireframes
- VTT (Virtual Tabletop) integration
- Mobile app considerations
- AI-powered features (generators, backstory AI)
- Marketplace/plugin system (future phase)
- Deployment/hosting infrastructure

## Approach

Research-first: Each task produces documented findings that feed into the final requirements spec. The study follows a domain-by-domain analysis pattern, comparing how each existing tool handles the domain, then synthesizing requirements for Aleph.

## Competitive Landscape Summary

| Tool | Strengths | Weaknesses | Key Inspiration |
|------|-----------|------------|-----------------|
| **Amsel Suite** (Tome + Lore) | Non-linear storytelling, Arcana tracking, template system, offline | Desktop only, no multiplayer/web | Story structure, Arcana/decision tracking, template builder |
| **Kanka.io** | 20+ entity types, deep permissions, plugin system, self-hostable | Complex UI, premium gates many features | Entity system, RBAC, mentions, properties, plugin architecture |
| **World Anvil** | 28+ article templates, autolinker, manuscripts, huge community | Complexity, BBCode editor, subscription tiers | Article templates, autolinker, chronicles, statblocks |
| **LegendKeeper** | Best wiki UX, auto-linking, massive maps, real-time collab, meters | No calendar (standalone tool), early-stage features | Wiki editor, atlas system, meters, boards, travel navigation |
| **Chronica** | Session/party management, inventory, kingdom building, shops | No wiki, per-campaign pricing, limited maps | Quest log, inventory system, shops, kingdom building, player roles |
| **Obsidian Portal** | Longest-running, adventure log, DSTs, community | Dated UI, limited free tier, basic maps | Adventure log, dynamic character sheets, community model |
| **Scabard** | Connection graph, AI backstory gen, Foundry integration | Limited free tier, basic features | Relationship graph, proper noun detection, auto-linking |
| **Campaign Logger** | Fast session logging, tag system, generators | Text-only, no visual tools, no maps | Tag-based logging, generator engine, rapid note-taking |
| **Notebook.ai** | 31 content types, bidirectional linking, writing tools | No session management, no maps, minimal collab | Content type breadth, bidirectional relationships |
| **YARPS** | Storygraph, music integration, fog-of-war, modular pricing | Uncertain status, complex pricing | Narrative database concept, music/atmosphere tools |
