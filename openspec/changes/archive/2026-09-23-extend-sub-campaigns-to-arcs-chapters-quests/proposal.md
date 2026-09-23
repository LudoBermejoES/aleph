## Why

Sub-campaigns (`2026-08-05-sub-campaigns`) gave every campaign a mandatory storyline bucket and
wired it through arcs, sessions and quests. Two years of Berlín en Tinieblas later the concept is
load-bearing — the mage campaign and the mortal one share a cast and a city but not a storyline —
and three holes in that original slice have become visible. **All three are gaps in coverage, not
defects in what shipped**: the data model is already right.

**1. Chapters were never part of the concept.** `chapters` (`server/db/schema/sessions.ts:49`) is the
only member of the arc/chapter/session/quest family with no `sub_campaign_id`, and that is the
correct schema — a chapter hangs off exactly one arc, so its sub-campaign is _derived_, and a stored
copy would be a second source of truth free to drift. But nothing exposes the derived value: `aleph
chapter list` narrows by `--arc` and by nothing else (`cli/src/commands/chapter.js:14`), the
chapters endpoints accept no `subCampaignSlug`, and the response carries no sub-campaign at all. A
Narrator running two storylines cannot ask "what chapters are in _Mortales_?" without walking every
arc by hand.

**2. Nothing enforces coherence between a session and the arc it points at.**
`resolveArcChapterSlugs` (`server/utils/arc-chapter.ts`) scopes every lookup by `campaignId` and
**never reads `subCampaignId`**. It already refuses a chapter that does not belong to the named arc
— a 422 at `arc-chapter.ts:151` — so the pattern and the error shape exist; the sub-campaign rung of
the same ladder is simply missing. A session in `mortales` can therefore point at an arc in
`general`, silently and with no way to notice: the session list filtered by
`?subCampaignSlug=mortales` returns it, and the `arcName` it prints belongs to the other storyline.
The file's own header comment says it "mirrors the `subCampaignSlug` convention already used by the
sessions PUT/POST handlers" (`arc-chapter.ts:9`), so the sibling concept was known and simply never
cross-checked. **There is no test for this in either direction** — `grep -rn "does not belong"
tests/` is empty.

**3. The UI never got the follow-up the original proposal deferred.** That proposal closed with "a
sub-campaign picker/filter can be added to the sessions/arcs/quests list pages as a follow-up, out
of scope for this change's minimum viable slice". Measured today, with a control query to prove the
search works: `subCampaign` appears in exactly six files under `app/` — the four sessions pages, the
sub-campaigns admin page, and `SessionForm.vue`. The arcs pages, the chapter management inside them,
and the quests pages know nothing about sub-campaigns. So the feature is reachable from the CLI and
invisible from the app for two of the three things it organizes, and neither
`openspec/specs/arcs-chapters-ui/spec.md` nor `quest-detail/spec.md` mentions sub-campaigns once.

## What Changes

- **Chapters gain a derived, read-only sub-campaign.** No new column: the value is resolved through
  `chapters.arcId -> arcs.subCampaignId`. The chapters list/detail projections gain
  `subCampaignId`/`subCampaignName`, `GET /api/campaigns/:id/chapters` gains a `subCampaignSlug`
  filter, and `aleph chapter list` gains `--subcampaign`. Writing a chapter's sub-campaign directly
  is rejected — you move its arc.
- **The arc/chapter resolver learns about sub-campaigns.** Assigning a session an arc from a
  different sub-campaign returns **422** naming both, in the same shape as the existing chapter/arc
  refusal. The check reads the sub-campaign the session will have _after_ the request, so sending
  `subCampaignSlug` and `arcSlug` together in one call is coherent by construction rather than
  order-dependent.
- **Moving an arc between sub-campaigns carries its sessions with it.** An arc's sessions are part
  of the storyline the arc names; leaving them behind manufactures exactly the incoherence this
  change closes. The PUT response reports how many sessions moved, so a bulk effect is never
  silent. Its chapters follow automatically, being derived.
- **A repair path for whatever is already incoherent.** This has been possible since August, so
  existing rows may already be wrong. A read-only audit reports every session whose arc lives in
  another sub-campaign; a CLI flag fixes them by adopting the arc's sub-campaign.
- **UI parity for arcs, chapters and quests.** A sub-campaign filter on the arcs and quests list
  pages and a picker on their create/edit forms, mirroring what `SessionForm.vue` already does; the
  sub-campaign shown on the arc and quest detail pages; chapters displaying the one they inherit,
  read-only, on the arc detail page that already manages them inline.

## Capabilities

### Modified Capabilities

- `sub-campaigns`: extended to cover chapters (derived), to enforce session/arc coherence with a 422,
  to define arc-move cascade semantics, and to add the audit/repair path.
- `arcs-chapters-ui`: the arcs list gains a sub-campaign filter, the arc form a picker, and the arc
  detail page shows the sub-campaign for the arc and for the chapters it manages inline.
- `quest-detail`: the quests list gains a sub-campaign filter and the quest form a picker.
- `aleph-cli`: `chapter list --subcampaign`, and the audit/repair flags.

## Impact

**Server:**

- `server/utils/arc-chapter.ts` — the resolver takes the effective sub-campaign and refuses a
  cross-sub-campaign arc; this is the only behavioural change to an existing code path, and it can
  turn a request that used to succeed into a 422, which is the point.
- `server/api/campaigns/[id]/chapters/**` — `subCampaignSlug` filter on the list, sub-campaign in the
  projection, explicit rejection of a write.
- `server/api/campaigns/[id]/arcs/[slug]/index.put.ts` — cascade the sessions on a sub-campaign move
  and report the count.
- `server/api/campaigns/[id]/sessions/**` — pass the effective sub-campaign into the resolver.
- No migration: no schema change. The repair path is data-only.

**CLI (`cli/`):**

- `cli/src/commands/chapter.js` — `--subcampaign` on `list`.
- `cli/src/commands/arc.js` — surface the moved-session count returned by the PUT.
- `cli/src/commands/sub-campaign.js` — the audit and repair commands.
- `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` — both, together, per the
  standing rule that the two skill files never diverge.

**Frontend:**

- `app/pages/campaigns/[id]/arcs/**`, `app/pages/campaigns/[id]/quests/**`, and the arc/quest forms
  under `app/components/forms/` — filter, picker, and display, modelled on `SessionForm.vue`.

**Explicitly out of scope:**

- Sub-campaign as an **access-control** dimension. It stays organizational, as the original change
  decided: every campaign member still sees every sub-campaign, and visibility keeps being governed
  by `visibility` + `:::secret` blocks. Nothing here narrows who can read what.
- Scoping **entities** (characters, locations, organizations) to a sub-campaign. They stay shared;
  that is the whole reason two storylines live in one campaign.
