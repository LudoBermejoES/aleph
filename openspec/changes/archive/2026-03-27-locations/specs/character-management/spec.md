## ADDED Requirements

### Requirement: Character primary location field

The system SHALL allow a character to have a primary location (where they currently are), stored in `characters.locationEntityId`.

#### Scenario: Set location on character create/edit
- **GIVEN** an editor+ is creating or editing a character
- **WHEN** the character form is submitted with a `locationId` field
- **THEN** `characters.locationEntityId` is updated to the provided entity ID
- **AND** if `locationId` is empty or null, `characters.locationEntityId` is set to null

#### Scenario: Location displayed on character detail
- **GIVEN** a character has a `locationEntityId` set
- **WHEN** the character detail page is viewed
- **THEN** the character's current location is shown as a linked name (links to the location detail page)

#### Scenario: Location picker in character form
- **GIVEN** an editor+ is on the character create or edit form
- **THEN** a "Current Location" field is shown as a select/combobox populated by the campaign's location list
- **AND** "None" is a valid selection (clears the location)
- **AND** the currently set location is pre-selected when editing

#### Scenario: Location returned in character API response
- **WHEN** `GET /api/campaigns/:id/characters/:slug` is called
- **THEN** the response includes `locationId` and `locationName` (null if no location is set)
