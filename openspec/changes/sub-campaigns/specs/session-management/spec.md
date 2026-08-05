## MODIFIED Requirements

### Requirement: Session list can be filtered by arc and reports arc and chapter names

`GET /api/campaigns/:id/sessions` SHALL accept an optional `arcSlug` query parameter that
filters results to sessions whose `arcId` matches an arc of that slug in the campaign, applied
in SQL before pagination and counting so the returned `meta.total` reflects the filter. An
unknown `arcSlug` MUST return an empty page rather than an error, matching the existing
`subCampaignSlug` read behaviour. The response projection MUST additionally include `arcName` and
`chapterName`, sourced from left joins on `arcs` and `chapters` in the same manner as the
existing `subCampaignName` join.

#### Scenario: Authenticated member filters sessions by arc

- **GIVEN** an authenticated campaign member and 12 of 73 sessions assigned to arc `act-i`
- **WHEN** they request `GET /api/campaigns/:id/sessions?arcSlug=act-i&pageSize=0`
- **THEN** exactly those 12 sessions are returned

#### Scenario: Filtered total reflects the filter

- **WHEN** a member requests `?arcSlug=act-i&page=1&pageSize=10`
- **THEN** `meta.total` is 12, not 73
- **AND** `meta.totalPages` is computed from the filtered total

#### Scenario: Unknown arc slug yields an empty page

- **GIVEN** no arc slugged `nonexistent` in the campaign
- **WHEN** a member requests `?arcSlug=nonexistent`
- **THEN** the response is 200 with an empty `data` array and `meta.total` 0

#### Scenario: Arc filter composes with the sub-campaign and status filters

- **WHEN** a member requests `?arcSlug=act-i&subCampaignSlug=mortales&status=completed`
- **THEN** all three predicates are ANDed in the query
- **AND** only sessions satisfying all three are returned

#### Scenario: Response carries arc and chapter names

- **GIVEN** a session in arc `Act I`, chapter `The Market`
- **WHEN** a member lists sessions
- **THEN** that session object includes `arcName: "Act I"` and `chapterName: "The Market"`

#### Scenario: Unassigned arc/chapter report null names

- **GIVEN** a session with `arcId` and `chapterId` both `NULL`
- **WHEN** a member lists sessions
- **THEN** that session's `arcName` and `chapterName` are `null` and the request still succeeds

#### Scenario: Unauthenticated request cannot list sessions by arc

- **GIVEN** a request with no valid API key and no session cookie
- **WHEN** it requests `GET /api/campaigns/:id/sessions?arcSlug=act-i`
- **THEN** the response is 401 and no session data is returned

## ADDED Requirements

### Requirement: Sessions always belong to a sub-campaign

Every session SHALL have a non-null `subCampaignId`. `POST /api/campaigns/:id/sessions` SHALL
accept an optional `subCampaignSlug` body field; when omitted, the created session's
`subCampaignId` MUST be set to the campaign's default sub-campaign. `PUT
/api/campaigns/:id/sessions/:slug` SHALL accept `subCampaignSlug` to reassign an existing
session to a different sub-campaign; an unresolvable slug MUST return 404 and the session MUST
be left unchanged. `GET /api/campaigns/:id/sessions` SHALL accept an optional
`subCampaignSlug` query parameter (replacing the removed `groupSlug`) filtering to sessions
assigned to that sub-campaign, and the response projection SHALL include `subCampaignName`
(replacing the removed `groupName`).

#### Scenario: Session created without a sub-campaign gets the default

- **WHEN** a co_dm sends `POST /api/campaigns/:id/sessions` with `{ "title": "Session 9" }` and no `subCampaignSlug`
- **THEN** the created session's `subCampaignId` is the campaign's default sub-campaign's id

#### Scenario: Session created with an explicit sub-campaign

- **GIVEN** a sub-campaign `mortales` exists in the campaign
- **WHEN** a co_dm sends `{ "title": "Sangre en Kreuzberg", "subCampaignSlug": "mortales" }`
- **THEN** the created session's `subCampaignId` is `mortales`'s id

#### Scenario: Reassigning a session to another sub-campaign

- **WHEN** a co_dm sends `PUT /api/campaigns/:id/sessions/:slug` with `{ "subCampaignSlug": "mortales" }`
- **THEN** the session's `subCampaignId` becomes `mortales`'s id

#### Scenario: Filtering sessions by sub-campaign

- **GIVEN** 12 of 73 sessions assigned to sub-campaign `mortales`
- **WHEN** a member requests `GET /api/campaigns/:id/sessions?subCampaignSlug=mortales&pageSize=0`
- **THEN** exactly those 12 sessions are returned, and each carries `subCampaignName: "Mortales"`

#### Scenario: Unknown sub-campaign slug on session filter yields an empty page

- **WHEN** a member requests `?subCampaignSlug=nonexistent`
- **THEN** the response is 200 with an empty `data` array and `meta.total` 0

#### Scenario: Unknown sub-campaign slug on session create or update returns 404

- **WHEN** a co_dm sends `{ "subCampaignSlug": "nonexistent" }` on session create or update
- **THEN** the response is 404 quoting `nonexistent` and no session is created or modified
