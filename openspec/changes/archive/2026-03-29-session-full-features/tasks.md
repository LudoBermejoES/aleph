## 1. API Client Methods

- [x] 1.1 Add `getSessionDecisionsWithConsequences(slug)` to `useCampaignApi.ts` — wraps existing GET decisions endpoint
- [x] 1.2 Add `createDecision(slug, body)` — POST to `/sessions/:slug/decisions`
- [x] 1.3 Add `createConsequence(slug, decisionId, body)` — POST to `/sessions/:slug/decisions/:decisionId/consequences`
- [x] 1.4 Add `revealConsequence(slug, decisionId, consequenceId, revealed)` — PATCH consequences
- [x] 1.5 Add `patchAttendance(slug, body)` — PATCH to `/sessions/:slug/attendance`
- [x] 1.6 Add `getSessionRolls(slug)` — GET to `/sessions/:slug/rolls`
- [x] 1.7 Add `getCampaignArcs()` — GET to `/api/campaigns/:id/arcs`
- [x] 1.8 Add `getArcChapters(arcSlug)` — arcs endpoint returns chapters embedded; no separate call needed

## 2. Session Detail — Decisions & Consequences

- [x] 2.1 Replace current read-only decisions timeline in `[slug]/index.vue` with a full-featured Decisions section
- [x] 2.2 Show decision type badge, title, description, and consequence list per decision
- [x] 2.3 Render hidden consequences as italic placeholder for non-DM; show full text for dm/co_dm with a "hidden" label
- [x] 2.4 Add "Add Decision" button (dm/co_dm only) that reveals an inline form with title, type select, description textarea
- [x] 2.5 Wire Add Decision form to `createDecision()` — refresh decisions list on success, hide form
- [x] 2.6 Add "Add Consequence" button per decision (dm/co_dm only) with description field and revealed toggle
- [x] 2.7 Wire Add Consequence form to `createConsequence()` — refresh on success
- [x] 2.8 Add reveal/hide toggle per consequence (dm/co_dm only) wired to `revealConsequence()`

## 3. Session Detail — Attendance

- [x] 3.1 Add Attendance section to `[slug]/index.vue` — renders existing `session.attendance` array
- [x] 3.2 Show per-attendee row: colored status dot, user name, character name if set
- [x] 3.3 Add RSVP button group for current user (pending/accepted/declined/tentative) — call `patchAttendance()` on click
- [x] 3.4 Add "attended" checkbox per attendee row visible only to dm/co_dm — call `patchAttendance()` with `{ attended }`
- [x] 3.5 Show empty state "No attendance recorded yet" when `session.attendance` is empty

## 4. Session Detail — Rolls Viewer

- [x] 4.1 Add collapsible Rolls section at bottom of `[slug]/index.vue` (collapsed by default)
- [x] 4.2 On expand, call `getSessionRolls(slug)` and show loading indicator
- [x] 4.3 Render rolls table: character, formula, total, time — ordered by most recent first
- [x] 4.4 Show "No rolls recorded for this session" when rolls array is empty

## 5. SessionForm — Arc/Chapter Linking

- [x] 5.1 In `SessionForm.vue`, fetch arcs from `getCampaignArcs()` on mount; show Arc select only if arcs.length > 0
- [x] 5.2 Add `arcId` to the form model type and v-model binding; include in submit payload
- [x] 5.3 Watch selected arcId — when changed, fetch chapters via `getArcChapters(arcId)` and reset chapterId
- [x] 5.4 Show Chapter select (conditional on arcId being set) with fetched chapters
- [x] 5.5 Add `chapterId` to the form model and v-model binding; include in submit payload
- [x] 5.6 Populate `arcId` and `chapterId` from existing session data in the edit form

## 6. i18n Keys

- [x] 6.1 Add all new i18n keys to `i18n/locales/en.json`: decisions CRUD labels, attendance labels (rsvp statuses, attended checkbox), rolls section labels, arc/chapter form labels
- [x] 6.2 Add matching keys to `i18n/locales/es.json`

## 7. CLI — session update

- [x] 7.1 Add `session update <slug>` subcommand to `cli/src/commands/session.js` with options `--title`, `--date`, `--status`, `--group`, `--campaign`
- [x] 7.2 Validate at least one option provided; print error and exit(1) otherwise
- [x] 7.3 Call `put()` on `/api/campaigns/:id/sessions/:slug` with the provided fields; print "Session updated."

## 8. CLI — session content

- [x] 8.1 Add `session content` subcommand group to `cli/src/commands/session.js`
- [x] 8.2 Implement `session content get <slug> --campaign <id> [--type ...]`: calls GET content endpoint; without `--type` prints all sections labeled; with `--type` prints raw text only
- [x] 8.3 Implement `session content set <slug> --campaign <id> --type <type> [--file <path>]`: reads from file or stdin; calls PUT content endpoint; prints "Content updated."
- [x] 8.4 Add `fs` import and stdin-reading helper in the session command file

## 9. CLI — session attendance

- [x] 9.1 Add `session attendance set <slug> --campaign <id> --status <status>` subcommand
- [x] 9.2 Validate status is one of pending/accepted/declined/tentative
- [x] 9.3 Call `patch()` on `/api/campaigns/:id/sessions/:slug/attendance` with `{ rsvpStatus }`; print "Attendance updated."
- [x] 9.4 Ensure `patch` helper exists in `cli/src/lib/client.js`; add if missing

## 10. CLI — session-group update

- [x] 10.1 Add `session-group update <slug> --campaign <id> [--name <name>] [--description <desc>]` subcommand to `cli/src/commands/session-group.js`
- [x] 10.2 Validate at least one option provided
- [x] 10.3 Call `put()` on `/api/campaigns/:id/session-groups/:slug`; print "Session group updated."

## 11. Skill File Updates

- [x] 11.1 Update `docs/claude-skill.md` to document `session update`, `session content get/set`, `session attendance set`, `session-group update`
- [x] 11.2 Mirror updates to `.claude/skills/aleph-cli/SKILL.md` and bump version to 2.2

## 12. Tests

- [x] 12.1 E2E test: DM creates a decision with a consequence, reveals it, verifies player can see it
- [x] 12.2 E2E test: Player sets RSVP on a session, verifies status indicator updates
- [x] 12.3 Integration test: `session content set` then `session content get` round-trip via CLI (or direct API)
- [x] 12.4 Unit test: `session update` CLI validates that at least one field must be provided (covered by integration test)
