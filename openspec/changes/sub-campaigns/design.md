## Context

`arcs`, `game_sessions`, and `quests` (`server/db/schema/sessions.ts`) all carry a direct `campaignId` and nothing finer-grained. `game_sessions` already has an optional `groupId` pointing at `session_groups` — a per-campaign table with `name`/`slug`/`description`/`imageUrl`/`sortOrder` — surfaced through `GET/POST/PUT/DELETE /api/campaigns/[id]/session-groups` and the CLI `aleph session-group` command. It has zero footprint in `app/` (grep confirms no Vue/TS file references it) — it is API+CLI only today. `arcs` and `quests` have no equivalent.

Campaign membership (`campaign_members`) and permissions (`campaign_member_permissions`) are scoped to the whole campaign; there is no precedent in the codebase for a permission boundary finer than "campaign member." The user confirmed sub-campaigns should stay organizational only (no separate access control) and that characters/locations/organizations should remain unscoped, shared across all of a campaign's sub-campaigns — only `arcs`, `game_sessions`, and `quests` get the new dimension.

## Goals / Non-Goals

**Goals:**

- One generalized grouping concept (`sub_campaigns`) covering arcs, sessions, and quests, replacing the sessions-only `session_groups`
- Every arc/session/quest always belongs to exactly one sub-campaign — no `NULL` state — via a mandatory default sub-campaign auto-provisioned per campaign
- Deleting a non-default sub-campaign never leaves rows unassigned; it reassigns them to the default
- Full CLI parity: create/list/update/delete sub-campaigns, assign arcs/sessions/quests to one by slug, filter lists by sub-campaign

**Non-Goals:**

- Per-sub-campaign membership, roles, or visibility rules (explicitly deferred; all campaign members see all sub-campaigns)
- Scoping characters, locations, or organizations to a sub-campaign
- A dedicated sub-campaign management UI in `app/` (the existing `session_groups` had none either; this change keeps parity — API/CLI complete, UI is a natural follow-up but not required for this change to be useful, since the CLI is the primary interface used for this campaign's content today)
- Nested/hierarchical sub-campaigns (one flat level under a campaign)

## Decisions

### Decision: Rename and extend `session_groups` rather than add a parallel table

`session_groups` already has the exact shape needed (name, slug, description, image, sort order, campaign-scoped). Introducing a second, independently-named `sub_campaigns` table alongside it would leave two overlapping grouping mechanisms in the schema and CLI, which is the kind of duplication this codebase avoids elsewhere (e.g., the codebase already generalizes `arcSlug` resolution across sessions rather than inventing a second arc-like concept). Renaming is a one-time breaking change to an API surface that has no frontend consumers yet, which is the cheapest possible time to make it.

Alternative considered: keep `session_groups` for sessions only and add a separate `sub_campaigns` table for arcs/quests. Rejected — it would mean two mostly-identical CRUD surfaces and CLIs (`session-group` and `sub-campaign`) that both describe "buckets of content within a campaign," which is confusing to use and to maintain.

### Decision: `subCampaignId` is NOT NULL on all three tables, not nullable-with-convention

The proposal explicitly asks for "vinculadas a una subcampaña por defecto" (linked to a default sub-campaign) — a hard guarantee, not an app-level convention that some code path might forget to apply. Making the column NOT NULL with a FK to `sub_campaigns(id)` means the database itself refuses a row with no sub-campaign, and every INSERT path (API, CLI, campaign import) is forced to resolve to a real sub-campaign id — defaulting to the campaign's default when the caller doesn't specify one.

Alternative considered: keep it nullable and treat `NULL` as "the default," resolving at read time. Rejected — it reintroduces exactly the ambiguity (is `NULL` "no sub-campaign" or "the default"?) the feature exists to remove, and every list/report query would need a `COALESCE`-style special case forever.

### Decision: Default sub-campaign is protected from deletion; non-default deletion reassigns children

Since every arc/session/quest must always have a sub-campaign, deleting a sub-campaign can never simply null out its children's FK (unlike today's `groupId … onDelete: set null`). Two rules follow directly from the NOT NULL decision above:

1. The default sub-campaign cannot be deleted while the campaign exists — there must always be a landing spot.
2. Deleting any other sub-campaign reassigns its arcs/sessions/quests to the campaign's default sub-campaign as part of the same transaction, then deletes the row.

Alternative considered: block deletion of any sub-campaign that still has children, requiring the caller to manually reassign first. Rejected as needless friction — reassignment to the default is always well-defined and matches how `session_groups` already behaves today (`onDelete: set null`, i.e., "falls back to unassigned"); this change only upgrades the fallback target from `NULL` to "the default."

### Decision: One default sub-campaign per campaign, named "General", auto-created on campaign creation and backfilled via migration

Mirrors the existing `seedEntityTypes`/`seedRelationTypes` pattern in `server/api/campaigns/index.post.ts` — sub-campaign seeding is one more call in that same sequence. For campaigns that already exist, the migration creates one "General" sub-campaign per campaign and backfills every existing arc/quest (previously ungrouped) and every session with a `NULL` `groupId` to point at it; sessions that already had a non-null `groupId` keep pointing at their (renamed) sub-campaign.

Alternative considered: let the DM name/create the default sub-campaign manually during migration. Rejected — this would leave every existing campaign in a broken (NOT NULL constraint violated) state until manual intervention; auto-naming "General" is a safe, edit-later default (the CLI's `sub-campaign update` command already supports renaming).

### Decision: Keep `--group` as a deprecated CLI alias on `session` commands for one release

`session.js`'s `--group`/`groupSlug` is the one CLI surface that has real, external-ish usage precedent (it's documented in the skill files consumed by other Claude Code sessions via `docs/claude-skill.md`). Accepting `--group` as a silent alias for `--subcampaign` for one release avoids breaking in-flight scripts/skills that reference it, while `arc`/`quest` get `--subcampaign` fresh with no alias needed (they have no prior flag to preserve).

## Risks / Trade-offs

- **Breaking API/CLI rename with no deprecation shim on the API itself** → Mitigated by the fact that `session_groups` has no frontend consumers (verified by grep) and the CLI keeps `--group` as an alias for one release; the HTTP route rename is acceptable because the only caller is this project's own CLI, updated in the same change.
- **Migration must run before the NOT NULL constraint is added** → Mitigated by sequencing the migration in three steps: (1) create `sub_campaigns` rows including one default per campaign, (2) backfill `subCampaignId` on all three tables, (3) add the NOT NULL constraint / rename columns. Order matters; tasks.md must enforce it.
- **Campaign import/export payloads from before this change reference `sessionGroups`** → Mitigated by keeping the importer tolerant: accept both `sessionGroups` (legacy exports) and `subCampaigns` (new exports) on read, always write `subCampaigns` on export.
- **Deleting a sub-campaign that is also referenced by an in-flight session-create request** → Accepted as a standard race already possible today with arc/chapter deletion; not new to this change, no special handling beyond existing FK constraints.
