## Why

A quest in this project carries a description of 1,000–3,000 characters: what happened, in which
session, who rolled what, and what was said at the table. That is exactly what you want when you
open the quest, and exactly what you do not want in a list of 25 cards.

The list currently resolves that conflict by **guessing**: it auto-trims the long description with
`buildExcerpt`. The excerpt is correct but it is a mechanical cut by length — it takes the opening
sentence, which is almost never the one that summarises the quest. In «El juicio del Avatar de
Otto» the first sentence names Symcha Landau but never says a death threat is hanging over Otto;
in «Las guardas de la capilla» it talks about a newspaper falling out of the sky, which is the
anecdote, not the matter at hand.

What is missing is a way for the Narrator to **write that line himself**, instead of having a
machine crop one for him.

## What Changes

- Quests gain a new field, `shortDescription`, independent of `description`: plain text, one or two
  sentences, **200 characters maximum**.
- The quests list shows that short description **in full — untruncated, no ellipsis, no line
  clamp**. That is the whole point of the field: if it fits by contract, there is nothing to trim.
- When a quest has no short description, the list **keeps showing the auto-excerpt of the long
  description**, as it does today. No card goes mute, and the 26 existing quests need not be
  revisited in one sitting.
- The quest form gains the field, above the long description, with a character counter.
- The detail page shows the short description as a standfirst, above the full description.
- The CLI gains `--short-description` on `quest create` and `quest update`, and shows it in
  `quest list`.
- No breaking changes: the field is optional and nullable, and every caller that does not send it
  keeps working unchanged.

## Capabilities

### New Capabilities

- `quest-short-description`: the field itself — its contract (plain text, 200 characters,
  optional), how it is validated, how it is persisted, how it travels through export/import, and
  the fallback rule that decides what the list shows when it is empty.

### Modified Capabilities

- `data-model`: the `quests` table gains `short_description` in the column list declared by the
  session-and-story schema.
- `quest-detail`: the detail page shows the standfirst, and the list goes from always excerpting to
  showing the short description whole, falling back to the excerpt.
- `aleph-cli`: `quest create` / `quest update` accept `--short-description`, and `quest list` shows
  it.

## Impact

**Database**

- `server/db/schema/sessions.ts` — `shortDescription` column on `quests`.
- `server/db/migrations/0038_*.sql` + `meta/_journal.json` —
  `ALTER TABLE quests ADD short_description text`.

**API**

- `server/api/campaigns/[id]/quests/index.post.ts` and `[slug]/index.put.ts` — the zod schema
  accepts `shortDescription` (`.max(200).nullable().optional()`).
- `server/api/campaigns/[id]/quests/index.get.ts` and `[slug]/index.get.ts` — they return it.

**Export / import**

- `server/services/campaign-export.ts` does `db.select().from(quests)`, which carries every column,
  and `campaign-import.ts` inserts what it receives. The field is _expected_ to travel with **no
  change at all** — but that is a hypothesis, and there is a dedicated task to prove it with a real
  round trip rather than assume it.

**UI**

- `app/components/forms/QuestForm.vue` — the new field.
- `app/pages/campaigns/[id]/quests/index.vue` — the fallback rule; `line-clamp-2` is dropped on the
  short-description branch.
- `app/pages/campaigns/[id]/quests/[slug]/index.vue` — the standfirst.
- `app/types/api.ts` — `Quest.shortDescription`.
- `i18n/locales/es.json` and `en.json` — label, placeholder and help text. **Only `i18n/locales/`
  counts**; `locales/` and `app/i18n/locales/` are stale duplicates that are never loaded.
- All user-facing copy is written in **Spanish**, which is this product's content language, even
  though this spec is in English like the rest of `openspec/`.

**CLI** — yes, affected, and in the three places the project mandates:

- `cli/src/commands/quest.js` — the new option on `create` and `update`, and the column in `list`.
- `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` — updated together, bumping the
  `version` of the latter.

**What this change does NOT touch**

- `buildExcerpt` / `flattenToPlainText` (`shared/utils/text-excerpt.ts`) stay exactly as they are:
  they are the fallback, not the primary mechanism.
- The quest-status mismatch (`abandoned` and `on_hold` are both unreachable because the zod enum and
  `VALID_QUEST_TRANSITIONS` declare different vocabularies, and the form's dropdown offers
  `abandoned`, which the API rejects) is a **real, adjacent defect** found while working on these
  same screens. It is deliberately out of scope: it is a change to the status contract, not to this
  field, and it deserves its own proposal.
