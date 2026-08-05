## Why

Some campaigns run more than one storyline in parallel within the same setting and shared cast of entities — e.g. Berlín en Tinieblas already runs a mage-focused main campaign, and needs a second, distinct storyline about mortal characters in the same city. Today `arcs`, `game_sessions`, and `quests` all belong to exactly one campaign with no further subdivision, so the only way to separate two storylines is either cramming them into one undifferentiated list or duplicating the entire campaign (losing the shared character/location/organization pool that makes them worth keeping together).

The codebase already has a `session_groups` table that groups sessions by name/slug within a campaign (API + CLI only, no UI), but it only covers sessions — arcs and quests have no equivalent grouping, and there is no "default" bucket, so unassigned rows are simply `NULL`. Rather than build a second, parallel grouping mechanism, this change generalizes `session_groups` into a first-class **sub-campaign** concept that also covers arcs and quests, with every arc/session/quest always belonging to exactly one sub-campaign (never unassigned), because every campaign auto-provisions a default sub-campaign.

## What Changes

- Rename and extend the existing `session_groups` table/API/CLI into `sub_campaigns`: same name/slug/description/image shape, plus an `isDefault` flag.
- Every campaign gets exactly one default sub-campaign, auto-created when the campaign is created (and backfilled for existing campaigns via migration).
- Add `subCampaignId` (NOT NULL, FK to `sub_campaigns`) to `arcs` and `quests` — previously these had no grouping concept at all.
- Rename `game_sessions.groupId` to `game_sessions.subCampaignId`, change it from nullable to NOT NULL, and backfill existing NULLs to each campaign's default sub-campaign.
- Sub-campaigns remain purely organizational: **BREAKING for existing groupSlug-only integrations**, but no new access-control dimension — all campaign members see all sub-campaigns, matching how campaign membership already works today. Characters, locations, and organizations (entities) are NOT scoped to a sub-campaign; they stay shared across all of a campaign's sub-campaigns.
- Deleting a non-default sub-campaign reassigns its arcs/sessions/quests to the campaign's default sub-campaign instead of leaving them unassigned. The default sub-campaign itself cannot be deleted while the campaign exists.
- CLI: rename `aleph session-group` to `aleph sub-campaign` (list/create/update/delete/image commands carry over), add `--subcampaign <slug>` to `arc create`/`arc update`/`arc list`, `quest create`/`quest update`/`quest list`, and rename `session ... --group` to `session ... --subcampaign` (kept as an alias for one release to avoid a hard CLI break, per design.md).

## Capabilities

### New Capabilities

- `sub-campaigns`: Organizational grouping of arcs, sessions, and quests into named sub-campaigns within a single campaign, with a mandatory default sub-campaign per campaign, full CRUD API, and CLI support.

### Modified Capabilities

- `session-management`: The `groupSlug`/`groupId` filtering and assignment behavior on sessions is renamed to `subCampaignSlug`/`subCampaignId` and becomes mandatory (never null) instead of optional.

## Impact

**Server:**

- `server/db/schema/sessions.ts` — rename `sessionGroups` table to `subCampaigns` (add `isDefault`), add `subCampaignId` to `arcs` and `quests`, rename `gameSessions.groupId` to `subCampaignId` and make it NOT NULL
- New migration: rename table/columns, add `isDefault`, backfill a default sub-campaign per existing campaign, backfill all existing arcs/quests/sessions to point at it
- `server/api/campaigns/[id]/session-groups/**` routes move to `server/api/campaigns/[id]/sub-campaigns/**`
- `server/api/campaigns/index.post.ts` — auto-create the default sub-campaign alongside existing entity-type/relation-type seeding
- `server/api/campaigns/[id]/arcs/**`, `server/api/campaigns/[id]/quests/**`, `server/api/campaigns/[id]/sessions/**` — accept `subCampaignSlug`/`subCampaignId`, resolve/validate like existing `arcSlug` resolution, list filters gain `subcampaignSlug` query param
- `server/api/campaigns/[id]/sub-campaigns/[slug]/index.delete.ts` — reassign child arcs/sessions/quests to the default sub-campaign before deleting; reject deleting the default sub-campaign
- `server/services/campaign-export.ts` / `campaign-import.ts` — rename the `sessionGroups` export/import resource key to `subCampaigns`, carry `isDefault` through round-trip

**CLI (`cli/`):**

- `cli/src/commands/session-group.js` renamed to `cli/src/commands/sub-campaign.js`, registered as `aleph sub-campaign`
- `cli/src/commands/arc.js`, `cli/src/commands/quest.js` — add `--subcampaign` create/update option and list filter
- `cli/src/commands/session.js` — rename `--group` to `--subcampaign` (keep `--group` as a deprecated alias for one release)
- `cli/src/lib/client.js` — no interface change (still generic REST helpers)
- `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` — document the new `sub-campaign` command and the `--subcampaign` options on arc/quest/session

**Frontend:**

- No existing UI to migrate (session groups were never exposed in `app/`); a sub-campaign picker/filter can be added to the sessions/arcs/quests list pages as a follow-up, out of scope for this change's minimum viable slice unless called out in tasks.md
