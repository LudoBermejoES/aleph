## REMOVED Requirements

### Requirement: Character list race, class, and alignment filters

**Reason**: `race`, `class`, and `alignment` are no longer hardcoded DB columns. They are now template-defined fields, so dedicated filter dropdowns based on these specific fields cannot be provided generically.

**Migration**: DMs who need race/class/alignment filtering should define those fields in a character template. Generic template-field filtering is out of scope for this change.

### Requirement: Characters meta endpoint

**Reason**: The `GET /api/campaigns/:id/characters/meta` endpoint existed solely to supply distinct race/class/alignment values for the filter dropdowns. With those filters removed, the endpoint has no purpose and is deleted.

**Migration**: No replacement endpoint. The `/meta` route file is deleted.

### Requirement: Character list API extended filters and sort

**Reason**: The `race`, `class`, and `alignment` query params on `GET /api/campaigns/:id/characters` no longer correspond to DB columns and are removed. The remaining filters (`organizationId`, `locationEntityId`, `sort`, `sortDir`) are unaffected.

**Migration**: Remove `race`, `class`, `alignment` params from any API calls. The endpoint continues to accept all other params.

## MODIFIED Requirements

### Requirement: Enriched character list rows

The system SHALL display status badge, current location name, and primary organization on each character list row in addition to the existing name and type. Race, class, and alignment are no longer shown as dedicated columns.

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
