## ADDED Requirements

### Requirement: Organization Data Model

The system SHALL store organizations as campaign-scoped records with the following fields: `id` (text PK), `campaignId` (FK → campaigns), `name` (text, required), `slug` (text, unique per campaign, server-generated from name), `description` (text, optional), `type` (enum: guild/faction/military/religious/secret/other, default: other), `status` (enum: active/disbanded/secret/unknown, default: active), `createdAt`, `updatedAt`.

The system SHALL store memberships in a separate `organization_members` table with fields: `organizationId` (FK → organizations, ON DELETE CASCADE), `characterId` (FK → characters, ON DELETE CASCADE), `role` (text, optional free-text label).

#### Scenario: Organization record created with valid data

- GIVEN a DM authenticated via API key or session on campaign C
- WHEN they POST `/api/campaigns/C/organizations` with `{ name: "The Iron Circle", type: "guild", status: "active" }`
- THEN a new organization row is inserted with a server-generated slug (`the-iron-circle`)
- AND `campaignId` is set to C
- AND `createdAt` and `updatedAt` are set to the current timestamp
- AND the response body contains the new organization including `id`, `slug`, `name`, `type`, `status`

#### Scenario: Slug uniqueness enforced within campaign

- GIVEN an organization named "The Iron Circle" already exists in campaign C
- WHEN a DM POSTs `/api/campaigns/C/organizations` with `{ name: "The Iron Circle" }`
- THEN the server returns 409 Conflict
- AND no new organization row is created

#### Scenario: Slug uniqueness is per-campaign

- GIVEN an organization named "The Iron Circle" exists in campaign A
- WHEN a DM POSTs `/api/campaigns/B/organizations` with `{ name: "The Iron Circle" }`
- THEN the organization is created successfully in campaign B with slug `the-iron-circle`

### Requirement: List Organizations

The system SHALL provide a `GET /api/campaigns/:id/organizations` endpoint that returns all organizations for the campaign, each including a `memberCount` field.

#### Scenario: Authenticated campaign member lists organizations

- GIVEN a user with any campaign role (dm, co_dm, editor, player, or visitor) authenticated on campaign C
- WHEN they GET `/api/campaigns/C/organizations`
- THEN the response is an array of organization objects, each with `id`, `name`, `slug`, `type`, `status`, `memberCount`
- AND the results are ordered by name ascending

#### Scenario: Unauthenticated request to list organizations

- GIVEN a request with no session or API key
- WHEN they GET `/api/campaigns/C/organizations`
- THEN the server returns 401 Unauthorized

### Requirement: Get Single Organization

The system SHALL provide a `GET /api/campaigns/:id/organizations/:slug` endpoint returning full organization detail including the member list.

#### Scenario: Authenticated user retrieves organization detail

- GIVEN a user authenticated on campaign C
- WHEN they GET `/api/campaigns/C/organizations/the-iron-circle`
- THEN the response includes `id`, `name`, `slug`, `description`, `type`, `status`, `createdAt`, `updatedAt`
- AND a `members` array where each entry has `characterId`, `characterName`, `characterSlug`, `role`

#### Scenario: Organization not found

- GIVEN campaign C has no organization with slug `nonexistent`
- WHEN an authenticated user GETs `/api/campaigns/C/organizations/nonexistent`
- THEN the server returns 404 Not Found

#### Scenario: Unauthenticated request for organization detail

- GIVEN a request with no session or API key
- WHEN they GET `/api/campaigns/C/organizations/the-iron-circle`
- THEN the server returns 401 Unauthorized

### Requirement: Create Organization

The system SHALL provide a `POST /api/campaigns/:id/organizations` endpoint restricted to users with campaign role dm, co_dm, or editor.

#### Scenario: DM creates an organization

- GIVEN a user with role dm authenticated on campaign C
- WHEN they POST `/api/campaigns/C/organizations` with `{ name: "Thieves Guild", type: "guild", description: "Shadow ops", status: "secret" }`
- THEN the organization is created and the response returns 201 with the new organization object

#### Scenario: Player cannot create an organization

- GIVEN a user with role player authenticated on campaign C
- WHEN they POST `/api/campaigns/C/organizations` with valid data
- THEN the server returns 403 Forbidden

#### Scenario: Missing required name field

- GIVEN a user with role dm authenticated on campaign C
- WHEN they POST `/api/campaigns/C/organizations` with `{}` (no name)
- THEN the server returns 400 Bad Request

### Requirement: Update Organization

The system SHALL provide a `PUT /api/campaigns/:id/organizations/:slug` endpoint restricted to dm, co_dm, or editor roles.

#### Scenario: DM updates an organization

