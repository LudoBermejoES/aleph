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
