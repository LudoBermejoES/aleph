# markdown-content Specification

## Purpose
TBD - created by archiving change campaign-manager-study. Update Purpose after archive.
## Requirements
### Requirement: Filesystem-Based Content Storage

The system SHALL store all narrative/textual content as `.md` files in a structured directory hierarchy. SQLite stores only metadata and relationships.

#### Scenario: Content file creation
- GIVEN an Editor creating a new wiki entry "Strahd von Zarovich" of type "character" in campaign "curse-of-strahd"
- WHEN the entry is saved
- THEN the system writes a file at `content/campaigns/curse-of-strahd/characters/strahd-von-zarovich.md`
- AND the file contains YAML frontmatter with metadata followed by the markdown body
- AND a corresponding row is inserted in SQLite with the file path, type, visibility, and indexed fields

#### Scenario: File format with frontmatter
- GIVEN a wiki entry file
- THEN it SHALL follow this format:
  ```markdown
  ---
  id: uuid-here
  type: character
  name: Strahd von Zarovich
  aliases: [Strahd, The Devil, Lord of Barovia]
  tags: [vampire, villain, npc]
  visibility: members
  template: character-default
  created: 2026-03-23T10:00:00Z
  modified: 2026-03-23T15:30:00Z
  fields:
    race: Vampire
    alignment: Lawful Evil
    location: castle-ravenloft
    status: alive
  ---

  # Strahd von Zarovich

  The ancient vampire lord who rules over the valley of Barovia...

  :::secret dm
  Strahd is aware the party has entered Barovia and is toying with them.
  :::
  ```

#### Scenario: Slug generation and uniqueness
- GIVEN a user creating an entry named "Castle Ravenloft"
- WHEN the file is created
- THEN the filename is generated as `castle-ravenloft.md` (lowercase, hyphenated)
- AND if a file with that name already exists in the same directory, a numeric suffix is appended (`castle-ravenloft-2.md`)
- AND the slug is stored in the database for URL routing

### Requirement: Campaign Directory Structure

The system SHALL organize content in a predictable, navigable directory hierarchy.

#### Scenario: Default campaign structure
- GIVEN a new campaign "Curse of Strahd"
- WHEN the campaign is created
- THEN the system creates the following directory structure:
  ```
  content/campaigns/curse-of-strahd/
    characters/
    locations/
    factions/
    items/
    lore/
    sessions/
    quests/
    maps/
    assets/
      images/
      maps/
  ```
- AND subdirectories can be created for nested organization (e.g., `locations/barovia/`)

#### Scenario: User-created entity types use custom directories
- GIVEN a DM creates a custom entity type "Deities"
- WHEN entries of that type are created
- THEN they are stored under `content/campaigns/{slug}/deities/`

#### Scenario: Asset co-location
- GIVEN a wiki entry references images
- WHEN images are uploaded via the editor
- THEN they are stored in `content/campaigns/{slug}/assets/images/`
- AND markdown references use relative paths (`../assets/images/strahd-portrait.png`)

### Requirement: Markdown Rendering with Vue Components

The system SHALL render markdown content with support for embedded Vue components (MDC -- Markdown Components).

#### Scenario: Basic markdown rendering
- GIVEN a `.md` file with standard markdown (headings, bold, italic, lists, tables, links, images, code blocks)
- WHEN the content is rendered in the browser
- THEN all markdown elements display with proper formatting
- AND heading IDs are generated for anchor linking and table-of-contents

#### Scenario: Entity mention rendering
- GIVEN markdown content containing `@[Strahd von Zarovich](characters/strahd-von-zarovich)`
- WHEN rendered
- THEN the mention displays as a styled link with hover preview (name, type, image thumbnail)
- AND clicking navigates to the entity page

#### Scenario: Embedded Vue components in markdown
- GIVEN markdown using MDC syntax for custom components:
  ```markdown
  Here is the map of Barovia:

  ::map-embed{src="maps/barovia" zoom="5" center="village-of-barovia"}
  ::

  The party's health:

  ::meter{type="bar" entity="characters/fighter" field="hp" max-field="max_hp"}
  ::

  Roll for initiative:

  ::dice-roller{formula="1d20+3"}
  ::
  ```
- WHEN rendered
- THEN each `::component` block renders as the corresponding Vue component
- AND components are interactive (map is pannable, meter is editable by authorized users, dice roller is clickable)

#### Scenario: Auto-linked entity names
- GIVEN a markdown paragraph: "The party arrived at Castle Ravenloft where they met Strahd."
- WHEN rendered, and "Castle Ravenloft" and "Strahd" are known entity names/aliases
- THEN both names are automatically converted to entity links with hover previews
- AND auto-linking is case-insensitive ("castle ravenloft" also links)
- AND auto-linking does not apply inside code blocks, frontmatter, or existing links

### Requirement: Rich Text Editor with Markdown Source

The system SHALL provide a WYSIWYG editor (Tiptap) that uses markdown as the underlying format.

