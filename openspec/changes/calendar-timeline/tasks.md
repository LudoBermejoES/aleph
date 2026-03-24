# Tasks: Calendar & Timeline

## 1. Database Schema

- [ ] 1.1 Create `calendars` schema with current date fields
- [ ] 1.2 Create `calendar_months` and `calendar_weekdays` schemas with sort order
- [ ] 1.3 Create `calendar_moons` schema with cycle and color
- [ ] 1.4 Create `calendar_seasons` schema with date ranges
- [ ] 1.5 Create `calendar_events` schema with recurrence rule JSON
- [ ] 1.6 Create `timelines` and `timeline_events` schemas
- [ ] 1.7 Generate and apply migration

## 2. Service Layer (`server/services/calendar.ts`)

- [ ] 2.1 Implement `calculateAge(birthDate, currentDate, calendarConfig)` -- age from custom calendar dates
- [ ] 2.2 Implement `getMoonPhase(date, moonConfig)` -- calculates moon phase for a given date
- [ ] 2.3 Implement `getNextOccurrence(event, calendarConfig)` -- next occurrence of recurring event
- [ ] 2.4 Implement `isDateInSeason(date, season, calendarConfig)` -- checks if date falls in season
- [ ] 2.5 Implement date advancement math (advance N days, handle month/year rollover)

## 3. Calendar CRUD API

- [ ] 3.1 Wire calendar create handler with months, weekdays, moons, seasons in a single payload
- [ ] 3.2 Wire calendar read handler (full definition with nested months, weekdays, moons, seasons)
- [ ] 3.3 Wire calendar update handler (reorder months, rename, adjust days)
- [ ] 3.4 Wire current date advancement handler (PATCH) calling date math service
- [ ] 3.5 Add RBAC checks (DM manages calendar, players view)

## 4. Calendar Events API

- [ ] 4.1 Wire calendar event CRUD handlers
- [ ] 4.2 Wire recurring event expansion at query time using `getNextOccurrence` service
- [ ] 4.3 Wire event filtering by date range
- [ ] 4.4 Link events to entities via entity_id

## 5. Timeline API

- [ ] 5.1 Wire timeline CRUD handlers
- [ ] 5.2 Wire timeline event CRUD handlers with date range support
- [ ] 5.3 Wire timeline event ordering and sorting

## 6. Calendar View Component

- [ ] 6.1 Create `CalendarView.vue` with custom month grid rendering
- [ ] 6.2 Render weekday headers from calendar definition
- [ ] 6.3 Display moon phase indicators per day cell (using `getMoonPhase` service)
- [ ] 6.4 Apply season colors as background tinting (using `isDateInSeason` service)
- [ ] 6.5 Show calendar events in day cells
- [ ] 6.6 Add month/year navigation and jump-to-current-date button
- [ ] 6.7 Build calendar creation/edit form (months, weekdays, moons, seasons)

## 7. Age Calculation

- [ ] 7.1 Display calculated age on character detail pages using `calculateAge` service
- [ ] 7.2 Wire age display into entity detail component (uses birth date from entity fields)

## 8. Timeline Views

- [ ] 8.1 Create `app/pages/campaigns/[id]/timelines/index.vue` (timeline list)
- [ ] 8.2 Create `app/pages/campaigns/[id]/timelines/[slug].vue` (timeline detail)
- [ ] 8.3 Build chronicle view (vertical narrative event list)
- [ ] 8.4 Build Gantt view (horizontal duration bars with CSS grid)
- [ ] 8.5 Build calendar overlay view (events rendered on CalendarView)
- [ ] 8.6 Add view switcher component for toggling between the three views

## 9. Tests (TDD)

### Unit Tests -- Service Functions (Vitest)

- [ ] 9.1 Test `calculateAge`: birth date + current calendar date returns correct age in custom calendar years
- [ ] 9.2 Test `calculateAge`: handles edge case where birth date has not yet occurred in current year (age = years - 1)
- [ ] 9.3 Test `getMoonPhase`: given cycle length and offset, compute correct phase for arbitrary date
- [ ] 9.4 Test `getMoonPhase`: multiple moons with different cycles return independent phases for same date
- [ ] 9.5 Test `getNextOccurrence`: yearly recurring event returns correct next date
- [ ] 9.6 Test `getNextOccurrence`: monthly recurring event on day 15 expands correctly across multiple months
- [ ] 9.7 Test `isDateInSeason`: date within season range returns true; date outside returns false
- [ ] 9.8 Test `isDateInSeason`: season wrapping year boundary (e.g., month 11 to month 2) detected correctly
- [ ] 9.9 Test custom calendar date math: advancing 35 days in a calendar with 30-day months crosses month boundary correctly
- [ ] 9.10 Test custom calendar date math: year rollover when advancing past last day of last month
- [ ] 9.11 Test timeline event ordering: events sorted by start date; ties broken by creation order

### Schema Tests (`:memory:` SQLite)

- [ ] 9.12 Test calendars table: campaign_id FK; current date fields accept valid values
- [ ] 9.13 Test calendar_months table: sort_order enforced; cascade delete when calendar deleted
- [ ] 9.14 Test calendar_events table: recurrence_rule JSON stored and retrieved correctly; entity_id FK nullable
- [ ] 9.15 Test timelines and timeline_events tables: cascade delete; sort_order fields

### Integration Tests (API)

- [ ] 9.16 Test calendar create: single payload with months, weekdays, moons, seasons creates complete calendar; read returns nested structure
- [ ] 9.17 Test calendar current date advancement: PATCH advances date, subsequent read shows new current date
- [ ] 9.18 Test calendar event CRUD: create event, query by date range returns it, delete removes it
- [ ] 9.19 Test recurring events via API: create recurring event, query date range returns expanded occurrences
- [ ] 9.20 Test timeline CRUD: create timeline, add events with date ranges, query returns ordered events
- [ ] 9.21 Test calendar RBAC: DM can create/edit calendar; player can view but not modify

### Component Tests

- [ ] 9.22 Test CalendarView component: renders correct number of day cells for custom month; displays moon phase indicators
- [ ] 9.23 Test month/year navigation: clicking next/prev month updates displayed month correctly
