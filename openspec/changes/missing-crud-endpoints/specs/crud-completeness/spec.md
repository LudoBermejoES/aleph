# CRUD Completeness

## ADDED Requirements

### Requirement: Quests DELETE endpoint

The system SHALL provide a DELETE endpoint for quests that removes the quest and nullifies child quest references.

#### Scenario: DM deletes a quest

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** a quest with slug "find-the-sword" exists in campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/quests/find-the-sword`
- **Then** the response status is 200
- **And** the quest is removed from the database
- **And** any child quests (parentQuestId) have their parentQuestId set to null

#### Scenario: Player cannot delete a quest

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/quests/find-the-sword`
- **Then** the response status is 403

#### Scenario: Delete non-existent quest returns 404

- **Given** an authenticated user with co_dm role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/quests/nonexistent`
- **Then** the response status is 404

---

### Requirement: Items PUT endpoint

The system SHALL provide a PUT endpoint for items that allows editors to update item properties.

#### Scenario: Editor updates an item

- **Given** an authenticated user with editor role on campaign "c1"
- **And** an item with id "item1" exists in campaign "c1"
- **When** they send `PUT /api/campaigns/c1/items/item1` with body `{ "name": "Magic Sword", "rarity": "rare" }`
- **Then** the response status is 200
- **And** the item name is "Magic Sword" and rarity is "rare"

#### Scenario: Player cannot update an item

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `PUT /api/campaigns/c1/items/item1` with body `{ "name": "Cheated Sword" }`
- **Then** the response status is 403

### Requirement: Items DELETE endpoint

The system SHALL provide a DELETE endpoint for items that removes the item and cascade-deletes related inventory and shop stock records.

#### Scenario: Co-DM deletes an item

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** an item with id "item1" exists in campaign "c1"
- **And** "item1" is referenced by inventory_items and shop_stock rows
- **When** they send `DELETE /api/campaigns/c1/items/item1`
- **Then** the response status is 200
- **And** the item is removed from the database
- **And** all inventory_items referencing "item1" are deleted
- **And** all shop_stock referencing "item1" are deleted

#### Scenario: Player cannot delete an item

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/items/item1`
- **Then** the response status is 403

---

### Requirement: Calendars DELETE endpoint

The system SHALL provide a DELETE endpoint for calendars that removes the calendar and cascade-deletes its events, moons, and seasons.

#### Scenario: Co-DM deletes a calendar

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** a calendar with id "cal1" exists in campaign "c1"
- **And** "cal1" has events, moons, and seasons
- **When** they send `DELETE /api/campaigns/c1/calendars/cal1`
- **Then** the response status is 200
- **And** the calendar is removed from the database
- **And** all calendar_events, calendar_moons, and calendar_seasons for "cal1" are cascade-deleted

#### Scenario: Player cannot delete a calendar

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/calendars/cal1`
- **Then** the response status is 403

### Requirement: Calendar Events DELETE endpoint

The system SHALL provide a DELETE endpoint for calendar events that removes the specified event.

#### Scenario: Editor deletes a calendar event

- **Given** an authenticated user with editor role on campaign "c1"
- **And** a calendar event with id "evt1" exists in calendar "cal1" in campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/calendars/cal1/events/evt1`
- **Then** the response status is 200
- **And** the calendar event is removed from the database

