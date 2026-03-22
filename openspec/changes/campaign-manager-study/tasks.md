# Tasks: Campaign Manager Study

## 1. Competitive Feature Analysis

- [ ] 1.1 Build a comprehensive feature matrix comparing all 10+ tools across every feature domain (wiki, maps, calendar, sessions, characters, inventory, permissions, search, collaboration, import/export, theming)
- [ ] 1.2 Identify the "best in class" implementation for each feature domain and document why
- [ ] 1.3 Identify the critical gaps and pain points across all tools (from user reviews, blog posts, and community feedback)
- [ ] 1.4 Document the auto-linking approaches: Kanka (@mentions + bracket syntax), World Anvil (autolinker), LegendKeeper (auto-linking + hover previews), Scabard (proper noun detection) -- compare strengths and feasibility for our stack

## 2. Worldbuilding Wiki Research

- [ ] 2.1 Study Kanka's entity type system (20+ types, custom modules, properties with 6 field types, cross-references, math operations)
- [ ] 2.2 Study Amsel Lore's template/rune system (drag-and-drop builder, 5 rune types, mirror links, grimoire)
- [ ] 2.3 Study LegendKeeper's wiki (infinite nesting, slash commands, cut-to-new-page, hover previews, transclusion)
- [ ] 2.4 Study World Anvil's article templates (28+ types, BBCode, custom templates with Twig/HTML/CSS)
- [ ] 2.5 Define the entity type catalog for Aleph: which types are built-in, which are user-creatable
- [ ] 2.6 Define the custom field/property system (field types, templates, inheritance, cross-references)
- [ ] 2.7 Research Tiptap editor capabilities and extensibility for our wiki needs (mentions, embeds, transclusion, collaborative editing)

## 3. Map System Research

- [ ] 3.1 Study LegendKeeper's Atlas (14K px maps, regions, paths, travel calc, zoom-level visibility, distance measurement, fantasy navigation)
- [ ] 3.2 Study Kanka's map system (layers, marker types, groups, explore mode, permission-controlled pins)
- [ ] 3.3 Evaluate Leaflet.js vs OpenLayers for custom image-based maps with pins, layers, and regions
- [ ] 3.4 Research nested map navigation patterns and breadcrumb implementations
- [ ] 3.5 Define map feature requirements: pin types, layer system, visibility controls, distance/travel tools

## 4. Campaign and Session Management Research

- [ ] 4.1 Study Amsel Tome's story structure (Arcs > Chapters > Scenes, non-linear branching, State tracking)
- [ ] 4.2 Study Amsel Tome's Arcana system (Choice, Role, Count, Destiny tracking)
- [ ] 4.3 Study Chronica's adventure notes and quest log (folders, nesting, visibility, quest chains, secret quests)
- [ ] 4.4 Study Obsidian Portal's adventure log and session journal system
- [ ] 4.5 Study Campaign Logger's rapid tagging system (@NPCs, #Locations, ~Plots, $Items)
- [ ] 4.6 Define session management workflow: scheduling, logging, recap, player contributions
- [ ] 4.7 Define quest/story tracking model: linear vs branching, decision tracking, consequence linking

## 5. Character Management Research

- [ ] 5.1 Study Kanka's character system (properties, articles, connections, abilities, inventory, age calculation)
- [ ] 5.2 Study Chronica's stat groups and abilities system (custom stats, secret/private, stat lock, profile templates)
- [ ] 5.3 Study World Anvil's interactive character sheets and statblock system (100+ RPG systems, rollable stats)
- [ ] 5.4 Study LegendKeeper's meter system (bars, circles, gauges, pools, ratings)
- [ ] 5.5 Define character profile structure: fixed fields vs custom properties, stat tracking approach
- [ ] 5.6 Define NPC management workflow: codex, secrets, encounter linking, relationship tracking

## 6. Calendar and Timeline Research

- [ ] 6.1 Study Kanka's calendar (custom months, moons, seasons, weather, intercalary months, recurring events, age calculation)
- [ ] 6.2 Study LegendKeeper's timeline (chronicle view, Gantt view, calendar view, custom calendar systems, moon phases)
- [ ] 6.3 Study Chronica's developments timeline and custom calendar (moon phases, seasons, recurring events)
- [ ] 6.4 Define custom calendar data model: months, weekdays, years, moons, seasons, intercalary periods
- [ ] 6.5 Define timeline visualization requirements: views, event linking, parallel storylines

