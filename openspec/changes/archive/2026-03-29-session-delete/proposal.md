## Why

Sessions currently cannot be deleted — there is no `DELETE /api/campaigns/:id/sessions/:slug` endpoint, no CLI command, and no UI action. This blocks data cleanup (e.g., removing mistakenly imported sessions) and is a basic CRUD gap in session management.

## What Changes

- Add `DELETE /api/campaigns/:id/sessions/:slug` API endpoint (co_dm or above)
- Add `aleph session delete` CLI subcommand
- Add delete button to the session detail page (frontend) with confirmation dialog

## Capabilities

### New Capabilities
- `session-delete`: Delete a session by slug within a campaign — cascades to session content, attendance, rolls, and decisions

### Modified Capabilities
- `session-management`: Session CRUD now includes deletion

## Impact

- New file: `server/api/campaigns/[id]/sessions/[slug]/index.delete.ts`
- Modified: `cli/src/commands/session.js` — add `delete` subcommand
- Modified: `app/pages/campaigns/[id]/sessions/[slug]/index.vue` — add delete button + confirmation
- Modified: `app/pages/campaigns/[id]/sessions/index.vue` — optionally add delete from list view
- aleph-cli: new `session delete` command required
- Skill files (`docs/claude-skill.md`, `.claude/skills/aleph-cli/SKILL.md`) must be updated
