## Context

The `session_attendance` table tracks per-user RSVP and actual attendance for each session. The existing `PATCH /api/campaigns/:id/sessions/:slug/attendance` endpoint operates only on the authenticated user's own record (`userId = event.context.user.id`). There is no way for a DM to retroactively mark which players actually attended a completed session — a common need when importing session notes (manual notes always include an attendance list like "Asisten Ludo, Conchi, Pau…").

The CLI import workflow (`/importar-sesion`) needs to record attendance as part of the post-session data entry, but currently has no command to do so.

## Goals / Non-Goals

**Goals:**

- New `PUT /api/campaigns/:id/sessions/:slug/attendance/bulk` endpoint that lets a DM or co-DM set `attended` (and optionally `characterId`) for multiple campaign members at once, identified by character slug.
- New CLI subcommand `aleph session attendance mark` that accepts a list of character slugs and calls the bulk endpoint.
- Add a Paso 2c to the `importar-sesion` command documenting how to record attendance after import.

**Non-Goals:**

- UI changes (no attendance management page or component).
- Changing the existing self-RSVP endpoint.
- Support for non-member attendees (guests without a campaign account).

## Decisions

### Identify attendees by character slug, not user ID

The DM knows character names, not user UUIDs. The bulk endpoint accepts an array of character slugs; the server resolves each slug → `characterId` → `userId` via the `characters` table and the `campaignMembers` table.

**Alternative considered**: Accept `userId` directly. Rejected — the DM would need to look up user IDs separately, which is not ergonomic from the CLI or the manual notes context.

### PUT semantics (full replace for a session)

`PUT` replaces the attended state for all members listed. Members not included in the payload are left unchanged (not reset to `attended: false`). This avoids accidentally clearing RSVP data set by players themselves.

**Alternative considered**: PATCH/merge with explicit `attended: false` entries required for absences. Chosen PUT with "omit = unchanged" because the most common use case is "mark these people as present" after reading attendance from notes.

### Auth: DM or co_DM only

The bulk endpoint checks that `event.context.user` is a member with role `dm` or `co_dm` in the campaign. Players cannot use it to mark each other as attended.

### CLI: character slugs as positional args + `--absent` flag

```
aleph session attendance mark <session-slug> --campaign <id> --characters <slug,...>
aleph session attendance mark <session-slug> --campaign <id> --characters <slug,...> --absent
```

`--absent` flips the meaning to mark the listed characters as NOT attended. Default (without flag) marks them as attended.

## Risks / Trade-offs

- **Character not linked to a user**: A character may exist without a matching campaign member (e.g. NPCs, or characters created by the DM). The endpoint skips these silently and returns a list of unresolved slugs in the response so the caller knows what didn't land.
- **Duplicate attendance records**: The `session_attendance` table has a unique index on `(sessionId, userId)`. The bulk handler upserts (insert-or-update), so calling the endpoint twice is safe.
