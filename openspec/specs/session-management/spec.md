# session-management Specification

## Purpose

The session API and list surface: full CRUD including deletion, arc and chapter assignment by slug on create and update, an optional `arcSlug` filter on the session list that also reports arc and chapter names, and leading icons on session status badges.

## Requirements

### Requirement: Session status badges display icons

Session status badges in `app/pages/campaigns/[id]/sessions/index.vue` SHALL render a leading icon (`w-3 h-3`) before the status label.

#### Scenario: Planned session has Clock icon

- **WHEN** a session with status `planned` is rendered
- **THEN** the badge shows a `Clock` icon

#### Scenario: Active session has Zap icon

- **WHEN** a session with status `active` is rendered
- **THEN** the badge shows a `Zap` icon

#### Scenario: Completed session has CheckCircle2 icon

- **WHEN** a session with status `completed` is rendered
- **THEN** the badge shows a `CheckCircle2` icon

#### Scenario: Cancelled session has X icon

- **WHEN** a session with status `cancelled` is rendered
- **THEN** the badge shows an `X` icon

### Requirement: Session supports deletion

The `DELETE /api/campaigns/:id/sessions/:slug` endpoint SHALL be part of the session management API surface, completing full CRUD for sessions.

#### Scenario: DELETE endpoint exists alongside GET and PUT

- **WHEN** the server is running
- **THEN** `DELETE /api/campaigns/:id/sessions/:slug` is a valid route returning 200 or 404 (not 405 Method Not Allowed)

### Requirement: Sessions accept arc and chapter assignment by slug

`PUT /api/campaigns/:id/sessions/:slug` and `POST /api/campaigns/:id/sessions` SHALL accept
optional `arcSlug` and `chapterSlug` body fields alongside the existing `arcId` and
`chapterId`, which MUST continue to be accepted unchanged. `arcSlug` SHALL be resolved
against `arcs` filtered by the route's `campaignId`; `chapterSlug` SHALL be resolved by
joining `chapters` to `arcs` and filtering on `arcs.campaignId`, never by a campaign-blind
lookup on `chapters.slug`. An `arcSlug` of `null` or `''` MUST clear both `arcId` and
`chapterId`; a `chapterSlug` of `null` or `''` MUST clear only `chapterId`. When
`chapterSlug` is supplied without `arcSlug`, the session's `arcId` MUST be set to the
resolved chapter's `arcId`. When both are supplied and the chapter does not belong to the
named arc, the request MUST be rejected with 422. An unresolvable slug MUST return 404 and an
ambiguous slug MUST return 409. Both endpoints keep requiring co_dm or higher.

A session MUST NOT be left holding a chapter that belongs to a different arc than its own.
Therefore when a **non-empty** `arcSlug` is supplied **without** `chapterSlug`, and the
session currently holds a `chapterId` whose chapter belongs to a different arc, that
`chapterId` MUST be cleared as part of the same update. Rejecting the request instead is not
acceptable, because moving a session to another arc is an ordinary operation and the caller
did not mention the chapter. Symmetrically, supplying `arcSlug: ''` together with a non-empty
`chapterSlug` MUST be rejected with 422, since clearing the arc and naming a chapter are
contradictory instructions.

#### Scenario: Authenticated co_dm assigns an arc by slug

- **GIVEN** a co_dm with a valid API key and an arc `act-i` in the campaign
- **WHEN** they send `PUT /api/campaigns/:id/sessions/session-5` with `{ "arcSlug": "act-i" }`
- **THEN** the response is 200 and the session's `arcId` is that arc's id

#### Scenario: Assigning a chapter derives the arc

- **GIVEN** chapter `the-market` belongs to arc `act-i`
- **WHEN** a co_dm sends `{ "chapterSlug": "the-market" }` with no `arcSlug`
- **THEN** the session's `chapterId` is that chapter and its `arcId` is `act-i`'s id

#### Scenario: Consistent arc and chapter pair is applied

- **GIVEN** chapter `the-market` belongs to arc `act-i`
- **WHEN** a co_dm sends `{ "arcSlug": "act-i", "chapterSlug": "the-market" }`
- **THEN** the response is 200 and both FKs are set

#### Scenario: Chapter from a different arc is rejected

- **GIVEN** chapter `the-market` belongs to arc `act-i` and arc `act-ii` also exists
- **WHEN** a co_dm sends `{ "arcSlug": "act-ii", "chapterSlug": "the-market" }`
- **THEN** the response is 422 naming both slugs and the session is unchanged

#### Scenario: Clearing the arc also clears the chapter

- **GIVEN** a session assigned to arc `act-i` and chapter `the-market`
- **WHEN** a co_dm sends `{ "arcSlug": "" }`
- **THEN** the response is 200 and both `arcId` and `chapterId` are `NULL`

#### Scenario: Moving a session to another arc clears a now-inconsistent chapter

