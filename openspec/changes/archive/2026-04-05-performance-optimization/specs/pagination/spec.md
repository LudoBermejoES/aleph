## ADDED Requirements

### Requirement: List endpoints support offset pagination

All list endpoints that currently return unbounded results SHALL accept `?page=N&pageSize=N` query parameters and return paginated responses. The affected endpoints are: characters, locations, sessions, organizations, maps, and quests.

#### Scenario: Default pagination returns first page

- **WHEN** `GET /api/campaigns/:id/characters` is called without pagination params
- **THEN** the response returns the first 50 results (default page size) along with pagination metadata

#### Scenario: Pagination metadata is included in response

- **GIVEN** a campaign with 120 characters
- **WHEN** `GET /api/campaigns/:id/characters?page=2&pageSize=25` is called
- **THEN** the response includes `{ data: [...25 items], meta: { page: 2, pageSize: 25, total: 120, totalPages: 5 } }`

#### Scenario: Page beyond total returns empty data

- **GIVEN** a campaign with 10 characters
- **WHEN** `GET /api/campaigns/:id/characters?page=5&pageSize=25` is called
- **THEN** the response includes `{ data: [], meta: { page: 5, pageSize: 25, total: 10, totalPages: 1 } }`

#### Scenario: Page size is capped at 200

- **WHEN** `GET /api/campaigns/:id/characters?pageSize=500` is called
- **THEN** the server clamps `pageSize` to 200 and returns at most 200 results

#### Scenario: Page size of 0 returns all results (backward compatibility)

- **WHEN** `GET /api/campaigns/:id/characters?pageSize=0` is called
- **THEN** the response returns all characters without pagination (transition period only)

---

### Requirement: Pagination works on all affected list endpoints

Each of the following endpoints SHALL support the same pagination interface:

#### Scenario: Characters list is paginated

- **WHEN** `GET /api/campaigns/:id/characters?page=1&pageSize=10` is called
- **THEN** at most 10 characters are returned with pagination metadata

#### Scenario: Locations list is paginated

- **WHEN** `GET /api/campaigns/:id/locations?page=1&pageSize=10` is called
- **THEN** at most 10 locations are returned with pagination metadata

#### Scenario: Sessions list is paginated

- **WHEN** `GET /api/campaigns/:id/sessions?page=1&pageSize=10` is called
- **THEN** at most 10 sessions are returned with pagination metadata

#### Scenario: Organizations list is paginated

- **WHEN** `GET /api/campaigns/:id/organizations?page=1&pageSize=10` is called
- **THEN** at most 10 organizations are returned with pagination metadata

#### Scenario: Maps list is paginated

- **WHEN** `GET /api/campaigns/:id/maps?page=1&pageSize=10` is called
- **THEN** at most 10 maps are returned with pagination metadata

#### Scenario: Quests list is paginated

- **WHEN** `GET /api/campaigns/:id/quests?page=1&pageSize=10` is called
- **THEN** at most 10 quests are returned with pagination metadata

---

### Requirement: Frontend list pages support pagination

Frontend pages for characters, locations, sessions, organizations, maps, and quests SHALL render pagination controls and fetch data page-by-page.

#### Scenario: Pagination controls appear when results exceed page size

- **GIVEN** a campaign with 60 characters and a page size of 25
- **WHEN** the user views the characters list page
- **THEN** pagination controls (page numbers or next/prev buttons) are displayed

#### Scenario: Clicking next page fetches the next page

- **GIVEN** the user is on page 1 of the characters list
- **WHEN** the user clicks "Next" or page 2
- **THEN** the page fetches `?page=2` and displays the next set of results

#### Scenario: URL reflects current page

- **WHEN** the user navigates to page 3
- **THEN** the URL query string includes `page=3` so the page is shareable/bookmarkable

---

### Requirement: CLI list commands support pagination

CLI commands that list resources SHALL accept `--page` and `--limit` flags.

#### Scenario: CLI character list with pagination

- **WHEN** `aleph character list <campaignId> --page 2 --limit 10` is run
- **THEN** the CLI displays characters 11-20 and shows pagination info (e.g., "Page 2 of 5, 50 total")

#### Scenario: CLI defaults to showing all results

- **WHEN** `aleph character list <campaignId>` is run without pagination flags
- **THEN** the CLI returns all results (backward compatible behavior)
