## Context

Two vocabularies for one field, in a codebase where four other layers already agreed on the same
four values. The zod enums are the outlier, and they were added by a security-hardening pass that
introduced validation across many endpoints at once — the kind of change where each schema is
written quickly from the shape of the data rather than from the rule it is meant to enforce.

The failure has the signature this repo keeps recording: **a value that is accepted and then does
nothing useful.** `POST` accepts `on_hold` and stores it; from that moment the row is outside the
transition table's domain, `canTransitionQuestStatus` returns false for every target, and nothing
anywhere says so. The quest simply refuses to change, with a message that reads like a rule
(«Cannot transition from on_hold to active») rather than like a gap.

There is also an existing test, `tests/unit/server/session-service.test.ts`, asserting
`completed -> active === false`. It is worth being precise about what that test is: it pins the
table, and the table pins nothing. No requirement, comment or spec anywhere states that completing
a quest is final. It is an implementation detail with a test wrapped around it — this project's
most-recorded defect shape — so it can be changed, but it must be changed deliberately and with the
reason written down, not quietly edited until it goes green.

## Goals / Non-Goals

**Goals:**

- One vocabulary, declared once, that the validation layer and the transition layer both read.
- Unfreeze the production quest currently stuck in `on_hold`.
- Make the form incapable of offering a status the server will reject.
- Leave no status from which a Narrator cannot escape.

**Non-Goals:**

- Redesigning the quest lifecycle. The four values stay; only the edges between them change, and
  only by one.
- Removing the vestigial `statusOpen` i18n key.
- Touching session, arc or chapter statuses. They are separate vocabularies with separate tables
  and are out of scope even though they look similar.

## Decisions

### D1 — `abandoned` wins, `on_hold` goes

**Decision:** the vocabulary is `active | completed | failed | abandoned`.

The count decides it, not taste. `abandoned` is in the schema comment, the transition table, the
form dropdown, the detail page's label helper, the CLI help and the i18n bundle — six places.
`on_hold` is in two zod enums and nowhere else. Choosing `on_hold` would mean editing six layers
and migrating the meaning of an existing value; choosing `abandoned` means editing two lines and
migrating one row.

### D2 — The list is declared once, and this is the actual fix

**Decision:** `shared/utils/quest-status.ts` exports the vocabulary and the transition map; the zod
schemas, the transition check, the form dropdown and the tests all read it.

The wrong word is the symptom. The defect is that **two independent declarations of the same
vocabulary existed at all**, so they could disagree silently for months. Replacing `on_hold` with
`abandoned` in the enums would fix today's bug and leave tomorrow's in place.

This is the same shape as `QUEST_SHORT_DESCRIPTION_MAX_LENGTH`, added yesterday for the same
reason, and it is why the form's `<option>` list is generated rather than typed: a hard-coded
dropdown is a third declaration, and it is the one that produced a visible, enabled control the
server refuses.

### D3 — The migration is part of the fix, not a follow-up

**Decision:** `UPDATE quests SET status = 'active' WHERE status = 'on_hold'` ships in the same
change.

Narrowing the enum without it makes things _worse_: the row keeps a value the schema no longer
accepts, so every route that validates it fails, and the quest stays frozen with a new error
message. `active` is the right landing spot — it is the default for a new quest, and the quest in
question is a live thread, not an abandoned one.

**Reversibility:** this loses the information that someone once chose `on_hold`. That is acceptable
because `on_hold` never had a meaning in this system: nothing rendered it, nothing filtered on it,
and no transition led out of it. It was a typo with a database row attached.

### D4 — `completed -> active`, and only that edge

**Decision:** add `completed: ['active']`. Do not add `completed -> failed` or
`completed -> abandoned`.

Reopening is the operation a Narrator actually needs: a thread declared closed comes back, or the
wrong row was clicked. Going from _completed_ directly to _failed_ is not a correction, it is a
contradiction — if it was never really complete, reopen it first and then fail it. Keeping the
single edge preserves that distinction while removing the dead end.

This reverses an existing test assertion. The justification is above rather than in the commit
message alone, because the next person to read that test deserves to find the reasoning next to
the rule.

### D5 — An unknown status is reopenable, not a trap

**Decision:** `canTransitionQuestStatus(from, to)` returns true for `to === 'active'` when `from`
is not in the table.

This is the generalisation of the incident. Today's specific stray value gets migrated by D3, but
the mechanism that made it unescapable is `VALID_QUEST_TRANSITIONS[from]` being `undefined` and
the function returning false for everything. Any future stray value — a direct SQL edit, a restored
backup, an import from an older export — lands in the same trap.

**Alternative rejected:** validating the stored status on read and throwing. That converts a
recoverable row into an unreadable one, which is worse: right now the quest at least renders.

**Alternative rejected:** allowing an unknown status to go anywhere. `active` is enough to rescue
the row, and a narrow rule is easier to reason about than a blanket exemption.

## Risks / Trade-offs

- **Narrowing an enum can reject data that already exists.** → That is exactly why D3 is in the
  same change and why the tasks verify the count of `on_hold` rows is zero **after** the migration
  and before anything ships. The check runs against a copy of production, not against a fixture.

- **`completed -> active` is a behaviour change, not a bug fix.** → It was decided explicitly
  rather than assumed, and it is one line in one map. Reverting it means deleting that edge and
  restoring one test assertion.

- **A generated dropdown could render a raw value if an i18n key is missing.** → The label helper
  already falls back to the raw status, so a missing translation degrades to `abandoned` rather
  than to an empty option. The four keys exist today; a task checks all four resolve in both
  locales.

- **Other campaigns may hold statuses nobody has looked for.** → The tasks count the distinct
  status values across all four production campaigns before and after, rather than assuming
  Kingmaker's row is the only one.

## Migration Plan

1. `shared/utils/quest-status.ts` with the vocabulary, the transition map and the unknown-status
   rule, plus its unit tests.
2. `server/services/sessions.ts` reads them; the old inline table is removed.
3. Both zod enums read the shared list.
4. Migration `0039` moves `on_hold` rows to `active`.
5. Form dropdown generated from the list; CLI help and both skill files updated.
6. `session-service.test.ts` rewritten against the new rules.
7. Deploy, then verify against the live server that the Kingmaker quest can change status.

**Rollback:** revert the code; the migrated rows stay `active`, which is valid under both the old
and the new vocabulary, so there is nothing to undo in the data.

## Open Questions

None. The one that existed — whether a completed quest may be reopened — was decided before this
was written (D4: yes, and only to `active`).
