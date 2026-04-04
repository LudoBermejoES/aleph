## 1. Quests

- [ ] 1.1 Create `server/api/campaigns/[id]/quests/[slug]/index.delete.ts` — require co_dm role, find quest by campaignId+slug (404 if not found), null out `parentQuestId` on child quests, delete the quest, return `{ success: true }`

## 2. Items

- [ ] 2.1 Create `server/api/campaigns/[id]/items/[itemId]/index.put.ts` — require editor role, find item by campaignId+itemId (404 if not found), update allowed fields (name, description, weight, priceJson, size, rarity, type, propertiesJson, stackable), return `{ success: true }`
- [ ] 2.2 Create `server/api/campaigns/[id]/items/[itemId]/index.delete.ts` — require co_dm role, find item by campaignId+itemId (404 if not found), delete referencing inventory_items and shop_stock rows first, then delete the item, return `{ success: true }`

## 3. Calendars

- [ ] 3.1 Create `server/api/campaigns/[id]/calendars/[calendarId]/index.delete.ts` — require co_dm role, find calendar by campaignId+calendarId (404 if not found), delete it (cascade handles events, moons, seasons), return `{ success: true }`
- [ ] 3.2 Create `server/api/campaigns/[id]/calendars/[calendarId]/events/[eventId].delete.ts` — require editor role, verify event belongs to the calendar in the campaign (404 if not found), delete it, return `{ success: true }`

## 4. Timelines

- [ ] 4.1 Create `server/api/campaigns/[id]/timelines/[slug]/index.put.ts` — require editor role, find timeline by campaignId+slug (404 if not found), update allowed fields (name, description, sortOrder), return `{ success: true }`
- [ ] 4.2 Create `server/api/campaigns/[id]/timelines/[slug]/index.delete.ts` — require co_dm role, find timeline by campaignId+slug (404 if not found), delete it (cascade handles events), return `{ success: true }`
- [ ] 4.3 Create `server/api/campaigns/[id]/timelines/[slug]/events/[eventId].delete.ts` — require editor role, verify event belongs to the timeline in the campaign (404 if not found), delete it, return `{ success: true }`

## 5. Arcs

- [ ] 5.1 Create `server/api/campaigns/[id]/arcs/[slug]/index.put.ts` — require editor role, find arc by campaignId+slug (404 if not found), update allowed fields (name, description, sortOrder, status), return `{ success: true }`
- [ ] 5.2 Create `server/api/campaigns/[id]/arcs/[slug]/index.delete.ts` — require co_dm role, find arc by campaignId+slug (404 if not found), null out `arcId` on sessions referencing it, delete the arc (cascade deletes chapters), return `{ success: true }`

## 6. Chapters

- [ ] 6.1 Create `server/api/campaigns/[id]/chapters/[slug]/index.put.ts` — require editor role, find chapter by slug where the parent arc belongs to the campaign (404 if not found), update allowed fields (name, description, sortOrder), return `{ success: true }`
- [ ] 6.2 Create `server/api/campaigns/[id]/chapters/[slug]/index.delete.ts` — require co_dm role, find chapter by slug where the parent arc belongs to the campaign (404 if not found), null out `chapterId` on sessions referencing it, delete the chapter, return `{ success: true }`

## 7. Shops

- [ ] 7.1 Create `server/api/campaigns/[id]/shops/[slug]/index.put.ts` — require editor role, find shop by campaignId+slug (404 if not found), update allowed fields (name, description, locationEntityId, shopkeeperEntityId, isPlayerOwned), return `{ success: true }`
- [ ] 7.2 Create `server/api/campaigns/[id]/shops/[slug]/index.delete.ts` — require co_dm role, find shop by campaignId+slug (404 if not found), delete associated inventory (ownerType='shop', ownerId=shop.id) and its items, delete the shop (cascade handles shop_stock), return `{ success: true }`

## 8. Currencies

