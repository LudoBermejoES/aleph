# Tasks

## 1. Schema + migration

- [x] 1.1 Add `sessionCharacterXp` to `server/db/schema/sessions.ts`: `id` (pk), `sessionId`
      (→ `gameSessions.id`, cascade), `characterId` (→ `characters.id`, cascade), `xp` integer
      NOT NULL. Unique index on `(session_id, character_id)`.
- [x] 1.2 Drop `session_attendance.xp` in the same migration, after the new table is created.
- [x] 1.3 Before writing the migration, re-run the measurement that justifies the drop
      (`SELECT COUNT(*) FROM session_attendance WHERE xp IS NOT NULL`). **If it is not 0, stop**
      and convert this task into a data migration — the design's decision 3 depends on that number.
- [x] 1.4 Generate + apply the migration; confirm it applies cleanly on a copy of the live DB.

## 2. Server

- [x] 2.1 Replace `server/utils/attendance-xp.ts` with `server/utils/session-xp.ts`: zod schema for
      `{ awards: [{ characterId, xp }] }` (non-negative integers, no duplicate `characterId`).
- [x] 2.2 `PUT /api/campaigns/[id]/sessions/[slug]/xp.put.ts` — `hasMinRole(role,'co_dm')`, validate
      every `characterId` belongs to the campaign, then replace the session's award set in one
      transaction.
- [x] 2.3 `DELETE /api/campaigns/[id]/sessions/[slug]/xp/[characterId].delete.ts` — 204 on removal,
      404 when nothing was recorded.
- [x] 2.4 `GET .../sessions/[slug]/index.get.ts` — add `xpAwards` (`characterId`, `characterName`,
      `characterSlug`, `xp`), joined so the UI needs no second call.
- [x] 2.5 Delete `attendance/[userId].patch.ts`.
- [x] 2.6 **Assert `parse(body)` deep-equals `body`** in the endpoint tests: zod strips unknown keys,
      so a passing `parse()` alone would not catch a client sending `character_id` instead of
      `characterId`.

## 3. Tests (server) — write before the code they cover

- [x] 3.1 One integration test per spec scenario in `## ADDED Requirements` (12 scenarios).
- [x] 3.2 The replace-semantics test is load-bearing: award two characters, `PUT` with only one,
      assert the other's award is **gone**.
- [x] 3.3 Mutation-check the campaign-membership validation: point a `characterId` at a character of
      another campaign and require a 422. A fixture where every character belongs to the campaign
      cannot fail this check — build the cross-campaign fixture explicitly.
- [x] 3.4 Assert the removed route is gone (`PATCH .../attendance/:userId` → 404/405), so its
      deletion is covered and not merely assumed.

## 4. CLI

- [x] 4.1 `aleph session xp <slug> --campaign <id>` with `--character`, `--xp`, `--clear`, `--list`.
- [x] 4.2 Single-character writes are **read-modify-write** against the current award list, per
      spec — a `--character X --xp N` call must not clear the other characters.
- [x] 4.3 Refuse `--character` with neither `--xp` nor `--clear`, non-zero exit, no request sent.
- [x] 4.4 Remove `aleph session attendance xp`.
- [x] 4.5 Update the endpoint-parity check and `cli/README.md`.

## 5. Frontend

- [x] 5.1 New `app/components/SessionXpPanel.vue`: roster characters seeded from `attendance`,
      number input each, add-character picker over the campaign's characters, remove-row control.
- [x] 5.2 Wire it into the session detail page; save issues one `PUT`, then refresh.
- [x] 5.3 Remove the XP input from `SessionAttendancePanel.vue`.
- [x] 5.4 Hide the whole panel below `co_dm`.

## 6. i18n

- [x] 6.1 Add `sessions.xpAwards`, `sessions.xpAddCharacter`, `sessions.xpNoAwards`,
      `sessions.xpUnknownCharacter` to `en.json` **and** `es.json`.
- [x] 6.2 Remove `sessions.xpRequiresAttendance`; grep the tree for it and for `attendance.xp`
      before deleting, so no template is left pointing at a missing key.

## 7. Verify

- [ ] 7.1 `npm test` and the integration suite green — aleph's deploy is gated on both
      (`deploy: needs: [test, integration-test]`), so a red suite blocks the rsync.
- [ ] 7.2 `openspec validate add-per-character-session-xp --strict`.
- [ ] 7.3 Live smoke test against a real session: award two characters, read them back through
      `GET`, clear one through the CLI, confirm the other survives.
- [ ] 7.4 Confirm the branch is `master`, not `main`, before expecting CI (`gh run list --branch main`
      returns empty here and reads as "CI never ran").
