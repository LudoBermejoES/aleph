## MODIFIED Requirements

### Requirement: Character detail UI displays all four narrative sections in tabs

The character detail page SHALL display `description`, `backstory`, `history`, and `current_status` in their designated tabs of the tabbed layout introduced by the `character-page-tabs` capability:

- `description` and `currentStatus` are shown in the **Main info** tab.
- `backstory` and `history` are shown in the **Story** tab.

Each section SHALL render the field's markdown using the `MDC` component. Sections whose value is `null` SHALL be hidden (not rendered). Labels SHALL use i18n keys.

The four-section flat layout (single scrollable column, all sections always visible) is replaced by the tabbed layout. Editing these fields remains on the separate character edit page (`/edit`).

#### Scenario: Description is visible in Main info tab

- **GIVEN** a character with a description
- **WHEN** the user is on the Main info tab
- **THEN** the description text is visible with its label

#### Scenario: Current status is visible in Main info tab when not null

- **GIVEN** a character with a `currentStatus` value
- **WHEN** the user is on the Main info tab
- **THEN** the current status text is visible

#### Scenario: Backstory is visible in Story tab

- **GIVEN** a character with a `backstory` value
- **WHEN** the user switches to the Story tab
- **THEN** the backstory text is visible under the Story tab

#### Scenario: History is visible in Story tab

- **GIVEN** a character with a `history` value
- **WHEN** the user is on the Story tab
- **THEN** the history text is visible

#### Scenario: Null sections are hidden

- **GIVEN** a character where `backstory`, `history`, and `currentStatus` are all null
- **WHEN** the user views the Story and Main info tabs
- **THEN** none of those sections are rendered
