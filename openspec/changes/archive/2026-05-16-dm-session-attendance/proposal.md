## Why

Session attendance is currently self-reported: each user can only mark their own RSVP via `PATCH /api/campaigns/:id/sessions/:slug/attendance`. The DM has no way to record who actually attended a completed session — a key piece of campaign history that the CLI import workflow needs (manual notes always list who attended).

## What Changes

- New server endpoint: `PUT /api/campaigns/:id/sessions/:slug/attendance/bulk` — allows a DM or co-DM to set the attendance (`attended: true/false`, optional `characterId`) for any list of campaign members by user ID or character slug.
- New CLI command: `aleph session attendance set-bulk` (or `session attendance mark`) — lets the DM mark multiple attendees at once, by character slug, from the terminal.
- Update the `importar-sesion` command documentation to include an attendance-recording step.

## Capabilities

### New Capabilities

- `dm-session-attendance`: DM-controlled bulk attendance recording — server endpoint + CLI command to mark which users/characters attended a given session.

### Modified Capabilities

- `session-management`: The attendance section of the session API gains a new bulk-write endpoint accessible to DMs (not just the authenticated user themselves).
- `aleph-cli`: New `session attendance mark` subcommand.

## Impact

- **Server**: New route `server/api/campaigns/[id]/sessions/[slug]/attendance/bulk.put.ts`. Auth check: requester must be DM or co-DM of the campaign.
- **CLI**: New subcommand in `cli/src/commands/session.js` under the existing `attendance` command group.
- **Tests**: Integration test for the new endpoint; unit test for the CLI command.
- **importar-sesion command**: Add Paso 2c to record attendance after importing notes.
