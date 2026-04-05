# Tasks: Campaign Data Export

## 1. Export Service

- [x] 1.1 Create `server/services/campaign-export.ts` with `buildCampaignExport(db, options)` function
- [x] 1.2 Define `CampaignExport` TypeScript interface and valid resource type keys
- [x] 1.3 Implement data assembly: query each resource type for the campaign (entities, characters, sessions, session groups, locations, organizations, quests, maps, calendars, timelines, relations, relation types, items, inventories, currencies, shops, transactions, arcs, chapters, rolls, tags, templates, mentions, members, entity types)
- [x] 1.4 Implement selective filtering: accept `include` array and skip resource types not listed
- [x] 1.5 Add export envelope fields: `version`, `exportedAt`, `generator`

## 2. Server Endpoint

- [x] 2.1 Create `server/api/campaigns/[id]/export.get.ts`
- [x] 2.2 Add RBAC check: require `dm` or `co_dm` role, return 403 otherwise
- [x] 2.3 Parse `include` query parameter (comma-separated string to array)
- [x] 2.4 Call `buildCampaignExport` and return JSON response with `Content-Disposition` header (`campaign-<slug>-export-<YYYY-MM-DD>.json`)
- [x] 2.5 Handle 404 for non-existent campaign

## 3. Frontend Export Button

- [x] 3.1 Add "Export Campaign" button to the campaign dashboard page (visible only for `dm` / `co_dm`)
- [x] 3.2 Implement download handler: fetch the export endpoint, create Blob, trigger download via temporary `<a>` element
- [x] 3.3 Add loading state and error handling (toast on failure)

## 4. CLI Command

- [x] 4.1 Add `export` subcommand to `cli/src/commands/campaign.js`
- [x] 4.2 Implement `--format json` flag (default, only option for v1)
- [x] 4.3 Implement `--include <types>` flag (comma-separated)
- [x] 4.4 Implement `--output <file>` flag (write to file; default: stdout)
- [x] 4.5 Handle error responses (404, 403) with user-friendly messages

## 5. i18n

- [x] 5.1 Add export-related keys to `i18n/locales/en.json` (`campaign.export`, `campaign.exportButton`, `campaign.exportSuccess`, `campaign.exportError`)
- [x] 5.2 Add corresponding keys to `i18n/locales/es.json`

## 6. Skill File Updates

- [x] 6.1 Update `docs/claude-skill.md` with `campaign export` command documentation
- [x] 6.2 Update `.claude/skills/aleph-cli/SKILL.md` with `campaign export` command documentation and bump version

## 7. Testing

### Unit Tests

- [x] 7.1 Test `buildCampaignExport` returns correct envelope fields (version, exportedAt, generator)
- [x] 7.2 Test full export includes all resource type keys
- [x] 7.3 Test selective export includes only requested resource types plus campaign
- [x] 7.4 Test selective export ignores invalid resource type keys
- [x] 7.5 Test export of campaign with no child data returns empty arrays

### Integration Tests

- [x] 7.6 Test `GET /api/campaigns/:id/export` returns 200 with valid JSON for DM
- [x] 7.7 Test export response includes `Content-Disposition` header with correct filename
- [x] 7.8 Test export with `?include=entities,characters` returns only those resource types
- [x] 7.9 Test export returns 403 for player role
- [x] 7.10 Test export returns 401 for unauthenticated request
- [x] 7.11 Test export returns 404 for non-existent campaign
- [x] 7.12 Test export returns 403 for non-member

### E2E Tests

- [x] 7.13 E2E: DM sees export button on campaign dashboard
- [x] 7.14 E2E: player does not see export button on campaign dashboard
- [x] 7.15 E2E: clicking export button triggers file download

## 8. Verification

- [x] 8.1 Run full unit test suite: `npx vitest run tests/unit/`
- [x] 8.2 Run integration tests: `npx vitest run tests/integration/`
- [x] 8.3 Run E2E tests: `npx playwright test`
- [x] 8.4 Run lint: `npx nuxt lint`
- [x] 8.5 Run build: `npx nuxt build`
