## Purpose

Provides filtering, sorting, and enriched display for the character list page. Characters can be searched by name and filtered by status, organization, and location. Filters and sort state are synced to URL query parameters for deep-linking and navigation.

## Requirements

### Requirement: Character list text search

The system SHALL provide a debounced text search input on the character list page that filters characters by name using the existing `search` query param on `GET /api/campaigns/:id/characters`.

#### Scenario: Search filters by name substring

- **GIVEN** a campaign with characters named "Aragorn", "Gandalf", and "Legolas"
- **WHEN** the user types "gan" in the search input
- **THEN** only "Gandalf" appears in the list

#### Scenario: Search is debounced

- **WHEN** the user types rapidly in the search input
- **THEN** only one API request is sent after the user stops typing for 300ms

#### Scenario: Clearing search restores full list

- **WHEN** the user clears the search input
- **THEN** all characters are displayed again

---

### Requirement: Character list status filter

The system SHALL provide a status filter (All / Alive / Dead / Missing / Unknown) on the character list page using the `status` query param on `GET /api/campaigns/:id/characters`.

#### Scenario: Status filter shows only matching characters

- **GIVEN** characters with statuses alive, dead, and missing
- **WHEN** the user selects "Dead" from the status filter
- **THEN** only dead characters are shown

#### Scenario: "All" status shows every character

- **WHEN** the user selects "All" in the status filter
- **THEN** characters of all statuses are shown

---

### Requirement: Character list organization filter

The system SHALL provide an organization filter dropdown on the character list page, showing only organizations that have at least one character member. Selecting an org filters to characters who are members of that org.

#### Scenario: Organization filter shows member characters only

- **GIVEN** characters "Alice" (member of "The Guild") and "Bob" (no org)
- **WHEN** the user selects "The Guild" from the organization filter
- **THEN** only "Alice" appears in the list

#### Scenario: Organization filter dropdown only lists orgs with members

- **GIVEN** two organizations, one with members and one empty
- **WHEN** the character list page loads
- **THEN** only the org with members appears in the dropdown

---

### Requirement: Character list location filter

The system SHALL provide a location filter dropdown on the character list page showing only locations currently assigned to at least one character.

#### Scenario: Location filter shows characters at that location

- **GIVEN** characters "Alice" at "Rivendell" and "Bob" at "Moria"
- **WHEN** the user selects "Rivendell" from the location filter
- **THEN** only "Alice" appears

---

### Requirement: Character list sort controls

The system SHALL provide sort field and sort direction controls on the character list page. Sort is applied server-side.

#### Scenario: Sort by name ascending

- **WHEN** the user selects "Name" and "A→Z"
- **THEN** characters are returned in alphabetical order by name

#### Scenario: Sort by name descending

- **WHEN** the user selects "Name" and "Z→A"
- **THEN** characters are returned in reverse alphabetical order

#### Scenario: Default sort is recently updated descending

- **WHEN** the character list page loads with no sort params
- **THEN** characters are ordered by most recently updated first

#### Scenario: Sort by status groups characters

- **WHEN** the user selects "Status" as the sort field
- **THEN** characters are sorted alphabetically by status value

---

### Requirement: Filter and sort state persisted in URL

The system SHALL sync all filter and sort state to URL query parameters so that the page can be deep-linked and browser back/forward navigation restores the previous filter state.

#### Scenario: Filter state survives page reload

- **WHEN** the user sets status="Alive" then reloads the page
- **THEN** the filters are restored and the filtered list is shown

#### Scenario: Back navigation restores previous filters

- **WHEN** the user navigates from a filtered list to a character detail and presses back
- **THEN** the character list re-appears with the same filters active

---

### Requirement: Enriched character list rows

The system SHALL display status badge, current location name, and primary organization on each character list row in addition to the existing name, type, and character type.

#### Scenario: Status badge visible in list

- **GIVEN** a character with status "Dead"
- **WHEN** the character list is shown
- **THEN** a "Dead" badge appears on that character's row

#### Scenario: Location shown when set

- **GIVEN** a character with locationEntityId pointing to "Rivendell"
- **WHEN** the character list is shown
- **THEN** "Rivendell" appears as a location indicator on that row

#### Scenario: Primary organization shown when set

- **GIVEN** a character who is a member of "The Fellowship" with role "Member"
- **WHEN** the character list is shown
- **THEN** "The Fellowship" appears as an org badge on that row

#### Scenario: No location or org shown when not set

- **GIVEN** a character with no locationEntityId and no org memberships
- **WHEN** the character list is shown
- **THEN** no location or org indicator appears on that row

---

### Requirement: Character list API extended filters and sort

The system SHALL accept `organizationId`, `locationEntityId`, `sort`, and `sortDir` as query parameters on `GET /api/campaigns/:id/characters`, applied server-side.

#### Scenario: organizationId param filters by membership

- **WHEN** `GET /api/campaigns/:id/characters?organizationId=<id>` is called
- **THEN** only characters who are members of that organization are returned

#### Scenario: sort=name&sortDir=asc returns alphabetical order

- **WHEN** `GET /api/campaigns/:id/characters?sort=name&sortDir=asc` is called
- **THEN** characters are returned sorted by name ascending

#### Scenario: Unknown sort field falls back to default

- **WHEN** `GET /api/campaigns/:id/characters?sort=invalid` is called
- **THEN** characters are returned sorted by updatedAt descending (default)
