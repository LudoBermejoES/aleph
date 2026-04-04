# Tasks: Campaign Data Export

## 1. Export Service

- [ ] 1.1 Create `server/services/campaign-export.ts` with `buildCampaignExport(db, options)` function
- [ ] 1.2 Define `CampaignExport` TypeScript interface and valid resource type keys
- [ ] 1.3 Implement data assembly: query each resource type for the campaign (entities, characters, sessions, session groups, locations, organizations, quests, maps, calendars, timelines, relations, relation types, items, inventories, currencies, shops, transactions, arcs, chapters, rolls, tags, templates, mentions, members, entity types)
- [ ] 1.4 Implement selective filtering: accept `include` array and skip resource types not listed
- [ ] 1.5 Add export envelope fields: `version`, `exportedAt`, `generator`

## 2. Server Endpoint

- [ ] 2.1 Create `server/api/campaigns/[id]/export.get.ts`
- [ ] 2.2 Add RBAC check: require `dm` or `co_dm` role, return 403 otherwise
- [ ] 2.3 Parse `include` query parameter (comma-separated string to array)
- [ ] 2.4 Call `buildCampaignExport` and return JSON response with `Content-Disposition` header (`campaign-<slug>-export-<YYYY-MM-DD>.json`)
- [ ] 2.5 Handle 404 for non-existent campaign

## 3. Frontend Export Button

- [ ] 3.1 Add "Export Campaign" button to the campaign dashboard page (visible only for `dm` / `co_dm`)
- [ ] 3.2 Implement download handler: fetch the export endpoint, create Blob, trigger download via temporary `<a>` element
- [ ] 3.3 Add loading state and error handling (toast on failure)

## 4. CLI Command

- [ ] 4.1 Add `export` subcommand to `cli/src/commands/campaign.js`
- [ ] 4.2 Implement `--format json` flag (default, only option for v1)
- [ ] 4.3 Implement `--include <types>` flag (comma-separated)
- [ ] 4.4 Implement `--output <file>` flag (write to file; default: stdout)
- [ ] 4.5 Handle error responses (404, 403) with user-friendly messages

## 5. i18n

- [ ] 5.1 Add export-related keys to `i18n/locales/en.json` (`campaign.export`, `campaign.exportButton`, `campaign.exportSuccess`, `campaign.exportError`)
- [ ] 5.2 Add corresponding keys to `i18n/locales/es.json`

## 6. Skill File Updates

- [ ] 6.1 Update `docs/claude-skill.md` with `campaign export` command documentation
- [ ] 6.2 Update `.claude/skills/aleph-cli/SKILL.md` with `campaign export` command documentation and bump version

## 7. Testing

### Unit Tests

- [ ] 7.1 Test `buildCampaignExport` returns correct envelope fields (version, exportedAt, generator)
- [ ] 7.2 Test full export includes all resource type keys
- [ ] 7.3 Test selective export includes only requested resource types plus campaign
- [ ] 7.4 Test selective export ignores invalid resource type keys
- [ ] 7.5 Test export of campaign with no child data returns empty arrays

### Integration Tests

- [ ] 7.6 Test `GET /api/campaigns/:id/export` returns 200 with valid JSON for DM
- [ ] 7.7 Test export response includes `Content-Disposition` header with correct filename
- [ ] 7.8 Test export with `?include=entities,characters` returns only those resource types
- [ ] 7.9 Test export returns 403 for player role
- [ ] 7.10 Test export returns 401 for unauthenticated request
- [ ] 7.11 Test export returns 404 for non-existent campaign
- [ ] 7.12 Test export returns 403 for non-member

### E2E Tests

- [ ] 7.13 E2E: DM sees export button on campaign dashboard
- [ ] 7.14 E2E: player does not see export button on campaign dashboard
- [ ] 7.15 E2E: clicking export button triggers file download

## 8. Verification

- [ ] 8.1 Run full unit test suite: `npx vitest run tests/unit/`
- [ ] 8.2 Run integration tests: `npx vitest run tests/integration/`
- [ ] 8.3 Run E2E tests: `npx playwright test`
- [ ] 8.4 Run lint: `npx nuxt lint`
- [ ] 8.5 Run build: `npx nuxt build`
