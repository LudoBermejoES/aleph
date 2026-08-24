# organization-management Specification

## Purpose

Leading icons on organization type and status badges, and a delete action on the organization detail page gated to `dm` and `co_dm` that confirms before calling the delete endpoint and redirecting.

## Requirements

### Requirement: Organization type badges display icons

Organization type badges in `app/pages/campaigns/[id]/organizations/index.vue` SHALL render a leading icon (`w-3 h-3`): Shield (faction), Star (guild), Swords (army), Flame (cult), Landmark (government), Circle (other).

#### Scenario: Faction type has Shield icon

- **WHEN** an organization of type `faction` is rendered
- **THEN** the type badge shows a `Shield` icon

#### Scenario: Army type has Swords icon

- **WHEN** an organization of type `army` is rendered
- **THEN** the type badge shows a `Swords` icon

### Requirement: Organization status badges display icons

Organization status badges SHALL render a leading icon (`w-3 h-3`): CircleCheck (active), CircleMinus (inactive), EyeOff (secret), CircleX (dissolved).

#### Scenario: Active org has CircleCheck icon

- **WHEN** an organization with status `active` is rendered
- **THEN** the status badge shows a `CircleCheck` icon

#### Scenario: Secret org has EyeOff icon

- **WHEN** an organization with status `secret` is rendered
- **THEN** the status badge shows an `EyeOff` icon

### Requirement: Organization detail page has a delete action

The organization detail page SHALL include a destructive Delete button, gated to `dm` and `co_dm` roles, that triggers a confirmation dialog and calls `DELETE /api/campaigns/:id/organizations/:slug` on confirmation, then redirects to the organization list.

#### Scenario: DM can delete an organization from the detail page

- **WHEN** a DM views an organization detail page and clicks Delete
- **AND** confirms the dialog
- **THEN** the organization is deleted
- **AND** the user is redirected to `/campaigns/:id/organizations`

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
