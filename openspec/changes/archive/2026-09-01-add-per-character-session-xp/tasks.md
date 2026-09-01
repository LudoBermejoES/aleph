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

- [x] 7.1 `npm test` and the integration suite green — aleph's deploy is gated on both
      (`deploy: needs: [test, integration-test]`), so a red suite blocks the rsync.
- [x] 7.2 `openspec validate add-per-character-session-xp --strict`.
- [x] 7.3 **Done 2026-08-31 against production (`https://aleph.ludobermejo.es`), campaign
      `Berlin en tinieblas` (`4b2adca6-fa7e-47b9-87f9-b0a0e9c6e1e4`).** Everything through
      `node cli/bin/aleph.js`; the feature is deployed (`origin/master..master` is empty, so
      `b015614` is live, and `aleph session xp --help` lists all four flags).
      Control query first, because "0 awards" is indistinguishable from "wrong key": session
      `27-de-agosto-de-2026` answered **7 awards / 8 XP total** (Julia Kirchner 1, Liandra 1, Oda
      Weinreich 2, …) — real data, so the read path works.
      Target chosen for having an EMPTY baseline: session `30-de-agosto-de-2026` («El traje de oro»),
      `--list --json` → `[]`. 1. `session xp 30-de-agosto-de-2026 --character matthias-keller --xp 3` → «XP set to 3». 2. `session xp … --character jonas-reuter --xp 5` → «XP set to 5». **Read-modify-write proven
      live (§4.2): the second write did NOT clear the first** — `--list --json` returns BOTH,
      `Jonas Reuter 5` and `Matthias Keller 3`. 3. Read back through the **session `GET`**, not just the xp listing:
      `session show 30-de-agosto-de-2026 --json` carries `xpAwards` (the only `xp`-named key on the
      payload) with both rows complete — `characterId`, `characterName`, `characterSlug`, `xp` —
      so §2.4's "the UI needs no second call" holds against the real server. 4. `session xp … --character jonas-reuter --clear` → «XP cleared». `--list --json` → **only
      `Matthias Keller 3` survives**: the clear is per character, not per session. 5. **Baseline restored** (it is the user's real campaign): `--character matthias-keller --clear`
      → `--list --json` returns `[]`, exactly as found. Control re-checked afterwards:
      `27-de-agosto-de-2026` still 7 awards / 8 XP, untouched.
- [x] 7.4 Confirm the branch is `master`, not `main`, before expecting CI (`gh run list --branch main`
      returns empty here and reads as "CI never ran").

## 8. Cierre verificado (2026-09-01)

- [x] 8.1 **7.1 — suites verdes en CI**: run `33470965823` sobre `74d7405` con `test`,
      `integration-test` y `deploy` en éxito. El deploy de aleph va detrás de los dos primeros, así que
      un verde ahí ES la comprobación que pedía la tarea.
- [x] 8.2 **7.2 — `openspec validate --strict`** en verde.
- [x] 8.3 **7.4 — la rama es `master`**, confirmado, y la trampa que describe la tarea se reprodujo:
      `gh run list --branch main` devuelve **vacío** en este repo y se lee como «CI no ha corrido nunca».
- [x] 8.4 **7.3 — la prueba en vivo se ejecutó contra producción**, campaña de Berlín, sesión
      `30-de-agosto-de-2026` con baseline `[]`. Con control previo (`27-de-agosto`: 7 premios / 8 PX):
      Matthias 3 → Jonas 5 sin que el segundo borrara el primero, `session show --json` devolviendo las
      dos filas, `clear` de Jonas dejando a Matthias en pie, y **baseline restaurado a `[]`** con el
      control re-verificado intacto. Es la campaña real del dueño, así que se dejó exactamente como
      estaba.