- GIVEN organization `the-iron-circle` exists in campaign C
- AND the requesting user has role dm
- WHEN they PUT `/api/campaigns/C/organizations/the-iron-circle` with `{ name: "The Iron Circle", status: "disbanded" }`
- THEN the organization's `status` is updated to `disbanded`
- AND `updatedAt` is refreshed

#### Scenario: Name change regenerates slug with conflict check

- GIVEN organization `old-name` exists in campaign C
- AND organization `new-name` also exists in campaign C
- WHEN a DM PUTs `/api/campaigns/C/organizations/old-name` with `{ name: "New Name" }`
- THEN the server returns 409 Conflict because slug `new-name` is already taken

#### Scenario: Player cannot update an organization

- GIVEN a user with role player authenticated on campaign C
- WHEN they PUT `/api/campaigns/C/organizations/the-iron-circle` with any data
- THEN the server returns 403 Forbidden

### Requirement: Delete Organization

The system SHALL provide a `DELETE /api/campaigns/:id/organizations/:slug` endpoint restricted to dm and co_dm roles.

#### Scenario: DM deletes an organization

- GIVEN organization `the-iron-circle` exists in campaign C with 2 members
- AND the requesting user has role dm
- WHEN they DELETE `/api/campaigns/C/organizations/the-iron-circle`
- THEN the organization row is deleted
- AND all `organization_members` rows for that organization are also deleted (CASCADE)
- AND the response returns 204 No Content

#### Scenario: Editor cannot delete an organization

- GIVEN a user with role editor authenticated on campaign C
- WHEN they DELETE `/api/campaigns/C/organizations/the-iron-circle`
- THEN the server returns 403 Forbidden

#### Scenario: Unauthenticated delete request

- GIVEN a request with no session or API key
- WHEN they DELETE `/api/campaigns/C/organizations/the-iron-circle`
- THEN the server returns 401 Unauthorized

### Requirement: Organization List Page

The system SHALL provide a frontend page at `/campaigns/:id/organizations` showing all organizations in the campaign.

#### Scenario: DM views the organization list

- GIVEN a DM is on the campaign dashboard
- WHEN they navigate to `/campaigns/C/organizations`
- THEN a list of organizations is displayed, each showing name, type, status badge, and member count
- AND a "New Organization" button is visible

#### Scenario: Player views the organization list

- GIVEN a user with role player on campaign C
- WHEN they navigate to `/campaigns/C/organizations`
- THEN the organization list is displayed
- AND no "New Organization" button is shown

#### Scenario: Empty state

- GIVEN campaign C has no organizations
- WHEN any authenticated user navigates to `/campaigns/C/organizations`
- THEN an empty state message is shown inviting the DM to create the first organization

### Requirement: Create Organization Page

The system SHALL provide a frontend page at `/campaigns/:id/organizations/new` with a form to create a new organization.

#### Scenario: DM creates an organization via the form

- GIVEN a DM is on `/campaigns/C/organizations/new`
- WHEN they fill in name, select type and status, optionally add description, and submit
- THEN the organization is created
- AND they are redirected to `/campaigns/C/organizations/:slug`

#### Scenario: Validation error shown

- GIVEN a DM is on the create form
- WHEN they submit without a name
- THEN an inline validation error is displayed and the form is not submitted

### Requirement: Edit Organization Page

The system SHALL provide a frontend page at `/campaigns/:id/organizations/:slug/edit` for updating an existing organization.

#### Scenario: DM edits an organization

- GIVEN a DM is on `/campaigns/C/organizations/the-iron-circle/edit`
- WHEN they change the status to "disbanded" and save
- THEN the organization is updated
- AND they are redirected back to the detail page

#### Scenario: Player cannot access the edit page

- GIVEN a user with role player
- WHEN they navigate to `/campaigns/C/organizations/the-iron-circle/edit`
- THEN they are redirected or shown a 403 error page

### Requirement: Organization Detail Page

The system SHALL provide a frontend page at `/campaigns/:id/organizations/:slug` showing full organization detail and the member list.

#### Scenario: DM views organization detail

- GIVEN organization `the-iron-circle` exists with 2 members
- WHEN a DM navigates to `/campaigns/C/organizations/the-iron-circle`
- THEN the page shows name, type, status, description, and a member table with character name and role columns
- AND an "Edit" button is visible
- AND each member row has a "Remove" button

#### Scenario: Player views organization detail (read-only)

- GIVEN a user with role player
- WHEN they navigate to `/campaigns/C/organizations/the-iron-circle`
- THEN the organization details and member list are shown
- AND no "Edit" button or "Remove" member buttons are visible

### Requirement: Campaign Sidebar Navigation

The system SHALL include an "Organizations" link in the campaign sidebar navigation.

#### Scenario: Organizations link appears in sidebar

- GIVEN an authenticated user on any campaign page
- WHEN they look at the campaign sidebar
- THEN an "Organizations" link is present pointing to `/campaigns/:id/organizations`
