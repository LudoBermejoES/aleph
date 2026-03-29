## Why

The session system has a rich backend (attendance tracking, decisions & consequences, content types, rolls, arc/chapter linking) but the frontend and CLI only expose a fraction of it. Users currently cannot manage decisions/consequences, update attendance RSVP, view session rolls, or update session content from the CLI — features that are already fully implemented server-side.

## What Changes

- **Decisions & Consequences UI**: Add UI to create decisions and consequences on the session detail page; DMs can reveal/hide individual consequences
- **Attendance RSVP UI**: Allow users to set their own RSVP status (accepted/declined/tentative) and DMs to mark actual attendance; display colored per-character attendance on session detail
- **Session Rolls Viewer**: Show the last dice rolls from a session on the session detail page (read-only, from `/sessions/{slug}/rolls`)
- **Arc/Chapter linking UI**: Add arc/chapter pickers to SessionForm for linking sessions to story arcs
- **CLI: content subcommand**: `session content get <slug>` / `session content set <slug> --type manual_notes|ai_notes|summary --file <path>` to read and write session notes from the terminal
- **CLI: attendance subcommand**: `session attendance set <slug> --campaign <id> --status accepted|declined|tentative` for players to RSVP
- **CLI: session update**: `session update <slug> --campaign <id> [--title] [--date] [--status] [--group]` to update session metadata without opening the browser
- **CLI: session-group update**: `session-group update <slug> --campaign <id> --name <name>` (currently missing despite API support)

## Capabilities

### New Capabilities

- `session-decisions-ui`: Create and manage decisions and consequences in the session detail page, with DM-only consequence reveal toggle
- `session-attendance-ui`: RSVP and actual attendance tracking UI on session detail page
- `session-rolls-viewer`: Read-only dice roll history displayed in session detail
- `session-arc-chapter-linking`: Arc and chapter pickers in SessionForm

### Modified Capabilities

- `session-cli`: Adds `content`, `attendance`, and `update` subcommands; session-group gets `update` subcommand

## Impact

- `app/pages/campaigns/[id]/sessions/[slug]/index.vue` — major additions: decisions CRUD section, attendance RSVP section, rolls viewer
- `app/components/forms/SessionForm.vue` — add arc/chapter selects
- `app/composables/useCampaignApi.ts` — add missing client methods (decisions CRUD, attendance patch, rolls GET, arcs/chapters GET)
- `cli/src/commands/session.js` — add `content`, `attendance`, `update` subcommands
- `cli/src/commands/session-group.js` — add `update` subcommand
- `cli/src/lib/client.js` — add `patch` helper if missing
- `docs/claude-skill.md` + `.claude/skills/aleph-cli/SKILL.md` — update CLI reference
- No new API endpoints or schema changes needed — all backend is already in place
