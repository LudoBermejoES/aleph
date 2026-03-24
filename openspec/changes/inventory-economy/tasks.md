# Tasks: Inventory & Economy

## 1. Database Schema

- [ ] 1.1 Create `items` schema with rarity enum, properties JSON, stackable flag
- [ ] 1.2 Create `inventories` and `inventory_items` schemas with position enum
- [ ] 1.3 Create `currencies` schema with base_value for conversion
- [ ] 1.4 Create `wealth` schema with polymorphic owner
- [ ] 1.5 Create `shops` and `shop_stock` schemas
- [ ] 1.6 Create `transactions` schema (append-only log)
- [ ] 1.7 Generate and apply migration

## 2. Service Layer (`server/services/inventory.ts`)

- [ ] 2.1 Implement `canTransferItem(fromInventory, toInventory, itemId, quantity)` -- validates transfer
- [ ] 2.2 Implement `calculateTotalPrice(items, currencies)` -- multi-currency price calculation
- [ ] 2.3 Implement `processTransaction(from, to, item, quantity, price)` -- atomic transfer logic
- [ ] 2.4 Implement `validateCurrencyAmount(amount, currencies)` -- validates currency values

## 3. Item Library API

- [ ] 3.1 Wire item CRUD handlers
- [ ] 3.2 Wire item list handler with filters: rarity, search, tags
- [ ] 3.3 Link items to wiki entities optionally

## 4. Inventory API

- [ ] 4.1 Wire inventory CRUD handlers (auto-create default for new characters)
- [ ] 4.2 Wire inventory item add/remove/update handlers
- [ ] 4.3 Wire item transfer handler calling `canTransferItem` + `processTransaction` services
- [ ] 4.4 Add RBAC: players manage own character inventory, DM manages all

## 5. Currency & Wealth API

- [ ] 5.1 Wire currency CRUD handlers with conversion rate configuration
- [ ] 5.2 Wire wealth query handler (all balances for an owner)
- [ ] 5.3 Wire currency conversion using `calculateTotalPrice` service
- [ ] 5.4 Wire wealth modification only via transaction creation using `processTransaction` service

## 6. Shop API

- [ ] 6.1 Wire shop CRUD handlers with stock management
- [ ] 6.2 Wire shop stock add/update/remove handlers
- [ ] 6.3 Wire buy handler calling `canTransferItem` + `processTransaction` (deduct wealth, add item, log transaction)
- [ ] 6.4 Wire sell handler calling `processTransaction` (add wealth, remove item, update stock, log transaction)
- [ ] 6.5 Wire player-owned shop: till balance, withdraw handler

## 7. Transaction Log

- [ ] 7.1 Record transactions for all wealth and item movements
- [ ] 7.2 Wire transaction history query handler with filters: type, owner, date range
- [ ] 7.3 Ensure transactions are immutable (no update/delete endpoints)

## 8. Inventory & Shop Pages

- [ ] 8.1 Create `app/pages/campaigns/[id]/items/index.vue` (item library browser)
- [ ] 8.2 Build inventory panel component (used on character detail, party page)
- [ ] 8.3 Build item transfer dialog with source/target inventory pickers
- [ ] 8.4 Build wealth display component with currency icons
- [ ] 8.5 Create `app/pages/campaigns/[id]/shops/index.vue` (shop list)
- [ ] 8.6 Create `app/pages/campaigns/[id]/shops/[slug].vue` (shop detail with stock and buy UI)
- [ ] 8.7 Build transaction history table component

## 9. Tests (TDD)

### Unit Tests -- Service Functions (Vitest)

- [ ] 9.1 Test `validateCurrencyAmount`: accepts valid positive amounts; rejects negative and zero amounts
- [ ] 9.2 Test `calculateTotalPrice`: 1 gold = 10 silver = 100 copper; converting 150 copper returns 1 gold 5 silver 0 copper
- [ ] 9.3 Test `calculateTotalPrice`: summing wealth across denominations produces correct total in base currency
- [ ] 9.4 Test `canTransferItem`: returns true when source inventory has sufficient quantity
- [ ] 9.5 Test `canTransferItem`: returns false with error when transferring 5 items but inventory has 3
- [ ] 9.6 Test `canTransferItem`: validates both inventories exist; returns false if either is missing
- [ ] 9.7 Test `processTransaction`: produces correct from/to/amount/item fields for a purchase transaction

### Schema Tests (`:memory:` SQLite)

- [ ] 9.8 Test items table: rarity enum constraint; properties JSON stored and retrieved; campaign_id FK
- [ ] 9.9 Test inventory_items table: inventory_id FK cascade delete; position enum constraint
- [ ] 9.10 Test transactions table: immutable append-only (no update trigger); all required fields enforced
- [ ] 9.11 Test wealth table: owner_type + owner_id + currency_id unique constraint; amount allows zero

### Integration Tests (API)

- [ ] 9.12 Test item CRUD: create item with properties JSON; read returns item; list filters by rarity and tags work correctly
- [ ] 9.13 Test item transfer atomicity: transfer item between inventories; source quantity decreases, target quantity increases; both changes visible in single read
- [ ] 9.14 Test item transfer rejection: transferring more than available quantity returns 400 with descriptive error
- [ ] 9.15 Test stackable items: adding same stackable item to inventory increases quantity instead of creating duplicate row
- [ ] 9.16 Test shop purchase flow: buy item from shop → wealth deducted from buyer, item added to buyer inventory, stock quantity decremented, transaction logged
- [ ] 9.17 Test shop purchase insufficient funds: attempting purchase with insufficient wealth returns 400; no side effects (wealth unchanged, stock unchanged)
- [ ] 9.18 Test shop sell flow: sell item to shop → wealth added to seller, item removed from seller inventory, stock updated, transaction logged
- [ ] 9.19 Test wealth modification only via transactions: direct wealth update endpoint does not exist; all wealth changes create transaction records
- [ ] 9.20 Test transaction immutability: PUT and DELETE on transaction endpoints return 405
- [ ] 9.21 Test transaction history query: filter by type, owner, and date range returns correct subset
- [ ] 9.22 Test inventory RBAC: player manages own character inventory; player cannot modify another character's inventory; DM manages all

### Component Tests

- [ ] 9.23 Test wealth display component: renders correct currency icons and amounts for multi-denomination wealth
- [ ] 9.24 Test item transfer dialog: source/target inventory pickers populate correctly; submit emits transfer payload
