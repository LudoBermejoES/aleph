## 1. Add-participant API

- [x] 1.1 Create `server/api/campaigns/[id]/sessions/[slug]/attendance/index.post.ts` wrapped with `withApiHandler`
- [x] 1.2 Enforce `hasMinRole(role, 'co_dm')` → 403 otherwise
- [x] 1.3 Validate body with `validateBody` + Zod: `{ userId: string (min 1), characterId?: string, rsvpStatus?: enum(pending|accepted|declined|tentative) }`
- [x] 1.4 Resolve session by `(campaignId, slug)` → 404 if not found
- [x] 1.5 Verify `userId` is in `campaign_members` for this campaign → 404 if not
- [x] 1.6 If `characterId` supplied, verify its entity belongs to this campaign → 422 if not
- [x] 1.7 Upsert `session_attendance` for `(sessionId, userId)`: update if exists else insert with `rsvpStatus` default `pending`; return the row

## 2. Remove-participant API

- [x] 2.1 Create `server/api/campaigns/[id]/sessions/[slug]/attendance/[userId].delete.ts` wrapped with `withApiHandler`
- [x] 2.2 Enforce `hasMinRole(role, 'co_dm')` → 403 (before row lookup)
- [x] 2.3 Resolve session by `(campaignId, slug)` → 404 if not found
- [x] 2.4 Look up attendance row for `(sessionId, userId)` → 404 if absent
- [x] 2.5 Delete the row; return `{ success: true }`

## 3. API integration tests

- [x] 3.1 `tests/integration/session-participant-management.test.ts`: DM add participant → 200, row exists
- [x] 3.2 Add with character + status → row reflects both
- [x] 3.3 Re-add existing participant → idempotent update, no duplicate
- [x] 3.4 Player add → 403
- [x] 3.5 Add non-member userId → 404
- [x] 3.6 Add missing userId (bad body) → 422
- [x] 3.7 Add characterId from another campaign → 422
- [x] 3.8 Add to unknown session slug → 404
- [x] 3.9 DM remove participant → 200, row gone
- [x] 3.10 Remove non-participant → 404
- [x] 3.11 Player remove → 403

## 4. Frontend composables

- [x] 4.1 Add `addSessionParticipant(slug, body)` (POST attendance) to `app/composables/useSessionApi.ts`
- [x] 4.2 Add `removeSessionParticipant(slug, userId)` (DELETE attendance/:userId) to `useSessionApi.ts`
- [x] 4.3 Confirm both are surfaced through the `useCampaignApi` facade (spread of `useSessionApi`); add explicit re-export if the facade lists methods individually
- [x] 4.4 Run `npx nuxi typecheck` — zero new errors

## 5. SessionAttendancePanel UI

- [x] 5.1 Add an "Add Participant" control (button → member picker) shown only when `canManage`
- [x] 5.2 Picker lists campaign members (via `getMembers()`) excluding userIds already in `attendance`
- [x] 5.3 Selecting a member emits an `add-participant` event with the userId
- [x] 5.4 Add a per-row "Remove" control (DM-only) emitting `remove-participant` with the row's userId
- [x] 5.5 Show empty-state text when no eligible members remain to add (`noEligibleMembers`)
- [x] 5.6 In `app/pages/campaigns/[id]/sessions/[slug]/index.vue`, handle `add-participant`/`remove-participant`: call the composable methods, then refresh the session/attendance

## 6. i18n

- [x] 6.1 Add keys under `sessions.*` in `i18n/locales/en.json`: addParticipant, removeParticipant, selectMember, noEligibleMembers, participantAdded, participantRemoved
- [x] 6.2 Add the same keys with Spanish translations in `i18n/locales/es.json`

## 7. CLI

- [x] 7.1 Add `session attendance add <slug> --campaign <id> --user <userId> [--character <slug>] [--status <status>]` to `cli/src/commands/session.js`
- [x] 7.2 Add `session attendance remove <slug> --campaign <id> --user <userId>` to `cli/src/commands/session.js`
- [x] 7.3 Update `docs/claude-skill.md` with the two new commands
- [x] 7.4 Update `.claude/skills/aleph-cli/SKILL.md` to mirror, bump `version` in frontmatter

## 8. Component + E2E tests

- [x] 8.1 Unit test `tests/unit/components/session-attendance.test.ts` (extend): Add/Remove controls render only when `canManage`; correct events emitted with userId; picker excludes existing attendees
- [x] 8.2 E2E `tests/e2e/session-attendance.spec.ts` (extend): DM adds a participant via the panel → appears in the list
- [x] 8.3 E2E: DM removes a participant via the panel → disappears from the list

## 9. Final verification

- [x] 9.1 `npx vitest run tests/unit/` — all pass
- [x] 9.2 `npx vitest run tests/integration/` (server on port 3333) — all pass
- [x] 9.3 `npx playwright test tests/e2e/session-attendance.spec.ts` — pass
- [x] 9.4 `npx nuxi typecheck` — zero new errors
- [x] 9.5 CLI smoke: `node cli/bin/aleph.js session attendance --help` shows add/remove