#### Scenario: Editing in the browser
- GIVEN a user opens a wiki entry for editing
- WHEN the Tiptap editor loads
- THEN the `.md` file content is parsed and rendered as rich text
- AND the user can format text, add headings, insert tables, embed images, and use slash commands
- AND the editor provides `@` mention autocomplete for linking to other entities

#### Scenario: Saving edits
- GIVEN a user finishes editing in Tiptap
- WHEN they save
- THEN the editor serializes the content back to markdown format
- AND the `.md` file is updated on disk
- AND the frontmatter is preserved/updated (modified timestamp)
- AND the database metadata and search index are updated

#### Scenario: Source mode toggle
- GIVEN a user editing in the rich text editor
- WHEN they toggle "Source Mode"
- THEN the raw markdown is displayed in a code editor (Monaco or CodeMirror)
- AND they can edit the markdown directly
- AND switching back to rich text mode re-renders the markdown

#### Scenario: Slash command palette
- GIVEN a user typing in the editor
- WHEN they type `/`
- THEN a command palette appears with options: Heading 1-6, Bullet List, Numbered List, Table, Image, Code Block, Quote, Divider, Entity Mention, Map Embed, Meter, Dice Roller, Secret Block, Callout
- AND selecting a command inserts the corresponding markdown/component

### Requirement: Filesystem Watching and Sync

The system SHALL detect external changes to `.md` files and re-sync metadata and indexes.

#### Scenario: External file edit
- GIVEN a DM edits a `.md` file directly in VS Code
- WHEN the file is saved
- THEN the server (via chokidar filesystem watcher) detects the change within 2 seconds
- AND the frontmatter is re-parsed and database metadata is updated
- AND the search index (FTS5) is updated with the new content
- AND the auto-linking engine re-processes the file
- AND any connected browser clients receive a real-time update

#### Scenario: External file creation
- GIVEN a DM creates a new `.md` file in the campaign directory manually
- WHEN the watcher detects the new file
- THEN the system reads the frontmatter, creates a database record, and indexes the content
- AND if frontmatter is missing or incomplete, the system generates defaults (uuid, timestamps)
- AND the entry appears in the UI on the next page load or via real-time push

#### Scenario: External file deletion
- GIVEN a DM deletes a `.md` file from the filesystem
- WHEN the watcher detects the deletion
- THEN the corresponding database record is soft-deleted (marked as deleted, not purged)
- AND references from other entities show as "broken link" indicators
- AND the DM can restore from the database record (re-creating the file from cached content) within 30 days

#### Scenario: Bulk import via filesystem
- GIVEN a DM copies 50 `.md` files into a campaign's `characters/` directory
- WHEN the watcher detects the batch
- THEN the system processes them sequentially (debounced, not all at once)
- AND a progress indicator shows indexing status
- AND the operation does not block the server for other users

### Requirement: YAML Frontmatter Schema

The system SHALL define a consistent frontmatter schema for all entity types.

#### Scenario: Required frontmatter fields
- GIVEN any entity `.md` file
- THEN the following frontmatter fields are REQUIRED:
  - `id` (UUID, auto-generated if missing)
  - `type` (string, must match a known or custom entity type)
  - `name` (string, display name)
- AND the following fields are OPTIONAL:
  - `aliases` (string array)
  - `tags` (string array)
  - `visibility` (enum: public, members, editors, dm_only, private, default: members)
  - `template` (string, reference to entity template slug)
  - `created` (ISO 8601 datetime)
  - `modified` (ISO 8601 datetime)
  - `fields` (object, custom key-value pairs defined by the entity template)
  - `parent` (string, slug of parent entity for nesting)

#### Scenario: Frontmatter validation
- GIVEN a `.md` file with invalid or missing required frontmatter
- WHEN the system reads the file (via editor save or filesystem watcher)
- THEN missing required fields are auto-populated with defaults
- AND type mismatches are logged as warnings
- AND the entry is still indexed (best effort) rather than rejected

### Requirement: Search Index Synchronization

The system SHALL maintain a full-text search index (SQLite FTS5) synchronized with filesystem content.

#### Scenario: Index on file change
- GIVEN a `.md` file is created or modified
- WHEN the change is detected
- THEN the file's text content (excluding frontmatter) is extracted and upserted into the FTS5 index
- AND the entity name, aliases, and tags from frontmatter are added as boosted terms

#### Scenario: Search queries
- GIVEN a user searches for "vampire lord"
- WHEN the query is executed
- THEN FTS5 returns ranked results from all entities the user has permission to see
- AND results include a snippet of matching text with highlighted terms
- AND entity type and campaign are included in results for disambiguation

### Requirement: Git-Friendly Content Versioning

The system SHALL support optional git-based versioning of campaign content.

#### Scenario: Campaign version history
- GIVEN a campaign with git integration enabled
- WHEN a file is saved via the UI
- THEN the system auto-commits the change with a message like "Update: Strahd von Zarovich (character)"
- AND the user can view file history and diff previous versions from the UI

#### Scenario: Campaign without git
- GIVEN a campaign without git integration
- WHEN files change
- THEN no version history is maintained beyond the filesystem timestamps
- AND this is the default mode (git is opt-in)

