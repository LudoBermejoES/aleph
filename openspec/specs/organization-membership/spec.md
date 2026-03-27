# organization-membership Specification

## Purpose
TBD - created by archiving change organizations. Update Purpose after archive.
## Requirements
### Requirement: Add Member to Organization

The system SHALL provide a `POST /api/campaigns/:id/organizations/:slug/members` endpoint that adds a character to an organization with an optional role. Restricted to dm, co_dm, and editor roles.

#### Scenario: DM adds a character to an organization

- GIVEN organization `the-iron-circle` exists in campaign C
- AND character with id `char-1` exists in campaign C
- AND the requesting user has role dm
- WHEN they POST `/api/campaigns/C/organizations/the-iron-circle/members` with `{ characterId: "char-1", role: "Advisor" }`
- THEN a new `organization_members` row is inserted
- AND the response returns 201 with `{ organizationId, characterId, role }`

#### Scenario: Adding a character without a role

- GIVEN organization `the-iron-circle` exists in campaign C
- AND the requesting user has role dm
- WHEN they POST `/api/campaigns/C/organizations/the-iron-circle/members` with `{ characterId: "char-1" }` (no role)
- THEN the member is added with `role` set to null
- AND the response returns 201

#### Scenario: Duplicate membership rejected

- GIVEN character `char-1` is already a member of `the-iron-circle`
- WHEN a DM POSTs the same `{ characterId: "char-1" }` again
- THEN the server returns 409 Conflict

#### Scenario: Character not in campaign rejected

- GIVEN character `char-99` does not belong to campaign C
- WHEN a DM POSTs `{ characterId: "char-99" }` to add them to an organization in C
- THEN the server returns 404 Not Found (character not found in campaign)

#### Scenario: Player cannot add members

- GIVEN a user with role player authenticated on campaign C
- WHEN they POST `/api/campaigns/C/organizations/the-iron-circle/members` with valid data
- THEN the server returns 403 Forbidden

#### Scenario: Unauthenticated request to add member

- GIVEN a request with no session or API key
- WHEN they POST `/api/campaigns/C/organizations/the-iron-circle/members`
- THEN the server returns 401 Unauthorized

### Requirement: Remove Member from Organization

The system SHALL provide a `DELETE /api/campaigns/:id/organizations/:slug/members/:characterId` endpoint that removes a character from an organization. Restricted to dm, co_dm, and editor roles.

#### Scenario: DM removes a member

- GIVEN character `char-1` is a member of `the-iron-circle` in campaign C
- AND the requesting user has role dm
- WHEN they DELETE `/api/campaigns/C/organizations/the-iron-circle/members/char-1`
- THEN the `organization_members` row is deleted
- AND the response returns 204 No Content

#### Scenario: Removing a non-member returns 404

- GIVEN character `char-99` is not a member of `the-iron-circle`
- WHEN a DM DELETEs `/api/campaigns/C/organizations/the-iron-circle/members/char-99`
- THEN the server returns 404 Not Found

#### Scenario: Player cannot remove members

- GIVEN a user with role player authenticated on campaign C
- WHEN they DELETE `/api/campaigns/C/organizations/the-iron-circle/members/char-1`
- THEN the server returns 403 Forbidden

#### Scenario: Unauthenticated remove request

- GIVEN a request with no session or API key
- WHEN they DELETE `/api/campaigns/C/organizations/the-iron-circle/members/char-1`
- THEN the server returns 401 Unauthorized

### Requirement: Member Management UI on Organization Detail Page

The system SHALL allow DMs/editors to add and remove members directly on the organization detail page at `/campaigns/:id/organizations/:slug`.

#### Scenario: DM adds a member via the detail page

- GIVEN a DM is on the organization detail page for `the-iron-circle`
- WHEN they select a character from the "Add Member" picker and optionally enter a role, then confirm
- THEN the new member appears in the member list without a full page reload
- AND the member count on the list page is updated when next visited

#### Scenario: DM removes a member via the detail page

- GIVEN a DM is on the organization detail page and a member is shown
- WHEN they click the "Remove" button next to a member and confirm the action
- THEN the member is removed from the list immediately
- AND a success notification is shown

#### Scenario: Already-a-member characters are excluded from the picker

- GIVEN character "Frodo" is already a member of `the-iron-circle`
- WHEN a DM opens the "Add Member" picker on the detail page
- THEN "Frodo" does not appear in the selectable character list

### Requirement: Organization Memberships on Character Detail Page

The system SHALL display the list of organizations a character belongs to on the character detail page at `/campaigns/:id/characters/:slug`.

#### Scenario: Character detail shows organization memberships

- GIVEN character "Gandalf" is a member of "The White Council" (role: "Member") and "Order of Wizards" (role: "Chief")
- WHEN any authenticated user views `/campaigns/C/characters/gandalf`
- THEN an "Organizations" section is visible listing both organizations with their respective roles
- AND each organization name is a link to `/campaigns/C/organizations/:slug`

#### Scenario: Character with no organizations shows no section or empty state

- GIVEN character "Bilbo" belongs to no organizations
- WHEN a user views `/campaigns/C/characters/bilbo`
- THEN the Organizations section is either hidden or shows an empty state message ("Not a member of any organizations")

### Requirement: aleph-cli Organization Commands

The system SHALL provide an `organization` command group in aleph-cli with the following subcommands: `list`, `create`, `show`, `delete`, `member-add`, `member-remove`.

#### Scenario: CLI lists organizations

- GIVEN the user is authenticated and campaign `C` exists
- WHEN they run `aleph organization list --campaign C`
- THEN a table of organizations is printed with columns: name, type, status, members

#### Scenario: CLI lists organizations as JSON

- GIVEN the user is authenticated
- WHEN they run `aleph organization list --campaign C --json`
- THEN raw JSON from the API is printed to stdout

#### Scenario: CLI creates an organization

- GIVEN the user is authenticated as a DM
- WHEN they run `aleph organization create --campaign C --name "The Iron Circle" --type guild --status active`
- THEN the organization is created and a success message is printed with the new slug

#### Scenario: CLI shows an organization

- GIVEN organization `the-iron-circle` exists in campaign C
- WHEN they run `aleph organization show the-iron-circle --campaign C`
- THEN organization details and member list are printed

#### Scenario: CLI deletes an organization

- GIVEN organization `the-iron-circle` exists in campaign C
- WHEN they run `aleph organization delete the-iron-circle --campaign C`
- THEN the organization is deleted and a confirmation message is printed

#### Scenario: CLI adds a member

- GIVEN organization `the-iron-circle` and character `char-1` exist in campaign C
- WHEN they run `aleph organization member-add the-iron-circle --campaign C --character char-1 --role "Advisor"`
- THEN the character is added to the organization and a success message is printed

#### Scenario: CLI removes a member

- GIVEN character `char-1` is a member of `the-iron-circle` in campaign C
- WHEN they run `aleph organization member-remove the-iron-circle --campaign C --character char-1`
- THEN the character is removed and a confirmation message is printed

#### Scenario: CLI command without authentication

- GIVEN the user is not logged in (no stored API key)
- WHEN they run any `aleph organization` subcommand
- THEN an error message is printed: "Not authenticated. Run `aleph login` first."
- AND the exit code is non-zero

