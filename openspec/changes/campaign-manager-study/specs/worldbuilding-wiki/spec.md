# Aleph -- Worldbuilding Wiki Specification

## Purpose

Define the wiki system that is the primary tool for creating, organizing, and interlinking all world content. This is the largest and most-used feature domain -- the knowledge base of every campaign.

## ADDED Requirements

### Requirement: Entity Type System

The system SHALL support a catalog of built-in entity types and allow Dungeon Masters to create custom types.

#### Scenario: Built-in entity types
- GIVEN the system ships with these built-in entity types:
  - Character (PCs, NPCs, creatures)
  - Location (places, regions, buildings)
  - Faction (organizations, governments, guilds, families)
  - Item (equipment, artifacts, consumables)
  - Lore (history, myths, legends, religion, culture, laws)
  - Event (world events, battles, festivals)
  - Species (races, creatures, flora, fauna)
  - Language (languages, scripts, codes)
  - Spell / Ability (magic, powers, feats)
  - Note (freeform catch-all)
- WHEN a user creates a new entity
- THEN they select from the available types (built-in + custom)
- AND each type has a default icon, color, and template

#### Scenario: Custom entity types
- GIVEN a Dungeon Master in campaign settings
- WHEN they create a custom entity type (e.g., "Deity", "Vehicle", "Plane")
- THEN a new directory is created under the campaign content folder
- AND the type appears in the entity creation dropdown
- AND it can have a custom icon, color, and default template

### Requirement: Entity Templates

The system SHALL support customizable templates that define the structure of entity pages.

#### Scenario: Default templates per type
- GIVEN each built-in entity type has a default template
- WHEN a user creates a "Character" entity
- THEN the template pre-populates the frontmatter `fields` with: race, class, alignment, status, age, location, faction_membership
- AND the markdown body includes section stubs: ## Description, ## Backstory, ## Personality, ## Goals, ## Secrets

#### Scenario: Custom template creation
- GIVEN a DM opens the template editor
- WHEN they define a custom template with:
  - Custom frontmatter fields (name, type, default value, visibility per field)
  - Markdown body sections
  - Embedded component blocks (meters, stat blocks)
- THEN the template is saved as a `.template.md` file in `content/campaigns/{slug}/_templates/`
- AND it can be assigned to any entity type

#### Scenario: Applying a template to existing entities
- GIVEN a DM creates a new template for "Location" entities
- WHEN they choose to apply it to existing locations
- THEN existing entities gain the new template's fields (with default values for new fields)
- AND existing content and field values are preserved
- AND the user can preview changes before applying

### Requirement: Entity Relationships and Connections

The system SHALL support typed, bidirectional relationships between any entities.

#### Scenario: Creating a relationship
- GIVEN two entities: "Strahd" (character) and "Castle Ravenloft" (location)
- WHEN the DM creates a relationship "resides in" from Strahd to Castle Ravenloft
- THEN the reverse relationship "inhabited by" is automatically created on Castle Ravenloft
- AND both entities display the relationship in their profile sidebar

#### Scenario: Relationship types
- GIVEN the system provides default relationship types:
  - Character ↔ Location: resides in / inhabited by
  - Character ↔ Faction: member of / has member
  - Character ↔ Character: ally, rival, family (parent, child, sibling, spouse), mentor/student
  - Item ↔ Character: owned by / possesses
  - Event ↔ Location: occurred at / site of
  - Any ↔ Any: related to (generic)
- WHEN users can also create custom relationship types
- THEN both sides of the relationship have configurable labels

#### Scenario: Relationship visibility
- GIVEN a relationship between a hidden NPC and a visible location
- WHEN a Player views the location
- THEN the relationship to the hidden NPC is not displayed
- AND the DM sees all relationships regardless of visibility

#### Scenario: Visual relationship graph
- GIVEN an entity with multiple relationships
- WHEN the user opens the "Connections" view
- THEN an interactive graph displays the entity at the center with connected entities as nodes
- AND edges are labeled with relationship types
- AND clicking a node navigates to that entity
- AND the graph respects permission filtering (hidden entities are excluded)

