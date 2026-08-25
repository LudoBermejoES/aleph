# aleph-cli Specification

## Purpose

Defines the surface of the `aleph` command-line client, which drives the Aleph API headlessly. It covers entity images, maps, quests, calendars and timelines, the economy (items, shops, currencies, transactions, inventories), entity templates, tags, arcs and chapters, session attendance and arc/chapter assignment, and a server health check.

## Requirements

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

The CLI SHALL provide commands to manage maps, including listing, viewing, creating,
updating, deleting, uploading images, and managing pins, across both the `image` and `osm`
map types.

`aleph map create` SHALL accept an optional `--type <image|osm>` (defaulting to `image` for
backward compatibility). When `--type osm` is given, it SHALL accept either `--address
<text>` (geocoded server-side, same provider/rate-limit/cache rules as the web UI) or direct
`--lat <n> --lng <n>`, plus an optional `--zoom <n>` stored as the map's initial zoom. When
`--address` is used, the CLI SHALL print the geocoded display name and resolved coordinates
to its output after creation, so the caller can see exactly what real-world location was
stored without needing an interactive confirmation step.

`aleph map pin-add` and `aleph map pins` SHALL use `--lat`/`--lng` (and `lat`/`lng` in JSON
output), matching the pin creation endpoint's actual contract
(`POST /api/campaigns/[id]/maps/[slug]/pins`, which requires `lat`/`lng` as required numeric
fields). The previous `--x`/`--y` flags and `x`/`y` JSON fields, which never matched the
endpoint's contract and caused every `pin-add` call to fail validation, SHALL be removed
rather than kept alongside the corrected ones.

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
- AND for an `osm`-type map it displays `type`, center, and zoom instead of pixel dimensions

#### Scenario: Create a map

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph map create --campaign <id> --name "World Map"`
- THEN the server creates a map with `type: 'image'`
- AND the CLI prints the new map's slug and a success message

#### Scenario: Create an OSM map by address

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph map create --campaign <id> --name "Berlin" --type osm --address
"Alexanderplatz, Berlin" --zoom 15`
- THEN the server geocodes the address, creates a map with `type: 'osm'` and the resolved
  center and the given zoom
- AND the CLI prints the new map's slug, the geocoded display name, and the resolved
  coordinates

#### Scenario: Create an OSM map by direct coordinates

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph map create --campaign <id> --name "Berlin" --type osm --lat
52.5219 --lng 13.4132 --zoom 15`
- THEN the server creates a map with `type: 'osm'` and the given center and zoom, with no
  geocoding call made

#### Scenario: Upload a map image

- GIVEN the user is authenticated and has editor or higher role
- AND a map exists with the given slug
- WHEN the user runs `aleph map upload --campaign <id> --slug <slug> --file ./map.png`
- THEN the CLI uploads the image via multipart POST
- AND prints a success message

#### Scenario: Upload fails for missing file

- GIVEN the user runs `aleph map upload --campaign <id> --slug <slug> --file
./nonexistent.png`
- WHEN the file does not exist on disk
- THEN the CLI prints an error message to stderr
- AND exits with a non-zero code

#### Scenario: List pins on a map

- GIVEN the user is authenticated
- WHEN the user runs `aleph map pins --campaign <id> --slug <slug>`
- THEN the CLI displays a table of pins with label, `lat`/`lng`, and linked entity

#### Scenario: Create a pin on a map

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph map pin-add --campaign <id> --slug <slug> --label "Dragon Lair"
--lat 100 --lng 200`
- THEN the server creates the pin, interpreting `lat`/`lng` as `CRS.Simple`-scaled pixel
  coordinates because the target map's `type` is `image`
- AND the CLI prints a success message with the pin ID

