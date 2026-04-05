## Context

Sessions have full CRUD except delete. The `game_sessions` table has three child tables (`session_attendance`, `decisions`, `session_contents`) all with `onDelete: 'cascade'` FK constraints. SQLite `foreign_keys = ON` is set in `server/utils/db.ts`, so a single `DELETE FROM game_sessions WHERE id = ?` will cascade automatically — no manual cleanup needed (unlike the session-group delete which required manually nulling `groupId` first, because that was a nullable FK without cascade).

## Goals / Non-Goals

**Goals:**

- Add `DELETE /api/campaigns/:id/sessions/:slug` — cascades to all child records
- Add `aleph session delete <campaignId> <slug>` CLI subcommand with `--yes` flag
- Add delete button on session detail page with confirmation dialog
- Require co_dm or above (same as create/edit)

**Non-Goals:**

- Soft delete / archive — hard delete only
- Bulk delete — single session at a time
- Undo / restore

## Decisions

**Decision 1: Cascade via DB, not manual cleanup**
Foreign keys are `onDelete: 'cascade'` and `foreign_keys = ON` is set, so child rows delete automatically. No need to manually delete `session_contents`, `session_attendance`, or `decisions` rows before deleting the session. Confirmed by reading `server/utils/db.ts`.

**Decision 2: Auth — co_dm minimum**
Consistent with session create/edit and session-group delete. Players and editors cannot delete sessions.

**Decision 3: Frontend confirmation — AlertDialog, not browser confirm()**
Same pattern used for session-group delete. Uses shadcn-vue `AlertDialog` with a destructive confirm button.

**Decision 4: After delete, redirect to sessions list**
On successful delete from the session detail page, `navigateTo('/campaigns/:id/sessions')`.

**Decision 5: CLI `--yes` flag for non-interactive use**
Same pattern as `campaign delete`. Without `--yes`, prompt for confirmation in the terminal.

## Risks / Trade-offs

- [Accidental deletion] → Mitigated by confirmation dialog (FE) and `--yes` flag requirement (CLI)
- [No undo] → Acceptable for current scope; data is either imported or manually created
