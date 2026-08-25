## Context

`session_attendance` (`server/db/schema/sessions.ts:89`) is keyed on `(sessionId, userId)`,
unique per that pair, and already carries `attended: boolean` (default `false`) plus
`rsvpStatus`. Three write paths touch it today:

- `PATCH .../attendance` (self-service RSVP/attended for the **caller only** — its zod schema
  has no `userId` field, so a `userId` in the request body is silently stripped by
  `schema.parse()` and the handler always resolves the row via `event.context.user.id`. This is
  a real, pre-existing bug: `SessionAttendancePanel.vue`'s per-row "Attended" checkbox emits
  `set-attended(userId, attended)` for _any_ row, and the page's handler forwards that `userId`
  in the body, but the endpoint ignores it and flips the **caller's own** row instead. Not fixed
  by this change — see Risks below.)
- `POST .../attendance` (DM/co-DM add-or-update-participant by `userId` in the body, `hasMinRole`
  gated).
- `PUT .../attendance/bulk` (DM/co-DM bulk-mark `attended` by character slug, `hasMinRole`
  gated).
- `DELETE .../attendance/:userId` (DM/co-DM remove, `hasMinRole` gated, target keyed by the URL
  param, not the body).

`GET .../sessions/:slug` projects the whole `session_attendance` table for that session —
`{ id, userId, userName, characterId, rsvpStatus, attended }` — to any caller who can view the
session at all. There is no per-row or per-field visibility filtering anywhere in this
projection.

## Goals / Non-Goals

**Goals:**

- Let a DM/co-DM record (or clear) an XP value for one participant of one session.
- Make the "did they actually attend" question and the "how much XP" question consistent by
  construction, not by convention — an inconsistent state should be rejected at the boundary,
  not just discouraged in a comment.
- Distinguish "not recorded" from "recorded as zero" in storage and API, permanently.
- Reuse the exact permission gate the sibling attendance-roster endpoints already use.

**Non-Goals:**

- No campaign-wide or per-user XP total (deferred, see Decision 4).
- No fix for the pre-existing self-service-PATCH `userId`-ignored bug described in Context. It
  predates this change, it's in a different write path (self-service RSVP, not DM-privileged
  roster management), and fixing it would need its own permission-model decision (should a
  player's own PATCH be allowed to touch someone else's row at all? almost certainly not) that
  is out of scope here.
- No negative-XP ("penalty") feature.
- No per-row visibility narrowing (e.g. "players see only their own XP") — see Decision 5.

## Decisions

### 1. XP requires `attended: true` — enforced at the write boundary, not just in the UI

**Chosen:** a non-null `xp` value is rejected with 422 unless the target's `session_attendance`
row already has `attended: true`. `xp: null` (clearing a value) is always allowed regardless of
`attended`, since clearing is a correction, not an award.

**Why:** the alternative — allowing XP for a non-attendee — is a real house-rule some tables use
(story awards, "you get participation credit even if you missed it"), so it isn't self-evidently
wrong. But this project has hit the _reverse_ failure four times already: a client-visible
control that the server's validation schema silently doesn't declare, so the write is dropped
without the caller ever finding out (`CLAUDE.md`'s standing warning, and concretely the
`patchAttendance` `userId`-drop bug rediscovered in Context above). The fix pattern that avoids
that class of bug is to make illegal states loud, not silent — so I picked the stricter rule and
enforced it as a 422 in the same handler that persists the value, then gated the UI control on
the exact same predicate (`a.attended`) so the two can't drift apart. If a future table wants
"XP for absentees," that's a deliberate schema/rule change, not a state this endpoint tolerates
by accident.

**Rejected:** silently allowing XP regardless of `attended` — rejected because a DM correcting a
missed attendance-mark later could accumulate XP that was never actually validated against
attendance at all, and there would be no signal that anything was off.

### 2. `xp` is nullable with no default; NULL and 0 mean different things

**Chosen:** `xp: integer('xp')` — no `.notNull()`, no `.default()`. `NULL` = "not recorded yet".
`0` = "the DM explicitly recorded that this attendee earned nothing." A future total (see
Decision 4, if ever built) MUST `SUM` only non-null rows and separately report how many
attendance rows for that user have a null `xp`, so "no data yet" is never silently reported as
"earned zero."

**Why:** a `DEFAULT 0` looks harmless until the first aggregate query is written — at that point
every session that was never touched by this feature (including every session that predates it)
reads as "0 XP awarded," indistinguishable from "the DM actually gave zero." That is exactly the
kind of fact-collapse the task description calls out, and it can't be undone later without a
data migration that has to guess which zeros were real. Nullable costs nothing today and avoids
that migration later.

