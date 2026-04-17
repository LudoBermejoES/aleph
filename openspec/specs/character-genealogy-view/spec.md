## ADDED Requirements

### Requirement: Genealogy API endpoint

The server SHALL expose `GET /api/campaigns/[id]/characters/[slug]/genealogy?depth=<N>` that returns a JSON payload `{ focus, nodes, edges, warnings }` where:

- `focus` is the slug of the centered character.
- `nodes` is an array of `{ entityId, slug, name, birthYear, deathYear, gender, portraitUrl, generation, x, y }` covering the centered character plus ancestors up to `depth` generations above, descendants up to `depth` generations below, plus spouses of any included character.
- `edges` is an array of `{ type: 'parent' | 'spouse', source, target, relationId }`.
- `x`, `y` are precomputed layout coordinates; `generation` is 0 at the focus, negative for ancestors, positive for descendants.
- `depth` defaults to 3 and is hard-capped at 10.

#### Scenario: Return three-generation tree

- **GIVEN** characters arranged as grandparent → parent → focus → child, all with family links and birthYears set
- **WHEN** an authenticated user requests `GET /genealogy?depth=3`
- **THEN** the response `nodes` contains the grandparent (generation=-2), parent (generation=-1), focus (generation=0), and child (generation=+1), each with an `x` and `y`

#### Scenario: Include spouse adjacent to focus

- **GIVEN** focus character "Agnus" with a `spouse_of` link to "Andrea"
- **WHEN** a user requests the focus's genealogy
- **THEN** Andrea appears in `nodes` with `generation=0` and an `x` adjacent to Agnus

#### Scenario: Include only up to the requested depth

- **GIVEN** a five-generation chain above the focus
- **WHEN** a user requests `depth=2`
- **THEN** only two generations of ancestors are included (generation=-1 and -2)

#### Scenario: Cap depth at 10

- **GIVEN** a query parameter `depth=50`
- **WHEN** the user requests the endpoint
- **THEN** the server behaves as if `depth=10` (the hard cap) and includes at most 10 generations in each direction

#### Scenario: Reject invalid depth

- **GIVEN** a query `depth=-1` or `depth=abc`
- **WHEN** the user requests the endpoint
- **THEN** the server responds 400 with a validation error

#### Scenario: Unauthenticated request rejected

- **WHEN** a client without credentials requests the endpoint
- **THEN** the server responds 401

#### Scenario: Character not found

- **WHEN** an authenticated user requests genealogy for an unknown slug
- **THEN** the server responds 404

#### Scenario: Empty tree for a character with no family links

- **GIVEN** a character with no family relations
- **WHEN** an authenticated user requests their genealogy
- **THEN** `nodes` contains only the focus character, `edges` is empty

### Requirement: Deterministic layout

The layout coordinates returned by the genealogy endpoint SHALL be deterministic — given the same input graph, two successive calls MUST return identical `x`, `y` values for every node. Tie-breaking rules: within a generation row, nodes are ordered first by birthYear ascending (with unknowns last), then by slug ascending.

#### Scenario: Repeated calls produce identical layout

- **GIVEN** a stable family graph
- **WHEN** the endpoint is called twice in succession
- **THEN** the `nodes` arrays match element-for-element in order and coordinates

#### Scenario: Unknown birthYears sort last

- **GIVEN** three siblings with birthYears [1900, null, 1910]
- **WHEN** the layout is computed
- **THEN** within their generation row the order is [1900, 1910, null]

#### Scenario: Spouses placed adjacent

- **GIVEN** a spouse pair with no other connections
- **WHEN** the layout is computed
- **THEN** the two nodes' `y` values are equal and their `x` values differ by exactly one node width plus a fixed spouse gap

### Requirement: Layered layout algorithm

The layout SHALL place nodes in generation rows where `y = generation * ROW_HEIGHT`, each row contains all nodes of that generation ordered per the determinism rules, spouse pairs are treated as a single unit when positioning children below, and subtrees are horizontally packed so that sibling subtrees do not overlap.

#### Scenario: Parent is centered above its children pair

- **GIVEN** a parent with two children
- **WHEN** the layout is computed
- **THEN** the parent's `x` is the midpoint of the children's `x` values (within a tolerance of half a node width)

#### Scenario: Spouse pair centered above shared children

- **GIVEN** a spouse pair with three shared children
- **WHEN** the layout is computed
- **THEN** the midpoint between the two parents' `x` values equals the midpoint of the three children's `x` range

### Requirement: Genealogy page

The frontend SHALL expose a page at `/campaigns/[id]/characters/[slug]/genealogy` that renders the server-computed genealogy in a tldraw canvas using a dedicated `GenealogyNodeShape`. The character detail page SHALL include a prominent "View genealogy" action linking to this page.

#### Scenario: Navigate from character page to genealogy

- **GIVEN** a user viewing a character detail page
- **WHEN** the user clicks the "View genealogy" button
- **THEN** the user is navigated to `/campaigns/[id]/characters/[slug]/genealogy` and the tldraw canvas renders at least the focus character node

#### Scenario: Tree renders with correct nodes and edges

- **GIVEN** a focus character with two parents, one spouse, and two children
- **WHEN** the genealogy page loads
- **THEN** six nodes are visible on the canvas and the expected parent-of and spouse-of connectors link them

#### Scenario: Recompute layout

- **GIVEN** a user has hand-edited the saved genealogy snapshot
- **WHEN** the user clicks "Recompute layout" and confirms
- **THEN** the page re-queries the server, overwrites the snapshot, and shows the freshly laid out tree

### Requirement: Gender-based node color

The `GenealogyNodeShape` SHALL render with a background color determined by `gender`: `male` → blue, `female` → pink, unknown or any other value → gray. The color SHALL NOT be configurable per character for v1; the computation is purely derived from the character's `gender` field.

#### Scenario: Male character renders blue

- **GIVEN** a character with `gender="male"`
- **WHEN** its node renders on the genealogy canvas
- **THEN** the node's background color is the project's blue token

#### Scenario: Female character renders pink

- **GIVEN** a character with `gender="female"`
- **WHEN** its node renders
- **THEN** the node's background color is the project's pink token

#### Scenario: Unknown gender renders gray

- **GIVEN** a character with `gender=null` (or any value outside `male`/`female`)
- **WHEN** its node renders
- **THEN** the node's background color is the project's gray token

### Requirement: Node shows name and year range

Each rendered node SHALL display the character's name, the character's portrait (or a placeholder if absent), and a year label: `"YYYY"` if only `birthYear` is set, `"YYYY–ZZZZ"` if both birthYear and deathYear are set, and no year label at all if both are null.

#### Scenario: Both years shown

- **GIVEN** a character Agnus with `birthYear=1970`, `deathYear=2042`
- **WHEN** the node renders
- **THEN** the node displays "Agnus" and "1970–2042"

#### Scenario: Birth year only

- **GIVEN** a character with `birthYear=1970`, `deathYear=null`
- **WHEN** the node renders
- **THEN** the node displays the name and "1970" (no separator)

#### Scenario: No year data

- **GIVEN** a character with both years null
- **WHEN** the node renders
- **THEN** the node displays the name only and no year label is present
