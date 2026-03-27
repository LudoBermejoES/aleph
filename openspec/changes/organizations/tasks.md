## 1. Database Schema

- [ ] 1.1 Create `server/db/schema/organizations.ts` defining the `organizations` table (id, campaignId, name, slug, description, type, status, createdAt, updatedAt) and the `organization_members` join table (organizationId, characterId, role) with ON DELETE CASCADE on both FKs
- [ ] 1.2 Export both new tables from `server/db/schema/index.ts`
- [ ] 1.3 Generate Drizzle migration (`npx drizzle-kit generate`) and verify the generated SQL is correct
- [ ] 1.4 Apply migration (`npx drizzle-kit migrate`) against the dev database

## 2. Server API — Organization CRUD

- [ ] 2.1 Create `server/api/campaigns/[id]/organizations/index.get.ts` — list organizations with memberCount via JOIN; enforce auth (any campaign role); return 401 if unauthenticated
- [ ] 2.2 Create `server/api/campaigns/[id]/organizations/index.post.ts` — create organization; generate slug from name; validate required `name`; enforce dm/co_dm/editor roles; return 409 on slug collision; return 201 with new org
- [ ] 2.3 Create `server/api/campaigns/[id]/organizations/[slug]/index.get.ts` — return organization detail with `members` array (characterId, characterName, characterSlug, role); return 404 if not found; enforce auth
- [ ] 2.4 Create `server/api/campaigns/[id]/organizations/[slug]/index.put.ts` — update organization fields; re-generate slug if name changes and validate uniqueness (409 on conflict); enforce dm/co_dm/editor roles
- [ ] 2.5 Create `server/api/campaigns/[id]/organizations/[slug]/index.delete.ts` — delete organization (members cascade); enforce dm/co_dm roles; return 204

## 3. Server API — Member Management

- [ ] 3.1 Create `server/api/campaigns/[id]/organizations/[slug]/members/index.post.ts` — add character to organization; validate character belongs to campaign; return 409 on duplicate; enforce dm/co_dm/editor roles; return 201
- [ ] 3.2 Create `server/api/campaigns/[id]/organizations/[slug]/members/[characterId]/index.delete.ts` — remove character from organization; return 404 if not a member; enforce dm/co_dm/editor roles; return 204

## 4. Frontend — i18n Keys

- [ ] 4.1 Add `organizations` namespace keys to `app/i18n/locales/en.json` (title, new, edit, detail labels, type/status enum labels, members section headers, empty state messages, member add/remove actions)
- [ ] 4.2 Add translated equivalents to `app/i18n/locales/es.json`

## 5. Frontend — Campaign Sidebar

- [ ] 5.1 Add an "Organizations" nav entry to the campaign nav links array in `app/layouts/default.vue`, pointing to `/campaigns/${id}/organizations`, using the i18n key `layout.organizations`
- [ ] 5.2 Add `layout.organizations` key to `en.json` and `es.json`

## 6. Frontend — Organization Pages

- [ ] 6.1 Create `app/pages/campaigns/[id]/organizations/index.vue` — list page fetching from `GET /api/campaigns/:id/organizations`; display name, type badge, status badge, member count; show "New Organization" button for dm/co_dm/editor; handle empty state
- [ ] 6.2 Create `app/pages/campaigns/[id]/organizations/new.vue` — create form with fields: name (required), type (select), status (select), description (textarea); submit to POST endpoint; redirect to detail page on success; show inline validation error for missing name
- [ ] 6.3 Create `app/pages/campaigns/[id]/organizations/[slug]/index.vue` — detail page fetching from GET `:slug`; display org info + member table (character name, role, remove button for dm/co_dm/editor); include "Add Member" UI (character picker + role input) for dm/co_dm/editor; show "Edit" button for dm/co_dm/editor
- [ ] 6.4 Create `app/pages/campaigns/[id]/organizations/[slug]/edit.vue` — edit form pre-filled with existing org data; submit to PUT endpoint; redirect to detail page on success; redirect/403 for player role