### 3. Negative values are refused

**Chosen:** `z.number().int().nonnegative().nullable()` (`server/utils/attendance-xp.ts`) —
integer, `>= 0`, or `null`. Fractional and negative values both fail validation with 422.

**Why:** WoD20 XP awards are always whole, non-negative numbers; a negative value would only ever
represent a penalty/deduction, which is a different, unbuilt feature (its own semantics: does it
floor at 0? can a total go negative? is it logged separately for an audit trail?). Refusing it
now keeps the door open to add that deliberately later instead of it falling out of an unvalidated
number field by accident.

### 4. No total anywhere — deferred, not half-built

**Chosen:** this change stores and surfaces exactly one number per `(session, user)`. No
endpoint, composable, or UI adds up XP across sessions for a character or campaign.

**Why:** "how much XP has Pau earned across the campaign" is the obvious next question, but
answering it well needs a decision this change shouldn't make in passing: does it sum
`session_attendance.xp` directly, or does it need to account for a character switching hands, a
session being deleted, or a future spend/ledger concept? Building a naive `SUM` now and calling
it a "total" would ship something that looks authoritative and isn't, which is a worse trap than
not having it. Left as a clearly separate follow-up change once there's a concrete need (e.g. a
character sheet or campaign-summary requirement) to shape it against.

### 5. Who may write, and who may see it

**Write gate — chosen:** `hasMinRole(role, 'co_dm')`, identical to `POST`/`DELETE
.../attendance` (and the bulk `PUT`). No new, looser gate. Rejected: allowing a player to record
their own XP via the self-service `PATCH .../attendance` path — XP is a DM judgment call, not a
self-report, and adding it to that endpoint's schema would let _any_ authenticated campaign
member set their own arbitrary XP (that endpoint has no role check at all — it only scopes to
the caller's own row, which is precisely why XP must NOT be added to it).

**Visibility — chosen, explicitly, not left to fall out of the code:** the existing attendance
projection in `GET .../sessions/:slug` has no per-role filtering on any field — every campaign
member who can view the session already sees every other participant's `attended` and
`rsvpStatus`. `xp` is added to that same unfiltered response, so every viewer of the session sees
every participant's XP, not just their own.

**Why not narrower:** a "players see only their own XP" rule would be the first per-field,
per-role visibility filter anywhere in this codebase's session data — there is no existing
mechanism to reuse (the `VISIBILITY_MIN_ROLE` machinery in `server/utils/permissions.ts` gates
whole _entities_, not individual fields of a joined row), so building one here would be new
infrastructure justified by a single field, for a change whose owner asked for the recording
capability, not a privacy model. If per-player XP privacy turns out to matter, it's a deliberate
follow-up with its own design (and it would need to solve the same problem for `attended` and
`rsvpStatus`, which are already broadcast the same way today).

## Risks / Trade-offs

- **[Known, not fixed] The self-service `PATCH .../attendance` endpoint ignores a `userId` in
  its body.** Discovered while reading the write paths for this change (Context above). It means
  the _existing_ "Attended" checkbox in `SessionAttendancePanel.vue`, when a DM clicks it for a
  row that isn't their own, currently flips the DM's own attendance instead of the target row's.
  This change does not touch that endpoint or that checkbox's wiring — the new XP control reads
  `a.attended` from the (correctly populated) `GET` response, so it is not fooled by the bug, and
  writes through a different, correctly-target-scoped endpoint (`PATCH
.../attendance/:userId`). In practice, today, the reliable way for a DM to mark someone
  _else's_ attendance is `PUT .../attendance/bulk` (by character slug) or `POST .../attendance`
  (`characterId`/`rsvpStatus` only, not `attended`) — not the per-row checkbox. Flagged for a
  separate fix; out of scope here.
- **[Accepted] XP is visible to every viewer of the session, including other players.** See
  Decision 5. Mitigation: none needed unless a future requirement says otherwise.
- **[Accepted] No audit trail of who set/changed an XP value or when.** Consistent with the rest
  of `session_attendance` (attendance/RSVP changes aren't audited either); out of scope.

## Migration Plan

Additive column (`ALTER TABLE session_attendance ADD xp integer`, nullable, no default) —
zero-downtime, no backfill needed since `NULL` is exactly the correct value for every existing
row ("not recorded"). Generated via `npx drizzle-kit generate`
(`server/db/migrations/0036_normal_speed.sql`), applied automatically at boot like every other
migration in this project. Rollback is dropping the column and the new route; no data to
reconcile since nothing downstream depends on `xp` existing.
