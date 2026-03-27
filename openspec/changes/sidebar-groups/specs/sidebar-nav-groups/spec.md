## ADDED Requirements

### Requirement: Campaign nav links are organized into named groups
The sidebar SHALL display campaign navigation links organized into collapsible groups: World, Story, Economy, and Campaign.

#### Scenario: Groups render with labels
- **WHEN** a user is inside a campaign
- **THEN** the sidebar shows 4 section headers (World, Story, Economy, Campaign) each with their respective links beneath

#### Scenario: All groups are expanded by default
- **WHEN** a user visits a campaign for the first time (no localStorage state)
- **THEN** all 4 groups are expanded and all 15 links are visible

### Requirement: Groups are collapsible
Each group SHALL be toggled open or closed by clicking its header.

#### Scenario: Collapsing a group hides its links
- **WHEN** a user clicks a group header
- **THEN** the group's links are hidden and only the header remains visible

#### Scenario: Expanding a group shows its links
- **WHEN** a user clicks a collapsed group header
- **THEN** the group's links become visible again

### Requirement: Collapsed state persists across navigation
The open/closed state of each group SHALL be stored in `localStorage` and restored on subsequent page loads.

#### Scenario: State survives navigation
- **WHEN** a user collapses a group and navigates to another page
- **THEN** the group remains collapsed when they return

### Requirement: Active group is always expanded
If the current route is within a group, that group SHALL be forced open regardless of its stored collapsed state.

#### Scenario: Navigating to a link in a collapsed group
- **WHEN** the current route matches a link inside a collapsed group
- **THEN** that group is automatically expanded
