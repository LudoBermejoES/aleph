## Context

`add-session-attendance-xp` (archived 2026-08-25) put XP on `session_attendance`, keyed
`(session_id, user_id)`. Attendance is genuinely a fact about a **person** — did Pau turn up, did
he RSVP. XP is a fact about a **character**. The original change conflated the two because they
are recorded at the same moment (end of session) by the same person (the DM), and the roster row
was already there.

Everything below rests on measurements taken against the live `berlin-en-tinieblas` campaign
before writing a line of code:

| measured                                                   | value                                     |
| ---------------------------------------------------------- | ----------------------------------------- |
| sessions in the campaign                                   | 98 (95 `general` + 3 `la-discoteca`)      |
| attendance rows with a non-NULL `xp`                       | **0**                                     |
| same user carrying different `characterId` across sessions | yes (`3wfRiWza…`: 3 different characters) |
| attendance rows with an empty `characterId`                | present (2 of 6 on 2026-08-24)            |

## Goals / Non-Goals

**Goals**

- Award XP to named characters, per session, choosing which characters receive it.
- Reachable from both the UI and the CLI.
- More than one character per player per session is representable.
- A character that is not on the attendance roster can still be awarded (downtime, off-screen).

**Non-Goals**

- Campaign or per-character XP **totals**. Still deferred, and for the reason `add-session-attendance-xp`
  gave: a total that looks authoritative and is not is worse than no total. This change makes a
  correct total _possible_ (sum by `character_id`) without shipping one.
- Spending XP, ledgers, or any link to the `wod20-char` XP economy. Separate system, separate app.
- XP penalties (negative values). Unbuilt, as before.

## Decisions

### 1. A new table, not a re-keyed `session_attendance`

**Chosen:** `session_character_xp (id, session_id, character_id, xp)`, UNIQUE `(session_id, character_id)`.

**Why:** the alternative — re-key the attendance row to `(session, character)` — would break the
thing attendance is actually for. RSVP, `attended`, and "who is coming on Thursday" are facts about
a person, and a person with no character yet (a guest, a player between characters) still has to
appear on the roster. Two facts with two different natural keys need two tables. Measured support:
attendance rows exist today with an empty `characterId`, so the character cannot be the attendance
key without losing rows.

**Rejected:** adding `session_attendance.xp2` keyed by character. Same table, two keys, permanent
confusion.

### 2. Row presence means "recorded"; `xp` is NOT NULL

**Chosen:** no nullable `xp`. A row exists ⇒ this character was awarded this much (possibly `0`).
No row ⇒ nothing recorded. Clearing is a `DELETE`.

**Why:** the old column needed a five-line schema comment to explain that `NULL` ("not recorded")
and `0` ("recorded, awarded nothing") must not be collapsed, and warned that a future `SUM` must
count only non-null rows. Modelling "recorded" as row presence makes that distinction structural
instead of a convention a future query has to remember. A `SUM` over the table is then simply
correct.

### 3. `session_attendance.xp` is dropped, not deprecated

**Chosen:** drop the column, delete its route, its UI control, its CLI command and its
`xpRequiresAttendance` i18n key.

**Why:** it is empty in every row of every session — verified by reading the live data, not
inferred from "we never used it". Leaving it would mean two places claiming to hold a session's XP,
and this repo has been bitten before by a value that is accepted and silently does nothing. If the
measurement had found even one non-NULL row, this decision would have been a migration instead, and
the tasks would carry it.

### 4. No attendance gate on a character award

**Chosen:** any character belonging to the campaign may be awarded XP for any session. The write
validates campaign membership and nothing else.

**Why:** the old rule ("XP only for `attended: true`") protected against awarding a person who was
not there. For characters the equivalent check is weaker and wronger: a character can legitimately
earn XP for a session their player attended under a different character, for downtime, or for
off-screen action the DM is settling up. The affordance the user actually asked for is _choosing_
which characters get XP — a gate that hides most of the campaign's characters fights that.

**Mitigation, in the UI rather than the schema:** the panel lists the session's own roster
characters first and pre-seeded, with everything else behind an explicit "add another character"
picker. The common case stays one click; the unusual case stays possible.

### 5. `PUT` the whole list, `DELETE` one

**Chosen:** `PUT .../xp` replaces the session's whole award set; `DELETE .../xp/:characterId`
removes one.

**Why:** end-of-session XP is entered as a batch ("everyone gets 2, Otto gets 3"), and a
whole-list write makes the UI's Save button a single atomic call with no partial-failure state to
reconcile. The per-character `DELETE` exists because the CLI needs to clear one award without
having to restate the rest — the shape that made `--clear` usable in the old command.

**Consequence to respect:** a `PUT` that omits a character **removes** its award. The endpoint
therefore replaces rather than merges, and that must be stated in the spec so a partial `PUT` is
never mistaken for a patch. The CLI's single-character form reads the current list, applies one
change, and writes it back, so `aleph session xp … --character otto --xp 3` does not wipe the rest.

## Risks / Trade-offs

- **Dropping a column is irreversible on a live DB.** Mitigated by the measurement (empty
  everywhere) and by the migration being additive-then-destructive in one step with the table
  created first. A rollback re-adds an empty column, which is exactly what it was.
- **`character_id` has no foreign key today** on `session_attendance`. The new table **does**
  reference `characters(id)` with `ON DELETE CASCADE`: deleting a character removes its awards
  rather than orphaning them. This is stricter than the column it replaces, deliberately.
- **A `PUT` that silently drops omitted characters** is the one sharp edge of decision 5. Covered
  by a spec scenario and by the CLI's read-modify-write.

## Migration Plan

1. Create `session_character_xp`.
2. Drop `session_attendance.xp` (no data copy — the source is empty; the migration asserts this by
   copying zero rows rather than by assuming).
3. Ship API + UI + CLI together. There is no window where the old route and the new table coexist,
   because the old route wrote a column that no longer exists.
