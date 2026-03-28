## ADDED Requirements

### Requirement: Central icon map exports named icon components
The system SHALL provide a single file `app/utils/icons.ts` that imports lucide-vue-next components and re-exports them as a named map `ICONS`. Every domain concept (nav areas, entity types, statuses, actions) SHALL have an entry. No other file SHALL import lucide icons directly for navigation or badge purposes.

#### Scenario: ICONS map covers all nav areas
- **WHEN** a developer imports `ICONS` from `~/utils/icons`
- **THEN** it contains keys for every sidebar section: `dashboard`, `allCampaigns`, `wiki`, `characters`, `organizations`, `locations`, `maps`, `sessions`, `quests`, `calendars`, `items`, `shops`, `inventories`, `currencies`, `transactions`, `graph`, `members`

#### Scenario: ICONS map covers nav group headers
- **WHEN** a developer imports `ICONS` from `~/utils/icons`
- **THEN** it contains keys for group headers: `groupWorld`, `groupStory`, `groupEconomy`, `groupCampaign`

#### Scenario: ICONS map covers action buttons
- **WHEN** a developer imports `ICONS` from `~/utils/icons`
- **THEN** it contains keys: `add`, `edit`, `delete`, `save`, `back`, `signOut`, `settings`, `search`

#### Scenario: ICONS map covers status values
- **WHEN** a developer imports `ICONS` from `~/utils/icons`
- **THEN** it contains character status keys (`alive`, `dead`, `missing`, `unknown`), quest status keys (`questActive`, `questCompleted`, `questFailed`, `questAbandoned`), and session status keys (`sessionPlanned`, `sessionActive`, `sessionCompleted`, `sessionCancelled`)

#### Scenario: ICONS map covers org types and statuses
- **WHEN** a developer imports `ICONS` from `~/utils/icons`
- **THEN** it contains org type keys (`orgFaction`, `orgGuild`, `orgArmy`, `orgCult`, `orgGovernment`, `orgOther`) and org status keys (`orgActive`, `orgInactive`, `orgSecret`, `orgDissolved`)

### Requirement: Icon rendering is consistent in size and alignment
All icons rendered via `ICONS` SHALL use Tailwind size classes that match their context: `w-4 h-4` for inline nav/button icons, `w-6 h-6` for dashboard card icons, `w-3 h-3` for badge icons. Icons SHALL be vertically aligned with adjacent text using `flex items-center gap-2`.

#### Scenario: Sidebar icon aligns with link text
- **WHEN** the sidebar renders a nav link
- **THEN** the icon and label are in a flex row with `items-center` and the icon has class `w-4 h-4 shrink-0`

#### Scenario: Dashboard card icon is larger
- **WHEN** the campaign dashboard renders a section card
- **THEN** each card has a leading icon with class `w-6 h-6`
