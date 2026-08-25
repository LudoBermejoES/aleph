## Why

A DM can mark who attended a session (`attended: true/false` on `session_attendance`, via the
bulk endpoint or the per-participant roster endpoints) but has no way to record what each
attendee earned for being there. "I gave Pau 2 XP this session, Sugus 1" is a routine
end-of-session action with nowhere to go today except the DM's own notes — it does not live
next to the attendance record it's actually about.

## What Changes

- **Schema**: `session_attendance` gains a nullable `xp` integer column (migration
  `0036_normal_speed.sql`). No default: `NULL` means "not recorded", `0` means "recorded,
  awarded nothing" — collapsing those with a `DEFAULT 0` would make any future per-user total
  silently count every un-awarded session as zero.
- **API**: `PATCH /api/campaigns/:id/sessions/:slug/attendance/:userId` (new route, sibling of
  the existing `DELETE` on the same path) lets a DM or co-DM set or clear a participant's XP.
  Gated identically to `POST`/`DELETE .../attendance` (`hasMinRole(role, 'co_dm')`). A non-null
  `xp` is rejected with 422 unless the target's attendance row already has `attended: true`;
  `xp: null` (clearing a mistaken entry) is always allowed. Negative or fractional values are
  rejected by the request schema.
- **Frontend**: `SessionAttendancePanel.vue` gets a small number input next to the existing
  "Attended" checkbox on each row (visible/enabled only once that row is marked attended,
  mirroring the server rule so the UI never offers an action the endpoint will refuse). The
  session detail page wires a new `set-xp` event to the new endpoint and refreshes.
- **CLI**: `aleph session attendance xp <slug> --campaign <id> --user <userId> (--xp <n> |
--clear)`.
- **i18n**: new `sessions.xp`, `sessions.xpNotRecorded`, `sessions.xpRequiresAttendance` keys in
  `en.json`/`es.json`.
- **Explicitly deferred**: a per-user "total XP across the campaign" view/endpoint. This change
  only stores and surfaces one number per (session, user). See design.md's Decision 4.

## Capabilities

### Modified Capabilities

- `session-participant-management`: gains a new requirement for recording per-participant XP,
  using the same target-by-`userId` routing and `co_dm`+ gate as the existing add/remove
  requirements in that capability.

## Impact

- **Server**: new route
  `server/api/campaigns/[id]/sessions/[slug]/attendance/[userId].patch.ts`; new shared
  validation module `server/utils/attendance-xp.ts` (zod schema + the
  attended-before-XP rule, so the endpoint and its unit test read the same rule); `xp` added to
  the attendance projection in `.../[slug]/index.get.ts` GET.
- **Schema/migration**: `server/db/schema/sessions.ts` (`sessionAttendance.xp`), generated
  migration `server/db/migrations/0036_normal_speed.sql`.
- **Frontend**: `app/composables/useSessionApi.ts` (+`setSessionAttendanceXp`, re-exported via
  the existing `useCampaignApi` spread), `app/components/sessions/SessionAttendancePanel.vue`
  (new control + `set-xp` emit), `app/pages/campaigns/[id]/sessions/[slug]/index.vue` (handler +
  refresh).
- **CLI**: `cli/src/commands/session.js` (+`attendance xp` subcommand); `docs/claude-skill.md`
  and `.claude/skills/aleph-cli/SKILL.md` updated together (local skill version bumped).
- **Tests**: unit tests for the shared validation rule (attended-gate, null-vs-zero, negative
  rejection) and for the CLI command's flag handling; integration tests for the endpoint
  (permission gate, 404s, the 422 attendance precondition, idempotent set, clear-to-null);
  component test extension for the panel's conditional rendering.
- **Visibility, stated explicitly rather than left to default**: the existing `GET
.../sessions/:slug` attendance projection has no per-field, per-role filtering — every
  campaign member who can view the session already sees everyone's `attended`/`rsvpStatus`.
  `xp` is added to that same unfiltered projection, so it inherits the same visibility: any
  player who can see the session can see every participant's XP, not just their own. No new
  visibility mechanism is introduced to narrow this — none exists elsewhere in the codebase to
  reuse, and building one is out of scope for this change.