#### Scenario: Create a pin on an OSM map

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph map pin-add --campaign <id> --slug <slug> --label "Safehouse"
--lat 52.52 --lng 13.40`
- THEN the server creates the pin, interpreting `lat`/`lng` as real WGS84 degrees because the
  target map's `type` is `osm`, after validating the range
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

The CLI SHALL provide commands to list, create, update, and delete arcs and chapters within a
campaign. Arc and chapter ordering SHALL be settable from the CLI via a `--sort-order <n>`
option on `arc create`, `arc update`, `chapter create`, and `chapter update`, sent to the
server as a numeric `sortOrder`. `chapter create --arc <arc>` SHALL accept either an arc slug
or an arc id. `chapter list` SHALL work without an `--arc` option. Creation commands SHALL
print the slug the server generated, never an empty or `undefined` slug.

#### Scenario: List arcs

- GIVEN the user is authenticated
- WHEN the user runs `aleph arc list --campaign <id>`
- THEN the CLI displays a table of arcs with slug, name, status, and sort order
- AND the arcs appear in ascending `sortOrder` order as returned by `GET /api/campaigns/:id/arcs`

#### Scenario: Create an arc

- GIVEN the user is authenticated and has co_dm or higher role
- WHEN the user runs `aleph arc create --campaign <id> --name "The Dragon War"`
- THEN the server creates the arc
- AND the CLI prints a success message containing the arc's real slug `the-dragon-war`

#### Scenario: Create an arc at a specific sort order

- GIVEN the user is authenticated and has co_dm or higher role
- WHEN the user runs `aleph arc create --campaign <id> --name "Act IV" --sort-order 3`
- THEN the CLI sends `sortOrder: 3` as a number in the POST body
- AND the created arc has `sortOrder` 3 rather than the default 0

#### Scenario: Reorder an existing arc

- GIVEN the user is authenticated and an arc `act-ii` exists with `sortOrder` 0
- WHEN the user runs `aleph arc update --campaign <id> --slug act-ii --sort-order 1`
- THEN the CLI sends `sortOrder: 1` as a number in the PUT body
- AND `aleph arc list --campaign <id>` shows `act-ii` in its new position

#### Scenario: Non-numeric sort order is rejected locally

- GIVEN the user is authenticated
- WHEN the user runs `aleph arc create --campaign <id> --name "Act V" --sort-order abc`
- THEN the CLI prints an error to stderr without sending a request
- AND exits with a non-zero code

#### Scenario: Update an arc

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph arc update --campaign <id> --slug the-dragon-war --status active`
- THEN the server updates the arc
- AND the CLI prints a success message

#### Scenario: Delete an arc

- GIVEN the user is authenticated and has co_dm or higher role
- WHEN the user runs `aleph arc delete --campaign <id> --slug the-dragon-war`
- THEN the CLI prompts for confirmation unless `--yes` was passed
- AND on confirmation the server deletes the arc

#### Scenario: List chapters across a whole campaign

- GIVEN the user is authenticated and the campaign has arcs with chapters
- WHEN the user runs `aleph chapter list --campaign <id>`
- THEN the CLI reads `GET /api/campaigns/:id/arcs` and flattens each arc's nested chapters
- AND displays a table of chapters with slug, name, arc name, and sort order
- AND the command succeeds instead of failing with HTTP 400

#### Scenario: List chapters of one arc

- GIVEN the user is authenticated and arc `act-i` has chapters
- WHEN the user runs `aleph chapter list --campaign <id> --arc act-i`
- THEN only chapters belonging to `act-i` are displayed, in ascending sort order

#### Scenario: Create a chapter addressed by arc slug

- GIVEN the user is authenticated and has co_dm or higher role and arc `act-i` exists
- WHEN the user runs `aleph chapter create --campaign <id> --name "The Siege" --arc act-i`
- THEN the CLI resolves `act-i` to its arc id and sends that as `arcId`
- AND the server creates the chapter
- AND the CLI prints a success message containing the chapter's real slug `the-siege`

#### Scenario: Create a chapter addressed by arc id

