## ADDED Requirements

### Requirement: The arcs list filters by sub-campaign

The arcs list page SHALL render a sub-campaign filter above the list whenever the campaign has more
than one sub-campaign, using the same control the sessions list already uses
(`app/pages/campaigns/[id]/sessions/index.vue`): a row of chips, one per sub-campaign plus a leading
"all" chip that clears the filter, each showing the sub-campaign's `imageUrl` when it has one. The
selected chip SHALL drive the `subCampaignSlug` query parameter the arcs endpoint already accepts, so
the filtering happens in SQL and not in the browser.

The page currently renders no filter of any kind, so this is the first one it gains.

#### Scenario: Filtering the arcs list

- **GIVEN** a campaign with sub-campaigns `General` (3 arcs) and `Mortales` (2 arcs)
- **WHEN** a member opens the arcs page and clicks the `Mortales` chip
- **THEN** only those 2 arcs are listed
- **AND** the request carried `subCampaignSlug=mortales` rather than filtering client-side

#### Scenario: Clearing the filter

- **WHEN** the member then clicks the "all" chip
- **THEN** all 5 arcs are listed again

#### Scenario: A single-sub-campaign campaign shows no filter

- **GIVEN** a campaign with only its default sub-campaign
- **WHEN** a member opens the arcs page
- **THEN** no filter row is rendered, so the concept stays invisible to campaigns that do not use it

### Requirement: The arc form assigns a sub-campaign

Creating or editing an arc SHALL offer a sub-campaign picker, pre-selected to the campaign's default
on create, mirroring `SessionForm.vue`. Submitting it SHALL send `subCampaignSlug`, which the arcs
endpoints already accept. Today the create call sends only `{ name }`, so an arc made from the web
always lands in the default and cannot be moved without the CLI.

#### Scenario: Creating an arc in a chosen sub-campaign

- **WHEN** a co_dm creates an arc with the picker set to `Mortales`
- **THEN** the created arc belongs to `Mortales`

#### Scenario: The picker defaults to the campaign default

- **WHEN** a co_dm opens the arc create form
- **THEN** the picker shows the campaign's default sub-campaign pre-selected

#### Scenario: Moving an existing arc from the web

- **GIVEN** an arc in `General` with 4 sessions
- **WHEN** a co_dm edits it and sets the picker to `Mortales`
- **THEN** the arc and its 4 sessions are in `Mortales`
- **AND** the page reports that 4 sessions moved with it

### Requirement: Arc and chapter views show the sub-campaign they belong to

The arcs list SHALL show each arc's sub-campaign as a badge, in the same manner as the sessions list.
The arc detail page SHALL show the arc's sub-campaign, and the chapters it manages inline SHALL show
the one they inherit, presented read-only with the arc named as the way to change it.

#### Scenario: The arcs list shows each row's sub-campaign

- **WHEN** a member views the unfiltered arcs list
- **THEN** each arc carries a badge naming its sub-campaign

#### Scenario: Chapters show an inherited, non-editable sub-campaign

- **WHEN** a co_dm opens an arc detail page in `Mortales`
- **THEN** each chapter shows `Mortales`
- **AND** the chapter editing controls offer no way to change it, naming the arc instead
