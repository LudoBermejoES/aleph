# Proposal: Session Management

## Why

Sessions are the heartbeat of a campaign -- each one represents a real-world play date with scheduling, attendance, and a narrative log. DMs need tools to plan sessions, track story arcs, manage quests, and record the consequences of player decisions. This change builds the session lifecycle from scheduling through post-session logging.

## What Changes

- Implement session CRUD with scheduling and status tracking
- Build session attendance tracking with RSVP system
- Create story structure hierarchy: Arcs > Chapters linked to sessions
- Store session logs as markdown files with the content engine
- Build quest tracking with nested sub-quests, status progression, and secret quests
- Implement decision/consequence tracking inspired by Kanka's Arcana system (choice, role, count, destiny types)
- Build session list page and session detail page with log viewer

## Scope

### In scope
- Session CRUD API (create, read, update, delete, list)
- Session fields: title, date, status (planned, active, completed, cancelled), summary
- Attendance RSVP tracking per player per session
- Story arcs and chapters with session linkage
- Session logs as `.md` files rendered with MDC
- Quest CRUD with status (active, completed, failed, abandoned), nested sub-quests, secret flag
- Decision tracking with types: choice, role, count, destiny
- Consequence records linking decisions to outcomes
- Session list page with status filters and upcoming/past grouping
- Session detail page with log viewer, attendance, quests

### Out of scope
- Real-time session tools like initiative tracker (future)
- Dice rolling integration (change 13)
- Calendar integration for session dates (change 07)

## Dependencies
- 01-project-setup
- 02-auth-rbac
- 03-markdown-engine
- 04-wiki-core
