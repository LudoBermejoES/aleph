## 1. Server — Verify & expose existing fields

- [x] 1.1 Confirm `characters.locationEntityId` is returned by `GET /api/campaigns/[id]/characters/[slug]` and accepted by the PUT endpoint; add it to both if missing
- [x] 1.2 Confirm `entity_relations` table supports `located_in` as a `relationType` value; add to enum/check constraint if needed

## 2. Server — Location list & detail endpoints

- [x] 2.1 Create `server/api/campaigns/[id]/locations/index.get.ts` — query entities with `type = 'location'`, apply visibility filtering, return list with `{ id, name, slug, subtype, parentId, parentName, childCount, inhabitantCount }`, support `?parentId`, `?subtype`, `?search`
- [x] 2.2 Create `server/api/campaigns/[id]/locations/index.post.ts` — create location entity + markdown file, validate subtype, return created location
- [x] 2.3 Create `server/api/campaigns/[id]/locations/[slug].get.ts` — return location with `content`, `ancestors` array, `subtype`
- [x] 2.4 Create `server/api/campaigns/[id]/locations/[slug].put.ts` — update location entity + markdown file
- [x] 2.5 Create `server/api/campaigns/[id]/locations/[slug].delete.ts` — delete entity + file, require co_dm+

## 3. Server — Sub-locations, inhabitants, organizations endpoints

- [x] 3.1 Create `server/api/campaigns/[id]/locations/[slug]/sub-locations.get.ts` — return direct children (parentId = this entity id)
- [x] 3.2 Create `server/api/campaigns/[id]/locations/[slug]/inhabitants.get.ts` — return primary inhabitants (characters.locationEntityId) + relation-linked characters, deduplicated with `source` field
- [x] 3.3 Create `server/api/campaigns/[id]/locations/[slug]/inhabitants.post.ts` — create `entity_relations` row linking character to location (located_in)
- [x] 3.4 Create `server/api/campaigns/[id]/locations/[slug]/inhabitants/[characterId].delete.ts` — remove entity_relations row
- [x] 3.5 Create `server/api/campaigns/[id]/locations/[slug]/organizations.get.ts` — return organizations linked via entity_relations (located_in)
- [x] 3.6 Create `server/api/campaigns/[id]/locations/[slug]/organizations.post.ts` — link organization to location via entity_relations
- [x] 3.7 Create `server/api/campaigns/[id]/locations/[slug]/organizations/[organizationId].delete.ts` — unlink organization

## 4. Server — Character API: expose locationEntityId

- [x] 4.1 Add `locationId` and `locationName` to the `GET /api/campaigns/[id]/characters/[slug]` response (join to entities for name)
- [x] 4.2 Accept `locationId` in `PUT /api/campaigns/[id]/characters/[slug]` body and update `characters.locationEntityId`

## 5. Frontend — useCampaignApi: add location methods

- [x] 5.1 Add to `app/composables/useCampaignApi.ts`: `getLocations(params?)`, `getLocation(slug)`, `createLocation(data)`, `updateLocation(slug, data)`, `deleteLocation(slug)`, `getSubLocations(slug)`, `getLocationInhabitants(slug)`, `addLocationInhabitant(slug, characterId)`, `removeLocationInhabitant(slug, characterId)`, `getLocationOrganizations(slug)`, `addLocationOrganization(slug, organizationId)`, `removeLocationOrganization(slug, organizationId)`

## 6. Frontend — LocationForm component

- [x] 6.1 Create `app/components/forms/LocationForm.vue` — fields: Name (required), Subtype (select with built-in options), Parent Location (select from campaign locations, optional), Visibility (select), Description (MarkdownEditor); expose `clearDraft` (autosave support)

## 7. Frontend — Location pages

- [x] 7.1 Create `app/pages/campaigns/[id]/locations/index.vue` — list page with search, subtype filter, "New Location" button; show name, subtype badge, parent breadcrumb, inhabitant count
- [x] 7.2 Create `app/pages/campaigns/[id]/locations/new.vue` — create form using LocationForm, redirect to detail on success
- [x] 7.3 Create `app/pages/campaigns/[id]/locations/[slug]/index.vue` — detail page: description, ancestors breadcrumb, Sub-locations panel, Inhabitants panel (with add/remove for editors+), Organizations panel (with add/remove for editors+), Maps panel (linked map pins), Edit/Delete buttons
- [x] 7.4 Create `app/pages/campaigns/[id]/locations/[slug]/edit.vue` — edit form using LocationForm

## 8. Frontend — Character form: location picker

- [x] 8.1 Add "Current Location" select to `CharacterForm.vue` — populated by `getLocations()`, with a "None" option; binds to `form.locationId`
- [x] 8.2 Show current location as a link on the character detail page (`app/pages/campaigns/[id]/characters/[slug]/index.vue`)

## 9. Frontend — Organization detail: locations panel

- [x] 9.1 Add a "Locations" panel to `app/pages/campaigns/[id]/organizations/[slug]/index.vue` — shows linked locations with add (select from location list) and remove controls for editors+

## 10. i18n

- [x] 10.1 Add location strings to `i18n/locales/en.json` and `i18n/locales/es.json` — key group `locations.*`: title, new, edit, detail, subtypes (all 11), fields (name, subtype, parent, visibility, description), panels (subLocations, inhabitants, organizations, maps), actions (add, remove, noInhabitants, noOrganizations, noSubLocations, noMaps)

## 11. Campaign sidebar navigation

- [x] 11.1 Add "Locations" link to the campaign sidebar navigation component

## 12. CLI — location command

- [x] 12.1 Create `cli/src/commands/location.js` — sub-commands: `list` (`--campaign`, `--subtype`, `--parent`, `--search`, `--json`), `create` (`--campaign`, `--name`, `--subtype`, `--parent`, `--content`, `--json`), `show <slug>` (`--campaign`, `--json`), `edit <slug>` (`--campaign`, `--name`, `--subtype`, `--parent`, `--content`, `--stdin`, `--json`), `delete <slug>` (`--campaign`, `--yes`)
- [x] 12.2 Add `location inhabitants` sub-commands: `list <slug>`, `add <slug> --character <id>`, `remove <slug> --character <id>` — hitting `/api/campaigns/:id/locations/:slug/inhabitants`
- [x] 12.3 Add `location organizations` sub-commands: `list <slug>`, `add <slug> --organization <id>`, `remove <slug> --organization <id>` — hitting `/api/campaigns/:id/locations/:slug/organizations`
- [x] 12.4 Register the `location` command in `cli/bin/aleph.js`
- [x] 12.5 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` to document all `aleph location` sub-commands

## 13. Integration Tests

- [x] 13.1 Write `tests/integration/locations.test.ts` — test: create location, list locations, get detail, update, delete, sub-locations, add/remove inhabitant, add/remove organization, 401/403 guards

## 14. E2E Tests

- [x] 14.1 Write `tests/e2e/locations.spec.ts` — test: create location, navigate to detail, verify sub-location panel; create character with location, verify location shown on character detail; add organization to location from detail page
