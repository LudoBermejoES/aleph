# Economy UI Improvements

## MODIFIED Requirements

### Requirement: Currency Management

The system SHALL allow DMs to edit and delete currencies inline on the currencies page, and MUST enforce role-based permissions preventing players from modifying currencies.

#### Scenario: Edit a currency inline
- **Given** I am a DM on the currencies page with at least one currency
- **When** I click the edit button on a currency row
- **Then** the row expands into an inline form pre-filled with current values (name, symbol, valueInBase, sortOrder)
- **When** I change the name and click Save
- **Then** the currency is updated via `PUT /api/campaigns/:id/currencies/:currencyId`
- **And** the row returns to display mode showing the updated values

#### Scenario: Cancel currency edit
- **Given** I am editing a currency inline
- **When** I click Cancel
- **Then** the row returns to display mode with original values unchanged

#### Scenario: Delete a currency with confirmation
- **Given** I am a DM on the currencies page with at least one currency
- **When** I click the delete button on a currency row
- **Then** a confirmation dialog appears warning that deletion is permanent
- **When** I confirm deletion
- **Then** the currency is deleted via `DELETE /api/campaigns/:id/currencies/:currencyId`
- **And** the currency disappears from the list

#### Scenario: Cancel currency deletion
- **Given** the currency delete confirmation dialog is open
- **When** I click Cancel
- **Then** the dialog closes and the currency remains in the list

#### Scenario: Non-DM cannot edit or delete currencies
- **Given** I am a player on the currencies page
- **Then** no edit or delete buttons are visible on currency rows

#### Scenario: PUT /api/campaigns/:id/currencies/:currencyId
- **Given** I am authenticated with at least editor role
- **When** I send a PUT request with `{ name, symbol, valueInBase, sortOrder }`
- **Then** the currency is updated and the updated record is returned
- **Given** I am a player
- **When** I send a PUT request
- **Then** I receive 403

#### Scenario: DELETE /api/campaigns/:id/currencies/:currencyId
- **Given** I am authenticated with at least editor role
- **When** I send a DELETE request
- **Then** the currency is deleted and 204 is returned
- **Given** I am a player
- **When** I send a DELETE request
- **Then** I receive 403

---

### Requirement: Transaction List with Resolved Names

The transaction list SHALL display resolved item names instead of raw UUIDs, and SHALL show a dash or empty indicator when no item is associated.

#### Scenario: Item name displayed instead of raw itemId
- **Given** the transactions page loads with transactions that reference items
- **When** the table renders
- **Then** the Item column shows the item name (e.g., "Longsword") instead of the raw UUID

#### Scenario: Transaction with no item
- **Given** a transaction has no `itemId`
- **When** the table renders
- **Then** the Item column shows a dash or empty indicator

---

### Requirement: Inventory Owner Picker

The inventory creation form SHALL provide a searchable owner picker that filters entities by the selected owner type, and MUST auto-select the campaign party when owner type is "party".

#### Scenario: Owner picker shows searchable dropdown
- **Given** I am creating a new inventory and select owner type "character"
- **When** I click the owner picker field
- **Then** a searchable dropdown appears listing all campaign characters by name
- **When** I type a partial name
- **Then** the list filters to matching characters
- **When** I select a character
- **Then** the ownerId is set to the character's ID and the picker shows the character's name

#### Scenario: Owner picker updates when owner type changes
- **Given** I have selected owner type "character" and picked a character
- **When** I change owner type to "faction"
- **Then** the selected owner clears
- **And** the picker now searches entities of type faction

#### Scenario: Owner picker for party type
- **Given** I select owner type "party"
- **Then** the owner picker auto-selects the campaign party (ownerId = campaignId)
- **And** the picker field shows "Party" and is not editable

#### Scenario: Owner picker for shop type
- **Given** I select owner type "shop"
- **When** I open the picker
- **Then** it lists all campaign shops by name

---

### Requirement: Items Price Display

The items list and shop stock pages SHALL display prices formatted using campaign currency symbols instead of raw JSON, and SHALL fall back to displaying the key as-is for unknown currency keys.

#### Scenario: Formatted price shown instead of raw JSON
- **Given** the items page loads with items that have `priceJson` set
- **When** the list renders
- **Then** prices display as formatted text (e.g., "50 gp, 5 sp") using campaign currency symbols
- **And** items without a price show no price indicator

