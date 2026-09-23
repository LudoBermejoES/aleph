## Context

The data model already supports everything here. `arcs`, `game_sessions` and `quests` each carry a
`sub_campaign_id` that is **NOT NULL with an FK** (`server/db/schema/sessions.ts:34,75,150`);
`chapters` carries none and hangs off `arcs.arcId` (`:49`). So this change adds no columns and no
migration. What it adds is exposure, one invariant, and the UI the original slice deferred.

Three constraints shape every decision below:

1. **Sub-campaigns are organizational, never access control.** The original design settled this and
   nothing here reopens it. Anything that would make a sub-campaign hide data from a member belongs
   to `visibility`/`:::secret`, which is a different mechanism with a different failure mode.
2. **A campaign always has exactly one default sub-campaign**, and every arc/session/quest always
   points at one. There is no unassigned state to design around — which is why "what happens when
   it's null" never appears below.
3. **This repo's recurring defect is a test that asserts the implementation instead of the rule.**
   Every gate here is written from the invariant and mutation-tested against it.

## Goals / Non-Goals

**Goals**

- A chapter's sub-campaign is knowable and filterable without walking its arc by hand.
- A session and the arc it points at cannot belong to different sub-campaigns.
- Whatever is already incoherent is findable and fixable.
- Arcs and quests reach UI parity with sessions.

**Non-Goals**

- Access control by sub-campaign.
- Scoping entities to a sub-campaign.
- A cross-sub-campaign move for quests — quests reference no arc, so they have no coherence
  relationship to break.
- Multi-sub-campaign membership. One row, one sub-campaign, as today.

## Decisions

### A chapter's sub-campaign is DERIVED, never stored

Adding `sub_campaign_id` to `chapters` would be the obvious symmetry and it is the wrong call. A
chapter belongs to exactly one arc by an FK that already cascades on delete; its sub-campaign is a
function of that arc. Storing a copy creates a second source of truth with no mechanism keeping the
two in step, and the drift is silent: the copy is what the filter reads, so a chapter would keep
answering for a storyline its arc left months ago. The same shape has already cost this project
real time — a `characterType` that disagreed between the DB row and the file, a deployed
`module.json` version that disagreed with a note in `CLAUDE.md`.

Cost of deriving: the chapters list needs a join to `arcs` to project the sub-campaign, and filtering
by it is a join rather than an indexed column lookup. `idx_arcs_sub_campaign` already exists
(`sessions.ts:45`) and a campaign's chapter count is in the dozens, so this is not a query-performance
question at this scale.

**Consequence, and it must be explicit in the API:** a write that tries to set a chapter's
sub-campaign directly is **422, not silently ignored**. Accepting and discarding it is this repo's
single most-repeated API defect ("a value that is accepted and silently does nothing"), and the fix
is to refuse loudly and name the real route — move the arc.

### The coherence check reads the sub-campaign the session will HAVE, not the one it has

A session PUT can carry `subCampaignSlug` and `arcSlug` in the same body. Validating the arc against
the session's _stored_ sub-campaign makes the outcome depend on the order the handler happens to
apply the two fields, and a request that is coherent as a whole would be refused because of an
intermediate state that never existed. So the resolver takes the **effective** sub-campaign — the
one from the body if present, otherwise the stored one — and checks the arc against that.

This also settles a case that would otherwise be maddening: moving a session and its arc assignment
to another storyline in one call is a single coherent request and must succeed.

### Moving an arc between sub-campaigns CARRIES its sessions

Three options, and the tie-break is which failure is silent.

- **Leave the sessions behind.** Cheapest, and it manufactures precisely the incoherence this change
  exists to close — and does so invisibly, one arc move at a time.
- **Refuse the move while the arc has sessions.** Safe and honest, but it makes a legitimate,
  ordinary editorial act ("this arc turned out to belong to the mortal storyline") impossible without
  reassigning every session by hand first, which is the same work with more steps and more chances
  to stop halfway.
- **Carry them.** Chosen. The arc is the organizing unit; its sessions are part of the storyline it
  names. The objection — that one edit silently rewrites many rows — is answered by **reporting the
  count in the response** (`movedSessions: 12`) and surfacing it in the CLI, so the effect is
  visible at the moment it happens rather than discovered later.

Chapters need no rule: being derived, they follow their arc by construction. That is the derivation
decision paying for itself.

### The repair path is a separate, read-only-by-default command

The cross-sub-campaign window has been open since August 2026, so production may already hold
incoherent rows — and we do not know how many, because nothing has ever looked. A migration that
silently "fixes" them would destroy the evidence of what the Narrator actually meant. So: an audit
that **only reports**, and an explicit flag to apply the repair, adopting the arc's sub-campaign as
the truth (the arc is the organizing unit, consistent with the cascade decision above).

Running the audit before shipping the 422 is a task, not an afterthought: if there are many
incoherent rows, the new refusal turns previously-working edits into 422s, and the Narrator deserves
to know that before it happens rather than from an error message.

### The UI mirrors `SessionForm.vue` rather than inventing a pattern

`SessionForm.vue` already solves this exact problem — a sub-campaign picker defaulting to the
campaign default, and a list filter. The arc and quest surfaces copy its shape. Not a shared
component extracted in this change: two call sites is not yet evidence of the right abstraction, and
a premature one here would couple three forms that may diverge. If a fourth appears, extract then.

## Risks / Trade-offs

- **The 422 is a breaking change for any caller that was relying on the gap.** That is intended, but
  it means the audit has to run first (above), and it means the error message must name both
  sub-campaigns so the fix is obvious from the message alone.
- **The arc-move cascade can rewrite many rows from one edit.** Mitigated by reporting the count,
  not by asking for confirmation — a confirmation prompt in an API is not a thing, and the CLI
  already prints what it did.
- **Deriving the chapter's sub-campaign costs a join on every chapter read.** Accepted at this
  scale; revisit only with a measurement, never on suspicion.
- **UI work here is invisible to the integration suite.** These are Vue pages, so the gates are
  component tests plus e2e. The standing trap applies: a green e2e run proves nothing if its
  environment's feature flags differ from production — check what `playwright.config.ts` inherits
  before trusting it as coverage.

## Migration Plan

No schema migration. Order matters:

1. Ship the audit command first, read-only.
2. Run it against production and record the count of incoherent sessions.
3. Repair whatever it finds, with the Narrator's sign-off on any row where the arc's sub-campaign is
   not obviously the intended one.
4. Only then ship the 422, so it can never fire on pre-existing data.
5. Chapters exposure, cascade and UI are independent of that sequence and can land in any order.

## Open Questions

- Should `quest` gain the same cascade? It has no arc today, so there is nothing to cascade — but if
  quests are ever attached to arcs, this decision has to be revisited rather than rediscovered.
- Does the arcs list need the sub-campaign filter to be **sticky** across navigation, the way a
  Narrator running two storylines would probably want? Deferred: it is a preference, it affects the
  sessions list equally, and it should be decided for all three at once rather than invented here.
