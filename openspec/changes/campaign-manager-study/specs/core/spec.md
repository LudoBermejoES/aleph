# Aleph -- Core Specification

## Purpose

Aleph is a self-hosted, web-based TTRPG campaign management suite that enables Dungeon Masters and players to collaboratively build worlds, manage campaigns, track sessions, and organize all game-related content through a unified, role-based platform.

## ADDED Requirements

### Requirement: Worldbuilding Wiki

The system SHALL provide a rich wiki system for creating, organizing, and interlinking world content (locations, characters, factions, items, lore, etc.).

Inspired by: Kanka (20+ entity types), World Anvil (28+ templates), LegendKeeper (infinite nesting, auto-linking), Amsel Lore (template builder with runes)

#### Scenario: Creating a wiki entry
- GIVEN an authenticated user with Editor or higher role
- WHEN the user creates a new wiki entry with a type, name, and content
- THEN the entry is saved and indexed for search and auto-linking
- AND the entry appears in the appropriate category listing

#### Scenario: Auto-linking entities
- GIVEN existing wiki entries with defined names and aliases
- WHEN a user writes content mentioning an entity by name or alias
- THEN the system SHALL automatically detect and hyperlink the mention
- AND linking SHALL be case-insensitive and retroactive

#### Scenario: Customizable entity templates
- GIVEN an Admin or Dungeon Master user
- WHEN they define a custom entity template with fields and layout
- THEN new entries of that type use the template structure
- AND existing entries can be migrated to updated templates

### Requirement: Markdown-First Content Storage

The system SHALL store all entity content as markdown files on the filesystem rather than in the database. SQLite handles metadata, relationships, permissions, and indexing, while the actual content lives as `.md` files organized in a directory structure per campaign. Vue renders markdown directly on the client and server side.

Rationale: Markdown files are human-readable, git-friendly, easily backed up by copying a folder, editable outside the app with any text editor, and naturally portable. This separates content (files) from structure (database), making the system transparent and hackable.

#### Scenario: Creating content as a markdown file
- GIVEN an Editor or higher user creating a new wiki entry
- WHEN they save the entry with rich content (headings, lists, images, links)
- THEN the system writes a `.md` file to the campaign's content directory
- AND the database stores only the metadata (id, type, name, path, visibility, timestamps, custom fields)
- AND the file includes YAML frontmatter with entity metadata for portability

#### Scenario: Editing content through the web UI
- GIVEN a user editing an existing wiki entry in the browser
- WHEN they use the rich text editor (Tiptap) to modify content
- THEN the editor works with markdown as the source format
- AND on save, the updated markdown is written back to the file
- AND the database metadata and search index are updated accordingly

#### Scenario: Editing content outside the app
- GIVEN a Dungeon Master editing a `.md` file directly with an external editor
- WHEN the server detects the file change (via filesystem watcher)
- THEN the database metadata and search index are re-synced automatically
- AND the auto-linking engine re-processes the updated content

#### Scenario: Rendering markdown in Vue
- GIVEN a user viewing a wiki entry in the browser
- WHEN the page loads
- THEN the server reads the `.md` file, applies permission filtering (strips secret sections), and serves it
- AND Vue renders the markdown with proper formatting, auto-linked entity references, and embedded components (maps, meters, dice)

#### Scenario: Campaign content directory structure
- GIVEN a campaign named "Curse of Strahd"
- WHEN the DM creates entities of various types
- THEN the filesystem reflects a structured layout like:
  ```
  content/campaigns/curse-of-strahd/
    characters/strahd-von-zarovich.md
    characters/ireena-kolyana.md
    locations/barovia/village-of-barovia.md
    locations/barovia/castle-ravenloft.md
    sessions/session-001.md
    maps/barovia-map.md
  ```
- AND the entire campaign can be backed up by copying the directory

### Requirement: Interactive Maps

The system SHALL support interactive maps with customizable pins, layers, and nested map hierarchies.

Inspired by: LegendKeeper (14K px, regions, paths, travel calc), Kanka (layers, marker groups, explore mode), Amsel (pin-to-page linking)