- GIVEN the user is authenticated and has co_dm or higher role
- WHEN the user runs `aleph chapter create --campaign <id> --name "The Siege" --arc <arcId>`
- THEN the value is passed through as `arcId` because no arc slug matches it
- AND the server creates the chapter

#### Scenario: Create a chapter with an unknown arc reference

- GIVEN the user is authenticated
- WHEN the user runs `aleph chapter create --campaign <id> --name "The Siege" --arc nope`
- THEN the CLI or server reports that the arc was not found
- AND the CLI exits with a non-zero code

#### Scenario: Reorder a chapter

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph chapter update --campaign <id> --slug the-siege --sort-order 2`
- THEN the CLI sends `sortOrder: 2` as a number in the PUT body
- AND the chapter's position within its arc changes accordingly

#### Scenario: Delete a chapter

- GIVEN the user is authenticated and has co_dm or higher role
- WHEN the user runs `aleph chapter delete --campaign <id> --slug the-siege`
- THEN the CLI prompts for confirmation unless `--yes` was passed
- AND on confirmation the server deletes the chapter

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

### Requirement: Assign a session to an arc and chapter from the CLI

The CLI SHALL allow a session's narrative arc and chapter to be set, changed, and unset
without any hand-built HTTP request. `session update <slug>` and `session create` SHALL each
accept `--arc <slug>` and `--chapter <slug>`, which are sent to the server as `arcSlug` and
`chapterSlug` for server-side resolution. Passing an empty value to `--arc` MUST unset the
session's arc, and passing an empty value to `--chapter` MUST unset only the chapter. The
"provide at least one field to update" guard in `session update` MUST count `--arc` and
`--chapter` as fields.

#### Scenario: Assign a session to an arc

- GIVEN the user is authenticated with a valid API key and has co_dm or higher role
- AND arc `act-i` exists in the campaign
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc act-i`
- THEN the CLI sends `PUT /api/campaigns/:id/sessions/session-5` with body `{ arcSlug: "act-i" }`
- AND the CLI prints a success message and exits with code 0

#### Scenario: Assign a session to an arc and chapter together

- GIVEN the user is authenticated and chapter `the-market` belongs to arc `act-i`
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc act-i --chapter the-market`
- THEN the CLI sends `{ arcSlug: "act-i", chapterSlug: "the-market" }`
- AND the session ends up in both the arc and the chapter

#### Scenario: Assign only a chapter and let the arc be derived

- GIVEN the user is authenticated and chapter `the-market` belongs to arc `act-i`
- WHEN the user runs `aleph session update session-5 --campaign <id> --chapter the-market`
- THEN the CLI sends `{ chapterSlug: "the-market" }` with no `arcSlug`
- AND the session's arc becomes `act-i` because the server derives it from the chapter

#### Scenario: Unset a session's arc

- GIVEN the user is authenticated and session `session-5` is assigned to arc `act-i`
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc ''`
- THEN the CLI sends `{ arcSlug: "" }`
- AND the session has no arc and no chapter afterwards

#### Scenario: Unset only a session's chapter

- GIVEN the user is authenticated and session `session-5` is in arc `act-i`, chapter `the-market`
- WHEN the user runs `aleph session update session-5 --campaign <id> --chapter ''`
- THEN the session keeps arc `act-i` and has no chapter

#### Scenario: Unknown arc slug reports a clear error

- GIVEN the user is authenticated and no arc `nonexistent` exists in the campaign
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc nonexistent`
- THEN the CLI prints the server's `Arc "nonexistent" not found` message to stderr
- AND exits with a non-zero code
- AND the session is left unchanged

#### Scenario: Create a session already assigned to an arc

- GIVEN the user is authenticated and has co_dm or higher role and arc `act-i` exists
- WHEN the user runs `aleph session create --campaign <id> --title "Session 9" --arc act-i`
- THEN the CLI includes `arcSlug: "act-i"` in the POST body
- AND the created session is in arc `act-i`

#### Scenario: Arc and chapter count as updatable fields

- GIVEN the user is authenticated
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc act-i` with no other flags
- THEN the CLI does not print the "provide at least one field to update" error
- AND the request is sent

