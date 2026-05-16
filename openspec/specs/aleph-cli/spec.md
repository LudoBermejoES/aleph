## ADDED Requirements

### Requirement: Upload entity image via CLI

The CLI SHALL provide an `entity upload-image` command that uploads an image file for a given entity.

#### Scenario: Upload image for entity

- **WHEN** a user runs `aleph entity upload-image --campaign <id> --slug <slug> --file <path>`
- **THEN** the CLI sends a multipart POST to `/api/campaigns/:id/entities/:slug/image` with the file and prints the resulting `imageUrl`

#### Scenario: Upload with --json flag

- **WHEN** the command is run with `--json`
- **THEN** the CLI outputs `{ "imageUrl": "..." }` to stdout

#### Scenario: File not found

- **WHEN** the `--file` path does not exist
- **THEN** the CLI prints an error to stderr and exits with code 1

#### Scenario: Server returns error

- **WHEN** the server responds with a non-2xx status
- **THEN** the CLI prints the server error message to stderr and exits with code 2

### Requirement: Maps CLI Commands

The CLI SHALL provide commands to manage maps, including listing, viewing, creating, updating, deleting, uploading images, and managing pins.

#### Scenario: List maps in a campaign

- GIVEN the user is authenticated with a valid API key
- WHEN the user runs `aleph map list --campaign <id>`
- THEN the CLI displays a table of maps with name, slug, and description
- AND the exit code is 0

#### Scenario: List maps as JSON

- GIVEN the user is authenticated
- WHEN the user runs `aleph map list --campaign <id> --json`
- THEN the CLI outputs the raw JSON array of map objects

#### Scenario: Get map details

- GIVEN the user is authenticated
- WHEN the user runs `aleph map get --campaign <id> --slug <slug>`
- THEN the CLI displays the map's name, description, dimensions, and layer count

#### Scenario: Create a map

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph map create --campaign <id> --name "World Map"`
- THEN the server creates the map
- AND the CLI prints the new map's slug and a success message

#### Scenario: Upload a map image

- GIVEN the user is authenticated and has editor or higher role
- AND a map exists with the given slug
- WHEN the user runs `aleph map upload --campaign <id> --slug <slug> --file ./map.png`
- THEN the CLI uploads the image via multipart POST
- AND prints a success message

#### Scenario: Upload fails for missing file

- GIVEN the user runs `aleph map upload --campaign <id> --slug <slug> --file ./nonexistent.png`
- WHEN the file does not exist on disk
- THEN the CLI prints an error message to stderr
- AND exits with a non-zero code

#### Scenario: List pins on a map

- GIVEN the user is authenticated
- WHEN the user runs `aleph map pins --campaign <id> --slug <slug>`
- THEN the CLI displays a table of pins with label, position, and linked entity

#### Scenario: Create a pin on a map

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph map pin-add --campaign <id> --slug <slug> --label "Dragon Lair" --x 100 --y 200`
- THEN the server creates the pin
- AND the CLI prints a success message with the pin ID

#### Scenario: Delete a pin from a map

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph map pin-delete --campaign <id> --slug <slug> --pin <pinId>`
- THEN the server deletes the pin
- AND the CLI prints a success message

#### Scenario: Unauthenticated map request

- GIVEN the user has no API key configured
- WHEN the user runs `aleph map list --campaign <id>`
- THEN the CLI prints an authentication error to stderr
- AND exits with a non-zero code

### Requirement: Quests CLI Commands

The CLI SHALL provide commands to list, view, create, and update quests within a campaign.

#### Scenario: List quests

- GIVEN the user is authenticated
- WHEN the user runs `aleph quest list --campaign <id>`
- THEN the CLI displays a table of quests with name, status, and slug

#### Scenario: Create a quest

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph quest create --campaign <id> --name "Find the Artifact" --status active`
- THEN the server creates the quest
- AND the CLI prints the new quest's slug and a success message

#### Scenario: Update quest status

- GIVEN the user is authenticated and has editor or higher role
- AND a quest exists with the given slug
- WHEN the user runs `aleph quest update --campaign <id> --slug <slug> --status completed`
- THEN the server updates the quest status
- AND the CLI prints a success message

### Requirement: Calendar & Timeline CLI Commands

The CLI SHALL provide commands to manage calendars (list, get, create, update, advance, manage events) and timelines (list, get, create, add events).

#### Scenario: List calendars

- GIVEN the user is authenticated
- WHEN the user runs `aleph calendar list --campaign <id>`
- THEN the CLI displays a table of calendars with name and current date

