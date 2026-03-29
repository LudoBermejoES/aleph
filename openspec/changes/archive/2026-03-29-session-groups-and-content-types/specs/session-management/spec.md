## MODIFIED Requirements

### Requirement: Session status badges display icons

Session status badges in `app/pages/campaigns/[id]/sessions/index.vue` SHALL render a leading icon (`w-3 h-3`) before the status label.

#### Scenario: Planned session has Clock icon

- **WHEN** a session with status `planned` is rendered
- **THEN** the badge shows a `Clock` icon

#### Scenario: Active session has Zap icon

- **WHEN** a session with status `active` is rendered
- **THEN** the badge shows a `Zap` icon

#### Scenario: Completed session has CheckCircle2 icon

- **WHEN** a session with status `completed` is rendered
- **THEN** the badge shows a `CheckCircle2` icon

#### Scenario: Cancelled session has X icon

- **WHEN** a session with status `cancelled` is rendered
- **THEN** the badge shows an `X` icon

### Requirement: Session group assignment

Sessions SHALL support an optional group assignment.

#### Scenario: Creating a session with a group

- **WHEN** a DM creates a session and specifies a group slug
- **THEN** the session is linked to that group

#### Scenario: Session list shows group label

- **WHEN** a session belongs to a group
- **THEN** the session list item shows the group name as a secondary label

### Requirement: Session content

Sessions SHALL expose their typed content (manual notes, AI notes, summary) in the detail response.

#### Scenario: Session detail includes content summary

- **WHEN** `GET /api/campaigns/:id/sessions/:slug` is called
- **THEN** the response includes a `hasContent` object indicating which types have data
- **AND** the full content is available via `GET /api/campaigns/:id/sessions/:slug/content`