#### Scenario: session update help advertises the new options

- WHEN the user runs `aleph session update --help`
- THEN the options list includes `--arc <slug>` and `--chapter <slug>`
- AND each notes that an empty string unsets the value

#### Scenario: Unauthenticated assignment is refused

- GIVEN no API key is configured and no session cookie is present
- WHEN the user runs `aleph session update session-5 --campaign <id> --arc act-i`
- THEN the CLI prints an authentication error to stderr
- AND exits with a non-zero code

### Requirement: Filter and display sessions by arc in the CLI

The CLI SHALL make a session's arc membership visible and filterable. `session list` MUST
accept `--arc <slug>`, forwarded to the server as an `arcSlug` query parameter so filtering
happens before pagination, and its human-readable table MUST include an arc column. `session
show` MUST display the session's arc and chapter names.

#### Scenario: List only the sessions in one arc

- GIVEN the user is authenticated and 12 of the campaign's 73 sessions are in arc `act-i`
- WHEN the user runs `aleph session list --campaign <id> --arc act-i --limit 0`
- THEN the CLI requests `GET /api/campaigns/:id/sessions?arcSlug=act-i&...`
- AND exactly those 12 sessions are listed

#### Scenario: Arc column appears in the session table

- GIVEN the user is authenticated and sessions are assigned to arcs
- WHEN the user runs `aleph session list --campaign <id>`
- THEN each row shows the arc name from the response's `arcName` field, blank when unassigned
- AND raw arc UUIDs are not shown in the table

#### Scenario: Arc filter combines with the group filter and pagination

- GIVEN the user is authenticated
- WHEN the user runs `aleph session list --campaign <id> --arc act-i --group main-table --page 2`
- THEN the CLI forwards `arcSlug`, `groupSlug`, and the pagination params together
- AND the printed page metadata reflects the filtered total, not the campaign total

#### Scenario: Filtering by an arc with no sessions

- GIVEN the user is authenticated and arc `act-iv` has no sessions
- WHEN the user runs `aleph session list --campaign <id> --arc act-iv`
- THEN the CLI prints an empty table and exits with code 0

#### Scenario: JSON output carries arc and chapter fields

- GIVEN the user is authenticated
- WHEN the user runs `aleph session list --campaign <id> --arc act-i --json`
- THEN each session object includes `arcId`, `arcName`, `chapterId`, and `chapterName`

#### Scenario: session show displays arc and chapter

- GIVEN the user is authenticated and session `session-5` is in arc `act-i`, chapter `the-market`
- WHEN the user runs `aleph session show session-5 --campaign <id>`
- THEN the output includes the arc name `Act I` and the chapter name `The Market`

#### Scenario: Unauthenticated list is refused

- GIVEN no API key is configured and no session cookie is present
- WHEN the user runs `aleph session list --campaign <id> --arc act-i`
- THEN the CLI prints an authentication error to stderr and exits with a non-zero code

### Requirement: Session import SHALL accept a sub-campaign and report the resulting placement

`aleph session import` SHALL accept `--subcampaign <slug>`, with `--group <slug>` as a deprecated
alias, matching `session list`, `session create` and `session update`. When the import creates a
session it SHALL pass the slug through as `subCampaignSlug`; when it finds an existing session and a
sub-campaign is given, it SHALL move that session to it. The command SHALL print the resulting
sub-campaign.

**The defect this closes is silence, not absence.** Without the flag, every imported session is
created in the campaign's DEFAULT sub-campaign, the import prints success, and the session exists —
attached to the wrong storyline. In `Berlin en tinieblas` a session of _La discoteca_ (six mortal
students) lands in _La capilla_ (the mage cabal), two casts that share nothing. Nothing errors, so
correctness depends entirely on remembering a second command afterwards.

