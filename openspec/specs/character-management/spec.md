# character-management Specification

## Purpose
TBD - created by archiving change campaign-manager-study. Update Purpose after archive.
## Requirements
### Requirement: Character Profiles

The system SHALL support rich character profiles stored as markdown files with structured frontmatter. Character detail pages SHALL also display the list of organizations the character belongs to, linking to each organization's detail page.

#### Scenario: Creating a player character

- GIVEN a Player with character creation permission
- WHEN they create a character with name, description, and profile fields
- THEN a `.md` file is created at `content/campaigns/{slug}/characters/{character-slug}.md`
- AND the character is linked to the player's user account
- AND the DM can see the full character including any secrets

#### Scenario: NPC profiles

- GIVEN a DM creating an NPC
- WHEN they set the NPC's visibility
- THEN the NPC can be: public (all can see), members (campaign members), dm_only (hidden from players)
- AND revealed to players later by changing visibility

#### Scenario: Character profile fields

- GIVEN a character entity template
- THEN the default profile fields include:
  - Name, aliases, title
  - Race/species, class/occupation
  - Alignment, status (alive, dead, missing, unknown)
  - Age (auto-calculated if birth date is set on campaign calendar)
  - Location (linked to a location entity)

#### Scenario: Character detail page shows organization memberships

- GIVEN character "Gandalf" belongs to organizations "The White Council" (role: "Member") and "Order of Wizards" (role: "Chief")
- WHEN any authenticated user views the character detail page at `/campaigns/:id/characters/gandalf`
- THEN an "Organizations" section is rendered listing each organization with the character's role
- AND each organization name is a hyperlink to `/campaigns/:id/organizations/:slug`

#### Scenario: Character with no organizations has no org section or shows empty state

- GIVEN character "Bilbo" is not a member of any organization
- WHEN a user views `/campaigns/:id/characters/bilbo`
- THEN either the Organizations section is not rendered, or it renders with the message "Not a member of any organizations"
- AND no broken links or errors are shown

### Requirement: Custom Stat Tracking

The system SHALL support fully customizable stat groups that can be applied to characters, NPCs, and creatures.

#### Scenario: Defining a stat group
- GIVEN a DM creating a stat group (e.g., "D&D 5e Ability Scores")
- WHEN they define stats: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
- THEN each stat has: name, type (number, text, checkbox, radio, select), default value, min/max constraints
- AND the stat group can be applied as a "profile template" to any character

#### Scenario: Stat visibility
- GIVEN a stat group on an NPC
- WHEN the DM marks specific stats as "secret" (e.g., true HP, hidden abilities)
- THEN Players see only non-secret stats
- AND the DM sees all stats

#### Scenario: Multiple stat groups per character
- GIVEN a character in a campaign that tracks both combat stats and social stats
- WHEN the DM assigns multiple stat groups
- THEN the character profile displays all stat groups in separate sections
- AND each group can be collapsed/expanded

### Requirement: Abilities and Powers

The system SHALL support tracking abilities, spells, and powers on characters.

#### Scenario: Adding abilities to a character
- GIVEN a character's profile
- WHEN the DM or Player adds an ability (name, description, type, charges/uses, cooldown)
- THEN the ability appears in the character's abilities section
- AND abilities with charges show current/max (e.g., "3/5 uses")

#### Scenario: Ability templates
- GIVEN a campaign using a specific game system
- WHEN the DM creates reusable ability definitions (e.g., "Fireball")
- THEN the ability can be assigned to multiple characters by reference
- AND changes to the template update all references

### Requirement: Character Connections

The system SHALL support rich relationship mapping between characters.

#### Scenario: Defining character relationships
- GIVEN two characters
- WHEN the DM or Player defines a relationship (e.g., "Sibling", "Rival", "Mentor")
- THEN the relationship appears on both characters' profiles (bidirectional)
- AND the relationship type and optional notes are displayed

#### Scenario: Family trees
- GIVEN characters with parent/child/spouse relationships defined
- WHEN the user views the "Family Tree" visualization for any family member
- THEN an interactive tree diagram displays the lineage
- AND each node is clickable to navigate to that character's page
- AND the tree respects permission visibility (hidden characters are excluded)

### Requirement: Creature and Monster Library

The system SHALL support a creature/monster library for encounter reference.

#### Scenario: Creating a creature entry
- GIVEN a DM creating a creature
- WHEN they define it with: name, type (beast, undead, etc.), stats, abilities, challenge rating, description
- THEN the creature is stored as a character entity with subtype "creature"
- AND it can be referenced in encounters, quests, and session logs

#### Scenario: Creature templates for encounters
- GIVEN a creature in the library (e.g., "Goblin")
- WHEN the DM uses it in an encounter
- THEN they can create an instance (e.g., "Goblin Archer #1") with modified stats
- AND the instance links back to the base creature template

### Requirement: Character Meters and Trackers

The system SHALL support visual meters for tracking character resources.

#### Scenario: Health bar meter
- GIVEN a character with HP stat (current: 45, max: 60)
- WHEN the character profile is viewed
- THEN a visual bar meter shows 45/60 HP with proportional fill
- AND authorized users can click to adjust the value
- AND the bar color changes based on percentage (green > yellow > red)

#### Scenario: Resource pool meters
- GIVEN a character with spell slots (e.g., 3 Level-1, 2 Level-2)
- WHEN displayed as pool meters
- THEN each pool shows filled/empty dots
- AND clicking a dot toggles its state (spent/available)

#### Scenario: Meter types
- GIVEN the system supports these meter types (inspired by LegendKeeper):
  - **Bar**: horizontal fill bar (HP, XP, morale)
  - **Pool**: dot/pip counter (spell slots, resources, ammo)
  - **Rating**: star/icon rating (reputation, quality)
  - **Gauge**: circular/semi-circular meter (stats, power levels)
- WHEN a DM or Player adds a meter to a character
- THEN they select type, value range, label, and color

