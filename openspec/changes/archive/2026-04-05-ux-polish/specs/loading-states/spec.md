## MODIFIED Requirements

### Requirement: All data-fetching pages show loading skeletons

Every page that fetches data on mount SHALL display a `LoadingSkeleton` component while the request is in flight. The skeleton SHALL be replaced by the actual content once data arrives, or by an error state if the fetch fails.

#### Scenario: Entity detail page shows skeleton while loading

GIVEN the user navigates to `/campaigns/:id/entities/:slug`
WHEN the entity data is being fetched
THEN a LoadingSkeleton is displayed in place of the entity content
AND the skeleton disappears once the entity data loads

#### Scenario: Character detail page shows skeleton while loading

GIVEN the user navigates to `/campaigns/:id/characters/:slug`
WHEN the character data is being fetched
THEN a LoadingSkeleton is displayed
AND the skeleton disappears once the character data loads

#### Scenario: Session detail page shows skeleton while loading

GIVEN the user navigates to `/campaigns/:id/sessions/:slug`
WHEN the session data is being fetched
THEN a LoadingSkeleton is displayed
AND the skeleton disappears once the session data loads

#### Scenario: Map detail page shows skeleton while loading

GIVEN the user navigates to `/campaigns/:id/maps/:slug`
WHEN the map data is being fetched
THEN a LoadingSkeleton is displayed
AND the skeleton disappears once the map data loads

#### Scenario: Calendar detail page shows skeleton while loading

GIVEN the user navigates to `/campaigns/:id/calendars/:calendarId`
WHEN the calendar data is being fetched
THEN a LoadingSkeleton is displayed
AND the skeleton disappears once the calendar data loads

#### Scenario: Timeline detail page shows skeleton while loading

GIVEN the user navigates to `/campaigns/:id/timelines/:slug`
WHEN the timeline data is being fetched
THEN a LoadingSkeleton is displayed
AND the skeleton disappears once the timeline data loads

#### Scenario: Shop detail page shows skeleton while loading

GIVEN the user navigates to `/campaigns/:id/shops/:slug`
WHEN the shop data is being fetched
THEN a LoadingSkeleton is displayed
AND the skeleton disappears once the shop data loads

#### Scenario: Location detail page shows skeleton while loading

GIVEN the user navigates to `/campaigns/:id/locations/:slug`
WHEN the location data is being fetched
THEN a LoadingSkeleton is displayed
AND the skeleton disappears once the location data loads

#### Scenario: Campaign dashboard shows skeleton while loading

GIVEN the user navigates to `/campaigns/:id`
WHEN the dashboard data is being fetched
THEN a LoadingSkeleton is displayed
AND the skeleton disappears once the dashboard data loads

#### Scenario: Graph page shows skeleton while loading

GIVEN the user navigates to `/campaigns/:id/graph`
WHEN the graph data is being fetched
THEN a LoadingSkeleton is displayed
AND the skeleton disappears once the graph data loads

### Requirement: API failures show visible error states instead of empty content

Pages that fetch data SHALL display a visible error message when the API call fails. Silent `.catch(() => [])` patterns SHALL be replaced with error handling that sets an error state displayed via `ErrorToast`.

#### Scenario: Entity list API failure shows error toast

GIVEN the user navigates to `/campaigns/:id/entities`
WHEN the entity list API call fails (e.g., 500 error)
THEN an ErrorToast is displayed with a meaningful error message
AND the page does NOT show an empty list with no indication of failure

#### Scenario: Character detail API failure shows error

GIVEN the user navigates to `/campaigns/:id/characters/:slug`
WHEN the character detail API call fails
THEN an ErrorToast is displayed with a meaningful error message
AND the loading skeleton is replaced by the error state (not blank content)

#### Scenario: Session detail API failure shows error

GIVEN the user navigates to `/campaigns/:id/sessions/:slug`
WHEN the session detail API call fails
THEN an ErrorToast is displayed with a meaningful error message

#### Scenario: Calendar list API failure shows error

GIVEN the user navigates to `/campaigns/:id/calendars`
WHEN the calendar list API call fails
THEN an ErrorToast is displayed with a meaningful error message
AND the page does NOT show an empty list

#### Scenario: Calendar detail API failure shows error

GIVEN the user navigates to `/campaigns/:id/calendars/:calendarId`
WHEN the calendar detail API call fails
THEN an ErrorToast is displayed with a meaningful error message

#### Scenario: Timeline detail API failure shows error

GIVEN the user navigates to `/campaigns/:id/timelines/:slug`
WHEN the timeline detail API call fails
THEN an ErrorToast is displayed with a meaningful error message

#### Scenario: Organization detail API failure shows error

GIVEN the user navigates to `/campaigns/:id/organizations/:slug`
WHEN the organization detail API call fails
THEN an ErrorToast is displayed with a meaningful error message

#### Scenario: Multiple silent-catch pages converted

GIVEN pages that previously used `.catch(() => [])`:
- `entities/index.vue`
- `entities/[slug]/index.vue`
- `organizations/index.vue`
- `organizations/[slug]/index.vue`
- `characters/[slug]/index.vue`
- `sessions/[slug]/index.vue`
- `calendars/index.vue`
- `calendars/[calendarId]/index.vue`
- `timelines/[slug]/index.vue`
- `SessionForm.vue`
- `CharacterForm.vue`
WHEN those pages are updated
THEN each uses `withLoading` from `useLoadingState` for its fetch calls
AND each renders `<ErrorToast>` bound to the composable's `error` ref

#### Scenario: Error toast can be dismissed

GIVEN an ErrorToast is displayed due to an API failure
WHEN the user clicks the dismiss button on the toast
THEN the error message disappears
AND the user can retry the action or navigate away