- [ ] 8.1 Create `server/api/campaigns/[id]/currencies/[currencyId]/index.put.ts` — require editor role, find currency by campaignId+currencyId (404 if not found), update allowed fields (name, symbol, valueInBase, sortOrder), return `{ success: true }`
- [ ] 8.2 Create `server/api/campaigns/[id]/currencies/[currencyId]/index.delete.ts` — require co_dm role, find currency by campaignId+currencyId (404 if not found), delete referencing wealth rows, delete the currency, return `{ success: true }`

## 9. Character Abilities

- [ ] 9.1 Create `server/api/campaigns/[id]/characters/[slug]/abilities/[abilityId]/index.delete.ts` — require editor role, verify the ability belongs to the character in the campaign (404 if not found), delete it, return `{ success: true }`

## 10. Character Folders

- [ ] 10.1 Create `server/api/campaigns/[id]/character-folders/[folderId]/index.put.ts` — require editor role, find folder by campaignId+folderId (404 if not found), update allowed fields (name, parentFolderId, sortOrder), return `{ success: true }`
- [ ] 10.2 Create `server/api/campaigns/[id]/character-folders/[folderId]/index.delete.ts` — require co_dm role, find folder by campaignId+folderId (404 if not found), null out `folderId` on characters in the folder, delete the folder, return `{ success: true }`

## 11. Entity Types

- [ ] 11.1 Create `server/api/campaigns/[id]/entity-types/[typeId]/index.put.ts` — require editor role, find entity type by campaignId+typeId (404 if not found), update allowed fields (name, icon, sortOrder), return `{ success: true }`
- [ ] 11.2 Create `server/api/campaigns/[id]/entity-types/[typeId]/index.delete.ts` — require co_dm role, find entity type by campaignId+typeId (404 if not found), reject with 400 if isBuiltin, reject with 409 if entities use this type, delete it, return `{ success: true }`

## 12. Map Layers

- [ ] 12.1 Create `server/api/campaigns/[id]/maps/[slug]/layers/[layerId]/index.put.ts` — require editor role, verify layer belongs to the map in the campaign (404 if not found), update allowed fields (name, type, opacity, sortOrder, visibleDefault), return `{ success: true }`
- [ ] 12.2 Create `server/api/campaigns/[id]/maps/[slug]/layers/[layerId]/index.delete.ts` — require co_dm role, verify layer belongs to the map in the campaign (404 if not found), delete it, return `{ success: true }`

## 13. Map Regions

- [ ] 13.1 Create `server/api/campaigns/[id]/maps/[slug]/regions/[regionId]/index.put.ts` — require editor role, verify region belongs to the map in the campaign (404 if not found), update allowed fields (name, geojson, color, opacity, entityId, visibility), return `{ success: true }`
- [ ] 13.2 Create `server/api/campaigns/[id]/maps/[slug]/regions/[regionId]/index.delete.ts` — require co_dm role, verify region belongs to the map in the campaign (404 if not found), delete it, return `{ success: true }`

## 14. Inventories

- [ ] 14.1 Create `server/api/campaigns/[id]/inventories/[inventoryId]/index.delete.ts` — require co_dm role, find inventory by campaignId+inventoryId (404 if not found), delete it (cascade handles inventory_items), return `{ success: true }`
- [ ] 14.2 Create `server/api/campaigns/[id]/inventories/[inventoryId]/items/[itemId].delete.ts` — require editor role, verify item belongs to the inventory in the campaign (404 if not found), delete it, return `{ success: true }`

## 15. Session Contents

- [ ] 15.1 Create `server/api/campaigns/[id]/sessions/[slug]/content/[contentId].delete.ts` — require co_dm role, verify content belongs to the session in the campaign (404 if not found), delete it, return `{ success: true }`

## 16. Composable — useCampaignApi

