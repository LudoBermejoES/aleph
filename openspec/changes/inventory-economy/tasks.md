# Tasks: Inventory & Economy

## 1. Database Schema

- [x] 1.1 Create `items` schema with rarity enum, properties JSON, stackable flag
- [x] 1.2 Create `inventories` and `inventory_items` schemas with position enum
- [x] 1.3 Create `currencies` schema with base_value for conversion
- [x] 1.4 Create `wealth` schema with polymorphic owner
- [x] 1.5 Create `shops` and `shop_stock` schemas
- [x] 1.6 Create `transactions` schema (append-only log)
- [x] 1.7 Generate and apply migration

## 2. Service Layer (`server/services/inventory.ts`)

- [x] 2.1 Implement `canTransferItem` -- validates transfer quantity
- [x] 2.2 Implement `calculateTotalPrice` -- multi-currency conversion + toBase
- [x] 2.3 Implement `processTransaction` -- builds transaction record
- [x] 2.4 Implement `validateCurrencyAmount` -- validates non-negative numbers

## 3. Item Library API

- [x] 3.1 Wire item CRUD handlers (POST create, GET list)
- [x] 3.2 Wire item list with filters: rarity, type, search
- [ ] 3.3 Link items to wiki entities optionally

## 4. Inventory API

- [x] 4.1 Wire inventory CRUD handlers (POST create, GET list with items)
- [x] 4.2 Wire inventory item add handler (stackable auto-merge)
- [x] 4.3 Wire item transfer handler calling canTransferItem + transaction logging
- [ ] 4.4 Add RBAC: players manage own character inventory, DM manages all

## 5. Currency & Wealth API

- [x] 5.1 Wire currency CRUD handlers (POST create, GET list with sort)
- [x] 5.2 Wire wealth query handler (GET with owner_id + owner_type)
- [ ] 5.3 Wire currency conversion endpoint
- [ ] 5.4 Wire wealth modification only via transaction creation

## 6. Shop API

- [x] 6.1 Wire shop CRUD handlers (POST create, GET list)
- [x] 6.2 Wire shop stock add handler (POST)
- [x] 6.3 Wire buy handler (deduct wealth, add item, decrement stock, log transaction)
- [ ] 6.4 Wire sell handler (add wealth, remove item, log transaction)
- [ ] 6.5 Wire player-owned shop: till balance, withdraw handler

## 7. Transaction Log

- [x] 7.1 Record transactions (POST create)
- [x] 7.2 Wire transaction history query (GET with type/entity filters)
- [ ] 7.3 Ensure transactions are immutable (no update/delete)

## 8. Inventory & Shop Pages

- [x] 8.1 Create `app/pages/campaigns/[id]/items/index.vue` (item library with rarity filter)
- [ ] 8.2 Build inventory panel component
- [ ] 8.3 Build item transfer dialog
- [ ] 8.4 Build wealth display component
- [x] 8.5 Create `app/pages/campaigns/[id]/shops/index.vue` (shop list)
- [x] 8.6 Create shop detail page with stock display
- [ ] 8.7 Build transaction history table

## 9. Tests (TDD)

### Unit Tests -- Service Functions

- [x] 9.1 Test validateCurrencyAmount: valid, negative, zero, non-numeric
- [x] 9.2 Test calculateTotalPrice: 150 copper → 1g 5s 0c
- [x] 9.3 Test calculateTotalPrice: toBase conversion
- [x] 9.4 Test canTransferItem: sufficient, insufficient, exact, zero, negative
- [x] 9.5 Test processTransaction: correct record for purchase and loot

### Integration Tests (API)

- [x] 9.6 Test item CRUD: create with rarity, list filters by rarity
- [x] 9.7 Test currency CRUD: create with conversion rate, list sorted
- [x] 9.8 Test shop CRUD: create, list returns shop
- [x] 9.9 Test transaction log: create, list returns entry
- [ ] 9.10 Test item transfer atomicity
- [ ] 9.11 Test shop purchase flow
- [ ] 9.12 Test transaction immutability (no PUT/DELETE)
- [ ] 9.13 Test inventory RBAC

### Component Tests

- [ ] 9.14 Test wealth display component
- [ ] 9.15 Test item transfer dialog
