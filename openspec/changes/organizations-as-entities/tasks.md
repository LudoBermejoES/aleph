## 1. Schema and migration

- [ ] 1.1 Add `entityId: text('entity_id').references(() => entities.id)` to the `organizations` table in `server/db/schema/organizations.ts` (or wherever the org schema lives)
- [ ] 1.2 Run `npm run db:generate` to produce migration `0028_organizations_as_entities.sql` (verify timestamp in `meta/_journal.json` is greater than every existing entry, per the bug fix in `6011c08`)
- [ ] 1.3 Hand-edit the generated migration to backfill: for each existing organization, insert an `entities` row with `type = 'organization'`, mirroring `name`/`slug`/`visibility`, and set `organizations.entity_id` to the new entity row's id
- [ ] 1.4 Handle slug collisions in the backfill: if a row already exists in `entities` with the same `(campaignId, slug)` as the org, write the entity row with slug `<orig>-org` instead; the org's own `slug` stays unchanged
- [ ] 1.5 Verify FK cascade from `entities` to `entityRelations`; if missing, add `ON DELETE CASCADE` in the same migration

## 2. Server: paired-row helpers

- [ ] 2.1 Add helper `createOrganizationWithEntity(db, campaignId, orgData)` in `server/services/organizations.ts` (create file if missing) that inserts both rows in one transaction
- [ ] 2.2 Add helper `updateOrganizationWithEntity(db, orgId, patch)` that updates org fields and syncs `name`/`slug`/`visibility` on the paired entity row
- [ ] 2.3 Add helper `deleteOrganizationWithEntity(db, orgId)` that deletes both rows in one transaction
- [ ] 2.4 Wire `server/api/campaigns/[id]/organizations/index.post.ts` to call `createOrganizationWithEntity` (replace the direct `db.insert(organizations)`); include `entityId` in the response payload
- [ ] 2.5 Wire `server/api/campaigns/[id]/organizations/[slug]/index.put.ts` to call `updateOrganizationWithEntity` (handle slug recomputation + sync)
- [ ] 2.6 Wire `server/api/campaigns/[id]/organizations/[slug]/index.delete.ts` to call `deleteOrganizationWithEntity`

## 3. Server: entity slug resolution

- [ ] 3.1 Verify `GET /api/campaigns/[id]/entities/[slug]/index.get.ts` already returns the org's entity row once the entity_id link exists (no code change expected); add an integration test to lock the behavior in
- [ ] 3.2 Ensure the organization list/detail responses include `entityId` so UI/CLI callers can pivot to the entity endpoint without an extra lookup

## 4. Tests

- [ ] 4.1 Add unit tests for the three helpers covering the happy path and slug-collision rename
- [ ] 4.2 Add integration test `tests/integration/organizations-as-entities.test.ts`:
  - org create returns `entityId`, entity row exists with `type: 'organization'`
  - org rename updates both rows
  - org delete removes both rows
  - `GET /entities/:org-slug` returns the entity row
  - `POST /relations` with org entity id as source succeeds and the relation appears on both endpoints' relation lists
  - relation create with org-to-org succeeds
  - non-admin / unauthenticated cases unchanged
- [ ] 4.3 Run the migration locally against a copy of the prod DB to confirm backfill correctness (number of `entities` rows of `type='organization'` equals number of `organizations` rows)
- [ ] 4.4 Verify the existing `tests/integration/organizations.test.ts` still passes

## 5. CLI and docs

- [ ] 5.1 Confirm `aleph relation create --source <org-slug> --target <any-slug>` works against the dev server (no CLI code change expected)
- [ ] 5.2 Update `docs/claude-skill.md` to add an example of `relation create` with an organization slug and a short note that orgs are first-class entities for relation purposes
- [ ] 5.3 Mirror the same update in `.claude/skills/aleph-cli/SKILL.md` and bump its frontmatter `version`

## 6. Verification

- [ ] 6.1 Run `npx vitest run tests/unit/ tests/integration/` and confirm no regressions
- [ ] 6.2 Manually create an org via the UI on a dev server, then create a relation from it to a character via the CLI; verify the relation appears on both detail pages
- [ ] 6.3 Re-run the original failing command from the 2026-05-17 session as a smoke test: `aleph relation create --source los-senores-del-tigre --target la-pequena-flor --forward arrasó --reverse "arrasada por"` — expect success