- **Given** a session assigned to arc `act-i` and to `act-i`'s chapter `the-market`
- **When** a co_dm sends `arcSlug: "act-ii"` with no `chapterSlug`
- **Then** the session's `arcId` SHALL become `act-ii`'s id
- **And** its `chapterId` SHALL be cleared, so arc and chapter never disagree

#### Scenario: Clearing the arc while naming a chapter is rejected

- **Given** a campaign with an arc `act-i` holding a chapter `the-market`
- **When** a co_dm sends `arcSlug: ""` together with `chapterSlug: "the-market"`
- **Then** the request SHALL be rejected with 422
- **And** the session SHALL be unmodified

#### Scenario: Clearing the chapter leaves the arc intact

- **GIVEN** a session assigned to arc `act-i` and chapter `the-market`
- **WHEN** a co_dm sends `{ "chapterSlug": "" }`
- **THEN** `chapterId` is `NULL` and `arcId` still points at `act-i`

#### Scenario: Unknown arc slug returns 404

- **GIVEN** no arc with slug `nonexistent` in the campaign
- **WHEN** a co_dm sends `{ "arcSlug": "nonexistent" }`
- **THEN** the response is 404 with a message quoting `nonexistent`, mirroring the existing
  `groupSlug` behaviour in the same handler
- **AND** no column of the session row is modified

#### Scenario: Arc slug from another campaign does not resolve

- **GIVEN** an arc `act-i` that belongs to a different campaign
- **WHEN** a co_dm of this campaign sends `{ "arcSlug": "act-i" }`
- **THEN** the response is 404

#### Scenario: Chapter slug that exists only in another campaign does not resolve

- **GIVEN** a chapter `prologue` whose arc belongs to a different campaign
- **WHEN** a co_dm of this campaign sends `{ "chapterSlug": "prologue" }`
- **THEN** the response is 404 and no chapter is assigned

#### Scenario: Ambiguous arc slug returns 409

- **GIVEN** two arcs in the same campaign both slugged `act-i`, which the schema permits
  because `arcs` has no unique constraint on `(campaignId, slug)`
- **WHEN** a co_dm sends `{ "arcSlug": "act-i" }`
- **THEN** the response is 409 naming the slug and the number of matches
- **AND** no arc is assigned, rather than the first match being chosen silently

#### Scenario: Ambiguous chapter slug is disambiguated by arcSlug

- **GIVEN** arcs `act-i` and `act-ii` each have a chapter slugged `prologue`
- **WHEN** a co_dm sends `{ "chapterSlug": "prologue" }` alone
- **THEN** the response is 409
- **WHEN** they instead send `{ "arcSlug": "act-i", "chapterSlug": "prologue" }`
- **THEN** the response is 200 and the chapter from `act-i` is assigned

#### Scenario: Existing id-based assignment keeps working

- **WHEN** the session form sends `{ "arcId": "<uuid>", "chapterId": "<uuid>" }` as it does today
- **THEN** the behaviour is unchanged from before this change

#### Scenario: Session creation accepts arcSlug

- **GIVEN** a co_dm and an arc `act-i`
- **WHEN** they send `POST /api/campaigns/:id/sessions` with `{ "title": "Session 9", "arcSlug": "act-i" }`
- **THEN** the created session's `arcId` is that arc's id

#### Scenario: Player role cannot assign an arc

- **GIVEN** an authenticated user whose campaign role is `player`
- **WHEN** they send `{ "arcSlug": "act-i" }` to the session PUT
- **THEN** the response is 403 and the slug is never resolved

#### Scenario: Unauthenticated request cannot assign an arc

- **GIVEN** a request with no valid API key and no session cookie
- **WHEN** it sends `{ "arcSlug": "act-i" }` to the session PUT
- **THEN** the response is 401 and the session is unchanged

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

#### Scenario: Arc filter composes with the group and status filters

- **WHEN** a member requests `?arcSlug=act-i&subCampaignSlug=mortales&status=completed`
- **THEN** all three predicates are ANDed in the query
- **AND** only sessions satisfying all three are returned

#### Scenario: Response carries arc and chapter names

- **GIVEN** a session in arc `Act I`, chapter `The Market`
- **WHEN** a member lists sessions
- **THEN** that session object includes `arcName: "Act I"` and `chapterName: "The Market"`

#### Scenario: Unassigned sessions report null names

- **GIVEN** a session with `arcId` and `chapterId` both `NULL`
- **WHEN** a member lists sessions
- **THEN** that session's `arcName` and `chapterName` are `null` and the request still succeeds

#### Scenario: Unauthenticated request cannot list sessions by arc

- **GIVEN** a request with no valid API key and no session cookie
- **WHEN** it requests `GET /api/campaigns/:id/sessions?arcSlug=act-i`
- **THEN** the response is 401 and no session data is returned

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
