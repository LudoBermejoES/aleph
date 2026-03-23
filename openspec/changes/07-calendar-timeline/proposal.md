# Proposal: Calendar & Timeline

## Why

Fantasy campaigns rarely use the Gregorian calendar. DMs need fully custom calendars with invented months, weekdays, moons, and seasons to make their world feel real. Alongside the calendar, a timeline system lets DMs track the chronological flow of events across arcs, providing both a narrative and a temporal view of the campaign's history.

## What Changes

- Implement custom calendar CRUD with fully configurable months, weekdays, and year lengths
- Add moon phase tracking with configurable cycle length and color
- Add season definitions with date ranges
- Build calendar events (one-time and recurring)
- Create a browser-rendered calendar view component for custom calendars
- Track the current in-game date per campaign
- Auto-calculate character ages based on birth date and current campaign date
- Implement timeline CRUD with events
- Build three timeline views: chronicle (narrative), Gantt (duration-based), and calendar

## Scope

### In scope
- Custom calendar definition (months, weekdays, year length, epoch name)
- Moon definitions with cycle length, phase calculation, display color
- Season definitions with start/end dates within the calendar year
- Calendar event CRUD (one-time and recurring with interval rules)
- Calendar view component that renders any custom calendar in the browser
- Current campaign date tracking and advancement
- Character age auto-calculation from birth date
- Timeline CRUD with events that have start/end dates
- Timeline views: chronicle, Gantt, calendar
- Entity linking on calendar events and timeline events

### Out of scope
- Real-world session scheduling integration
- Weather generation systems
- Astronomical simulation beyond moon phases

## Dependencies
- 01-project-setup
- 02-auth-rbac
- 03-markdown-engine
- 04-wiki-core
