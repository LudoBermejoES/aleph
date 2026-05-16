## 1. Server — Bulk Attendance Endpoint

- [x] 1.1 Create `server/api/campaigns/[id]/sessions/[slug]/attendance/bulk.put.ts` with auth check (dm or co_dm only)
- [x] 1.2 Implement character slug → userId resolution: look up each slug in the `characters` table, then find the matching `campaignMembers` row
- [x] 1.3 Upsert each resolved `session_attendance` row (insert if absent, update if exists) with the provided `attended` value and `characterId`
- [x] 1.4 Collect unresolved slugs and return `{ updated: n, unresolved: [...] }` in the response

## 2. Server — Tests

- [x] 2.1 Write integration test: DM can mark attendees → returns 200, rows updated
- [x] 2.2 Write integration test: player gets 403
- [x] 2.3 Write integration test: unknown slug appears in `unresolved`, no error thrown
- [x] 2.4 Write integration test: calling endpoint twice is idempotent

## 3. CLI — `session attendance mark` Command

- [x] 3.1 Add `mark <session-slug>` subcommand under the existing `attendance` command group in `cli/src/commands/session.js`
- [x] 3.2 Accept `--campaign <id>`, `--characters <slug,...>` (required), `--absent` (flag), `--json` options
- [x] 3.3 Parse `--characters` as comma-separated list and build the request body `{ attendees, attended }`
- [x] 3.4 Call `PUT /api/campaigns/:id/sessions/:slug/attendance/bulk` and print result
- [x] 3.5 Print warning line for each slug in `unresolved`
- [x] 3.6 Exit with code 1 if `--characters` is missing

## 4. CLI — Docs & Skill Files

- [x] 4.1 Update `docs/claude-skill.md` to document `session attendance mark`
- [x] 4.2 Update `.claude/skills/aleph-cli/SKILL.md` to mirror the same entry

## 5. Import Command — Paso 2c

- [x] 5.1 Add Paso 2c to `.claude/commands/importar-sesion.md`: extract attendee list from manual notes or ai notes, map names to character slugs, run `session attendance mark`