- [ ] 16.1 Add delete and update methods to `app/composables/useCampaignApi.ts` for each new endpoint: `deleteQuest`, `updateItem`, `deleteItem`, `deleteCalendar`, `deleteCalendarEvent`, `updateTimeline`, `deleteTimeline`, `deleteTimelineEvent`, `updateArc`, `deleteArc`, `updateChapter`, `deleteChapter`, `updateShop`, `deleteShop`, `updateCurrency`, `deleteCurrency`, `deleteAbility`, `updateCharacterFolder`, `deleteCharacterFolder`, `updateEntityType`, `deleteEntityType`, `updateMapLayer`, `deleteMapLayer`, `updateMapRegion`, `deleteMapRegion`, `deleteInventory`, `deleteInventoryItem`, `deleteSessionContent`

## 17. CLI — update existing commands

- [ ] 17.1 Add `session content-delete <campaignId> <sessionSlug> <contentId>` subcommand to `cli/src/commands/session.js` — accepts `--yes` flag; calls `DELETE /api/campaigns/:id/sessions/:slug/content/:contentId`
- [ ] 17.2 Update `docs/claude-skill.md` to document new CLI subcommands; keep consistent with all existing command documentation
- [ ] 17.3 Update `.claude/skills/aleph-cli/SKILL.md` to mirror `docs/claude-skill.md`; bump version in frontmatter

## 18. Tests

- [ ] 18.1 Add integration tests in `tests/integration/quest-delete.test.ts` — cover: 200 success + child quest parentQuestId nulled, 404 missing quest, 403 for player
- [ ] 18.2 Add integration tests in `tests/integration/item-crud.test.ts` — cover: PUT 200 + fields updated, PUT 403 for player, DELETE 200 + cascade cleanup of inventory_items and shop_stock, DELETE 403 for player
- [ ] 18.3 Add integration tests in `tests/integration/calendar-delete.test.ts` — cover: calendar DELETE 200 + cascade, calendar event DELETE 200, 403 for player on both
- [ ] 18.4 Add integration tests in `tests/integration/timeline-crud.test.ts` — cover: PUT 200, DELETE 200 + cascade, event DELETE 200, 403 for player on all
- [ ] 18.5 Add integration tests in `tests/integration/arc-chapter-crud.test.ts` — cover: arc PUT/DELETE 200, chapter PUT/DELETE 200, session arcId/chapterId nulled on delete, 403 for player on all
- [ ] 18.6 Add integration tests in `tests/integration/shop-crud.test.ts` — cover: PUT 200, DELETE 200 + inventory cleanup, 403 for player
- [ ] 18.7 Add integration tests in `tests/integration/currency-crud.test.ts` — cover: PUT 200, DELETE 200 + wealth cleanup, 403 for player
- [ ] 18.8 Add integration tests in `tests/integration/character-ability-delete.test.ts` — cover: DELETE 200, 403 for player
- [ ] 18.9 Add integration tests in `tests/integration/character-folder-crud.test.ts` — cover: PUT 200, DELETE 200 + folderId nulled on characters, 403 for player
- [ ] 18.10 Add integration tests in `tests/integration/entity-type-crud.test.ts` — cover: PUT 200, DELETE 200 (no entities), DELETE 409 (entities exist), DELETE 400 (builtin), 403 for player
- [ ] 18.11 Add integration tests in `tests/integration/map-layer-crud.test.ts` — cover: PUT 200, DELETE 200, 403 for player
- [ ] 18.12 Add integration tests in `tests/integration/map-region-crud.test.ts` — cover: PUT 200, DELETE 200, 403 for player
- [ ] 18.13 Add integration tests in `tests/integration/inventory-delete.test.ts` — cover: inventory DELETE 200 + cascade, inventory item DELETE 200, 403 for player on both
- [ ] 18.14 Add integration tests in `tests/integration/session-content-delete.test.ts` — cover: DELETE 200, 403 for player

## 19. Verification

- [ ] 19.1 Run `npx vitest run tests/integration/` and confirm all new tests pass
- [ ] 19.2 Run `npx nuxi build` and confirm no type errors or build failures
