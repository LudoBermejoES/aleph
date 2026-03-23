# Design: Calendar & Timeline

## Technical Approach

### Custom Calendar Schema

- `calendars` table: `id, campaign_id, name, epoch_label, current_year, current_month, current_day, year_length_override (nullable)`
- `calendar_months` table: `id, calendar_id, name, days, sort_order`
- `calendar_weekdays` table: `id, calendar_id, name, sort_order`
- Year length is the sum of all month days (or overridden for intercalary days)
- Weekday cycle repeats continuously across months

### Moon Phases

- `calendar_moons` table: `id, calendar_id, name, cycle_days, color, offset`
- Phase calculated client-side: `phase = ((dayOfYear + offset) % cycle_days) / cycle_days`
- Phase mapped to 8 standard phases (new, waxing crescent, first quarter, etc.)
- Rendered as a tinted circle with CSS clip-path or SVG

### Seasons

- `calendar_seasons` table: `id, calendar_id, name, start_month, start_day, end_month, end_day, color`
- Seasons can wrap around year boundaries (e.g., winter: month 11 → month 2)
- Displayed as colored bands on the calendar view

### Calendar Events

- `calendar_events` table: `id, calendar_id, title, description, year, month, day, end_year, end_month, end_day, is_recurring, recurrence_rule (JSON), entity_id (nullable), visibility`
- Recurrence rules: `{ interval: "yearly" | "monthly", every: number }`
- Recurring events expanded at query time, not materialized

### Calendar View Component

- `CalendarView.vue`: renders a month grid based on the custom calendar definition
- Computed grid: weekday headers from `calendar_weekdays`, cells from month's day count
- Moon phase indicators in each day cell
- Season color as row/cell background tint
- Navigation: month/year arrows, jump to current date

### Current Date & Age Calculation

- Current campaign date stored on the `calendars` table
- DM advances date manually (button or set specific date)
- Character age: count full years between character's birth date and current campaign date using the custom calendar's year length

### Timeline System

- `timelines` table: `id, campaign_id, name, slug, sort_order`
- `timeline_events` table: `id, timeline_id, title, description, start_year, start_month, start_day, end_year, end_month, end_day, entity_id (nullable), color, sort_order`

### Timeline Views

- **Chronicle**: Vertical narrative list, events in chronological order with date labels
- **Gantt**: Horizontal bars showing event duration on a time axis (rendered with CSS grid)
- **Calendar**: Events overlaid on the custom calendar view (reuses CalendarView component)

### API Endpoints

```
GET/POST       /api/campaigns/:id/calendars
GET/PUT        /api/campaigns/:id/calendars/:calId
PATCH          /api/campaigns/:id/calendars/:calId/date    # advance current date
GET/POST       /api/campaigns/:id/calendars/:calId/events
GET/POST       /api/campaigns/:id/timelines
GET/PUT/DELETE /api/campaigns/:id/timelines/:slug
GET/POST       /api/campaigns/:id/timelines/:slug/events
```