## 7. Inventory and Economy Research

- [ ] 7.1 Study Chronica's inventory system (personal + party, containers, weight, shops, currencies, wealth logs, player shopkeeper)
- [ ] 7.2 Study Kanka's inventory system (positions, grid layout, weight/size/price, on any entity type)
- [ ] 7.3 Define inventory data model: items, containers, positions, transactions, currencies
- [ ] 7.4 Define shop system requirements: browsing, purchasing, player-owned shops, stock management

## 8. Role-Based Access Control Research

- [ ] 8.1 Study Kanka's permission system in depth (role-based + entity-level overrides, 5 visibility levels, permission chaining, inline permissions)
- [ ] 8.2 Study Chronica's player permissions and named admin roles (CharacterCodexer, KinshipKeeper, QuestKeeper, etc.)
- [ ] 8.3 Study LegendKeeper's secrets system and granular visibility settings
- [ ] 8.4 Study World Anvil's subscriber groups and secret/spoiler system
- [ ] 8.5 Define role hierarchy: Admin > Dungeon Master > Co-DM > Editor > Player > Visitor
- [ ] 8.6 Define permission granularity levels: system-wide, campaign-wide, entity-level, field-level
- [ ] 8.7 Define visibility model: public, members, editors, dm-only, specific-users, private
- [ ] 8.8 Define permission inheritance and override rules
- [ ] 8.9 Research and define additional granular permission roles (QuestKeeper, Cartographer, Chronicler, etc.)

## 9. Tech Stack Validation

- [ ] 9.1 Validate Nuxt 3 as the meta-framework: evaluate file-based API routing, middleware, SQLite compatibility, WebSocket support
- [ ] 9.2 Evaluate Drizzle ORM with SQLite: migration system, type safety, JSON column support, FTS5 integration
- [ ] 9.3 Evaluate Tiptap + Y.js for collaborative rich text editing in Vue 3
- [ ] 9.4 Evaluate Leaflet.js with custom image layers for the map system
- [ ] 9.5 Evaluate SQLite FTS5 for full-text search performance with expected data volumes
- [ ] 9.6 Evaluate authentication approaches: Lucia Auth vs custom JWT vs Nuxt Auth Utils
- [ ] 9.7 Evaluate real-time sync options: Socket.io vs native WebSocket vs Nuxt WebSocket module
- [ ] 9.8 Prototype: basic Nuxt 3 + SQLite + Drizzle setup to validate the core stack works end-to-end

## 10. Data Model Design

- [ ] 10.1 Design the User and Authentication schema (users, sessions, password hashes, 2FA)
- [ ] 10.2 Design the Campaign and Membership schema (campaigns, members, roles, invitations)
- [ ] 10.3 Design the Entity system schema (polymorphic entities, templates, custom fields, tags, relations)
- [ ] 10.4 Design the Map schema (maps, layers, pins, groups, nested maps)
- [ ] 10.5 Design the Session and Story schema (sessions, logs, arcs, scenes, decisions)
- [ ] 10.6 Design the Calendar and Timeline schema (calendars, months, events, timelines)
- [ ] 10.7 Design the Inventory and Economy schema (items, inventories, shops, currencies, transactions)
- [ ] 10.8 Design the Permission schema (roles, permissions, entity-level overrides, visibility)
- [ ] 10.9 Design the Search index schema (FTS5 virtual tables, trigram index for auto-linking)

## 11. Collaboration and Real-Time Research

- [ ] 11.1 Study LegendKeeper's real-time co-editing (multiplayer cursors, conflict resolution)
- [ ] 11.2 Research Y.js CRDT for collaborative editing with Tiptap
- [ ] 11.3 Define which features need real-time sync vs eventual consistency
- [ ] 11.4 Design WebSocket event model for live updates (entity changes, map pin moves, dice rolls, session state)

## 12. Differentiation and Unique Features

- [ ] 12.1 Define the auto-linking engine specification: entity detection, alias support, case-insensitivity, retroactive linking, performance requirements
- [ ] 12.2 Define the "relationship graph" feature: bidirectional connections, visual graph view, connection types
- [ ] 12.3 Define the decision/consequence tracking system (inspired by Amsel Tome's Arcana)
- [ ] 12.4 Define the self-hosting story: single binary/Docker, zero-config SQLite, easy backup (copy one file)
- [ ] 12.5 Identify 3-5 differentiating features that no single existing tool provides in combination