#### Scenario: Price with unknown currency key
- **Given** an item has `priceJson` with a key that does not match any campaign currency
- **When** the list renders
- **Then** the key is displayed as-is (e.g., "50 gold") as a fallback

#### Scenario: Price display on shop stock
- **Given** I am viewing a shop detail page with stock
- **Then** each stock item shows its price formatted using campaign currency symbols
- **And** price overrides are shown instead of the base item price when present

## ADDED Requirements

### Requirement: Transaction Creation Form

The system SHALL provide a transaction creation form for editors that supports trade, grant, and other transaction types, and MUST show currency amount inputs only for wealth-modifying transaction types.

#### Scenario: Open and close the transaction creation form
- **Given** I am an editor on the transactions page
- **When** I click "New Transaction"
- **Then** a form panel appears with fields: type, from entity, to entity, item, quantity, amounts, notes
- **When** I click Cancel
- **Then** the form panel closes

#### Scenario: Create a trade transaction with an item
- **Given** the transaction form is open
- **When** I select type "trade", pick a from-entity, pick a to-entity, select an item, enter quantity 2, and add notes
- **And** I click Save
- **Then** a POST is sent to `/api/campaigns/:id/transactions`
- **And** the transaction appears in the list
- **And** the form resets and closes

#### Scenario: Create a grant transaction with currency amounts
- **Given** the transaction form is open
- **When** I select type "grant", pick a to-entity, and enter amounts for one or more currencies
- **And** I click Save
- **Then** the transaction is created with wealth adjustments applied server-side

#### Scenario: Currency amount inputs visibility
- **Given** the transaction form is open
- **When** I select a wealth-modifying type (grant, deposit, withdrawal, loot)
- **Then** currency amount inputs appear (one row per campaign currency)
- **When** I select a non-wealth type (purchase, sale, transfer, trade)
- **Then** currency amount inputs are hidden

#### Scenario: Player cannot create transactions
- **Given** I am a player on the transactions page
- **Then** no "New Transaction" button is visible

---

### Requirement: Shop Stock Management

The shop detail page SHALL allow editors to add, edit, and remove stock entries with quantity, price override, and availability controls, and MUST enforce role-based permissions preventing players from managing stock.

#### Scenario: Add item to shop stock
- **Given** I am an editor on the shop detail page
- **When** I click "Add Stock"
- **Then** a form appears with: item picker (searchable), quantity input, price override inputs (per currency), availability toggle
- **When** I select an item, set quantity to 10, and click Save
- **Then** a POST is sent to `/api/campaigns/:id/shops/:slug/stock`
- **And** the new stock entry appears in the stock list

#### Scenario: Add unlimited stock
- **Given** the add stock form is open
- **When** I set quantity to -1 (or toggle "Unlimited")
- **And** I save
- **Then** the stock entry shows "Unlimited" in the quantity column

#### Scenario: Edit stock entry inline
- **Given** I am an editor viewing shop stock
- **When** I click the edit button on a stock row
- **Then** the row becomes editable with inputs for quantity, price override, and availability
- **When** I change the quantity and click Save
- **Then** a PUT is sent to `/api/campaigns/:id/shops/:slug/stock/:stockId`
- **And** the row returns to display mode with updated values

#### Scenario: Remove stock entry
- **Given** I am an editor viewing shop stock
- **When** I click the remove button on a stock row
- **Then** a confirmation prompt appears
- **When** I confirm
- **Then** a DELETE is sent to `/api/campaigns/:id/shops/:slug/stock/:stockId`
- **And** the stock entry disappears from the list

#### Scenario: Player cannot manage stock
- **Given** I am a player on the shop detail page
- **Then** no Add Stock, edit, or remove buttons are visible

#### Scenario: PUT /api/campaigns/:id/shops/:slug/stock/:stockId
- **Given** I am authenticated with at least editor role
- **When** I send a PUT with `{ quantity, priceOverrideJson, isAvailable }`
- **Then** the stock entry is updated and returned
- **Given** I am a player
- **When** I send a PUT
- **Then** I receive 403

#### Scenario: DELETE /api/campaigns/:id/shops/:slug/stock/:stockId
- **Given** I am authenticated with at least editor role
- **When** I send a DELETE
- **Then** the stock entry is removed and 204 is returned
- **Given** I am a player
- **When** I send a DELETE
- **Then** I receive 403
