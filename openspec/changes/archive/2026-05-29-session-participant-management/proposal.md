## Why

A DM cannot add or remove participants to/from a game session through the UI. Today the session attendance UI only lets each user toggle their **own** RSVP and lets a DM mark existing attendees as "attended". To pre-populate a session with expected players, or to correct the roster, a DM must use the CLI bulk endpoint (which only marks attendance and cannot remove anyone). DMs need a direct, in-app way to manage the participant roster.

## What Changes

- **Add-participant API**: `POST /api/campaigns/:id/sessions/:slug/attendance` (DM/co_dm only) creates an attendance row for a given campaign member; idempotent (updates if a row already exists for that user). Validates the user is a campaign member and any supplied character belongs to the campaign.
- **Remove-participant API**: `DELETE /api/campaigns/:id/sessions/:slug/attendance/:userId` (DM/co_dm only) deletes that user's attendance row for the session.
- **Composables**: `addSessionParticipant(slug, body)` and `removeSessionParticipant(slug, userId)` in `useSessionApi.ts`, re-exported via the `useCampaignApi` facade.
- **UI**: `SessionAttendancePanel.vue` gains (DM-only, gated by existing `canManage`) an "Add Participant" picker of campaign members not already attending, and a per-row "Remove" control. The session detail page wires the new events and refreshes attendance after add/remove.
- **CLI**: `session attendance add` and `session attendance remove` subcommands.
- **i18n**: new keys (addParticipant, removeParticipant, selectMember, noEligibleMembers, …) in `en.json` and `es.json`.

## Capabilities

### New Capabilities

- `session-participant-management`: DM/co_dm add and remove session participants via API, UI, and CLI; covers permission rules, validation, idempotency, and the participant-picker UX.

### Modified Capabilities

- _(none — `dm-session-attendance` covers DM bulk-marking attendance; this is additive roster management and does not change that capability's existing requirements.)_

## Impact

**Server API** (`server/api/campaigns/[id]/sessions/[slug]/attendance/`): new `index.post.ts` (add) and `[userId].delete.ts` (remove), both wrapped with `withApiHandler` and validated with `validateBody`/Zod, reusing `hasMinRole`.

**Frontend** (`app/`): `composables/useSessionApi.ts` (+2 methods), `composables/useCampaignApi.ts` facade (re-export), `components/sessions/SessionAttendancePanel.vue` (add/remove controls + member picker), `pages/campaigns/[id]/sessions/[slug]/index.vue` (event handlers + refresh).

**aleph-cli** (`cli/src/commands/session.js`): `attendance add` and `attendance remove` subcommands; mirror in `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` (bump version).

**i18n** (`i18n/locales/en.json`, `es.json`): new attendance/participant keys.

**Tests**: new integration tests for the two endpoints (permission, idempotency, validation, not-found); unit tests for the panel's new controls; E2E for add/remove via the UI. No DB schema change — attendance stays keyed on `userId`.
