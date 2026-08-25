## MODIFIED Requirements

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
