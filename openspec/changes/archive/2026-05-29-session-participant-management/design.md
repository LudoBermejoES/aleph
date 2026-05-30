## Context

`session_attendance` keys on `userId` (FK to `user`), with optional `characterId`, `rsvpStatus`, and `attended`, unique on `(sessionId, userId)`. Existing endpoints: `PATCH .../attendance` (self-service RSVP, current user only) and `PUT .../attendance/bulk` (DM marks characters attended via slug→ownerUserId resolution). The session GET joins attendance to `user` to return `{ id, userId, userName, characterId, rsvpStatus, attended }`. The campaign members endpoint (`GET .../members`) returns `{ userId, name, role }`. This change adds DM roster management on top, with no schema change.

## Goals / Non-Goals

**Goals:**

- DM/co_dm can add a campaign member as a session participant (idempotent).
- DM/co_dm can remove a participant from a session.
- Member picker in the UI shows only members not already attending.
- Reuse `hasMinRole`, `validateBody` (Zod), `withApiHandler`.

**Non-Goals:**

- No schema change (attendance stays keyed on `userId`).
- No change to self-service RSVP (`PATCH`) or bulk-attended (`PUT bulk`).
- No notification/email when a participant is added.
- No support for adding a non-member user (must already be a campaign member).

## Decisions

### 1. Add = `POST .../attendance`, Remove = `DELETE .../attendance/:userId`

The collection POST mirrors REST conventions and sits beside the existing `PATCH .../attendance` (self) and `PUT .../attendance/bulk` (DM). Keying remove on `:userId` (not an attendance row id) matches how attendance is uniquely identified `(sessionId, userId)` and avoids the client needing to look up the row id. **Alternative:** a single `PUT .../attendance/:userId` upsert — rejected because add and remove want distinct permission/validation messaging and the DELETE verb is clearer for removal.

### 2. Add is idempotent (upsert), not 409-on-duplicate

A DM re-adding an existing participant should not error. If a row for `(sessionId, userId)` exists, update its `characterId`/`rsvpStatus` from the body (when provided) and return the row; otherwise insert with `rsvpStatus` defaulting to `pending`. Mirrors the bulk endpoint's existing upsert behavior. **Alternative:** 409 Conflict — rejected; worse UX for a roster tool and inconsistent with bulk.

### 3. Validation: member + character ownership checked server-side

`userId` must be a row in `campaign_members` for this campaign → else 404 ("User is not a campaign member"). If `characterId` is supplied, it must be a character whose entity belongs to this campaign → else 422. `rsvpStatus`, if supplied, must be one of `pending|accepted|declined|tentative`. Body shape validated by Zod via `validateBody` (422 on shape errors). **Alternative:** trust the client — rejected; the endpoint is DM-privileged and writes FK columns, so server validation is required.

### 4. Remove returns 404 when no attendance row exists

`DELETE .../attendance/:userId` looks up `(sessionId, userId)`; if absent, 404 ("Participant not on this session"). Keeps the operation honest rather than silently succeeding. Permission check (`co_dm`+) runs before the lookup so a non-DM gets 403 regardless of whether the row exists.

### 5. UI member picker: client-side filter of existing members endpoint

The panel already receives the attendance list; the picker fetches `getMembers()` (already in the composable) and filters out members whose `userId` is already in attendance. No new "eligible members" endpoint needed. Selecting a member calls `addSessionParticipant` then the page refreshes attendance (re-fetch session). **Alternative:** a dedicated eligible-members endpoint — unnecessary; the lists are small and already available.

### 6. Composables added to `useSessionApi`, surfaced via `useCampaignApi` facade

Consistent with the recent composable split: domain methods live in `useSessionApi.ts`; the `useCampaignApi` facade spreads them so existing call sites keep working.

## Risks / Trade-offs

- **[Risk] Picker shows members but a member may own no character** → Mitigation: `characterId` is optional on add; a participant can be added by user alone. The picker lists members (users), not characters.
- **[Risk] Race: two DMs add the same member concurrently** → Mitigation: idempotent upsert keyed on the unique `(sessionId, userId)`; second write updates rather than duplicating.
- **[Risk] Removing a participant loses their recorded `attended`/RSVP history** → Mitigation: acceptable for a roster tool; removal is an explicit DM action. (No soft-delete planned.)
- **[Risk] CLI `--user <userId>` requires knowing the raw userId** → Mitigation: document that `aleph member list` surfaces userIds; consistent with how other CLI commands reference ids.

## Migration Plan

No DB migration. Ship API endpoints first (with integration tests), then composables, then UI, then CLI + docs. Each layer is independently testable. Rollback is removing the new endpoints/UI — no data migration to reverse.

## Open Questions

- Should adding a participant default `rsvpStatus` to `pending` or `accepted`? (Decision: `pending`, since the DM is inviting, not RSVPing for them — the player can still set their own status. The body may override.)
