## Why

TTRPG campaigns are fundamentally tied to place. Parties move between locations — kingdoms, cities, dungeons, ruins, taverns — and those places have inhabitants, factions, histories, and maps. Currently there is no dedicated Locations UI: locations exist in the generic entity system (type: "location") but have no specialized pages, no sub-location tree, no inhabitants list, and no map pin integration. DMs have no easy way to see who is in Barovia, which organizations control Castle Ravenloft, or that Strahd inhabits both the castle and the village.

## What Changes

- Dedicated Locations section in the campaign UI with list, detail, create, and edit pages
- Hierarchical sub-location tree (Barovia Region → Village of Barovia → The Blue Water Inn)
- Inhabitants panel on location detail: characters currently at the location (via `characters.locationEntityId`)
- Organizations present panel: organizations linked to the location via entity relations
- Characters and organizations can belong to multiple locations via entity relations (`located_in`)
- Location type picker with built-in subtypes: country, region, city, town, village, dungeon, lair, building, room, wilderness, other
- Integration with existing maps: map pins that link to location entities are shown on the location detail page
- Markdown editor for location lore (description), consistent with characters and entities

## Capabilities

### New Capabilities
- `location-management`: CRUD for locations as a first-class entity type — list, create, edit, delete, hierarchy, inhabitants, organizations

### Modified Capabilities
- `character-management`: Characters gain a "Current Location" field on their form and detail page that links to a location entity
- `organization-management`: Organizations gain a "Locations" panel on their detail page showing where they have a presence

## Impact

- New API routes: `server/api/campaigns/[id]/locations/` (list, create, detail, update, delete, sub-locations, inhabitants)
- New pages: `app/pages/campaigns/[id]/locations/` (index, new, [slug]/index, [slug]/edit)
- New component: `app/components/forms/LocationForm.vue`
- Modified: `CharacterForm.vue` + character pages → add location picker field
- Modified: `OrganizationForm.vue` + org detail page → show linked locations panel
- Modified: `server/api/campaigns/[id]/characters/[slug].put.ts` → accept and persist `locationEntityId`
- No new DB tables needed — uses existing `entities`, `characters.locationEntityId`, and `entity_relations` (`located_in`)
- **CLI impact**: The existing `aleph entity` command hits `/api/campaigns/:id/entities` (generic). The new dedicated `/api/campaigns/:id/locations/` routes require a new `aleph location` command for CRUD and a `location inhabitants` sub-command for managing inhabitants and organizations. The generic `entity` command will NOT reach the new endpoints.
- New CLI command file: `cli/src/commands/location.js`
- Update `cli/bin/aleph.js` to register the new `location` command
- Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` to document `aleph location` commands
- New DB migration: add `NOT NULL` default to `characters.locationEntityId` if missing (check current state first)
