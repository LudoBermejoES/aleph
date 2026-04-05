## Why

The economy subsystem (currencies, transactions, inventories, items, shops) has functional backend APIs but the frontend is incomplete. DMs cannot edit or delete currencies after creation, transactions are read-only with raw IDs instead of resolved names, inventory creation requires typing raw UUIDs for owners, item prices display as raw JSON, and shops have no stock management UI. These gaps force users to rely on the CLI or direct API calls for basic economy operations that should be manageable through the web UI.

## What Changes

- **Currencies page**: Add inline edit and delete with confirmation for each currency row
- **Transactions page**: Resolve `itemId` to item name in the table; add a transaction creation form with type selector, entity/item pickers, amount inputs per currency, and notes
- **Inventories page**: Replace the raw UUID text input for `ownerId` with a searchable entity/character autocomplete that filters by the selected `ownerType`
- **Items page**: Parse `priceJson` and display formatted prices using campaign currency names/symbols instead of raw JSON
- **Shop detail page**: Add stock management UI -- add items to stock (item picker, quantity, optional price override), edit stock quantity/availability, remove stock entries

All changes are frontend-only except two new server API routes needed for currency edit/delete (`PUT /api/campaigns/:id/currencies/:currencyId`, `DELETE /api/campaigns/:id/currencies/:currencyId`).

## Capabilities

### New Capabilities

- `currency-edit-delete`: Edit currency name/symbol/value/sortOrder inline; delete with confirmation dialog
- `transaction-create-ui`: Form to create transactions from the web UI with entity pickers and currency amount inputs
- `shop-stock-management`: Add, edit quantity/availability, and remove stock entries from the shop detail page

### Modified Capabilities

- `transaction-list`: Resolves `itemId` to item name; shows `fromEntityId`/`toEntityId` as entity names
- `inventory-owner-picker`: Searchable autocomplete replacing raw UUID input, filtered by owner type
- `item-price-display`: Formatted price using currency symbols instead of raw `priceJson`

## Impact

- **New server routes**: `server/api/campaigns/[id]/currencies/[currencyId].put.ts`, `server/api/campaigns/[id]/currencies/[currencyId].delete.ts`
- **Modified pages**: `app/pages/campaigns/[id]/currencies/index.vue`, `app/pages/campaigns/[id]/transactions/index.vue`, `app/pages/campaigns/[id]/inventories/index.vue`, `app/pages/campaigns/[id]/items/index.vue`, `app/pages/campaigns/[id]/shops/[slug]/index.vue`
- **New component(s)**: Entity/owner autocomplete picker (reusable), formatted price display component or utility
- **Composable changes**: `useCampaignApi` -- may need `addStock`, `updateStock`, `deleteStock` methods; `createTransaction` method already exists server-side but client composable needs it exposed
- **i18n**: New keys in `i18n/locales/en.json` and `i18n/locales/es.json` for all new UI labels
- **No DB migrations** -- all schema already exists
- **CLI impact**: The two new currency endpoints (PUT/DELETE) should be assessed for `aleph-cli` but the CLI already has `currency create`; adding `currency edit` and `currency delete` commands is recommended