#### Scenario: Uploading and pinning a map
- GIVEN a Dungeon Master or Editor user
- WHEN they upload a map image and place pins on it
- THEN each pin can be linked to a wiki entry
- AND pins can have custom icons, colors, and visibility settings

#### Scenario: Player viewing a map with hidden pins
- GIVEN a map with pins at various visibility levels
- WHEN a Player views the map
- THEN only pins visible to their role or specifically shared with them are displayed
- AND hidden pins are completely invisible (no placeholder or indication)

#### Scenario: Nested maps
- GIVEN a world map with a pin for a city
- WHEN the user clicks the city pin
- THEN the system navigates to the city's detailed map
- AND breadcrumb navigation shows the map hierarchy

### Requirement: Campaign and Session Management

The system SHALL support organizing campaigns into arcs, chapters, and sessions with branching narrative support.

Inspired by: Amsel Tome (arcs > chapters > scenes, Arcana), Chronica (adventure notes, quest log), Obsidian Portal (adventure log)

#### Scenario: Creating a campaign with session logs
- GIVEN a Dungeon Master user
- WHEN they create a campaign and add session log entries
- THEN each session is dated, searchable, and linkable to wiki entries
- AND players with access can read (and optionally contribute to) session logs

#### Scenario: Tracking story decisions
- GIVEN a campaign with branching narrative points
- WHEN the Dungeon Master logs a player decision at a choice point
- THEN the decision is recorded with who made it and its consequences
- AND future scenes can reference prior decisions

### Requirement: Character Management

The system SHALL support detailed character profiles for PCs, NPCs, and creatures with customizable stat tracking.

Inspired by: Kanka (characters with properties), Chronica (stat groups, abilities), World Anvil (interactive sheets), LegendKeeper (meters)

#### Scenario: Player managing their character
- GIVEN a Player user with an assigned character
- WHEN they update their character's stats, inventory, or notes
- THEN the changes are saved and visible to the Dungeon Master
- AND the Dungeon Master can see all character details including any secrets

#### Scenario: DM creating an NPC with secrets
- GIVEN a Dungeon Master user
- WHEN they create an NPC with public and secret information
- THEN players see only the public information
- AND the DM sees all information including the secret sections

### Requirement: Calendar and Timeline System

The system SHALL support fully custom in-game calendars and chronological timelines.

Inspired by: Kanka (custom months, moons, seasons, age calc), Chronica (developments timeline), LegendKeeper (chronicle, Gantt, calendar views), World Anvil (fantasy calendar)

#### Scenario: Creating a custom calendar
- GIVEN a Dungeon Master or Editor user
- WHEN they define a calendar with custom months, weekdays, moons, and seasons
- THEN the calendar renders correctly with all custom elements
- AND events can be placed on specific dates

#### Scenario: Age auto-calculation
- GIVEN a character with a birth date on a custom calendar
- WHEN the campaign's current date advances
- THEN the character's age is automatically recalculated

### Requirement: Inventory and Economy System

The system SHALL support item libraries, character inventories, party loot, and in-game shops.

Inspired by: Chronica (inventories, shops, currencies, wealth tracking), Kanka (inventory on any entity, positions)

#### Scenario: Managing party inventory
- GIVEN a campaign with a shared party inventory
- WHEN a player adds or removes an item
- THEN the inventory updates for all party members
- AND the DM can see a full transaction history

#### Scenario: Operating an in-game shop
- GIVEN a DM-created shop with priced items
- WHEN a player purchases an item
- THEN the item moves to their inventory
- AND the currency is deducted from their wealth

### Requirement: Dice Rolling

The system SHALL provide an integrated dice roller supporting standard and custom dice.

Inspired by: Amsel (standard + custom dice), Chronica (d4-d100), Campaign Logger (formulas, exploding dice)

#### Scenario: Rolling dice with modifiers
- GIVEN any authenticated user in a campaign
- WHEN they roll dice using a formula (e.g., 2d6+4)
- THEN the result shows individual die values and the total
- AND the roll can optionally be logged to the session

### Requirement: Search and Organization

The system SHALL provide global search, tagging, filtering, and hierarchical organization.