#### Scenario: Create a calendar

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph calendar create --campaign <id> --name "Harptos"`
- THEN the server creates the calendar
- AND the CLI prints the calendar ID and a success message

#### Scenario: Advance calendar date

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph calendar advance --campaign <id> --calendar <calendarId> --days 7`
- THEN the server advances the calendar by 7 days
- AND the CLI prints the new current date

#### Scenario: List calendar events

- GIVEN the user is authenticated
- WHEN the user runs `aleph calendar events --campaign <id> --calendar <calendarId>`
- THEN the CLI displays a table of events with name, date, and description

#### Scenario: Create a calendar event

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph calendar event-add --campaign <id> --calendar <calendarId> --name "Festival" --day 15`
- THEN the server creates the event
- AND the CLI prints a success message

#### Scenario: List timelines

- GIVEN the user is authenticated
- WHEN the user runs `aleph timeline list --campaign <id>`
- THEN the CLI displays a table of timelines with name and slug

#### Scenario: Create a timeline

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph timeline create --campaign <id> --name "Age of Legends"`
- THEN the server creates the timeline
- AND the CLI prints the timeline slug and a success message

#### Scenario: Add event to timeline

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph timeline event-add --campaign <id> --slug <slug> --name "The Great War" --year -500`
- THEN the server creates the timeline event
- AND the CLI prints a success message

### Requirement: Economy CLI Commands (Items, Shops, Currencies, Transactions, Inventories)

The CLI SHALL provide commands for the full economy subsystem: items, shops (with stock/buy/sell), currencies (with conversion), transactions, and inventories (with item management and transfers).

#### Scenario: List items

- GIVEN the user is authenticated
- WHEN the user runs `aleph item list --campaign <id>`
- THEN the CLI displays a table of items with name and price

#### Scenario: Create an item

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph item create --campaign <id> --name "Longsword" --price '{"gold": 15}'`
- THEN the server creates the item
- AND the CLI prints a success message

#### Scenario: List shops

- GIVEN the user is authenticated
- WHEN the user runs `aleph shop list --campaign <id>`
- THEN the CLI displays a table of shops with name and slug

#### Scenario: Get shop details with stock

- GIVEN the user is authenticated
- WHEN the user runs `aleph shop get --campaign <id> --slug <slug>`
- THEN the CLI displays the shop name, description, and stock list with item names and quantities

#### Scenario: Add stock to a shop

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph shop stock --campaign <id> --slug <slug> --item <itemId> --quantity 10`
- THEN the server adds the item to the shop's stock
- AND the CLI prints a success message

#### Scenario: Buy from a shop

- GIVEN the user is authenticated
- WHEN the user runs `aleph shop buy --campaign <id> --slug <slug> --item <itemId> --quantity 1 --buyer <inventoryId>`
- THEN the server processes the purchase
- AND the CLI prints the transaction summary

#### Scenario: Sell to a shop

- GIVEN the user is authenticated
- WHEN the user runs `aleph shop sell --campaign <id> --slug <slug> --item <itemId> --quantity 1 --seller <inventoryId>`
- THEN the server processes the sale
- AND the CLI prints the transaction summary

#### Scenario: List currencies

- GIVEN the user is authenticated
- WHEN the user runs `aleph currency list --campaign <id>`
- THEN the CLI displays a table of currencies with name, symbol, and value

#### Scenario: Create a currency

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph currency create --campaign <id> --name "Gold" --symbol "gp" --value 1`
- THEN the server creates the currency
- AND the CLI prints a success message

#### Scenario: Convert currency

- GIVEN the user is authenticated
- WHEN the user runs `aleph currency convert --campaign <id> --amount 100 --from gp --to sp`
- THEN the CLI displays the converted amount

#### Scenario: List transactions

- GIVEN the user is authenticated
- WHEN the user runs `aleph transaction list --campaign <id>`
- THEN the CLI displays a table of transactions with type, amount, from/to entities, and date

#### Scenario: Create a transaction

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph transaction create --campaign <id> --type payment --from <entityId> --to <entityId> --amounts '{"gold": 50}'`
- THEN the server creates the transaction
- AND the CLI prints the transaction ID and a success message

#### Scenario: Delete a transaction

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph transaction delete --campaign <id> --id <txId>`
- THEN the CLI prompts for confirmation
- AND on confirmation, the server deletes the transaction
- AND the CLI prints a success message

#### Scenario: List inventories

- GIVEN the user is authenticated
- WHEN the user runs `aleph inventory list --campaign <id>`
- THEN the CLI displays a table of inventories with owner name, owner type, and item count

#### Scenario: Create an inventory

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph inventory create --campaign <id> --owner-type character --owner-id <characterId>`
- THEN the server creates the inventory
- AND the CLI prints the inventory ID and a success message

#### Scenario: Add item to inventory

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph inventory add-item --campaign <id> --inventory <inventoryId> --item <itemId> --quantity 3`
- THEN the server adds the item to the inventory
- AND the CLI prints a success message

