## Why

Many resources in Aleph have incomplete CRUD coverage. They can be created (and sometimes updated) but lack update and/or delete endpoints. This means DMs cannot remove obsolete quests, reorganize arcs, clean up unused items, or delete stale calendar events without direct database access. These gaps break the management workflow and leave orphaned data that clutters the campaign.

## What Changes

Add the missing PUT (update) and DELETE endpoints across 15 resource types. Each new endpoint follows the established patterns: role-based authorization via `hasMinRole`, campaign-scoped lookups, and reliance on SQLite cascade deletes where foreign keys are already configured.

**New DELETE endpoints:**
- `DELETE /api/campaigns/:id/quests/:slug`
- `DELETE /api/campaigns/:id/items/:itemId`
- `DELETE /api/campaigns/:id/calendars/:calendarId`
- `DELETE /api/campaigns/:id/calendars/:calendarId/events/:eventId`
- `DELETE /api/campaigns/:id/timelines/:slug`
- `DELETE /api/campaigns/:id/timelines/:slug/events/:eventId`
- `DELETE /api/campaigns/:id/arcs/:slug`
- `DELETE /api/campaigns/:id/chapters/:slug`
- `DELETE /api/campaigns/:id/shops/:slug`
- `DELETE /api/campaigns/:id/currencies/:currencyId`
- `DELETE /api/campaigns/:id/characters/:slug/abilities/:abilityId`
- `DELETE /api/campaigns/:id/character-folders/:folderId`
- `DELETE /api/campaigns/:id/entity-types/:typeId`
- `DELETE /api/campaigns/:id/maps/:slug/layers/:layerId`
- `DELETE /api/campaigns/:id/maps/:slug/regions/:regionId`
- `DELETE /api/campaigns/:id/inventories/:inventoryId`
- `DELETE /api/campaigns/:id/inventories/:inventoryId/items/:itemId`
- `DELETE /api/campaigns/:id/sessions/:slug/content/:contentId`

**New PUT endpoints:**
- `PUT /api/campaigns/:id/items/:itemId`
- `PUT /api/campaigns/:id/timelines/:slug`
- `PUT /api/campaigns/:id/arcs/:slug`
- `PUT /api/campaigns/:id/chapters/:slug`
- `PUT /api/campaigns/:id/shops/:slug`
- `PUT /api/campaigns/:id/currencies/:currencyId`
- `PUT /api/campaigns/:id/character-folders/:folderId`
- `PUT /api/campaigns/:id/entity-types/:typeId`
- `PUT /api/campaigns/:id/maps/:slug/layers/:layerId`
- `PUT /api/campaigns/:id/maps/:slug/regions/:regionId`

## Capabilities

### New Capabilities
- `quest-delete`: Delete a quest by slug (cascades to sub-quests via parentQuestId nulling)
- `item-update`: Update item properties (name, description, weight, price, rarity, type)
- `item-delete`: Delete an item (removes from shop stock and inventory items)
- `calendar-delete`: Delete a calendar and all its events, moons, and seasons
- `calendar-event-delete`: Delete a single calendar event
- `timeline-update`: Update timeline name, description, sort order
- `timeline-delete`: Delete a timeline and all its events
- `timeline-event-delete`: Delete a single timeline event
- `arc-crud`: Full update and delete for arcs (cascade to chapters, unlink sessions)
- `chapter-crud`: Full update and delete for chapters (unlink sessions)
- `shop-crud`: Full update and delete for shops (cascade to shop stock)
- `currency-crud`: Full update and delete for currencies (cascade to wealth records)
- `ability-delete`: Delete a character ability
- `character-folder-crud`: Full update and delete for character folders (reassign characters)
- `entity-type-crud`: Full update and delete for entity types (reassign entities)
- `map-layer-crud`: Full update and delete for map layers
- `map-region-crud`: Full update and delete for map regions
- `inventory-delete`: Delete an inventory and its items
- `inventory-item-delete`: Delete a single inventory item
- `session-content-delete`: Delete a session content record

### Modified Capabilities
- All existing resource management flows gain complete lifecycle control

## Impact

- ~28 new endpoint files in `server/api/campaigns/[id]/`
- Modified: `app/composables/useCampaignApi.ts` — add delete/update methods for each resource
- Modified: `cli/src/commands/` — add delete/update subcommands where CLI commands exist
- Modified: `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` — document new CLI commands
- aleph-cli: new subcommands required for resources that already have CLI commands