## 7. Frontend — Character Detail Page Update

- [ ] 7.1 Update `app/pages/campaigns/[id]/characters/[slug]/index.vue` to fetch and display an "Organizations" section listing the character's organization memberships (name + role, each name linking to the org detail page); show empty state when no memberships; update the character detail API or add a separate fetch as needed

## 8. aleph-cli

- [ ] 8.1 Create `cli/src/commands/organization.js` with `makeOrganizationCommand()` exporting subcommands: `list` (--campaign, --json), `create` (--campaign, --name required, --type, --status, --description, --json), `show <slug>` (--campaign, --json), `delete <slug>` (--campaign), `member-add <slug>` (--campaign, --character required, --role, --json), `member-remove <slug>` (--campaign, --character required)
- [ ] 8.2 Import `makeOrganizationCommand` in `cli/src/index.js` and register it with `program.addCommand(makeOrganizationCommand())`
- [ ] 8.3 Update `docs/claude-skill.md` to document the `organization` command group with usage examples for all subcommands

## 9. Unit Tests

- [ ] 9.1 Create `tests/unit/server/organization-service.test.ts` — unit tests for slug generation logic, slug collision detection, and memberCount computation (using an in-memory SQLite DB or mocks consistent with existing unit test patterns)
- [ ] 9.2 Create `tests/unit/components/organization-components.test.ts` — component tests for the organization list item (renders name, type, status, count), the member row (renders name, role, remove button based on role), and the empty state

## 10. Integration Tests

- [ ] 10.1 Create `tests/integration/organizations.test.ts` — integration tests against a running server (port 3333) covering:
  - GET /organizations returns 401 when unauthenticated
  - GET /organizations returns empty array for new campaign
  - POST /organizations creates org and returns 201 (dm role)
  - POST /organizations returns 403 for player role
  - POST /organizations returns 400 with missing name
  - POST /organizations returns 409 on duplicate slug within same campaign
  - GET /organizations/:slug returns org with members array
  - GET /organizations/:slug returns 404 for unknown slug
  - PUT /organizations/:slug updates fields (dm role)
  - PUT /organizations/:slug returns 409 on slug collision via name change
  - DELETE /organizations/:slug deletes org and cascades members (dm role)
  - DELETE /organizations/:slug returns 403 for editor role
- [ ] 10.2 Create `tests/integration/organization-members.test.ts` — covering:
  - POST /members adds character (dm role), returns 201
  - POST /members with no role stores null role, returns 201
  - POST /members returns 409 on duplicate
  - POST /members returns 404 for character not in campaign
  - POST /members returns 403 for player role
  - DELETE /members/:characterId removes member, returns 204
  - DELETE /members/:characterId returns 404 for non-member
  - DELETE /members/:characterId returns 403 for player role

## 11. E2E Tests

- [ ] 11.1 Create `tests/e2e/organizations.spec.ts` — E2E tests for the list page:
  - DM sees the Organizations link in the sidebar
  - Empty state renders when no organizations exist
  - DM creates an organization via the form and it appears in the list
  - List shows name, type badge, status badge, member count
  - Player sees the list but no "New Organization" button
- [ ] 11.2 Create `tests/e2e/organization-detail.spec.ts` — E2E tests for the detail page:
  - DM navigates to detail page and sees org info + member list
  - DM adds a member via the picker; new member appears in list
  - DM removes a member; member disappears from list
  - Player sees detail page but no Edit button or Remove buttons
  - Character detail page shows the "Organizations" section for a member character

## 12. Verification

- [ ] 12.1 Run unit tests: `npx vitest run tests/unit`
- [ ] 12.2 Run integration tests (server must be running on port 3333): `npx vitest run tests/integration`
- [ ] 12.3 Run E2E tests: `npx playwright test tests/e2e/organizations.spec.ts tests/e2e/organization-detail.spec.ts`
- [ ] 12.4 Run full lint check: `npx eslint . --ext .ts,.vue`
- [ ] 12.5 Run production build to verify no type errors: `npx nuxt build`
