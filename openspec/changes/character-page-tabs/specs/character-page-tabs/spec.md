## ADDED Requirements

### Requirement: Character detail page has a tabbed layout below the header

The character detail page SHALL display all content below the header (portrait + name + badges + action buttons) inside a tab bar with four tabs: **Main info**, **Story**, **Relations**, and **Play info**. The header block SHALL remain outside the tabs and always visible.

#### Scenario: Default tab is Main info

- **WHEN** a user navigates to a character detail page with no `?tab=` query param
- **THEN** the Main info tab is active and its content is visible

#### Scenario: Tab selection is persisted in the URL

- **WHEN** a user clicks the Story tab
- **THEN** the URL updates to include `?tab=story`
- **AND** reloading the page opens the Story tab

#### Scenario: Invalid tab param falls back to main

- **WHEN** a user navigates to the page with `?tab=invalid`
- **THEN** the Main info tab is displayed

---

### Requirement: Main info tab contains description, current status, and secret notes

The Main info tab SHALL contain the Description section (`data-testid="character-description"`), the Current Status section (`data-testid="character-current-status"`), and the secret notes block (the element with `ref="contentRef"` used by secret reveal injection).

#### Scenario: Description is visible on Main info tab

- **GIVEN** a character with a description
- **WHEN** the user is on the Main info tab
- **THEN** the description text is visible

#### Scenario: Current status is visible on Main info tab

- **GIVEN** a character with a currentStatus value
- **WHEN** the user is on the Main info tab
- **THEN** the current status text is visible

#### Scenario: Current status section is hidden when null

- **GIVEN** a character where currentStatus is null
- **WHEN** the user is on the Main info tab
- **THEN** the current status section is not rendered

---

### Requirement: Story tab contains backstory and history

The Story tab SHALL contain the Backstory section (`data-testid="character-backstory"`) and the History section (`data-testid="character-history"`). Sections with null content SHALL be hidden.

#### Scenario: Backstory is visible on Story tab

- **GIVEN** a character with a backstory value
- **WHEN** the user clicks the Story tab
- **THEN** the backstory text is visible under the Story tab

#### Scenario: History is visible on Story tab

- **GIVEN** a character with a history value
- **WHEN** the user is on the Story tab
- **THEN** the history text is visible

#### Scenario: Empty Story tab shows no sections

- **GIVEN** a character where backstory and history are both null
- **WHEN** the user is on the Story tab
- **THEN** no backstory or history sections are rendered

---

### Requirement: Relations tab contains relationships, organizations, and the relations graph

The Relations tab SHALL contain the Connections list (`data-testid="character-connections"`), the Relations list (`data-testid="character-relations"`), the Organizations section (`data-testid="character-organizations"`), and the relations graph (`data-testid="character-graph"`).

#### Scenario: Relations list is visible on Relations tab

- **GIVEN** a character with at least one relation
- **WHEN** the user clicks the Relations tab
- **THEN** the relations list is visible

#### Scenario: Graph is visible on Relations tab when data exists

- **GIVEN** a character with at least one relation or connection
- **WHEN** the user is on the Relations tab
- **THEN** the relations graph canvas is visible

---

### Requirement: Play info tab contains stats, abilities, wealth, inventory, and template fields

The Play info tab SHALL contain the Stats section (`data-testid="character-stats"`), the Abilities section (`data-testid="character-abilities"`), the Wealth/Richness section, the Inventory section (`data-testid="character-inventory"`), and the Template Fields display.

#### Scenario: Template fields are visible on Play info tab

- **GIVEN** a character with a templateId and field values
- **WHEN** the user clicks the Play info tab
- **THEN** the template field values are visible

#### Scenario: Inventory is visible on Play info tab

- **GIVEN** a character with inventory items
- **WHEN** the user is on the Play info tab
- **THEN** the inventory section is visible
