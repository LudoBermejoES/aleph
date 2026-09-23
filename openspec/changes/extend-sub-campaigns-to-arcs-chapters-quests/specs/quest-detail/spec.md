## ADDED Requirements

### Requirement: The quests list filters by sub-campaign alongside status

The quests list page SHALL render a sub-campaign filter whenever the campaign has more than one
sub-campaign, using the chip control the sessions list uses, and it SHALL compose with the existing
status filter rather than replacing it: both predicates apply together, as the quests endpoint
already supports. The selected chip SHALL drive the `subCampaignSlug` query parameter.

#### Scenario: Both filters apply together

- **GIVEN** a campaign with 9 quests, of which 4 are in `Mortales` and 2 of those 4 are `completed`
- **WHEN** a member selects the `Mortales` chip and the `completed` status
- **THEN** exactly those 2 quests are listed

#### Scenario: Changing one filter preserves the other

- **WHEN** the member then switches the status filter to `active`
- **THEN** the `Mortales` chip stays selected and the list shows that sub-campaign's active quests

#### Scenario: A single-sub-campaign campaign shows only the status filter

- **GIVEN** a campaign with only its default sub-campaign
- **WHEN** a member opens the quests page
- **THEN** the status filter renders and no sub-campaign filter does

### Requirement: The quest form assigns a sub-campaign

Creating or editing a quest SHALL offer a sub-campaign picker, pre-selected to the campaign's default
on create, and submit it as `subCampaignSlug`. The quest detail page SHALL show the quest's
sub-campaign.

#### Scenario: Creating a quest in a chosen sub-campaign

- **WHEN** a co_dm creates a quest with the picker set to `Mortales`
- **THEN** the created quest belongs to `Mortales`

#### Scenario: Moving an existing quest from the web

- **WHEN** a co_dm edits a quest in `General` and sets the picker to `Mortales`
- **THEN** the quest belongs to `Mortales`

#### Scenario: The quest detail page names its sub-campaign

- **WHEN** a member opens a quest detail page
- **THEN** the sub-campaign is shown by name, not as a raw id
