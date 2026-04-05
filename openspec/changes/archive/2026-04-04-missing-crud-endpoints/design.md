## Context

Aleph's API follows a consistent pattern: Nitro route handlers in `server/api/campaigns/[id]/`, role checks via `hasMinRole()`, Drizzle ORM queries against SQLite, and campaign-scoped resource lookups. Most tables already have `onDelete: 'cascade'` on their foreign keys, and `foreign_keys = ON` is set in `server/utils/db.ts`, so child rows delete automatically when a parent is removed.

Existing complete CRUD examples to follow:
- **Locations**: GET list, GET detail, POST create, PUT update, DELETE — requires co_dm
- **Characters**: GET list, GET detail, POST create, PUT update, DELETE — requires editor (update) / co_dm (delete)
- **Sessions**: GET list, GET detail, POST create, PUT update, DELETE — requires co_dm
- **Organizations**: GET list, GET detail, POST create, PUT update, DELETE — requires co_dm

The CLI (`cli/src/commands/`) currently covers: campaigns, entities, characters, locations, organizations, sessions, session-groups, members, search, rolls, relations. Resources like items, calendars, timelines, arcs, chapters, shops, and currencies do not yet have CLI commands, so new CLI work is limited to adding delete/update subcommands to existing CLI commands only.

## Goals / Non-Goals

**Goals:**
- Add every missing PUT and DELETE endpoint listed in the proposal
- Follow existing authorization patterns (editor for updates, co_dm for deletes)
- Rely on DB cascade deletes wherever foreign keys already support it
- Handle edge cases: nullify dangling references that are not cascade-configured
- Add update/delete methods to `useCampaignApi` composable
- Add CLI subcommands for resources that already have CLI command files
- Full test coverage at integration level for every new endpoint

**Non-Goals:**
- Soft delete or archival — all deletes are hard deletes (consistent with existing patterns)
- Undo or restore functionality
- Bulk delete operations
- Adding new CLI command files for resources that lack them (e.g., no new `cli/src/commands/item.js`)
- Frontend UI for delete/update buttons (separate change)

## Decisions

### Decision 1: Hard delete everywhere, no soft delete

All existing delete endpoints use hard deletes. Introducing soft delete for some resources but not others would create inconsistency. Hard delete with confirmation dialogs (frontend, future change) and `--yes` flags (CLI) is sufficient.

### Decision 2: Cascade behavior per resource

| Resource | Cascade via FK | Manual cleanup needed |
|----------|---------------|----------------------|
| Quests | No cascade FK on `parentQuestId` | Null out `parentQuestId` on child quests before deleting |
| Items | `inventoryItems.itemId` has no cascade | Delete inventory_items referencing the item, delete shop_stock referencing the item |
| Calendars | `calendarEvents`, `calendarMoons`, `calendarSeasons` all cascade | None |
| Calendar Events | Leaf node | None |
| Timelines | `timelineEvents` cascades | None |
| Timeline Events | Leaf node | None |
| Arcs | `chapters` cascades; `gameSessions.arcId` is nullable ref | Null out `arcId` on sessions referencing the arc |
| Chapters | `gameSessions.chapterId` is nullable ref | Null out `chapterId` on sessions referencing the chapter |
| Shops | `shopStock` cascades | Delete associated inventory (ownerType='shop', ownerId=shop.id) |
| Currencies | `wealth` references currencyId (no cascade) | Delete wealth records referencing the currency |
| Character Abilities | Leaf node | None |
| Character Folders | `characters.folderId` is nullable | Null out `folderId` on characters in the folder |
| Entity Types | `entities.type` references slug, not FK | Reassign entities to a default type or block delete if entities exist |
| Map Layers | Leaf node | None |
| Map Regions | Leaf node | None |
| Inventories | `inventoryItems` cascades | None |
| Inventory Items | Leaf node | None |
| Session Contents | Leaf node | None |

### Decision 3: Authorization levels

| Operation | Minimum Role | Rationale |
|-----------|-------------|-----------|
| PUT (update) | `editor` | Consistent with existing update endpoints |
| DELETE | `co_dm` | Destructive action, consistent with existing delete endpoints |
| DELETE character abilities | `editor` | Character data, not structural — matches ability create/update |
| DELETE inventory items | `editor` | Item management is editor-level |
| DELETE calendar/timeline events | `editor` | Event management is editor-level |
| DELETE session contents | `co_dm` | Session data is co_dm-level |

### Decision 4: Entity types — block delete if entities exist

Rather than silently reassigning entities, deleting an entity type that has entities using it should return 409 Conflict. This prevents accidental data corruption and forces the DM to reassign entities first.

### Decision 5: Return values

- DELETE endpoints return `{ success: true }` (consistent with existing deletes)
- PUT endpoints return `{ success: true }` (consistent with existing updates)

### Decision 6: Identifying resources in URLs

Follow existing patterns:
- Resources with slugs use `:slug` in URLs (quests, timelines, arcs, chapters, shops)
- Resources without slugs use `:id` parameter (items, calendars, calendar events, currencies, abilities, folders, entity types, map layers, map regions, inventories, inventory items, session contents)
