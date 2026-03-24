# Tasks: Calendar & Timeline

## 1. Database Schema

- [ ] 1.1 Create `calendars` schema with current date fields
- [ ] 1.2 Create `calendar_months` and `calendar_weekdays` schemas with sort order
- [ ] 1.3 Create `calendar_moons` schema with cycle and color
- [ ] 1.4 Create `calendar_seasons` schema with date ranges
- [ ] 1.5 Create `calendar_events` schema with recurrence rule JSON
- [ ] 1.6 Create `timelines` and `timeline_events` schemas
- [ ] 1.7 Generate and apply migration

## 2. Calendar CRUD API

- [ ] 2.1 Implement calendar create with months, weekdays, moons, seasons in a single payload
- [ ] 2.2 Implement calendar read (full definition with nested months, weekdays, moons, seasons)
- [ ] 2.3 Implement calendar update (reorder months, rename, adjust days)
- [ ] 2.4 Implement current date advancement endpoint (PATCH)
- [ ] 2.5 Add RBAC checks (DM manages calendar, players view)

## 3. Calendar Events API

- [ ] 3.1 Implement calendar event CRUD
- [ ] 3.2 Implement recurring event expansion at query time
- [ ] 3.3 Implement event filtering by date range
- [ ] 3.4 Link events to entities via entity_id

## 4. Timeline API

- [ ] 4.1 Implement timeline CRUD
- [ ] 4.2 Implement timeline event CRUD with date range support
- [ ] 4.3 Implement timeline event ordering and sorting

## 5. Calendar View Component

- [ ] 5.1 Create `CalendarView.vue` with custom month grid rendering
- [ ] 5.2 Render weekday headers from calendar definition
- [ ] 5.3 Display moon phase indicators per day cell
- [ ] 5.4 Apply season colors as background tinting
- [ ] 5.5 Show calendar events in day cells
- [ ] 5.6 Add month/year navigation and jump-to-current-date button
- [ ] 5.7 Build calendar creation/edit form (months, weekdays, moons, seasons)

## 6. Age Calculation

- [ ] 6.1 Implement age calculation utility using custom calendar year length
- [ ] 6.2 Display calculated age on character detail pages (uses birth date from entity fields)

## 7. Timeline Views

- [ ] 7.1 Create `app/pages/campaigns/[id]/timelines/index.vue` (timeline list)
- [ ] 7.2 Create `app/pages/campaigns/[id]/timelines/[slug].vue` (timeline detail)
- [ ] 7.3 Build chronicle view (vertical narrative event list)
- [ ] 7.4 Build Gantt view (horizontal duration bars with CSS grid)
- [ ] 7.5 Build calendar overlay view (events rendered on CalendarView)
- [ ] 7.6 Add view switcher component for toggling between the three views

## 8. Tests (TDD)

### Unit Tests (Vitest)

- [ ] 8.1 Test custom calendar date math: advancing 35 days in a calendar with 30-day months crosses month boundary correctly
- [ ] 8.2 Test custom calendar date math: year rollover when advancing past last day of last month
- [ ] 8.3 Test moon phase calculation: given cycle length and reference date, compute correct phase for arbitrary date
- [ ] 8.4 Test moon phase calculation: multiple moons with different cycles return independent phases for same date
- [ ] 8.5 Test age calculation utility: birth date + current calendar date → correct age in custom calendar years
- [ ] 8.6 Test age calculation: handles edge case where birth date has not yet occurred in current year (age = years - 1)
- [ ] 8.7 Test recurring event expansion: weekly event generates correct occurrences within a date range query
- [ ] 8.8 Test recurring event expansion: monthly event on day 15 correctly expands across multiple months
- [ ] 8.9 Test timeline event ordering: events sorted by start date; ties broken by creation order

### Integration Tests (@nuxt/test-utils)

- [ ] 8.10 Test calendar create: single payload with months, weekdays, moons, seasons creates complete calendar; read returns nested structure
- [ ] 8.11 Test calendar current date advancement: PATCH advances date, subsequent read shows new current date
- [ ] 8.12 Test calendar event CRUD: create event, query by date range returns it, delete removes it
- [ ] 8.13 Test recurring events via API: create recurring event, query date range returns expanded occurrences
- [ ] 8.14 Test timeline CRUD: create timeline, add events with date ranges, query returns ordered events
- [ ] 8.15 Test calendar RBAC: DM can create/edit calendar; player can view but not modify

### Component Tests (@vue/test-utils)

- [ ] 8.16 Test CalendarView component: renders correct number of day cells for custom month; displays moon phase indicators
- [ ] 8.17 Test month/year navigation: clicking next/prev month updates displayed month correctly
