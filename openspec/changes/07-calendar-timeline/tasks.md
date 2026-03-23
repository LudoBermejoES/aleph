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
