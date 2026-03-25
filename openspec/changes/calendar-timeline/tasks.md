# Tasks: Calendar & Timeline

## 1. Database Schema

- [x] 1.1 Create `calendars` schema with current date fields
- [x] 1.2 Create calendar config as JSON (months, weekdays in configJson)
- [x] 1.3 Create `calendar_moons` schema with cycle and color
- [x] 1.4 Create `calendar_seasons` schema with date ranges
- [x] 1.5 Create `calendar_events` schema with recurrence rule JSON
- [x] 1.6 Create `timelines` and `timeline_events` schemas
- [x] 1.7 Generate and apply migration

## 2. Service Layer (`server/services/calendar.ts`)

- [x] 2.1 Implement `calculateAge(birthDate, currentDate, calendarConfig)`
- [x] 2.2 Implement `getMoonPhase(date, moonConfig)`
- [x] 2.3 Implement `getNextOccurrence(event, calendarConfig)`
- [x] 2.4 Implement `isDateInSeason(date, season, calendarConfig)`
- [x] 2.5 Implement `advanceDate` (advance N days, month/year rollover)

## 3. Calendar CRUD API

- [x] 3.1 Wire calendar create with months, weekdays, moons, seasons
- [x] 3.2 Wire calendar read (full nested structure)
- [x] 3.3 Wire calendar update (reorder months, rename)
- [x] 3.4 Wire current date advancement (PATCH) calling advanceDate service
- [x] 3.5 Add RBAC checks (DM manages, players view)

## 4. Calendar Events API

- [x] 4.1 Wire calendar event create
- [ ] 4.2 Wire recurring event expansion at query time
- [x] 4.3 Wire event filtering by date range
- [ ] 4.4 Link events to entities via entity_id

## 5. Timeline API

- [x] 5.1 Wire timeline CRUD (POST create, GET list with events)
- [x] 5.2 Wire timeline event create with date range
- [x] 5.3 Wire timeline event ordering (sortOrder)

## 6. Calendar View Component

- [ ] 6.1 Create `CalendarView.vue` with custom month grid
- [ ] 6.2 Render weekday headers from config
- [ ] 6.3 Display moon phase indicators per day cell
- [ ] 6.4 Apply season colors as background tinting
- [ ] 6.5 Show calendar events in day cells
- [ ] 6.6 Add month/year navigation
- [ ] 6.7 Build calendar creation/edit form

## 7. Age Calculation

- [ ] 7.1 Display calculated age on character pages
- [ ] 7.2 Wire age into entity detail (uses birth date field)

## 8. Timeline Views

- [x] 8.1 Create `app/pages/campaigns/[id]/calendars/index.vue` (calendar + timeline list)
- [ ] 8.2 Create timeline detail page
- [ ] 8.3 Build chronicle view (vertical event list)
- [ ] 8.4 Build Gantt view
- [ ] 8.5 Build calendar overlay view
- [ ] 8.6 Add view switcher component

## 9. Tests (TDD)

### Unit Tests -- Service Functions

- [x] 9.1 Test calculateAge: correct age, birthday not yet occurred
- [x] 9.2 Test getMoonPhase: correct phase, multiple moons
- [x] 9.3 Test getNextOccurrence: yearly, monthly
- [x] 9.4 Test isDateInSeason: within, outside, year-wrapping
- [x] 9.5 Test advanceDate: within month, cross month, cross year, zero days

### Integration Tests (API)

- [x] 9.6 Test calendar create with full payload, read nested structure
- [x] 9.7 Test calendar date advancement (PATCH)
- [x] 9.8 Test calendar event create and retrieve
- [x] 9.9 Test timeline create with events
- [ ] 9.10 Test recurring event expansion
- [ ] 9.11 Test calendar RBAC

### Component Tests

- [ ] 9.12 Test CalendarView component
- [ ] 9.13 Test month/year navigation
