# Proposal: Inventory & Economy

## Why

Tracking items, currency, and shops is one of the most tedious parts of running a TTRPG campaign. DMs juggle spreadsheets for shop inventories, players lose track of what they're carrying, and currency conversions are error-prone. This change provides a structured inventory and economy system that handles item management, wealth tracking, and shop interactions within the campaign manager.

## What Changes

- Build an item library with per-campaign item definitions
- Implement character, party, and faction inventories with positional slots (Equipped, Backpack, etc.)
- Support item transfers between inventories
- Create a custom currency system per campaign
- Track wealth at character, party, faction, and shop levels
- Build a shop system: DM-created shops with stock, prices, and player purchasing flow
- Support player-owned shops with till and earnings tracking
- Log all transactions for audit trail

## Scope

### In scope
- Item library CRUD per campaign (name, description, weight, rarity, properties, stackable)
- Inventories for characters, parties, and factions with position/slot system
- Item transfer between any two inventories
- Custom currency definitions per campaign (name, abbreviation, conversion rates)
- Wealth tracking (balance per currency per owner)
- Shop CRUD with stock management and pricing
- Player purchasing flow (browse shop, buy item, deduct currency, add to inventory)
- Player-owned shops with till (revenue tracking)
- Transaction log recording all currency and item movements

### Out of scope
- Crafting systems
- Encumbrance auto-calculation with movement penalties (future)
- Real-world marketplace between campaigns

## Dependencies
- 01-project-setup
- 02-auth-rbac
- 03-markdown-engine
- 04-wiki-core
- 08-character-management
