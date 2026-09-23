## ADDED Requirements

### Requirement: A chapter's sub-campaign is derived from its arc

A chapter SHALL report the sub-campaign of the arc it belongs to. The system MUST NOT store a
`sub_campaign_id` on `chapters`: the value is resolved through `chapters.arcId -> arcs.subCampaignId`
on read, so that an arc and its chapters can never disagree about which storyline they are in. The
chapter list and detail projections SHALL include `subCampaignId` and `subCampaignName`.

#### Scenario: A chapter reports its arc's sub-campaign

- **GIVEN** an arc `sangre-en-kreuzberg` assigned to sub-campaign `mortales`, holding a chapter `el-mercado`
- **WHEN** a campaign member requests `GET /api/campaigns/:id/chapters`
- **THEN** `el-mercado` carries `subCampaignName: "Mortales"` and the `subCampaignId` of `mortales`

#### Scenario: Moving the arc moves the chapter's reported sub-campaign

- **GIVEN** the same chapter, and its arc then reassigned to sub-campaign `general`
- **WHEN** the member requests the chapter again
- **THEN** it reports `general`, with no separate write to the chapter having occurred

### Requirement: A chapter's sub-campaign cannot be assigned directly

`POST` and `PUT` on `/api/campaigns/:id/chapters` SHALL reject a body carrying `subCampaignSlug` or
`subCampaignId` with **422**, naming the arc as the way to change it. The field MUST NOT be accepted
and discarded.

#### Scenario: Writing a chapter's sub-campaign is refused, not ignored

- **WHEN** a co_dm sends `PUT /api/campaigns/:id/chapters/el-mercado` with `{ "subCampaignSlug": "general" }`
- **THEN** the response is 422 and the message names the arc as the route to change it
- **AND** the chapter is unchanged

### Requirement: Chapters can be listed campaign-wide and filtered by sub-campaign

`GET /api/campaigns/:id/chapters` SHALL list every chapter of the route's campaign when no narrowing
parameter is given, instead of the current hard 400 demanding `arc_id`. It SHALL accept an optional
`subCampaignSlug` filtering to chapters whose arc belongs to that sub-campaign, composing with the
existing arc narrowing. An unknown slug MUST return an empty result rather than an error, matching
the arc, quest and session filters.

The endpoint SHALL also scope its arc narrowing to the route's campaign: an `arc_id` belonging to
another campaign MUST return an empty result, never that campaign's chapters.

#### Scenario: Listing every chapter of a campaign

- **GIVEN** a campaign with 5 arcs holding 14 chapters between them
- **WHEN** a member requests `GET /api/campaigns/:id/chapters` with no parameters
- **THEN** all 14 chapters are returned, each carrying its arc and sub-campaign

#### Scenario: Filtering chapters by sub-campaign

- **GIVEN** a campaign whose `mortales` sub-campaign holds 2 arcs with 5 chapters between them, and whose `general` sub-campaign holds 3 arcs with 9 chapters
- **WHEN** a member requests `?subCampaignSlug=mortales`
- **THEN** exactly those 5 chapters are returned

#### Scenario: Unknown sub-campaign slug yields an empty list

- **WHEN** a member requests `?subCampaignSlug=nonexistent`
- **THEN** the response is 200 with an empty list, not an error

#### Scenario: An arc from another campaign returns nothing

- **GIVEN** an arc belonging to campaign B
- **WHEN** a member of campaign A requests `GET /api/campaigns/A/chapters?arc_id=<that arc>`
- **THEN** the response is 200 with an empty list, and no chapter of campaign B is disclosed

### Requirement: A session's arc must belong to the session's sub-campaign

When a session is created or updated with an arc, the system SHALL verify that the arc's
`subCampaignId` equals the session's **effective** sub-campaign — the one from the request body when
`subCampaignSlug` is present, otherwise the session's stored one — and MUST return **422** naming
both sub-campaigns when they differ. No row may be modified by a refused request. This mirrors the
existing chapter/arc refusal, which stays unchanged.

#### Scenario: Assigning an arc from another sub-campaign is refused

- **GIVEN** a session in sub-campaign `mortales` and an arc `act-ii` in sub-campaign `general`
- **WHEN** a co_dm sends `PUT /api/campaigns/:id/sessions/:slug` with `{ "arcSlug": "act-ii" }`
- **THEN** the response is 422, the message names both `mortales` and `general`
- **AND** the session's `arcId` is unchanged

