## ADDED Requirements

### Requirement: Real-time diagram synchronization via WebSocket

The system SHALL synchronize tldraw diagram edits in real-time between multiple connected clients using the `@tldraw/sync` protocol over a dedicated WebSocket route.

#### Scenario: Two editors open the same diagram

- **GIVEN** two users with editor+ role open diagram `D1` in campaign `C1`
- **WHEN** user A creates a new shape on the canvas
- **THEN** user B sees the shape appear on their canvas within 500ms
- **AND** user B's canvas reflects the exact position, type, and properties of the shape

#### Scenario: Concurrent edits to different shapes

- **GIVEN** two editors connected to the same diagram
- **WHEN** user A moves shape S1 and user B resizes shape S2 simultaneously
- **THEN** both changes are applied without conflict
- **AND** both users see both changes reflected on their canvas

#### Scenario: Edit to the same shape

- **GIVEN** two editors connected to the same diagram
- **WHEN** both users modify properties of the same shape simultaneously
- **THEN** the `@tldraw/sync` protocol resolves the conflict deterministically
- **AND** both users converge to the same final state

### Requirement: WebSocket authentication and authorization

The system SHALL authenticate WebSocket connections to the tldraw sync route and enforce campaign membership and role-based permissions.

#### Scenario: Authenticated editor connects

- **GIVEN** a user with `editor` role in campaign `C1`
- **WHEN** they connect to `wss://host/api/tldraw-sync/{diagramId}` with a valid session cookie
- **THEN** the connection is accepted
- **AND** the user can send and receive shape edits

#### Scenario: Authenticated player connects (read-only)

- **GIVEN** a user with `player` role in campaign `C1`
- **WHEN** they connect to the tldraw sync WebSocket for a diagram in `C1`
- **THEN** the connection is accepted
- **AND** the user receives real-time shape updates from other editors
- **AND** any edit messages sent by this user are rejected by the server

#### Scenario: Unauthenticated connection attempt

- **GIVEN** a request to the tldraw sync WebSocket with no session cookie and no WS token
- **WHEN** the WebSocket upgrade is attempted
- **THEN** the server rejects the upgrade with a 401 status

#### Scenario: Non-member connection attempt

- **GIVEN** an authenticated user who is not a member of campaign `C1`
- **WHEN** they attempt to connect to a diagram sync WebSocket for a diagram in `C1`
- **THEN** the server rejects the connection with a 403 status

#### Scenario: WS token authentication fallback

- **GIVEN** a client that cannot send cookies on WebSocket upgrade
- **WHEN** the client connects with `?token={wsToken}` query parameter
- **THEN** the server validates the token via `validateWsToken()`
- **AND** proceeds with campaign membership and role checks as normal

### Requirement: Server-side room lifecycle management

The system SHALL manage one `TLSocketRoom` instance per active diagram, handling creation, persistence, and cleanup.

#### Scenario: First client connects to an idle diagram

- **GIVEN** no active room exists for diagram `D1`
- **WHEN** the first client connects to the sync WebSocket for `D1`
- **THEN** the server loads the latest snapshot from `diagramSnapshots` table
- **AND** creates a new `TLSocketRoom` initialized with that snapshot
- **AND** attaches the client to the room

#### Scenario: First client connects to a diagram with no snapshot

- **GIVEN** no active room and no snapshot exists for diagram `D1`
- **WHEN** the first client connects
- **THEN** the server creates a `TLSocketRoom` with an empty/default state
- **AND** the client sees a blank canvas

#### Scenario: Subsequent clients join an active room

- **GIVEN** an active room exists for diagram `D1` with 2 connected clients
- **WHEN** a third client connects
- **THEN** the client receives the current room state (not the DB snapshot)
- **AND** sees all shapes including edits made since the last DB persist

#### Scenario: Room persists to database on debounce

- **GIVEN** an active room with editors making changes
- **WHEN** 2 seconds elapse since the last edit
- **THEN** the room state is serialized and written to the `diagramSnapshots` table
- **AND** the snapshot version is incremented

#### Scenario: Last client disconnects with grace period

- **GIVEN** an active room with one remaining client
- **WHEN** that client disconnects
- **THEN** the server starts a 30-second grace period
- **AND** if a new client connects within 30 seconds, the room stays alive
- **AND** if no client connects within 30 seconds, the room persists final state and is destroyed

#### Scenario: Server shutdown persists all rooms

- **GIVEN** multiple active rooms with unsaved changes
- **WHEN** the server process receives a shutdown signal
- **THEN** all rooms persist their current state to the database before exit

### Requirement: Fallback to REST snapshot mode

The system SHALL fall back to single-user REST snapshot saving when the sync WebSocket is unavailable.

#### Scenario: WebSocket connection fails

- **GIVEN** the `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` flag is `true`
- **WHEN** the client fails to establish a WebSocket connection (timeout, network error)
- **THEN** the diagram page falls back to the current REST snapshot mode
- **AND** the user can still edit and save via `PUT /api/campaigns/{id}/diagrams/{diagramId}/snapshot`

#### Scenario: Feature flag disabled

- **GIVEN** `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` is `false` or unset
- **WHEN** a user opens a diagram
- **THEN** the diagram loads in single-user REST mode (current behavior)
- **AND** no WebSocket connection is attempted

### Requirement: Feature flag for multiplayer rollout

The system SHALL gate multiplayer diagram functionality behind a runtime configuration flag.

#### Scenario: Flag enabled

- **GIVEN** `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` is set to `true` in runtime config
- **WHEN** a user opens a diagram page
- **THEN** the page computes a sync WebSocket URI and passes it to the tldraw component

#### Scenario: Flag disabled

- **GIVEN** `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` is not set or is `false`
- **WHEN** a user opens a diagram page
- **THEN** the page uses the existing snapshot-based loading and REST auto-save
