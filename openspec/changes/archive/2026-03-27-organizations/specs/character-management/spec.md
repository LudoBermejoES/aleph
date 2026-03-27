## MODIFIED Requirements

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
