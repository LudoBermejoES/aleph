## 1. Schema and migration

- [x] 1.1 In `server/db/schema/sessions.ts`, rename the `sessionGroups` table export/definition to `subCampaigns`, add an `isDefault` boolean column (default `false`)
- [x] 1.2 Add `subCampaignId` (text, FK to `subCampaigns.id`) to the `arcs` table definition
- [x] 1.3 Add `subCampaignId` (text, FK to `subCampaigns.id`) to the `quests` table definition
- [x] 1.4 Rename `gameSessions.groupId` to `subCampaignId`, drop the `onDelete: 'set null'` clause (no longer nullable)
- [x] 1.5 Generate a Drizzle migration that, in order: (a) renames the `session_groups` table to `sub_campaigns` and adds `is_default`, (b) inserts one "General" `is_default = true` row per existing campaign, (c) adds `sub_campaign_id` columns to `arcs` and `quests`, (d) backfills `sub_campaign_id` on `arcs`, `quests`, and `game_sessions` (renaming `group_id`) to each row's campaign's default sub-campaign where currently unset, (e) adds the NOT NULL constraint on all three `sub_campaign_id` columns
- [x] 1.6 Update `server/db/schema/index.ts` exports for the renamed table

## 2. Campaign creation seeding

- [x] 2.1 Add a `createDefaultSubCampaign(db, campaignId)` helper (alongside `seedEntityTypes`/`seedRelationTypes`) that inserts the "General" `isDefault: true` sub-campaign
- [x] 2.2 Call it from `server/api/campaigns/index.post.ts` in the same sequence as the existing seeding calls
- [x] 2.3 Add a unit test asserting a newly created campaign has exactly one sub-campaign with `isDefault: true`

## 3. Sub-campaign API

- [x] 3.1 Move `server/api/campaigns/[id]/session-groups/**` to `server/api/campaigns/[id]/sub-campaigns/**` (list, create, update, delete, image get/post), updating table references to `subCampaigns`
- [x] 3.2 In the delete handler, reject with 422 if the target is the default sub-campaign; otherwise reassign all arcs/sessions/quests pointing at it to the campaign's default sub-campaign in the same transaction, then delete the row
- [x] 3.3 Add unit/integration tests: create, list, update (including renaming the default), delete-non-default-reassigns-children, delete-default-rejected-422

## 4. Arc and quest sub-campaign assignment

- [x] 4.1 `POST /api/campaigns/[id]/arcs` and `PUT .../arcs/[slug]` — accept `subCampaignSlug`, resolve against the campaign's sub-campaigns (404 on unknown, 409 on ambiguous), default to the campaign's default sub-campaign when omitted on create
- [x] 4.2 `GET /api/campaigns/[id]/arcs` — accept `subCampaignSlug` query filter, applied before pagination
- [x] 4.3 Repeat 4.1–4.2 for `server/api/campaigns/[id]/quests/**`
- [x] 4.4 Integration tests mirroring the existing `arcSlug` resolution tests on sessions (unknown slug 404, cross-campaign slug 404, default-on-omit)

## 5. Session sub-campaign assignment

- [x] 5.1 `server/api/campaigns/[id]/sessions/index.post.ts` — accept `subCampaignSlug`, default to the campaign's default sub-campaign when omitted, rename internal `groupSlug` handling to `subCampaignSlug`
- [x] 5.2 `server/api/campaigns/[id]/sessions/[slug]/index.put.ts` — accept `subCampaignSlug` to reassign
- [x] 5.3 `server/api/campaigns/[id]/sessions/index.get.ts` — rename `groupSlug` query param and `groupName` projection field to `subCampaignSlug`/`subCampaignName`
- [x] 5.4 Update/rename existing tests referencing `groupSlug`/`groupName` to `subCampaignSlug`/`subCampaignName`

## 6. Frontend (discovered mid-implementation — not in the original design)

> The original `design.md` claimed `session_groups` had no frontend footprint, based on
> a broken `rg` search (used `\|` instead of `|` for alternation, so it silently matched
> nothing). It does: a full management page, a composable, and usage inside the session
> create/edit form and list page. Fixed under apply-time option 2 (rename what exists,
> no new arc/quest UI) — see conversation for the pause/resume.

- [x] 6.1 `app/composables/useSessionApi.ts` — rename `getSessionGroups`/`createSessionGroup`/`updateSessionGroup`/`deleteSessionGroup` to their `SubCampaign` equivalents, point at `/sub-campaigns`
- [x] 6.2 Move `app/pages/campaigns/[id]/session-groups/index.vue` to `app/pages/campaigns/[id]/sub-campaigns/index.vue`, rename internals, show an "isDefault" badge, hide delete for the default
- [x] 6.3 `app/components/forms/SessionForm.vue` — rename `groupSlug` to `subCampaignSlug`, fetch from `/sub-campaigns`, default the picker to the campaign's default sub-campaign, drop the now-meaningless "no group" option
- [x] 6.4 `app/pages/campaigns/[id]/sessions/new.vue` and `[slug]/edit.vue` — rename `groupSlug` to `subCampaignSlug` in form state
- [x] 6.5 `app/pages/campaigns/[id]/sessions/index.vue` — rename group tabs/state to sub-campaigns, update link to `/sub-campaigns`
- [x] 6.6 `i18n/locales/en.json` / `es.json` — rename `sessionGroups.*` to `subCampaigns.*`, rename `sessions.group`/`groups`/`allGroups`/`noGroup` keys

## 7. Campaign export/import

- [x] 7.1 `server/services/campaign-export.ts` — rename the `sessionGroups` result key to `subCampaigns`, include `isDefault` in the exported columns
- [x] 7.2 `server/services/campaign-import.ts` — write to `subCampaigns`; on read, accept both `subCampaigns` (new) and `sessionGroups` (legacy exports) for backward compatibility, defaulting `isDefault: false` for legacy rows and ensuring the imported campaign still ends up with exactly one default (synthesize one if none of the legacy rows qualifies)
- [x] 7.3 Update export/import round-trip tests

## 8. CLI

- [x] 8.1 Rename `cli/src/commands/session-group.js` to `cli/src/commands/sub-campaign.js`; rename the command from `session-group` to `sub-campaign`, update its registration in the CLI entrypoint
- [x] 8.2 Add `--subcampaign <slug>` to `arc create`, `arc update`, `arc list` in `cli/src/commands/arc.js`
- [x] 8.3 Add `--subcampaign <slug>` to `quest create`, `quest update`, `quest list` in `cli/src/commands/quest.js`
- [x] 8.4 In `cli/src/commands/session.js`, rename `--group` to `--subcampaign`; keep `--group` accepted as a deprecated alias that maps to the same `subCampaignSlug` body/query field for this release
- [x] 8.5 Update `docs/claude-skill.md` with the new `sub-campaign` command and `--subcampaign` options
- [x] 8.6 Update `.claude/skills/aleph-cli/SKILL.md` to mirror the same documentation, bump its `version` frontmatter

## 9. Verification

- [x] 9.1 Run full unit + integration suite, confirm no lingering references to `groupSlug`/`groupId`/`session-groups` outside the deprecated CLI alias
- [x] 9.2 Manually verify against a real campaign: create a second sub-campaign, move an existing arc/session/quest into it, confirm the default sub-campaign still holds everything else, delete the new sub-campaign and confirm reassignment
