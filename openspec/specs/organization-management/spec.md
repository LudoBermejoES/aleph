## MODIFIED Requirements

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
