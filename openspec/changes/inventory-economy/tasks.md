# Tasks: Inventory & Economy

## 1. Database Schema

- [ ] 1.1 Create `items` schema with rarity enum, properties JSON, stackable flag
- [ ] 1.2 Create `inventories` and `inventory_items` schemas with position enum
- [ ] 1.3 Create `currencies` schema with base_value for conversion
- [ ] 1.4 Create `wealth` schema with polymorphic owner
- [ ] 1.5 Create `shops` and `shop_stock` schemas
- [ ] 1.6 Create `transactions` schema (append-only log)
- [ ] 1.7 Generate and apply migration

## 2. Item Library API

- [ ] 2.1 Implement item CRUD endpoints
- [ ] 2.2 Implement item list with filters: rarity, search, tags
- [ ] 2.3 Link items to wiki entities optionally

## 3. Inventory API

- [ ] 3.1 Implement inventory CRUD (auto-create default for new characters)
- [ ] 3.2 Implement inventory item add/remove/update endpoints
- [ ] 3.3 Implement item transfer endpoint with validation and quantity handling
- [ ] 3.4 Add RBAC: players manage own character inventory, DM manages all

## 4. Currency & Wealth API

- [ ] 4.1 Implement currency CRUD with conversion rate configuration
- [ ] 4.2 Implement wealth query endpoint (all balances for an owner)
- [ ] 4.3 Implement currency conversion utility
- [ ] 4.4 Implement wealth modification only via transaction creation

## 5. Shop API

- [ ] 5.1 Implement shop CRUD with stock management
- [ ] 5.2 Implement shop stock add/update/remove endpoints
- [ ] 5.3 Implement buy endpoint (deduct wealth, add item to buyer inventory, log transaction)
- [ ] 5.4 Implement sell endpoint (add wealth, remove item from seller inventory, add to shop stock)
- [ ] 5.5 Implement player-owned shop: till balance, withdraw endpoint

## 6. Transaction Log

- [ ] 6.1 Record transactions for all wealth and item movements
- [ ] 6.2 Implement transaction history query with filters: type, owner, date range
- [ ] 6.3 Ensure transactions are immutable (no update/delete endpoints)

## 7. Inventory & Shop Pages

- [ ] 7.1 Create `app/pages/campaigns/[id]/items/index.vue` (item library browser)
- [ ] 7.2 Build inventory panel component (used on character detail, party page)
- [ ] 7.3 Build item transfer dialog with source/target inventory pickers
- [ ] 7.4 Build wealth display component with currency icons
- [ ] 7.5 Create `app/pages/campaigns/[id]/shops/index.vue` (shop list)
- [ ] 7.6 Create `app/pages/campaigns/[id]/shops/[slug].vue` (shop detail with stock and buy UI)
- [ ] 7.7 Build transaction history table component

## 8. Tests (TDD)

### Unit Tests (Vitest)

- [ ] 8.1 Test currency conversion utility: 1 gold = 10 silver = 100 copper; converting 150 copper returns 1 gold 5 silver 0 copper
- [ ] 8.2 Test multi-currency calculation: summing wealth across denominations produces correct total in base currency
- [ ] 8.3 Test insufficient quantity rejection: transferring 5 items when inventory has 3 throws validation error

### Integration Tests (@nuxt/test-utils)

- [ ] 8.4 Test item transfer atomicity: transfer item between inventories; source quantity decreases, target quantity increases; both changes visible in single read
- [ ] 8.5 Test item transfer rejection: transferring more than available quantity returns 400 with descriptive error
- [ ] 8.6 Test shop purchase flow: buy item from shop → wealth deducted from buyer, item added to buyer inventory, stock quantity decremented, transaction logged
- [ ] 8.7 Test shop purchase insufficient funds: attempting purchase with insufficient wealth returns 400; no side effects (wealth unchanged, stock unchanged)
- [ ] 8.8 Test shop sell flow: sell item to shop → wealth added to seller, item removed from seller inventory, stock updated, transaction logged
- [ ] 8.9 Test wealth modification only via transactions: direct wealth update endpoint does not exist; all wealth changes create transaction records
- [ ] 8.10 Test transaction immutability: PUT and DELETE on transaction endpoints return 405
- [ ] 8.11 Test transaction history query: filter by type, owner, and date range returns correct subset
- [ ] 8.12 Test inventory RBAC: player manages own character inventory; player cannot modify another character's inventory; DM manages all
- [ ] 8.13 Test item CRUD: create item with properties JSON; read returns item; list filters by rarity and tags work correctly
- [ ] 8.14 Test stackable items: adding same stackable item to inventory increases quantity instead of creating duplicate row

### Component Tests (@vue/test-utils)

- [ ] 8.15 Test wealth display component: renders correct currency icons and amounts for multi-denomination wealth
- [ ] 8.16 Test item transfer dialog: source/target inventory pickers populate correctly; submit emits transfer payload
