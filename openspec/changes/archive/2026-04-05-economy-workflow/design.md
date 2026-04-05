## Technical Approach

Frontend-first improvements to the economy subsystem pages with two new server routes for currency CRUD completion. All UI follows existing patterns: inline forms, `useCampaignApi` composable, shadcn-vue primitives, `data-testid` attributes for E2E testing.

## Decisions

### Currency Edit: Inline Edit vs Modal

**Decision: Inline edit.** Each currency row gets an edit button that expands the row into an inline form (same fields as creation: name, symbol, valueInBase, sortOrder). This matches the existing pattern where the create form appears inline at the top of the page. A modal would be heavier than necessary for four simple fields. Delete uses a small confirm dialog (shadcn `AlertDialog`) to prevent accidental deletion.

### Transaction Creation Form

**Decision: Collapsible form panel at the top of the page** (same pattern as currency/inventory creation). Fields:

- **Type**: `<select>` with all transaction types (purchase, sale, transfer, trade, deposit, withdrawal, grant)
- **From / To entity**: Two instances of the new entity autocomplete picker (see below)
- **Item**: Optional item autocomplete picker (searches campaign items by name)
- **Quantity**: Number input, shown when an item is selected
- **Amounts**: Dynamic currency rows -- one per campaign currency, each with a number input. Only shown for wealth-modifying types (grant, deposit, withdrawal, loot)
- **Notes**: Textarea

The form calls `POST /api/campaigns/:id/transactions` which already exists and handles wealth updates.

### Inventory Owner Picker

**Decision: New reusable `OwnerPicker` component** using a shadcn-vue `Popover` + `Command` (combobox pattern). The component:

1. Accepts `ownerType` and `campaignId` props
2. Fetches the appropriate list based on `ownerType`:
   - `character` -> `api.getCharacters()`
   - `party` -> hardcoded "Party" entry (single party per campaign, uses campaignId as ownerId)
   - `faction` -> `api.getEntities({ type: 'faction' })` (factions are entities)
   - `shop` -> `api.getShops()`
3. Displays a searchable dropdown with name + type badge
4. Emits the selected `ownerId`

This component will also be reused in the transaction creation form for from/to entity selection (where it shows all characters + entities).

### Price Display Format

**Decision: Utility function `formatPrice(priceJson: string, currencies: Currency[])`** that:

1. Parses the JSON string (`{ "gold": 50, "silver": 5 }` or `{ "<currencyId>": amount }`)
2. Matches keys against campaign currencies by `id` or `name`
3. Outputs formatted string: `50 gp, 5 sp` (using currency symbol if available, otherwise name)
4. Falls back to raw JSON display if currencies cannot be resolved

Used in: items list, shop stock display, transaction amounts. Implemented as a composable `useFormatPrice` that loads currencies once and provides the formatter.

### Shop Stock Management

**Decision: Inline management on the shop detail page.** Three additions:

1. **Add stock form**: Collapsible panel with item autocomplete picker, quantity input (-1 for unlimited), optional price override (per-currency inputs), and availability toggle. Calls `POST /api/campaigns/:id/shops/:slug/stock`.

2. **Edit stock inline**: Each stock row gets edit/remove buttons. Edit toggles inline inputs for quantity, price override, and availability. This requires a new `PUT /api/campaigns/:id/shops/:slug/stock/:stockId` endpoint -- but checking the existing routes, there is no update/delete for stock. We will add `stock/[stockId].put.ts` and `stock/[stockId].delete.ts`.

3. **Remove stock**: Delete button with confirmation. Calls `DELETE /api/campaigns/:id/shops/:slug/stock/:stockId`.

### New Server Routes Summary

| Route                                           | Method | Purpose                                  |
| ----------------------------------------------- | ------ | ---------------------------------------- |
| `/api/campaigns/:id/currencies/:currencyId`     | PUT    | Update currency fields                   |
| `/api/campaigns/:id/currencies/:currencyId`     | DELETE | Delete currency (cascades via FK)        |
| `/api/campaigns/:id/shops/:slug/stock/:stockId` | PUT    | Update stock quantity/price/availability |
| `/api/campaigns/:id/shops/:slug/stock/:stockId` | DELETE | Remove stock entry                       |

### Composable Updates

`useCampaignApi` needs:

- `createTransaction(body)` -- expose the existing POST endpoint
- `addShopStock(slug, body)`, `updateShopStock(slug, stockId, body)`, `deleteShopStock(slug, stockId)` -- stock management
- Existing `updateCurrency` and `deleteCurrency` are already exposed

### i18n Approach

Add new keys under existing namespaces (`currencies.*`, `transactions.*`, `inventories.*`, `items.*`, `shops.*`) in both `en.json` and `es.json`. No new top-level namespaces needed.
