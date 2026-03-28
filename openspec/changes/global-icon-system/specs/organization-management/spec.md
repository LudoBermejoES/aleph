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
