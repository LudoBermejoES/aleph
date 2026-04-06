## 1. Import Service

- [x] 1.1 Create `server/services/campaign-import.ts` with `CampaignImportOptions` interface and `importCampaign(db, payload, importingUserId, nameOverride?)` function
- [x] 1.2 Implement ID remap map builder: iterate all resource arrays in export, generate new nanoid for each record, store `oldId → newId` mapping
- [x] 1.3 Implement dependency-ordered insertion: campaign → tags/entityTypes → templates/fields → entities → characters → sessionGroups/arcs → chapters → sessions → quests → maps/calendars/timelines → relationTypes/relations → currencies/items → shops/inventories → transactions → rolls → mentions
- [x] 1.4 Implement foreign key substitution helper: replace all known FK fields in each resource record using the ID map before insertion
- [x] 1.5 Wrap all insertions in a single `db.transaction()` call so any failure rolls back the full import
- [x] 1.6 Implement name deduplication: if campaign name exists for user, append ` (imported YYYY-MM-DD)`
- [x] 1.7 Assign importing user as `dm` in `campaignMembers` after campaign creation
- [x] 1.8 Skip `members` array from import payload entirely

## 2. API Endpoint

- [x] 2.1 Create `server/api/campaigns/import.post.ts`
- [x] 2.2 Add auth check: reject with 401 if no session/API key
- [x] 2.3 Add payload validation: require `version === "1.0"`, `campaign` object present; return 422 with message on failure
- [x] 2.4 Parse optional `?name=` query param and pass as `nameOverride` to import service
- [x] 2.5 Call `importCampaign(db, body, userId, nameOverride)` and return 201 with `{ id, name, slug }`
- [x] 2.6 Catch errors and return 500 with message; ensure no partial data is left (relies on transaction rollback)

## 3. Unit Tests

- [x] 3.1 Create `tests/unit/server/campaign-import.test.ts`
- [x] 3.2 Test ID remap: given a minimal export payload, all IDs in result records are new and consistent
- [x] 3.3 Test foreign key substitution: `entity.campaignId`, `character.entityId`, `session.sessionGroupId`, `relation.fromEntityId/toEntityId` are all remapped
- [x] 3.4 Test partial export: missing resource type arrays are skipped without error
- [x] 3.5 Test members array is ignored: no `campaignMembers` rows created from export members
- [x] 3.6 Test name deduplication logic in isolation

## 4. Integration Tests

- [x] 4.1 Create `tests/integration/campaign-import.test.ts`
- [x] 4.2 Test successful full import: POST valid export → 201, new campaign in DB, all resource counts match
- [x] 4.3 Test unauthenticated request returns 401
- [x] 4.4 Test unsupported version returns 422
- [x] 4.5 Test missing `campaign` envelope returns 422
- [x] 4.6 Test `?name=` override sets campaign name
- [x] 4.7 Test duplicate name appends suffix
- [x] 4.8 Test API key authentication works

## 5. Frontend

- [x] 5.1 Add "Import Campaign" button to `app/pages/campaigns/index.vue` (hidden file input + trigger button)
- [x] 5.2 Implement `handleImport` handler: read file via `FileReader`, parse JSON, POST to `/api/campaigns/import`
- [x] 5.3 Add loading state: disable button and show spinner while import is in progress
- [x] 5.4 On success: show success toast and navigate to new campaign page (`/campaigns/<id>`)
- [x] 5.5 On error: show error toast with server message, stay on page
- [x] 5.6 Add i18n keys to `i18n/locales/en.json` and `i18n/locales/es.json` for import button label, success message, and error message

## 6. CLI

- [x] 6.1 Add `campaign import <file>` subcommand to `cli/src/commands/campaign.js`
- [x] 6.2 Add `--name <name>` option to the import subcommand
- [x] 6.3 Implement handler: read and parse JSON file, POST to `/api/campaigns/import` with `X-API-Key` header
- [x] 6.4 On success: print new campaign ID and name, exit 0
- [x] 6.5 On file-not-found: print error, exit non-zero
- [x] 6.6 On server error: print error message from response, exit non-zero
- [x] 6.7 Update `docs/claude-skill.md` to document the new `campaign import` command
- [x] 6.8 Update `.claude/skills/aleph-cli/SKILL.md` to mirror the new command

## 7. E2E Tests

- [x] 7.1 Create `tests/e2e/campaign-import.spec.ts`
- [x] 7.2 Test: Import button is visible on campaigns list page for authenticated user
- [x] 7.3 Test: Selecting a valid export JSON file triggers import and redirects to new campaign page
- [x] 7.4 Test: Importing an invalid JSON file shows error notification
- [x] 7.5 Test: Imported campaign appears in the campaigns list with correct name