#### Scenario: Player cannot delete a calendar event

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/calendars/cal1/events/evt1`
- **Then** the response status is 403

---

### Requirement: Timelines PUT endpoint

The system SHALL provide a PUT endpoint for timelines that allows editors to update timeline properties.

#### Scenario: Editor updates a timeline

- **Given** an authenticated user with editor role on campaign "c1"
- **And** a timeline with slug "age-of-dragons" exists in campaign "c1"
- **When** they send `PUT /api/campaigns/c1/timelines/age-of-dragons` with body `{ "name": "Age of Fire", "description": "Updated desc" }`
- **Then** the response status is 200
- **And** the timeline name is "Age of Fire"

#### Scenario: Player cannot update a timeline

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `PUT /api/campaigns/c1/timelines/age-of-dragons` with body `{ "name": "Hacked" }`
- **Then** the response status is 403

### Requirement: Timelines DELETE endpoint

The system SHALL provide a DELETE endpoint for timelines that removes the timeline and cascade-deletes its events.

#### Scenario: Co-DM deletes a timeline

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** a timeline with slug "age-of-dragons" exists in campaign "c1"
- **And** "age-of-dragons" has timeline events
- **When** they send `DELETE /api/campaigns/c1/timelines/age-of-dragons`
- **Then** the response status is 200
- **And** the timeline is removed from the database
- **And** all timeline_events for the timeline are cascade-deleted

#### Scenario: Player cannot delete a timeline

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/timelines/age-of-dragons`
- **Then** the response status is 403

### Requirement: Timeline Events DELETE endpoint

The system SHALL provide a DELETE endpoint for timeline events that removes the specified event.

#### Scenario: Editor deletes a timeline event

- **Given** an authenticated user with editor role on campaign "c1"
- **And** a timeline event with id "tevt1" exists in timeline "age-of-dragons" in campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/timelines/age-of-dragons/events/tevt1`
- **Then** the response status is 200
- **And** the timeline event is removed from the database

#### Scenario: Player cannot delete a timeline event

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/timelines/age-of-dragons/events/tevt1`
- **Then** the response status is 403

---

### Requirement: Arcs PUT endpoint

The system SHALL provide a PUT endpoint for arcs that allows editors to update arc properties including name and status.

#### Scenario: Editor updates an arc

- **Given** an authenticated user with editor role on campaign "c1"
- **And** an arc with slug "the-curse" exists in campaign "c1"
- **When** they send `PUT /api/campaigns/c1/arcs/the-curse` with body `{ "name": "The Curse Unveiled", "status": "active" }`
- **Then** the response status is 200
- **And** the arc name is "The Curse Unveiled" and status is "active"

#### Scenario: Player cannot update an arc

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `PUT /api/campaigns/c1/arcs/the-curse` with body `{ "name": "Hacked" }`
- **Then** the response status is 403

### Requirement: Arcs DELETE endpoint

The system SHALL provide a DELETE endpoint for arcs that removes the arc, cascade-deletes its chapters, and nullifies arc references on sessions.

#### Scenario: Co-DM deletes an arc

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** an arc with slug "the-curse" exists in campaign "c1"
- **And** "the-curse" has chapters and sessions referencing it
- **When** they send `DELETE /api/campaigns/c1/arcs/the-curse`
- **Then** the response status is 200
- **And** the arc is removed from the database
- **And** all chapters under the arc are cascade-deleted
- **And** sessions referencing the arc have their arcId set to null

#### Scenario: Player cannot delete an arc

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/arcs/the-curse`
- **Then** the response status is 403

---

### Requirement: Chapters PUT endpoint

The system SHALL provide a PUT endpoint for chapters that allows editors to update chapter properties including name and sort order.

#### Scenario: Editor updates a chapter

- **Given** an authenticated user with editor role on campaign "c1"
- **And** a chapter with slug "the-cave" exists in an arc in campaign "c1"
- **When** they send `PUT /api/campaigns/c1/chapters/the-cave` with body `{ "name": "The Dark Cave", "sortOrder": 2 }`
- **Then** the response status is 200
- **And** the chapter name is "The Dark Cave"

#### Scenario: Player cannot update a chapter

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `PUT /api/campaigns/c1/chapters/the-cave` with body `{ "name": "Hacked" }`
- **Then** the response status is 403

### Requirement: Chapters DELETE endpoint

The system SHALL provide a DELETE endpoint for chapters that removes the chapter and nullifies chapter references on sessions.

#### Scenario: Co-DM deletes a chapter

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** a chapter with slug "the-cave" exists in an arc in campaign "c1"
- **And** sessions reference this chapter
- **When** they send `DELETE /api/campaigns/c1/chapters/the-cave`
- **Then** the response status is 200
- **And** the chapter is removed from the database
- **And** sessions referencing the chapter have their chapterId set to null

#### Scenario: Player cannot delete a chapter

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/chapters/the-cave`
- **Then** the response status is 403

