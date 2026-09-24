## Why

A quest's status is declared with **two different vocabularies that do not agree**, and the
disagreement has a victim in production.

`server/services/sessions.ts` declares the transition table over
`active | completed | failed | abandoned`. The zod schemas on `POST /quests` and
`PUT /quests/[slug]` declare `active | completed | failed | on_hold`. Every other layer — the form
dropdown, the CLI's `--status` help, the schema comment, the i18n labels, the status icons — uses
the first vocabulary. `on_hold` appears in **exactly two places in the whole repository**: those two
zod enums. It was introduced by `db65911` ("Implement security hardening: CSRF, input validation,
rate limiting, permissions"), where a validation vocabulary was written from memory and never
checked against the table it was validating.

The consequence is that **two of the four declared statuses cannot be set at all**:

- `abandoned` passes the transition table and is rejected by zod.
- `on_hold` passes zod and is rejected by the transition table.

So from `active` the only reachable statuses are `completed` and `failed`, while the UI offers
`abandoned` in its dropdown — a control that is visible, enabled, and rejected by the server.

Worse, `POST` does not consult the transition table (correctly — creation is not a transition), so
a quest **can be created** as `on_hold`. Once it is, `VALID_QUEST_TRANSITIONS['on_hold']` is
`undefined`, `canTransitionQuestStatus` returns false for every target, and the quest is **frozen
permanently**. This is not hypothetical: `el-anillo-de-bodas-robado-a-svetlana` in the Kingmaker
campaign, created 2026-09-06, is in that state today. Measured against the live server, every exit
is refused:

```
-> active     : Cannot transition from on_hold to active
-> completed  : Cannot transition from on_hold to completed
-> failed     : Cannot transition from on_hold to failed
-> abandoned  : Validation failed (expected "active"|"completed"|"failed"|"on_hold")
-> on_hold    : ✓ Quest updated.          <- the only accepted value is the one it already has
```

## What Changes

- The quest status vocabulary becomes one list: **`active | completed | failed | abandoned`**.
  `on_hold` is removed.
- That list is declared **once** and read by the zod schemas, the transition table, the form
  dropdown, the CLI help and the tests — so the two halves cannot drift apart again, which is the
  actual defect here rather than the wrong word.
- **A data migration moves every existing `on_hold` quest to `active`**, unfreezing the Kingmaker
  quest. Without it those rows would hold a value the new enum rejects, and stay just as stuck.
- `completed` gains a transition back to `active`, so a quest marked complete by mistake can be
  reopened. It still cannot jump straight to `failed` or `abandoned`.
- Any status the transition table does not know about SHALL be treated as reopenable to `active`
  rather than as a dead end, so a future stray value degrades into something a Narrator can fix
  instead of a row only a DBA can rescue.

## Capabilities

### New Capabilities

- `quest-status-vocabulary`: the single declared list of quest statuses, the transitions allowed
  between them, and the rule that a status outside the list can always be escaped.

### Modified Capabilities

- `data-model`: the `quests` table's declared status list is stated as the single vocabulary.
- `aleph-cli`: `quest list --status` and `quest update --status` document the same four values, and
  reopening a completed quest becomes possible.

`quest-detail` is deliberately NOT listed. Its spec says nothing about the status control today, so
there is no requirement to modify — the form's obligation to offer exactly what the server accepts
is stated by the new capability instead of being retrofitted as a change to something that was
never written down.

## Impact

**Server**

- `server/services/sessions.ts` — `VALID_QUEST_TRANSITIONS` rebuilt over the shared list, plus the
  `completed -> active` edge and the unknown-status rule.
- `server/api/campaigns/[id]/quests/index.post.ts` and `[slug]/index.put.ts` — both zod enums read
  the shared list instead of spelling it out.

**Shared**

- `shared/utils/quest-status.ts` — new: the vocabulary and the transition map, in one place, the
  same shape `shared/utils/quest-short-description.ts` already uses for its cap.

**Database**

- `server/db/migrations/0039_*.sql` — `UPDATE quests SET status = 'active' WHERE status = 'on_hold'`.
- `server/db/schema/sessions.ts` — the status comment stops being a fifth, hand-maintained copy of
  the list.

**UI**

- `app/components/forms/QuestForm.vue` — the dropdown is generated from the shared list rather than
  hard-coded, so it can no longer offer a value the server rejects.

**CLI**

- `cli/src/commands/quest.js` — `--status` help text on `list` and `update`.
- `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md`, updated together with a version
  bump on the latter.

**Tests**

- `tests/unit/server/session-service.test.ts` pins `completed -> active` as **false** today. That
  assertion mirrors the implementation rather than a stated rule — there is no requirement anywhere
  saying a completed quest is final — so it is rewritten against the new rule, with the reasoning
  recorded rather than silently flipped.

**Not in scope**

- The vestigial `quests.statusOpen` i18n key. No `open` status exists anywhere in the code; it is
  dead copy, and removing it is a separate tidy-up with its own (small) risk of breaking a
  translation lookup.
