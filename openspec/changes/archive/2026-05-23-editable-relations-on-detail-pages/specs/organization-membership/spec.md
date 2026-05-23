## ADDED Requirements

### Requirement: Edit member role inline

The system SHALL allow editors+ to change an existing member's role on the organization detail page without having to remove and re-add the member.

#### Scenario: Editor changes a member's role via PATCH

- **GIVEN** character `frodo` is a member of `the-iron-circle` with role `"Knight"`
- **WHEN** an editor sends `PATCH /api/campaigns/:id/organizations/the-iron-circle/members/<frodo-id>` with body `{ role: "Commander" }`
- **THEN** the server responds `200 OK` with the updated membership
- **AND** a subsequent `GET /api/campaigns/:id/organizations/the-iron-circle/members` reflects role `"Commander"`

#### Scenario: Editor changes role from the detail page UI

- **GIVEN** an editor on the organization detail page for `the-iron-circle`
- **WHEN** they click "Edit" on member `frodo`, modify the role to `"Commander"`, and save
- **THEN** the detail page row updates to show the new role without a full page reload
- **AND** no removal-then-add sequence occurs

#### Scenario: Player cannot edit member role

- **GIVEN** a user with the `player` role
- **WHEN** they call the member role PATCH endpoint
- **THEN** the server responds `403 Forbidden`

## MODIFIED Requirements

### Requirement: Member Management UI on Organization Detail Page

The system SHALL allow DMs/editors to add, edit, and remove members directly on the organization detail page at `/campaigns/:id/organizations/:slug`.

#### Scenario: DM adds a member via the detail page

- GIVEN a DM is on the organization detail page for `the-iron-circle`
- WHEN they select a character from the "Add Member" picker and optionally enter a role, then confirm
- THEN the new member appears in the member list without a full page reload
- AND the member count on the list page is updated when next visited

#### Scenario: DM edits a member's role via the detail page

- GIVEN a DM is on the organization detail page and a member is shown with role `"Knight"`
- WHEN they click "Edit" on that member, change the role to `"Commander"`, and save
- THEN the displayed role updates in place
- AND a success notification is shown

#### Scenario: DM removes a member via the detail page

- GIVEN a DM is on the organization detail page and a member is shown
- WHEN they click the "Remove" button next to a member and confirm the action
- THEN the member is removed from the list immediately
- AND a success notification is shown

#### Scenario: Already-a-member characters are excluded from the picker

- GIVEN character "Frodo" is already a member of `the-iron-circle`
- WHEN a DM opens the "Add Member" picker on the detail page
- THEN "Frodo" does not appear in the selectable character list