---

### Requirement: Shops PUT endpoint

The system SHALL provide a PUT endpoint for shops that allows editors to update shop properties.

#### Scenario: Editor updates a shop

- **Given** an authenticated user with editor role on campaign "c1"
- **And** a shop with slug "ye-olde-shoppe" exists in campaign "c1"
- **When** they send `PUT /api/campaigns/c1/shops/ye-olde-shoppe` with body `{ "name": "The Grand Emporium", "description": "Updated" }`
- **Then** the response status is 200
- **And** the shop name is "The Grand Emporium"

#### Scenario: Player cannot update a shop

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `PUT /api/campaigns/c1/shops/ye-olde-shoppe` with body `{ "name": "Hacked" }`
- **Then** the response status is 403

### Requirement: Shops DELETE endpoint

The system SHALL provide a DELETE endpoint for shops that removes the shop, cascade-deletes shop stock, and removes the shop inventory.

#### Scenario: Co-DM deletes a shop

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** a shop with slug "ye-olde-shoppe" exists in campaign "c1"
- **And** "ye-olde-shoppe" has shop_stock entries and an associated inventory
- **When** they send `DELETE /api/campaigns/c1/shops/ye-olde-shoppe`
- **Then** the response status is 200
- **And** the shop is removed from the database
- **And** all shop_stock entries are cascade-deleted
- **And** the shop's inventory (ownerType='shop', ownerId=shop.id) is deleted

#### Scenario: Player cannot delete a shop

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/shops/ye-olde-shoppe`
- **Then** the response status is 403

---

### Requirement: Currencies PUT endpoint

The system SHALL provide a PUT endpoint for currencies that allows editors to update currency properties.

#### Scenario: Editor updates a currency

- **Given** an authenticated user with editor role on campaign "c1"
- **And** a currency with id "cur1" exists in campaign "c1"
- **When** they send `PUT /api/campaigns/c1/currencies/cur1` with body `{ "name": "Platinum", "symbol": "PP", "valueInBase": 1000 }`
- **Then** the response status is 200
- **And** the currency name is "Platinum"

#### Scenario: Player cannot update a currency

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `PUT /api/campaigns/c1/currencies/cur1` with body `{ "name": "Hacked" }`
- **Then** the response status is 403

### Requirement: Currencies DELETE endpoint

The system SHALL provide a DELETE endpoint for currencies that removes the currency and deletes associated wealth records.

#### Scenario: Co-DM deletes a currency

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** a currency with id "cur1" exists in campaign "c1"
- **And** wealth records reference "cur1"
- **When** they send `DELETE /api/campaigns/c1/currencies/cur1`
- **Then** the response status is 200
- **And** the currency is removed from the database
- **And** all wealth records referencing "cur1" are deleted

#### Scenario: Player cannot delete a currency

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/currencies/cur1`
- **Then** the response status is 403

---

### Requirement: Character Abilities DELETE endpoint

The system SHALL provide a DELETE endpoint for character abilities that removes the specified ability.

#### Scenario: Editor deletes a character ability

- **Given** an authenticated user with editor role on campaign "c1"
- **And** a character with slug "gandalf" exists in campaign "c1"
- **And** an ability with id "ab1" belongs to "gandalf"
- **When** they send `DELETE /api/campaigns/c1/characters/gandalf/abilities/ab1`
- **Then** the response status is 200
- **And** the ability is removed from the database

#### Scenario: Player cannot delete another character's ability

