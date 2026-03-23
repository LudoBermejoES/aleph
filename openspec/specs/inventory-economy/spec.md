# inventory-economy Specification

## Purpose
TBD - created by archiving change campaign-manager-study. Update Purpose after archive.
## Requirements
### Requirement: Item Library

The system SHALL support a campaign-wide item library that serves as the master catalog.

#### Scenario: Creating an item definition
- GIVEN a DM or Editor in the item library
- WHEN they create an item with: name, description, type (weapon, armor, potion, misc, etc.), weight, value/price, rarity, properties, image
- THEN the item is stored as a wiki entity of type "item"
- AND it can be added to inventories, shops, and loot tables by reference

#### Scenario: Item categories and filtering
- GIVEN a library with many items
- WHEN a user browses the library
- THEN items can be filtered by: type, rarity, price range, weight, tags
- AND items can be sorted by any column
- AND search works across name and description

### Requirement: Character Inventories

The system SHALL support per-character inventories with organizational features.

#### Scenario: Adding items to inventory
- GIVEN a character's inventory view
- WHEN the owner (Player or DM) adds an item (from library or freeform)
- THEN the item appears in the inventory with: name, quantity, weight, notes
- AND the total weight is calculated and displayed

#### Scenario: Inventory containers/positions
- GIVEN a character with equipment organization needs
- WHEN they create containers (e.g., "Equipped", "Backpack", "Horse Saddlebags")
- THEN items can be moved between containers via drag-and-drop
- AND each container can have an optional weight capacity
- AND containers are collapsible

#### Scenario: Item transfer between characters
- GIVEN two characters in the same campaign
- WHEN one character transfers an item to another
- THEN the item moves from one inventory to the other
- AND the transaction is logged

### Requirement: Party Inventory

The system SHALL support a shared party inventory accessible to all party members.

#### Scenario: Party loot management
- GIVEN a party inventory
- WHEN any authorized member adds or removes items
- THEN all party members see the updated inventory
- AND the DM can see a full transaction history with who added/removed what and when

#### Scenario: Distributing loot
- GIVEN items in the party inventory
- WHEN a player claims an item
- THEN it moves from party inventory to their character's inventory
- AND the transfer is logged

### Requirement: Currency and Wealth Tracking

The system SHALL support custom currency systems with wealth tracking at multiple levels.

#### Scenario: Defining campaign currencies
- GIVEN a DM in campaign settings
- WHEN they define currencies (e.g., Copper, Silver, Gold, Platinum with conversion rates: 10:1)
- THEN all wealth displays use the configured currencies
- AND conversion between denominations is automatic when needed

#### Scenario: Character wealth
- GIVEN a character with wealth tracked
- WHEN the Player or DM adds/removes currency
- THEN the current balance is updated
- AND a wealth log records every transaction with: amount, reason, date, source

#### Scenario: Party wealth
- GIVEN a party fund
- WHEN any authorized member deposits or withdraws
- THEN the party balance updates
- AND the transaction is logged with who did it and why

### Requirement: In-Game Shops

The system SHALL support DM-created shops where players can browse and purchase items.

#### Scenario: Creating a shop
- GIVEN a DM or Shopkeeper-permitted user
- WHEN they create a shop with: name, description, location (linked entity), inventory of items with prices and stock quantities
- THEN the shop is browsable by permitted campaign members

#### Scenario: Player purchasing
- GIVEN a player browsing a shop
- WHEN they purchase an item and have sufficient currency
- THEN the item is added to their character's inventory
- AND the currency is deducted from their character's wealth
- AND the shop's stock quantity decreases by the purchased amount
- AND the transaction is logged

#### Scenario: Player-owned shops
- GIVEN a Player with the Shopkeeper permission
- WHEN they create a shop linked to their character
- THEN they can manage stock, set prices, and withdraw earnings
- AND the DM retains override access

#### Scenario: Shop visibility
- GIVEN a shop that players haven't discovered yet
- WHEN the DM sets its visibility to "dm_only"
- THEN players cannot see or browse the shop
- AND the DM can reveal it when the party finds it in-game