#### Scenario: Transfer items between inventories

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph inventory transfer --campaign <id> --from <inventoryId> --to <inventoryId> --item <itemId> --quantity 1`
- THEN the server processes the transfer
- AND the CLI prints a success message

### Requirement: Template CLI Commands

The CLI SHALL provide commands to list, view, create, update, and delete entity templates.

#### Scenario: List templates

- GIVEN the user is authenticated
- WHEN the user runs `aleph template list --campaign <id>`
- THEN the CLI displays a table of templates with name and entity type

#### Scenario: Get template details

- GIVEN the user is authenticated
- WHEN the user runs `aleph template get --campaign <id> --id <templateId>`
- THEN the CLI displays the template name, entity type, and content preview

#### Scenario: Create a template

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph template create --campaign <id> --name "NPC Sheet" --entityType character --content '...'`
- THEN the server creates the template
- AND the CLI prints the template ID and a success message

#### Scenario: Delete a template

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph template delete --campaign <id> --id <templateId>`
- THEN the CLI prompts for confirmation
- AND on confirmation, the server deletes the template
- AND the CLI prints a success message

### Requirement: Tag CLI Commands

The CLI SHALL provide commands to list and create tags within a campaign.

#### Scenario: List tags

- GIVEN the user is authenticated
- WHEN the user runs `aleph tag list --campaign <id>`
- THEN the CLI displays a table of tags with name and color

#### Scenario: Create a tag

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph tag create --campaign <id> --name "Important" --color "#ff0000"`
- THEN the server creates the tag
- AND the CLI prints a success message

### Requirement: Arc & Chapter CLI Commands

The CLI SHALL provide commands to list and create arcs and chapters within a campaign.

#### Scenario: List arcs

- GIVEN the user is authenticated
- WHEN the user runs `aleph arc list --campaign <id>`
- THEN the CLI displays a table of arcs with name and sort order

#### Scenario: Create an arc

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph arc create --campaign <id> --name "The Dragon War"`
- THEN the server creates the arc
- AND the CLI prints a success message

#### Scenario: List chapters

- GIVEN the user is authenticated
- WHEN the user runs `aleph chapter list --campaign <id>`
- THEN the CLI displays a table of chapters with name, arc, and sort order

#### Scenario: Create a chapter

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph chapter create --campaign <id> --name "The Siege" --arc <arcId>`
- THEN the server creates the chapter
- AND the CLI prints a success message

### Requirement: Health Check CLI Command

The CLI SHALL provide a command to check server connectivity and health.

#### Scenario: Server is healthy

- GIVEN the user has a server URL configured
- WHEN the user runs `aleph health`
- THEN the CLI sends a GET request to `/api/health`
- AND prints the server status and version
- AND exits with code 0

#### Scenario: Server is unreachable

- GIVEN the user has a server URL configured
- WHEN the user runs `aleph health`
- AND the server is not reachable
- THEN the CLI prints a connection error to stderr
- AND exits with a non-zero code

### Requirement: CLI command to mark session attendance

The CLI SHALL provide a `session attendance mark` subcommand that sends a bulk attendance update for a session to the server.

#### Scenario: Mark characters as attended

- **GIVEN** the user is authenticated with a DM or co-DM API key
- **WHEN** the user runs `aleph session attendance mark --campaign <id> --session <slug> --characters sim-sim,laughlin`
- **THEN** the CLI sends `PUT /api/campaigns/:id/sessions/:slug/attendance/bulk` with `{ "attendees": ["sim-sim", "laughlin"], "attended": true }`
- **AND** prints the number of updated records and any unresolved slugs

#### Scenario: Mark characters as absent

- **GIVEN** the user is authenticated with a DM or co-DM API key
- **WHEN** the user runs `aleph session attendance mark --campaign <id> --session <slug> --characters sim-sim --absent`
- **THEN** the CLI sends the bulk attendance request with `{ "attendees": ["sim-sim"], "attended": false }`
- **AND** prints a success message

#### Scenario: Unresolved slugs are reported

- **WHEN** the server returns `{ "updated": 1, "unresolved": ["ghost-slug"] }`
- **THEN** the CLI prints a warning listing the unresolved slugs
- **AND** exits with code 0

#### Scenario: Player API key is rejected

- **GIVEN** the user is authenticated with a player API key
- **WHEN** the command is run
- **THEN** the CLI prints the 403 error message to stderr
- **AND** exits with a non-zero code

#### Scenario: --json flag outputs raw response

- **WHEN** the command is run with `--json`
- **THEN** the CLI outputs the raw JSON response body to stdout