- **Given** an authenticated user with player role on campaign "c1"
- **And** the user does not own the character "gandalf"
- **When** they send `DELETE /api/campaigns/c1/characters/gandalf/abilities/ab1`
- **Then** the response status is 403

---

### Requirement: Character Folders PUT endpoint

The system SHALL provide a PUT endpoint for character folders that allows editors to update folder properties.

#### Scenario: Editor updates a character folder

- **Given** an authenticated user with editor role on campaign "c1"
- **And** a character folder with id "fold1" exists in campaign "c1"
- **When** they send `PUT /api/campaigns/c1/character-folders/fold1` with body `{ "name": "NPCs - Town" }`
- **Then** the response status is 200
- **And** the folder name is "NPCs - Town"

#### Scenario: Player cannot update a character folder

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `PUT /api/campaigns/c1/character-folders/fold1` with body `{ "name": "Hacked" }`
- **Then** the response status is 403

### Requirement: Character Folders DELETE endpoint

The system SHALL provide a DELETE endpoint for character folders that removes the folder and nullifies folder references on characters.

#### Scenario: Co-DM deletes a character folder

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** a character folder with id "fold1" exists in campaign "c1"
- **And** characters have folderId set to "fold1"
- **When** they send `DELETE /api/campaigns/c1/character-folders/fold1`
- **Then** the response status is 200
- **And** the folder is removed from the database
- **And** characters that were in the folder have folderId set to null

#### Scenario: Player cannot delete a character folder

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/character-folders/fold1`
- **Then** the response status is 403

---

### Requirement: Entity Types PUT endpoint

The system SHALL provide a PUT endpoint for entity types that allows editors to update entity type properties.

#### Scenario: Editor updates an entity type

- **Given** an authenticated user with editor role on campaign "c1"
- **And** an entity type with id "et1" (slug "tavern") exists in campaign "c1"
- **When** they send `PUT /api/campaigns/c1/entity-types/et1` with body `{ "name": "Inn", "icon": "bed" }`
- **Then** the response status is 200
- **And** the entity type name is "Inn" and icon is "bed"

#### Scenario: Player cannot update an entity type

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `PUT /api/campaigns/c1/entity-types/et1` with body `{ "name": "Hacked" }`
- **Then** the response status is 403

### Requirement: Entity Types DELETE endpoint

The system SHALL provide a DELETE endpoint for entity types that removes the type only when no entities reference it and it is not a builtin type.

#### Scenario: Co-DM deletes an entity type with no entities

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** an entity type with id "et1" exists in campaign "c1"
- **And** no entities use this entity type
- **When** they send `DELETE /api/campaigns/c1/entity-types/et1`
- **Then** the response status is 200
- **And** the entity type is removed from the database

#### Scenario: Co-DM cannot delete an entity type that has entities

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** an entity type with id "et1" exists in campaign "c1"
- **And** entities exist that use this entity type
- **When** they send `DELETE /api/campaigns/c1/entity-types/et1`
- **Then** the response status is 409
- **And** the response body contains an error message about existing entities

#### Scenario: Cannot delete a builtin entity type

- **Given** an authenticated user with dm role on campaign "c1"
- **And** a builtin entity type with id "et-builtin" exists in campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/entity-types/et-builtin`
- **Then** the response status is 400
- **And** the response body contains an error message about builtin types

#### Scenario: Player cannot delete an entity type

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/entity-types/et1`
- **Then** the response status is 403

---

### Requirement: Map Layers PUT endpoint

The system SHALL provide a PUT endpoint for map layers that allows editors to update layer properties including name and opacity.

#### Scenario: Editor updates a map layer

- **Given** an authenticated user with editor role on campaign "c1"
- **And** a map with slug "world-map" exists in campaign "c1"
- **And** a map layer with id "lay1" exists on "world-map"
- **When** they send `PUT /api/campaigns/c1/maps/world-map/layers/lay1` with body `{ "name": "Political Borders", "opacity": 0.5 }`
- **Then** the response status is 200
- **And** the layer name is "Political Borders" and opacity is 0.5

#### Scenario: Player cannot update a map layer

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `PUT /api/campaigns/c1/maps/world-map/layers/lay1` with body `{ "name": "Hacked" }`
- **Then** the response status is 403

### Requirement: Map Layers DELETE endpoint

The system SHALL provide a DELETE endpoint for map layers that removes the specified layer.

#### Scenario: Co-DM deletes a map layer

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** a map layer with id "lay1" exists on map "world-map" in campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/maps/world-map/layers/lay1`
- **Then** the response status is 200
- **And** the map layer is removed from the database

