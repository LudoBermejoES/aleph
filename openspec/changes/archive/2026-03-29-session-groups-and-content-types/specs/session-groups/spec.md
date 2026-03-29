## Requirements

### Requirement: Session Group Management

The system SHALL support campaign-scoped player groups that sessions can be assigned to, allowing DMs running multiple parallel groups within the same campaign to keep their session histories separate.

#### Scenario: Creating a session group

- **WHEN** a DM or editor creates a session group with a name
- **THEN** the group is saved with an auto-generated slug under the campaign
- **AND** it appears in the session filter bar and session form dropdown

#### Scenario: Listing session groups

- **WHEN** any campaign member calls `GET /api/campaigns/:id/session-groups`
- **THEN** all groups for that campaign are returned ordered by `sort_order`

#### Scenario: Updating a session group

- **WHEN** an editor or above updates a group's name or description
- **THEN** the changes are persisted; the slug is NOT changed on rename

#### Scenario: Deleting a session group

- **WHEN** a DM or co-DM deletes a session group
- **THEN** sessions previously in that group have their `groupId` set to NULL (they become group-less)
- **AND** no session data is lost

#### Scenario: Filtering sessions by group

- **WHEN** a user selects a group tab in the session list
- **THEN** only sessions assigned to that group are shown
- **AND** an "All" tab always shows every session regardless of group

#### Scenario: Assigning a session to a group

- **WHEN** a DM creates or edits a session and selects a group
- **THEN** the session is linked to that group
- **AND** sessions may have no group (visible only in "All")
