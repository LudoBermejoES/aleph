## 1. Server — Currency Edit/Delete API Routes

- [ ] 1.1 Create `server/api/campaigns/[id]/currencies/[currencyId].put.ts` — validate editor+ role, update currency fields (name, symbol, valueInBase, sortOrder), return updated record
- [ ] 1.2 Create `server/api/campaigns/[id]/currencies/[currencyId].delete.ts` — validate editor+ role, delete currency, return 204
- [ ] 1.3 Verify `useCampaignApi` already exposes `updateCurrency(currencyId, body)` and `deleteCurrency(currencyId)` — confirm they target the correct URLs

## 2. Server — Shop Stock Edit/Delete API Routes

- [ ] 2.1 Create `server/api/campaigns/[id]/shops/[slug]/stock/[stockId].put.ts` — validate editor+ role, update stock entry (quantity, priceOverrideJson, isAvailable), return updated record
- [ ] 2.2 Create `server/api/campaigns/[id]/shops/[slug]/stock/[stockId].delete.ts` — validate editor+ role, delete stock entry, return 204
- [ ] 2.3 Add `addShopStock(slug, body)`, `updateShopStock(slug, stockId, body)`, `deleteShopStock(slug, stockId)` to `useCampaignApi`
- [ ] 2.4 Add `createTransaction(body)` to `useCampaignApi` if not already exposed

## 3. Shared — Price Formatter Utility

- [ ] 3.1 Create `app/composables/useFormatPrice.ts` — accepts `priceJson` string + currencies array, returns formatted string (e.g., "50 gp, 5 sp"); falls back to raw key names if currency not found
- [ ] 3.2 Unit test the formatter with various priceJson shapes (single currency, multiple, empty, malformed, unknown keys)

## 4. Shared — Owner Picker Component

- [ ] 4.1 Create `app/components/OwnerPicker.vue` — shadcn Popover + Command combobox pattern; props: `campaignId`, `ownerType`, `modelValue`; emits `update:modelValue` with selected ownerId
- [ ] 4.2 Implement data fetching per ownerType: characters, factions (entities type=faction), shops, party (auto-select campaignId)
- [ ] 4.3 Implement search/filter within the dropdown list

## 5. Currency Edit/Delete UI

- [ ] 5.1 Add edit button to each currency row that toggles inline edit form (pre-filled name, symbol, valueInBase, sortOrder)
- [ ] 5.2 Add save/cancel for inline edit — calls `api.updateCurrency()`, reloads list on success
- [ ] 5.3 Add delete button with `AlertDialog` confirmation — calls `api.deleteCurrency()`, reloads list on success
- [ ] 5.4 Gate edit/delete buttons behind editor+ role (use campaign role from context)

## 6. Transaction Creation Form

- [ ] 6.1 Add "New Transaction" button (editor+ only) that toggles a collapsible form panel
- [ ] 6.2 Implement form fields: type select, from-entity OwnerPicker, to-entity OwnerPicker, item picker (searchable items list), quantity (shown when item selected), notes textarea
- [ ] 6.3 Implement dynamic currency amount inputs: shown for wealth-modifying types (grant, deposit, withdrawal, loot), one row per campaign currency
- [ ] 6.4 Submit calls POST `/api/campaigns/:id/transactions`, reload list on success
- [ ] 6.5 Resolve `itemId` to item name in the transaction table — fetch items list on page load, create a lookup map

## 7. Inventory Owner Picker Integration

- [ ] 7.1 Replace the raw `ownerId` text input in `inventories/index.vue` with the `OwnerPicker` component
- [ ] 7.2 Wire `ownerType` select to reset and reconfigure the OwnerPicker
- [ ] 7.3 Auto-select party (campaignId) when ownerType is "party"

## 8. Items Price Display

- [ ] 8.1 Load campaign currencies on the items page
- [ ] 8.2 Replace raw `{{ item.priceJson }}` with formatted price output using `useFormatPrice`
- [ ] 8.3 Apply the same formatted price display to shop stock rows in `shops/[slug]/index.vue`

## 9. Shop Stock Management UI

- [ ] 9.1 Add "Add Stock" button (editor+ only) with collapsible form: item picker, quantity input (-1 toggle for unlimited), price override per-currency inputs, availability toggle
- [ ] 9.2 Add inline edit to each stock row: quantity, price override, availability — save calls PUT stock endpoint
- [ ] 9.3 Add remove button with confirmation to each stock row — calls DELETE stock endpoint
- [ ] 9.4 Reload stock list after add/edit/remove operations

## 10. i18n Keys

- [ ] 10.1 Add keys to `i18n/locales/en.json`: `currencies.edit`, `currencies.delete`, `currencies.confirmDelete`, `currencies.deleted`, `currencies.updated`; `transactions.new`, `transactions.create`, `transactions.fromEntity`, `transactions.toEntity`, `transactions.notes`, `transactions.amounts`, `transactions.quantity`; `inventories.selectOwner`, `inventories.searchOwner`; `items.price`, `items.noPrice`; `shops.addStock`, `shops.editStock`, `shops.removeStock`, `shops.confirmRemoveStock`, `shops.quantity`, `shops.priceOverride`, `shops.availability`, `shops.available`, `shops.unavailable`
- [ ] 10.2 Add corresponding Spanish translations to `i18n/locales/es.json`

## 11. CLI Updates

- [ ] 11.1 Assess whether `aleph-cli` needs `currency edit` and `currency delete` commands — if the CLI already has `currency create`, add edit/delete for parity
- [ ] 11.2 Assess whether shop stock management commands are needed in the CLI
- [ ] 11.3 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` if CLI commands were added (bump version in SKILL.md frontmatter)

## 12. Testing

- [ ] 12.1 **Unit tests** (`tests/unit/`): `useFormatPrice` utility — various priceJson inputs, currency matching, fallback behavior
- [ ] 12.2 **Integration tests** (`tests/integration/`): Currency PUT/DELETE endpoints — success, 403 for players, 404 for missing currency; Shop stock PUT/DELETE endpoints — success, 403, 404; Transaction POST — verify item/entity resolution
- [ ] 12.3 **E2E tests** (`tests/e2e/`): Currency edit flow (click edit, change name, save, verify updated); Currency delete flow (click delete, confirm, verify removed); Transaction creation flow (open form, fill fields, save, verify in list); Inventory owner picker (select type, search, pick entity); Items page price display (verify formatted output); Shop stock add/edit/remove flows

## 13. Verification

- [ ] 13.1 Run `npm run build` — confirm no compilation errors
- [ ] 13.2 Run `npx vitest run tests/unit/` — all unit tests pass
- [ ] 13.3 Run `npx vitest run tests/integration/` — all integration tests pass (server on port 3333)
- [ ] 13.4 Run `npx playwright test` — all E2E tests pass
- [ ] 13.5 Run `npx nuxi typecheck` — no type errors