#### Scenario: Player cannot delete a map layer

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/maps/world-map/layers/lay1`
- **Then** the response status is 403

---

### Requirement: Map Regions PUT endpoint

The system SHALL provide a PUT endpoint for map regions that allows editors to update region properties including name and color.

#### Scenario: Editor updates a map region

- **Given** an authenticated user with editor role on campaign "c1"
- **And** a map with slug "world-map" exists in campaign "c1"
- **And** a map region with id "reg1" exists on "world-map"
- **When** they send `PUT /api/campaigns/c1/maps/world-map/regions/reg1` with body `{ "name": "Elven Forest", "color": "#00ff00" }`
- **Then** the response status is 200
- **And** the region name is "Elven Forest" and color is "#00ff00"

#### Scenario: Player cannot update a map region

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `PUT /api/campaigns/c1/maps/world-map/regions/reg1` with body `{ "name": "Hacked" }`
- **Then** the response status is 403

### Requirement: Map Regions DELETE endpoint

The system SHALL provide a DELETE endpoint for map regions that removes the specified region.

#### Scenario: Co-DM deletes a map region

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** a map region with id "reg1" exists on map "world-map" in campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/maps/world-map/regions/reg1`
- **Then** the response status is 200
- **And** the map region is removed from the database

#### Scenario: Player cannot delete a map region

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/maps/world-map/regions/reg1`
- **Then** the response status is 403

---

### Requirement: Inventories DELETE endpoint

The system SHALL provide a DELETE endpoint for inventories that removes the inventory and cascade-deletes its items.

#### Scenario: Co-DM deletes an inventory

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** an inventory with id "inv1" exists in campaign "c1"
- **And** "inv1" has inventory items
- **When** they send `DELETE /api/campaigns/c1/inventories/inv1`
- **Then** the response status is 200
- **And** the inventory is removed from the database
- **And** all inventory_items in "inv1" are cascade-deleted

#### Scenario: Player cannot delete an inventory

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/inventories/inv1`
- **Then** the response status is 403

### Requirement: Inventory Items DELETE endpoint

The system SHALL provide a DELETE endpoint for inventory items that removes the specified item from its inventory.

#### Scenario: Editor deletes an inventory item

- **Given** an authenticated user with editor role on campaign "c1"
- **And** an inventory item with id "ii1" exists in inventory "inv1" in campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/inventories/inv1/items/ii1`
- **Then** the response status is 200
- **And** the inventory item is removed from the database

#### Scenario: Player cannot delete an inventory item

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/inventories/inv1/items/ii1`
- **Then** the response status is 403

---

### Requirement: Session Contents DELETE endpoint

The system SHALL provide a DELETE endpoint for session content records that removes the specified content entry.

#### Scenario: Co-DM deletes a session content record

- **Given** an authenticated user with co_dm role on campaign "c1"
- **And** a session with slug "session-1" exists in campaign "c1"
- **And** a session content with id "sc1" (type "ai_notes") exists for "session-1"
- **When** they send `DELETE /api/campaigns/c1/sessions/session-1/content/sc1`
- **Then** the response status is 200
- **And** the session content record is removed from the database

#### Scenario: Player cannot delete session content

- **Given** an authenticated user with player role on campaign "c1"
- **When** they send `DELETE /api/campaigns/c1/sessions/session-1/content/sc1`
- **Then** the response status is 403
