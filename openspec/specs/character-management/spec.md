## MODIFIED Requirements

### Requirement: Character status badges display icons
Character status badges in `app/pages/campaigns/[id]/characters/index.vue` and character detail pages SHALL render a leading icon (`w-3 h-3`) before the status text.

#### Scenario: Alive status has Heart icon
- **WHEN** a character with status `alive` is rendered in the list
- **THEN** the status badge shows a `Heart` icon

#### Scenario: Dead status has Skull icon
- **WHEN** a character with status `dead` is rendered in the list
- **THEN** the status badge shows a `Skull` icon

#### Scenario: Missing status has CircleHelp icon
- **WHEN** a character with status `missing` is rendered in the list
- **THEN** the status badge shows a `CircleHelp` icon

### Requirement: Character type badges display icons
PC/NPC type badges SHALL render a leading icon: `Sword` for PC, `Bot` for NPC.

#### Scenario: PC badge has Sword icon
- **WHEN** a PC character is rendered
- **THEN** the type badge shows a `Sword` icon before "PC"

#### Scenario: NPC badge has Bot icon
- **WHEN** an NPC character is rendered
- **THEN** the type badge shows a `Bot` icon before "NPC"
