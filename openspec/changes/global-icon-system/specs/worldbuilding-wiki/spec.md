## MODIFIED Requirements

### Requirement: Campaign dashboard cards display icons
Each card in the campaign dashboard grid (`app/pages/campaigns/[id]/index.vue`) SHALL render a leading icon (`w-6 h-6`) in the `CardHeader` before the `CardTitle`. The icon SHALL be the same icon used for that section in the sidebar.

#### Scenario: Wiki card has BookOpen icon
- **WHEN** the campaign dashboard is rendered
- **THEN** the Wiki card shows a `BookOpen` icon in the card header

#### Scenario: All 13 dashboard cards have icons
- **WHEN** the campaign dashboard is rendered
- **THEN** every card (Wiki, Characters, Maps, Sessions, Calendars, Quests, Items, Shops, Inventories, Currencies, Transactions, Graph, Members) shows its assigned icon