#### Scenario: Moving the session and assigning the arc in one request succeeds

- **GIVEN** the same session in `mortales` and the same arc `act-ii` in `general`
- **WHEN** a co_dm sends `{ "subCampaignSlug": "general", "arcSlug": "act-ii" }` in a single request
- **THEN** the response is 200, the session is in `general` and points at `act-ii`
- **AND** the outcome does not depend on the order the handler applies the two fields

#### Scenario: A session with no arc is unaffected

- **WHEN** a co_dm moves a session with `arcId` null to another sub-campaign
- **THEN** the response is 200 and no arc check is performed

#### Scenario: Creating a session with a mismatched arc is refused

- **WHEN** a co_dm sends `POST /api/campaigns/:id/sessions` with `subCampaignSlug` and an `arcSlug` from a different sub-campaign
- **THEN** the response is 422 and no session is created

### Requirement: Moving an arc to another sub-campaign moves its sessions

The system SHALL, when `PUT /api/campaigns/:id/arcs/:slug` changes an arc's sub-campaign, reassign
every session pointing at that arc to the same sub-campaign in the same transaction, and SHALL report
the number of sessions moved in the response as `movedSessions`. Chapters require no reassignment,
deriving their sub-campaign from the arc.

#### Scenario: Sessions follow their arc

- **GIVEN** an arc in `general` with 12 sessions and 3 chapters
- **WHEN** a co_dm sends `PUT .../arcs/:slug` with `{ "subCampaignSlug": "mortales" }`
- **THEN** the arc and all 12 sessions are in `mortales`
- **AND** the response reports `movedSessions: 12`
- **AND** the 3 chapters report `mortales` without any chapter row having been written

#### Scenario: A move that changes nothing reports zero

- **WHEN** a co_dm sends the arc's current sub-campaign slug
- **THEN** the response is 200 with `movedSessions: 0`

#### Scenario: The move is atomic

- **GIVEN** a failure occurs while reassigning the sessions
- **WHEN** the transaction rolls back
- **THEN** neither the arc nor any session has changed sub-campaign

### Requirement: Cross-sub-campaign incoherence can be audited and repaired

The system SHALL provide a read-only audit reporting every session whose arc belongs to a different
sub-campaign than the session, and a separate, explicitly-requested repair that reassigns each such
session to its arc's sub-campaign. The audit MUST NOT modify any row.

#### Scenario: The audit reports without changing anything

- **GIVEN** 4 sessions whose arc is in another sub-campaign
- **WHEN** a co_dm runs the audit
- **THEN** all 4 are listed with their session slug, their sub-campaign and their arc's sub-campaign
- **AND** no row has been modified

#### Scenario: Repair adopts the arc's sub-campaign

- **WHEN** a co_dm runs the audit with the repair flag
- **THEN** each reported session is reassigned to its arc's sub-campaign
- **AND** a re-run of the audit reports nothing

#### Scenario: A coherent campaign audits clean

- **GIVEN** a campaign where every session's arc matches its sub-campaign
- **WHEN** a co_dm runs the audit
- **THEN** it reports zero rows and exits successfully

### Requirement: Every arc, chapter and quest response names its sub-campaign

The arc, chapter and quest list, detail and create responses SHALL carry `subCampaignName` and
`subCampaignSlug` alongside `subCampaignId`, resolved by a left join in the same manner as the
sessions list already does. A response MUST NOT report a sub-campaign as a bare id.

This closes an asymmetry that is currently load-bearing in the wrong direction: all three can already
be **filtered** by sub-campaign while none of them ever **shows** which one a row belongs to, so a
filtered list is indistinguishable from an unfiltered one.

#### Scenario: The arcs list names the sub-campaign

- **WHEN** a member requests `GET /api/campaigns/:id/arcs`
- **THEN** each arc carries `subCampaignName` and `subCampaignSlug`, not only `subCampaignId`

#### Scenario: Creating an arc echoes its sub-campaign

- **WHEN** a co_dm creates an arc
- **THEN** the response includes the sub-campaign it landed in, so a client never has to re-read to find out

#### Scenario: The quest detail names the sub-campaign

- **WHEN** a member requests a single quest
- **THEN** the response carries `subCampaignName` and `subCampaignSlug`
