## 1. Schema & Migration

- [x] 1.1 Add nullable `xp` integer column (no default) to `sessionAttendance` in
      `server/db/schema/sessions.ts`
- [x] 1.2 Generate the migration with `npx drizzle-kit generate` (do not hand-write SQL) —
      produced `server/db/migrations/0036_normal_speed.sql`
- [x] 1.3 Confirm the migration is a single additive `ALTER TABLE ... ADD xp integer` with no
      backfill needed (NULL is already correct for every existing row)

## 2. Shared validation

- [x] 2.1 Create `server/utils/attendance-xp.ts`: `attendanceXpSchema` (zod: `xp` required,
      `int().nonnegative().nullable()`) and `canSetAttendanceXp(attended, xp)` (true if
      `xp === null` or `attended === true`)
- [x] 2.2 Unit test `tests/unit/server/attendance-xp.test.ts`: schema accepts `0`, positive
      integers, and `null`; rejects negative, fractional, and a missing `xp` key;
      `canSetAttendanceXp` table-driven over `{attended, xp}` combinations including the
      null-vs-zero distinction

## 3. Server — XP endpoint

- [x] 3.1 Create `server/api/campaigns/[id]/sessions/[slug]/attendance/[userId].patch.ts`,
      wrapped with `withApiHandler`
- [x] 3.2 Enforce `hasMinRole(role, 'co_dm')` → 403 (checked before any DB lookup, mirroring
      `[userId].delete.ts`)
- [x] 3.3 Validate body with `validateBody(event, attendanceXpSchema)`
- [x] 3.4 Resolve session by `(campaignId, slug)` → 404 if not found
- [x] 3.5 Resolve attendance row by `(sessionId, userId)` → 404 if absent
- [x] 3.6 Apply `canSetAttendanceXp` → 422 if a non-null `xp` is requested for a
      non-`attended` row
- [x] 3.7 Update `xp` on the row; return `{ success: true, xp }`
- [x] 3.8 Add `xp: sessionAttendance.xp` to the attendance projection in
      `server/api/campaigns/[id]/sessions/[slug]/index.get.ts`

## 4. Server integration tests

- [x] 4.1 `tests/integration/session-attendance-xp.test.ts`: DM sets XP on an attended
      participant → 200, `GET` reflects it
- [x] 4.2 co_dm can also set XP
- [x] 4.3 Player gets 403
- [x] 4.4 Unauthenticated request gets 401
- [x] 4.5 Setting non-null XP on a non-attended row → 422, value unchanged
- [x] 4.6 Clearing XP (`xp: null`) on a non-attended row → 200, succeeds
- [x] 4.7 Negative XP → 422; fractional XP → 422; missing `xp` key → 422
- [x] 4.8 Unknown `userId` (no attendance row) → 404
- [x] 4.9 Unknown session slug → 404
- [x] 4.10 Setting the same XP value twice → idempotent, both 200
- [x] 4.11 A fresh attendance row (never touched by this feature) reports `xp: null` from `GET`,
      not `0`
- [x] 4.12 A second, non-DM campaign member can `GET` the session and see another participant's
      recorded `xp` (documents the visibility decision, not a bug)

## 5. Frontend composable

- [x] 5.1 Add `setSessionAttendanceXp(slug, userId, xp)` (PATCH
      `.../attendance/:userId`, body `{ xp }`) to `app/composables/useSessionApi.ts`
- [x] 5.2 Confirm it's surfaced through the `useCampaignApi` facade (spread of `useSessionApi`)

## 6. SessionAttendancePanel UI

- [x] 6.1 Add an XP number input per row, rendered only when `canManage && a.attended`;
      otherwise show a disabled/placeholder indicator (or, for non-managers, the recorded value
      read-only if present)
- [x] 6.2 Wire the input to emit `set-xp` with `(userId, xp)`, `xp: null` when cleared
- [x] 6.3 In `app/pages/campaigns/[id]/sessions/[slug]/index.vue`, handle `set-xp`: call
      `setSessionAttendanceXp`, then reload the session
- [x] 6.4 Extend `tests/unit/components/session-attendance.test.ts`: input visibility gated on
      `attended`; `set-xp` payload shape; null-vs-zero display distinction

## 7. i18n

- [x] 7.1 Add `sessions.xp`, `sessions.xpNotRecorded`, `sessions.xpRequiresAttendance` to
      `i18n/locales/en.json`
- [x] 7.2 Add the same keys with Spanish translations to `i18n/locales/es.json`

## 8. CLI

- [x] 8.1 Add a `session attendance xp <slug>` subcommand (`--campaign <id> --user <userId>`,
      plus `--xp <n>` or `--clear`) to `cli/src/commands/session.js`; validate client-side that
      `--xp` is a non-negative integer, that `--xp`/`--clear` are mutually exclusive, and that
      one of them is required — before calling the server
- [x] 8.2 Unit test the CLI flag handling (source-based, mirroring
      `tests/unit/cli/session-arc-flags.test.ts`)
- [x] 8.3 Update `docs/claude-skill.md` with the new command
- [x] 8.4 Update `.claude/skills/aleph-cli/SKILL.md` to mirror, bump `version` in frontmatter

## 9. Final verification

- [x] 9.1 `npx vitest run tests/unit/` — all pass, no regressions
- [ ] 9.2 `npx vitest run tests/integration/` (server on port 3333) — not run in this
      environment; the Nuxt dev server is known not to bind here (see project CLAUDE.md's
      documented trap). Written and ready to run in CI/an environment where it binds.
- [x] 9.3 `npx prettier --check .` clean
- [x] 9.4 `npx eslint . --ext .ts,.vue,.tsx` clean
