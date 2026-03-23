# collaboration Specification

## Purpose
TBD - created by archiving change campaign-manager-study. Update Purpose after archive.
## Requirements
### Requirement: Real-Time Collaborative Editing

The system SHALL support real-time co-editing of wiki entries and session logs.

#### Scenario: Two users editing the same entry
- GIVEN two users open the same wiki entry for editing simultaneously
- WHEN both make changes
- THEN changes merge in real-time via CRDT (Y.js) without conflicts
- AND each user sees the other's cursor with a name label
- AND the resulting content is serialized to markdown and saved to the `.md` file

#### Scenario: Edit presence indicators
- GIVEN a user browsing the wiki
- WHEN another user is editing an entry
- THEN a small avatar/indicator shows on the entry card and page
- AND this does not prevent navigation or viewing

#### Scenario: Collaborative map editing
- GIVEN two DMs editing a map simultaneously
- WHEN one adds a pin and another moves a region
- THEN both changes apply without conflict
- AND both see live updates on the map canvas

### Requirement: Secrets and Selective Revelation

The system SHALL support hiding and revealing content to specific users or roles over time.

#### Scenario: Revealing a secret entity
- GIVEN a location "Hidden Temple" with visibility "dm_only"
- WHEN the DM changes visibility to "members" during a session
- THEN all campaign members can now see the entity
- AND it appears in their search results, entity lists, and auto-linked content

#### Scenario: Progressive revelation
- GIVEN a character with multiple secret sections:
  ```markdown
  :::secret dm
  The shopkeeper is actually a spy for the BBEG.
  :::

  :::secret player:alice
  Alice overheard the shopkeeper speaking in Infernal last session.
  :::
  ```
- WHEN the DM later wants to reveal the spy information to all players
- THEN they edit the secret fence to change `:::secret dm` to `:::secret members`
- AND the content immediately becomes visible to all campaign members
- AND the file is updated on disk

#### Scenario: Secret map pins
- GIVEN a map with a pin for "Hidden Dungeon Entrance" with visibility "dm_only"
- WHEN the party discovers the entrance in-game
- THEN the DM changes the pin visibility to "members"
- AND the pin appears on the map for all players

### Requirement: Notifications and Activity Feed

The system SHALL support activity tracking and notifications for campaign changes.

#### Scenario: Entity change notifications
- GIVEN a campaign with active members
- WHEN a DM creates or modifies a visible entity
- THEN campaign members receive an in-app notification
- AND the campaign activity feed shows: who changed what and when
- AND members can configure notification preferences (all, mentions only, none)

#### Scenario: Session reminders
- GIVEN a scheduled session
- WHEN the session is within 24 hours
- THEN a reminder notification is sent to all invited members
- AND the reminder includes session details and RSVP link

### Requirement: Import and Export

The system SHALL support campaign data import and export for portability.

#### Scenario: Full campaign export
- GIVEN a DM requesting a campaign export
- WHEN the export runs
- THEN the system creates an archive containing:
  - All `.md` content files (as-is from the filesystem)
  - All asset files (images, maps)
  - A `metadata.json` with: database records (entities, relationships, permissions, calendar, inventory, etc.)
- AND the archive format is a standard ZIP file
- AND the export respects the markdown-first philosophy (content is human-readable even without importing)

#### Scenario: Campaign import
- GIVEN a user with an exported campaign ZIP
- WHEN they import it
- THEN the system extracts markdown files to the content directory
- AND database records are re-created from `metadata.json`
- AND relationships, permissions, and indexes are rebuilt
- AND asset files are restored

#### Scenario: Markdown-only import
- GIVEN a user with a folder of `.md` files (e.g., from Obsidian or a manual export)
- WHEN they import the folder into a campaign
- THEN the system reads each file, parses frontmatter, and creates database records
- AND missing frontmatter fields are auto-populated with defaults
- AND auto-linking runs across all imported files

#### Scenario: Selective export
- GIVEN a DM wanting to share part of a campaign
- WHEN they select specific entities, maps, or entity types for export
- THEN only the selected content and its dependencies (linked entities, referenced assets) are exported
- AND the export can be imported into another campaign

### Requirement: Campaign Theming and Customization

The system SHALL support visual themes per campaign.

#### Scenario: Selecting a campaign theme
- GIVEN a DM in campaign settings
- WHEN they choose a theme from the available options (e.g., "Fantasy Classic", "Dark Horror", "Sci-Fi Neon", "Parchment")
- THEN all campaign pages render with the selected theme's colors, fonts, and styling
- AND the theme applies to all members viewing the campaign

#### Scenario: Custom CSS override
- GIVEN a DM with knowledge of CSS
- WHEN they enter custom CSS in campaign settings
- THEN the CSS is applied on top of the selected theme
- AND a live preview shows the effect before saving

#### Scenario: User preference override
- GIVEN a campaign with a dark theme selected
- WHEN a Player prefers light mode
- THEN they can override the campaign theme in their personal settings
- AND their override applies only to their view

