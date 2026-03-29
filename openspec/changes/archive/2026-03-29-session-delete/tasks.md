## 1. API — Server endpoint

- [x] 1.1 Create `server/api/campaigns/[id]/sessions/[slug]/index.delete.ts` — require co_dm role, find session by campaignId+slug (404 if not found), delete it (cascade handles child rows), return `{ success: true }`

## 2. CLI — session delete subcommand

- [x] 2.1 Add `session delete <campaignId> <slug>` subcommand to `cli/src/commands/session.js` — accepts `--yes` flag; without it prompts for confirmation; calls `DELETE /api/campaigns/:id/sessions/:slug`; prints success or error
- [x] 2.2 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` to document the new `session delete` command; bump SKILL.md version

## 3. Frontend — session detail page

- [x] 3.1 Add delete button (visible to dm/co_dm only) to `app/pages/campaigns/[id]/sessions/[slug]/index.vue`; wire it to an `AlertDialog` confirmation; on confirm call `$fetch DELETE` then `navigateTo` sessions list

## 4. Tests

- [x] 4.1 Add integration tests in `tests/integration/session-delete.test.ts` — cover: successful delete (200 + cascade), 404 on missing session, 403 for player role, 401 for unauthenticated
- [x] 4.2 Add E2E test in `tests/e2e/session-delete.spec.ts` — create a session via API, open the detail page, click delete, confirm dialog, verify redirect to sessions list and session no longer appears
