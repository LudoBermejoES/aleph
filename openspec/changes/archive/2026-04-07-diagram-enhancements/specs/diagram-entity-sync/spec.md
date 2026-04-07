## ADDED Requirements

### Requirement: Batch entity fetch endpoint

The system SHALL expose `GET /api/campaigns/:id/diagrams/entities/batch?ids=<comma-separated-entityIds>` that returns a minimal entity data object for each requested ID. The endpoint requires player-or-above campaign membership. Unknown IDs are silently omitted from the response.

#### Scenario: Authenticated batch fetch returns entity data

- **GIVEN** a campaign member with player role
- **WHEN** they request `GET /api/campaigns/:id/diagrams/entities/batch?ids=id1,id2`
- **THEN** the response is `200` with a JSON object keyed by entity ID, each value containing `{ id, name, type, slug, portraitUrl, tags, status }`

#### Scenario: Unauthenticated request is rejected

- **WHEN** a request with no auth header hits `GET /api/campaigns/:id/diagrams/entities/batch`
- **THEN** the response is `401`

#### Scenario: Unknown entity IDs are omitted silently

- **GIVEN** a batch request containing one valid ID and one non-existent ID
- **WHEN** the endpoint processes the request
- **THEN** only the valid entity appears in the response; no error is thrown

#### Scenario: Empty ids param returns empty object

- **WHEN** `GET /api/campaigns/:id/diagrams/entities/batch?ids=` is called
- **THEN** the response is `200` with `{}`

#### Scenario: IDs are split into batches of 50

- **GIVEN** a diagram with 120 entity-linked shapes
- **WHEN** the client hydrates on canvas load
- **THEN** the client issues 3 separate batch requests (50+50+20) via `Promise.all`

### Requirement: Client-side entity hydration on canvas load

The system SHALL hydrate all entity-linked shapes (`npcToken`, `entityCard`, `locationPin`, `questNode`, `factionCard`) with fresh campaign data every time a diagram canvas is opened. Shapes persist only `entityId` and `slug` as canonical identity; all other display props (`name`, `portraitUrl`, `statusBadge`, `tags`) are overwritten from the batch fetch result.

#### Scenario: Shapes display updated portrait after hydration

- **GIVEN** an NPCToken shape was dropped when a character had no portrait
- **AND** the character's portrait was subsequently uploaded
- **WHEN** the diagram canvas is opened
- **THEN** the NPCToken displays the new portrait without any manual refresh

#### Scenario: Hydration runs after snapshot is loaded

- **GIVEN** a diagram with 10 entity-linked shapes
- **WHEN** the tldraw editor mounts and loads the snapshot
- **THEN** `editor.updateShapes()` is called with fresh entity data after the snapshot is fully applied (deferred via `setTimeout(0)`)

#### Scenario: Shape with deleted entity shows fallback

- **GIVEN** an NPCToken referencing an entity that has since been deleted
- **WHEN** the canvas loads and the batch fetch omits that entity
- **THEN** the shape retains its last known `name` and shows the placeholder portrait — no crash

#### Scenario: Hydration respects campaign membership visibility

- **GIVEN** a player-role user opens a diagram
- **WHEN** the batch fetch runs
- **THEN** entity data respects the campaign's visibility rules (DM-only entities not returned to players)
