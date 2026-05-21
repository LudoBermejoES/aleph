## 1. Schema and migration

- [x] 1.1 Add `entityId: text('entity_id').references(() => entities.id)` to the `organizations` table in `server/db/schema/organizations.ts` (or wherever the org schema lives)
- [x] 1.2 Run `npm run db:generate` to produce migration `0028_slow_white_queen.sql` (timestamp fixed to 1779667200000, greater than 0027's 1779580800000)
- [x] 1.3 Hand-edit the generated migration to backfill: for each existing organization, insert an `entities` row with `type = 'organization'`, mirroring `name`/`slug`/`visibility`, and set `organizations.entity_id` to the new entity row's id
- [x] 1.4 Handle slug collisions in the backfill: if a row already exists in `entities` with the same `(campaignId, slug)` as the org, write the entity row with slug `<orig>-org` instead; the org's own `slug` stays unchanged
- [x] 1.5 Verify FK cascade from `entities` to `entityRelations`; already present (`onDelete: 'cascade'` on both sourceEntityId and targetEntityId)

## 2. Server: paired-row helpers

- [x] 2.1 Add helper `createOrganizationWithEntity(db, campaignId, orgData)` in `server/services/organizations.ts` (create file if missing) that inserts both rows in one transaction
- [x] 2.2 Add helper `updateOrganizationWithEntity(db, orgId, patch)` that updates org fields and syncs `name`/`slug`/`visibility` on the paired entity row
- [x] 2.3 Add helper `deleteOrganizationWithEntity(db, orgId)` that deletes both rows in one transaction
- [x] 2.4 Wire `server/api/campaigns/[id]/organizations/index.post.ts` to call `createOrganizationWithEntity` (replace the direct `db.insert(organizations)`); include `entityId` in the response payload
- [x] 2.5 Wire `server/api/campaigns/[id]/organizations/[slug]/index.put.ts` to call `updateOrganizationWithEntity` (handle slug recomputation + sync)
- [x] 2.6 Wire `server/api/campaigns/[id]/organizations/[slug]/index.delete.ts` to call `deleteOrganizationWithEntity`

## 3. Server: entity slug resolution

- [x] 3.1 Verify `GET /api/campaigns/[id]/entities/[slug]/index.get.ts` already returns the org's entity row once the entity_id link exists (no code change expected); covered by integration test
- [x] 3.2 Ensure the organization list/detail responses include `entityId` so UI/CLI callers can pivot to the entity endpoint without an extra lookup

## 4. Tests

- [x] 4.1 Add unit tests for the three helpers covering the happy path and slug-collision rename
- [x] 4.2 Add integration test `tests/integration/organizations-as-entities.test.ts`:
  - org create returns `entityId`, entity row exists with `type: 'organization'`
  - org rename updates both rows
  - org delete removes both rows
  - `GET /entities/:org-slug` returns the entity row
  - `POST /relations` with org entity id as source succeeds and the relation appears on both endpoints' relation lists
  - relation create with org-to-org succeeds
  - non-admin / unauthenticated cases unchanged
- [ ] 4.3 Run the migration locally against a copy of the prod DB to confirm backfill correctness (number of `entities` rows of `type='organization'` equals number of `organizations` rows)
- [ ] 4.4 Verify the existing `tests/integration/organizations.test.ts` still passes (requires healthy server — restart dev server after migration 0027 fix applied to `__drizzle_migrations`)

## 5. CLI and docs

- [ ] 5.1 Confirm `aleph relation create --source <org-slug> --target <any-slug>` works against the dev server (no CLI code change expected)
- [x] 5.2 Update `docs/claude-skill.md` to add an example of `relation create` with an organization slug and a short note that orgs are first-class entities for relation purposes
- [x] 5.3 Mirror the same update in `.claude/skills/aleph-cli/SKILL.md` and bump its frontmatter `version` to 3.3

## 6. Verification

- [x] 6.1 Unit tests: 1132/1132 pass. Integration tests require server restart (see 4.4 note)
- [ ] 6.2 Manually create an org via the UI on a dev server, then create a relation from it to a character via the CLI; verify the relation appears on both detail pages
- [ ] 6.3 Re-run the original failing command from the 2026-05-17 session as a smoke test: `aleph relation create --source los-senores-del-tigre --target la-pequena-flor --forward arrasó --reverse "arrasada por"` — expect success