Inspired by: Kanka (Ctrl+K search, additive filters, tag system), LegendKeeper (full-text search), Campaign Logger (symbol-based tagging)

#### Scenario: Global search
- GIVEN a user in any campaign view
- WHEN they invoke global search and type a query
- THEN results from all accessible entities are returned ranked by relevance
- AND results respect the user's permission level (hidden entries are excluded)

### Requirement: Import and Export

The system SHALL support data import and export for portability and backup.

Inspired by: LegendKeeper (Markdown, WorldAnvil import), Kanka (full export, CSV import), Campaign Logger (JSON export)

#### Scenario: Full campaign export
- GIVEN a campaign Admin or Dungeon Master
- WHEN they request a full campaign export
- THEN the system generates a complete archive (JSON + assets)
- AND the archive can be re-imported to restore the campaign

### Requirement: Role-Based Access Control

The system SHALL enforce a comprehensive role-based permission system with granular visibility controls.

Inspired by: Kanka (role + entry-level permissions, 5 visibility levels), Chronica (named admin roles), LegendKeeper (secrets system)

#### Scenario: Role hierarchy and default permissions
- GIVEN the system defines these roles: Admin, Dungeon Master, Editor, Player, Visitor
- WHEN a user is assigned a role in a campaign
- THEN they inherit that role's default permissions
- AND permissions can be overridden per-entity or per-user

#### Scenario: Admin managing users
- GIVEN an Admin user
- WHEN they invite a new user and assign the Player role
- THEN the new user can access only content permitted for Players
- AND the Admin can promote, demote, or remove users

#### Scenario: Dungeon Master hiding content from players
- GIVEN a Dungeon Master creating or editing any content
- WHEN they set visibility to "DM Only" or "DM + specific players"
- THEN only authorized users can see that content
- AND related references (relations, map pins, inventory) are also hidden

#### Scenario: Visitor browsing a public campaign
- GIVEN a campaign marked as public
- WHEN a Visitor (unauthenticated or no-role user) accesses it
- THEN they can view only content marked with public visibility
- AND they cannot edit, comment, or interact beyond reading

### Requirement: Real-Time Collaboration

The system SHALL support real-time collaborative editing for wiki entries and maps.

Inspired by: LegendKeeper (real-time co-editing, multiplayer cursors)

#### Scenario: Concurrent editing
- GIVEN two users editing the same wiki entry
- WHEN both make changes simultaneously
- THEN changes are merged in real-time without conflict
- AND each user sees the other's cursor position

### Requirement: Theming and Customization

The system SHALL support visual themes and UI customization per campaign.

Inspired by: Amsel (Pendragon/Neo Tokyo/Redrum themes), Chronica (3 themes), Kanka (theme builder, custom CSS), World Anvil (CSS per world)

#### Scenario: Applying a campaign theme
- GIVEN a Dungeon Master or Admin user
- WHEN they select or customize a visual theme for the campaign
- THEN all campaign pages render with the chosen theme
- AND individual users MAY override with their own preference

## Role Definitions

| Role | Description | Default Capabilities |
|------|-------------|---------------------|
| **Admin** | System administrator | Full system access, user management, system settings, all campaign access |
| **Dungeon Master** | Campaign owner/GM | Full campaign control, create/edit/delete all content, manage secrets, invite players, manage campaign settings |
| **Editor** | Trusted content creator | Create and edit wiki entries, maps, and shared content; cannot manage users or campaign settings; cannot see DM-only secrets |
| **Player** | Campaign participant | View permitted content, manage own character(s), contribute to session logs (if allowed), manage own inventory |
| **Visitor** | Read-only browser | View public content only, no editing, no character ownership |
| **Co-DM** | Assistant game master | Same as Dungeon Master but cannot delete the campaign or remove the primary DM |

### Additional Granular Permissions (inspired by Chronica)
- **QuestKeeper**: Can create/edit quests
- **LoreKeeper**: Can create/edit wiki entries
- **Cartographer**: Can create/edit maps
- **Shopkeeper**: Can manage in-game shops
- **Chronicler**: Can write session logs