The asymmetry is the evidence: `session create` already accepts `--subcampaign` and posts
`subCampaignSlug` to the same endpoint the import uses, so the capability exists everywhere except
the one path that is used for bulk work.

#### Scenario: Import creates a session into a named sub-campaign

- **WHEN** `session import --subcampaign <slug>` creates a new session
- **THEN** the session SHALL be created in that sub-campaign
- **AND** the command SHALL print the sub-campaign it used

#### Scenario: Import moves an existing session

- **WHEN** `session import --subcampaign <slug>` finds an existing session for that date, in a
  different sub-campaign
- **THEN** the session SHALL be moved to the named sub-campaign
- **AND** the move SHALL be reported in the output

#### Scenario: No sub-campaign given

- **WHEN** `session import` is run without `--subcampaign` or `--group`
- **THEN** the session SHALL be created in the campaign's default sub-campaign, as before
- **AND** the command SHALL still print which sub-campaign it landed in, so a default placement is
  visible rather than assumed

#### Scenario: The deprecated alias behaves identically

- **WHEN** `--group <slug>` is used instead of `--subcampaign <slug>`
- **THEN** the behaviour SHALL be identical, matching the alias handling of the sibling subcommands

### Requirement: Entity creation SHALL reject a type the campaign does not declare

`aleph entity create --type <type>` SHALL validate the type against the types registered for that
campaign and SHALL refuse an unknown one, naming the valid set in the error. Its help text SHALL NOT
advertise as an example any type that is not universally registered.

**The silent write is the defect.** The help read `Entity type (e.g. location, faction, npc)` while
`npc` is not a registered type for `Berlin en tinieblas`, whose set is `character, event, faction,
item, location, lore, note, quest, session`. The CLI accepted `--type npc` and wrote the entity, which
then existed as the only `npc` in a campaign that has no such type — a record the UI cannot
categorise, reachable only through the generic page. Refusing at the point of entry costs one request
and removes the whole class.

#### Scenario: An unregistered type is refused

- **WHEN** `entity create --type npc` runs against a campaign whose types do not include `npc`
- **THEN** the command SHALL exit non-zero without creating anything
- **AND** the error SHALL list the campaign's registered types

#### Scenario: A registered type is accepted

- **WHEN** the type is one the campaign declares
- **THEN** the entity SHALL be created as before

#### Scenario: The help does not suggest an unregistered type

- **WHEN** `entity create --help` is read
- **THEN** the examples SHALL be types that exist across campaigns, and SHALL NOT include `npc`

### Requirement: Character CLI visibility control

The `character create` and `character update` CLI commands SHALL accept a `--visibility <vis>` option that is passed through to the server's `visibility` field on `POST`/`PUT /api/campaigns/[id]/characters`, matching the option already available on `organization create`/`organization edit`. The `character list` and `character show` commands SHALL include `visibility` in their output.

#### Scenario: Creating a character with an explicit visibility

- **WHEN** a DM runs `character create --campaign <id> --name "Hidden Villain" --visibility dm_only`
- **THEN** the CLI sends `visibility: "dm_only"` in the POST body and the created character is returned with `visibility: "dm_only"`

#### Scenario: Updating an existing character's visibility

- **WHEN** a DM runs `character update <slug> --campaign <id> --visibility private`
- **THEN** the CLI sends `visibility: "private"` in the PUT body and the character's visibility is updated to `private`

#### Scenario: Server rejects an invalid visibility value

- **WHEN** a user runs `character create --campaign <id> --name "X" --visibility not-a-real-value`
- **THEN** the CLI does not validate the value locally and forwards it to the server, which returns a validation error that the CLI prints to the user

#### Scenario: Listing and showing characters includes visibility

- **WHEN** a user runs `character list --campaign <id>` or `character show <slug> --campaign <id>`
- **THEN** the output includes each character's current `visibility` value