### Requirement: Auto-Linking Engine

The system SHALL automatically detect entity names and aliases in markdown content and convert them to hyperlinks.

#### Scenario: Name detection
- GIVEN entities named "Barovia", "Strahd von Zarovich" (alias: "Strahd"), and "Ireena Kolyana"
- WHEN a user writes: "The party arrived in barovia where they met strahd and Ireena Kolyana."
- THEN "barovia", "strahd", and "Ireena Kolyana" are all auto-linked
- AND linking is case-insensitive
- AND the longest match wins (if "Castle" and "Castle Ravenloft" both exist, "Castle Ravenloft" is linked as one, not "Castle" alone)

#### Scenario: Retroactive linking
- GIVEN existing content mentions "Vallaki" and no entity by that name exists yet
- WHEN the DM creates a new entity named "Vallaki"
- THEN existing mentions of "Vallaki" across all campaign content are retroactively linked
- AND retroactive linking runs as a background task, not blocking the UI

#### Scenario: Auto-link exclusions
- GIVEN auto-linking is active
- WHEN content contains entity names inside:
  - Code blocks (`` ` `` or ``` ``` ```)
  - Existing manual links (`[text](url)`)
  - Frontmatter
  - Headings (to avoid double-linking the entity's own name)
- THEN those occurrences are NOT auto-linked

#### Scenario: Ambiguous names
- GIVEN two entities named "John" in different categories
- WHEN "John" appears in content
- THEN the system links to the most contextually relevant entity (same entity type preference, or most recently referenced)
- AND the user can disambiguate manually via explicit mention syntax `@[John](characters/john-the-blacksmith)`

### Requirement: Entity Aliases

The system SHALL support multiple aliases per entity for auto-linking and search.

#### Scenario: Alias definition
- GIVEN an entity "Strahd von Zarovich"
- WHEN the DM sets aliases: ["Strahd", "The Devil", "Lord of Barovia", "The Count"]
- THEN all aliases trigger auto-linking in content
- AND all aliases are searchable
- AND the canonical name is always displayed in the link tooltip

### Requirement: Hierarchical Organization

The system SHALL support nested entity hierarchies and tag-based organization.

#### Scenario: Parent-child nesting
- GIVEN a location "Barovia" with child locations "Village of Barovia" and "Castle Ravenloft"
- WHEN the user views "Barovia"
- THEN child entities are listed in a collapsible tree
- AND breadcrumb navigation shows the hierarchy path
- AND the filesystem mirrors this: `locations/barovia/village-of-barovia.md`

#### Scenario: Tagging
- GIVEN an entity can have multiple tags
- WHEN the user adds tags "vampire", "villain", "noble" to Strahd
- THEN the entity appears in filtered views for any of those tags
- AND tags are managed campaign-wide (rename a tag, it updates everywhere)

#### Scenario: Favorites and pinning
- GIVEN any user viewing entities
- WHEN they star/pin an entity
- THEN it appears in their personal "Favorites" quick-access list
- AND favorites are per-user, per-campaign

### Requirement: Entity Search and Filtering

The system SHALL provide powerful search and filtering across all entities.

#### Scenario: Quick search (Ctrl+K)
- GIVEN a user presses Ctrl+K from any page
- WHEN they type 3+ characters
- THEN results from all accessible entities are returned in real-time
- AND results show entity name, type icon, and a text snippet
- AND results are ranked by relevance (name match > alias match > content match)

#### Scenario: Filtered list views
- GIVEN a user viewing the entity list for a type (e.g., Characters)
- WHEN they apply filters (tags, custom fields, visibility, parent location, etc.)
- THEN the list shows only matching entities
- AND filters can be combined (additive)
- AND filter state persists in the URL for bookmarking/sharing

#### Scenario: Table and card views
- GIVEN an entity list
- WHEN the user toggles view mode
- THEN they can switch between: Card view (grid with images), Table view (sortable columns), Tree view (hierarchical)
