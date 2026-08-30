## Why

XP in this app is recorded **per player, per session** — `session_attendance.xp`, written through
`PATCH .../attendance/:userId`. That is the wrong unit. In every system this app is used for, XP
belongs to a **character**, not to the person holding the dice.

The gap is not theoretical, and the data says so:

- **The field has never been used.** Across the 98 sessions of `berlin-en-tinieblas`, every
  `session_attendance.xp` is `NULL`. Nothing has ever been recorded through it.
- **Players already switch characters between sessions.** The same user (`3wfRiWza…`) carries
  `characterId 2485385e…` on 2026-08-27, `9c24fafb…` on 2026-08-24 and again on 2025-07-26. One XP
  number per (session, user) cannot say which of those characters earned what.
- **A player can field more than one character in a session**, and `session_attendance` cannot
  represent it at all: its index is `(session_id, user_id)`, one row per person.
- Some attendance rows carry **no `characterId`** at all (measured: 2 of 6 on 2026-08-24), so the
  existing column is not a usable key even as a tag.

`add-session-attendance-xp`'s own `design.md` decision 4 saw the edge — it deferred campaign
totals partly because they would have to "account for a character switching hands" — but deferred
the **total** while keeping the **key**. This change fixes the key.

## What Changes

- **Schema**: new table `session_character_xp` — `(id, session_id, character_id, xp)`, UNIQUE on
  `(session_id, character_id)`, `xp` a NOT NULL non-negative integer. **A row's existence means
  "recorded"**; deleting it means "not recorded". This removes the NULL-vs-0 ambiguity the old
  column needed a paragraph of schema comment to explain.
- **Schema (removal)**: `session_attendance.xp` is **dropped**. It is safe to drop rather than
  deprecate precisely because it is empty everywhere — verified, not assumed. Keeping both would
  leave two competing answers to "how much XP did this session award", which is the ambiguity this
  change exists to end.
- **API**:
  - `PUT /api/campaigns/:id/sessions/:slug/xp` — set the whole per-character award list for a
    session in one call (`{ awards: [{ characterId, xp }] }`), replacing what was there.
  - `DELETE /api/campaigns/:id/sessions/:slug/xp/:characterId` — clear one character's award.
  - `GET .../sessions/:slug` grows an `xpAwards` array alongside `attendance`.
  - Gated exactly like the attendance writes: `hasMinRole(role, 'co_dm')`.
  - **Removed**: `PATCH .../attendance/:userId` (the per-user XP route).
- **Frontend**: a session's detail page gets an **XP panel** listing the characters that appear in
  that session's attendance roster, each with a number input, plus a picker to add any other
  campaign character. This is the "choose which characters got XP" affordance the current UI has no
  way to express. The per-row XP input on `SessionAttendancePanel.vue` is removed.
- **CLI**: `aleph session xp <slug> --campaign <id> --character <slug> --xp <n>`,
  `--clear` to remove one, and `aleph session xp <slug> --campaign <id> --list` to read them.
  **Removed**: `aleph session attendance xp`.
- **i18n**: new `sessions.xpAwards`, `sessions.xpAddCharacter`, `sessions.xpNoAwards`,
  `sessions.xpUnknownCharacter` in `en.json`/`es.json`; the now-unused `sessions.xpRequiresAttendance`
  is removed.

## Impact

- Affected specs: `session-participant-management`
- Affected code: `server/db/schema/sessions.ts`, a new migration, `server/api/campaigns/[id]/sessions/[slug]/`
  (new `xp` routes, deleted `attendance/[userId].patch.ts`), `server/utils/attendance-xp.ts` →
  `server/utils/session-xp.ts`, `app/components/SessionAttendancePanel.vue`, a new
  `SessionXpPanel.vue`, the session detail page, `cli/`, `i18n/`.
- **No data migration**: the dropped column holds no values.
