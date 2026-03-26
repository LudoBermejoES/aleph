# Delta for Inventory Economy

## ADDED Requirements

### Requirement: Inventory Transfer API

The system SHALL support moving items between inventories atomically.

#### Scenario: Transferring an item between characters
- GIVEN two characters in the same campaign each with an inventory
- WHEN an authorized user sends a POST request to `/api/inventory/transfer` with source, target, and item details
- THEN the item is removed from the source inventory and added to the target inventory in a single transaction
- AND both inventory records reflect the updated quantities

#### Scenario: Transfer failure on insufficient quantity
- GIVEN a source inventory with fewer items than the requested transfer amount
- WHEN the transfer request is submitted
- THEN the transaction is rolled back
- AND the API returns a 409 Conflict error with an explanatory message
