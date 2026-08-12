## ADDED Requirements

### Requirement: Organizations have a settable visibility field

The system SHALL support a `visibility` field on organizations, with the same values and semantics as characters and locations (`public`, `members`, `editors`, `dm_only`, `private`, `specific_users`), settable via `POST /api/campaigns/:id/organizations` and `PUT /api/campaigns/:id/organizations/:slug`, stored on the organization's mirror `entities` row. This is distinct from the existing cosmetic `status: 'secret'` badge (which only changes the displayed icon and has no access-control effect) — visibility controls whether the organization is returned at all to a given role.

#### Scenario: Creating an organization with explicit visibility

- **WHEN** a DM creates an organization with `visibility: 'dm_only'`
- **THEN** the organization's mirror entity is stored with `visibility = 'dm_only'`
- **AND** a subsequent `GET /api/campaigns/:id/organizations/:slug` by a player returns HTTP 404

#### Scenario: Creating an organization without specifying visibility defaults to members

- **WHEN** a DM creates an organization without a `visibility` field
- **THEN** the organization's mirror entity is stored with `visibility = 'members'`, matching prior default behavior

#### Scenario: Updating an organization's visibility takes effect immediately

- **GIVEN** an organization currently visible to players (`visibility: 'members'`)
- **WHEN** a DM updates it to `visibility: 'dm_only'` via `PUT /api/campaigns/:id/organizations/:slug`
- **THEN** subsequent requests from a player for that organization's list entry or detail page no longer include it

### Requirement: Organization visibility is settable from the create/edit UI

The organization create (`app/pages/campaigns/[id]/organizations/new.vue`) and edit (`.../[slug]/edit.vue`) pages SHALL include a visibility selector, matching the existing pattern used by `CharacterForm.vue` and `LocationForm.vue`.

#### Scenario: DM sets visibility when creating an organization

- **WHEN** a DM fills out the organization creation form and selects `dm_only` from the visibility control
- **AND** submits the form
- **THEN** the created organization has `visibility: 'dm_only'`
