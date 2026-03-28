## MODIFIED Requirements

### Requirement: Sidebar nav links display icons
Every nav link in `app/layouts/default.vue` SHALL render a leading icon from `ICONS` before its text label. The icon SHALL be `w-4 h-4 shrink-0` and the link SHALL use `flex items-center gap-2`.

#### Scenario: All Campaigns link has icon
- **WHEN** the sidebar is rendered outside a campaign
- **THEN** the "All Campaigns" link shows a `LayoutDashboard` icon before the label

#### Scenario: Campaign section links have icons
- **WHEN** the sidebar is rendered inside a campaign
- **THEN** each link (Wiki, Characters, Organizations, Locations, Maps, Sessions, Quests, Calendars, Items, Shops, Inventories, Currencies, Transactions, Graph, Members) shows its assigned icon

#### Scenario: Nav group headers have icons
- **WHEN** a collapsible nav group header is rendered
- **THEN** the group button shows a thematic icon: Globe (World), BookMarked (Story), Landmark (Economy), Shield (Campaign)

#### Scenario: Sign out and Settings links have icons
- **WHEN** the bottom user section of the sidebar is rendered
- **THEN** Sign Out shows a `LogOut` icon and Settings shows a `Settings` icon
