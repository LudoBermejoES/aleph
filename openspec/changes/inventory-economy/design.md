# Design: Inventory & Economy

## Technical Approach

### Item Library

- `items` table: `id, campaign_id, name, slug, description, weight, rarity (common|uncommon|rare|very_rare|legendary|artifact), properties (JSON), stackable, icon, entity_id (nullable)`
- Items are campaign-scoped templates; inventory entries reference them
- Optional entity_id links an item to a wiki entity for rich description

### Inventory System

- `inventories` table: `id, campaign_id, owner_type (character|party|faction|shop), owner_id, name`
- `inventory_items` table: `id, inventory_id, item_id, quantity, position (equipped|backpack|storage|trade|custom), custom_position_label, notes, sort_order`
- Each character/party/faction/shop gets one or more inventories
- Default inventory auto-created when a character is created
- Position is an enum with a `custom` option for user-defined slots

### Item Transfer

- Transfer endpoint moves items between any two inventories
- Validates: source has sufficient quantity, both inventories exist, RBAC permissions
- For stackable items, adjusts quantity; for non-stackable, moves the row
- Creates a transaction log entry for every transfer

### Currency System

- `currencies` table: `id, campaign_id, name, abbreviation, sort_order, base_value`
- `base_value` expresses conversion: if "gold" has base_value 100 and "silver" has base_value 10, then 1 gold = 10 silver
- Conversion calculated as: `amount * source.base_value / target.base_value`

### Wealth Tracking

- `wealth` table: `id, owner_type (character|party|faction|shop), owner_id, currency_id, amount`
- Wealth modified via transactions (never direct edits to maintain audit trail)
- Bulk balance endpoint returns all currency amounts for an owner

### Shop System

- `shops` table: `id, campaign_id, name, slug, entity_id (nullable), owner_type (dm|player), owner_character_id (nullable), description`
- `shop_stock` table: `id, shop_id, item_id, quantity (nullable for unlimited), price_amount, price_currency_id, markup_pct`
- DM creates shops and sets stock/prices
- Player purchasing flow: browse stock → select item → confirm → deduct wealth → add to inventory → log transaction
- Player-owned shops: `owner_type = 'player'`, revenue deposited to shop's wealth (till), owner can withdraw

### Transaction Log

- `transactions` table: `id, campaign_id, type (purchase|sale|transfer|deposit|withdrawal|grant), description, from_owner_type, from_owner_id, to_owner_type, to_owner_id, currency_id, amount, item_id (nullable), quantity (nullable), created_at, created_by_user_id`
- Immutable append-only log; no updates or deletes
- Queryable for history views and audit

### Service Layer (TDD)

Business logic extracted into `server/services/inventory.ts` -- pure functions tested in isolation:

- `canTransferItem(fromInventory, toInventory, itemId, quantity)` -- validates transfer
- `calculateTotalPrice(items, currencies)` -- multi-currency price calculation
- `processTransaction(from, to, item, quantity, price)` -- atomic transfer logic
- `validateCurrencyAmount(amount, currencies)` -- validates currency values

Architecture: Write unit tests first (TDD red phase), then implement service functions (green phase), then refactor API handlers to call services. API handlers stay thin -- they call services + DB, return results.

Test layers:
1. **Unit tests**: service functions in isolation (no DB, no server)
2. **Schema tests**: DB constraints and cascades (`:memory:` SQLite)
3. **Integration tests**: API contracts against running server

### API Endpoints

```
GET/POST       /api/campaigns/:id/items
GET/PUT/DELETE /api/campaigns/:id/items/:slug
GET/POST       /api/campaigns/:id/inventories
GET            /api/campaigns/:id/inventories/:invId
POST           /api/campaigns/:id/inventories/transfer
GET/POST       /api/campaigns/:id/currencies
GET            /api/campaigns/:id/wealth/:ownerType/:ownerId
GET/POST       /api/campaigns/:id/shops
GET/PUT        /api/campaigns/:id/shops/:slug
POST           /api/campaigns/:id/shops/:slug/buy
POST           /api/campaigns/:id/shops/:slug/sell
GET            /api/campaigns/:id/transactions
```
