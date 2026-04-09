## ADDED Requirements

### Requirement: Remote cursor visibility on diagram canvas

The system SHALL display other connected users' cursors on the diagram canvas in real-time with identifying information.

#### Scenario: User sees remote cursors

- **GIVEN** users A and B are both connected to diagram `D1` via sync
- **WHEN** user A moves their mouse over the canvas
- **THEN** user B sees a cursor indicator at user A's position
- **AND** the cursor is labeled with user A's display name
- **AND** the cursor is rendered in user A's assigned color

#### Scenario: Remote cursor disappears on disconnect

- **GIVEN** users A and B are both connected to diagram `D1`
- **WHEN** user A disconnects (closes tab, network loss)
- **THEN** user A's cursor disappears from user B's canvas within 5 seconds

#### Scenario: Multiple remote cursors

- **GIVEN** 4 users are connected to the same diagram
- **WHEN** all users move their cursors
- **THEN** each user sees 3 remote cursors, each with a distinct color and name label

### Requirement: Remote selection visibility

The system SHALL show which shapes other users have selected on the diagram canvas.

#### Scenario: User sees remote selections

- **GIVEN** users A and B are connected to diagram `D1`
- **WHEN** user A selects shape S1
- **THEN** user B sees shape S1 highlighted with user A's color
- **AND** the highlight is visually distinct from user B's own selection color

#### Scenario: Remote multi-selection

- **GIVEN** users A and B are connected to diagram `D1`
- **WHEN** user A selects shapes S1, S2, and S3
- **THEN** user B sees all three shapes highlighted with user A's color

### Requirement: Connected users indicator in toolbar

The system SHALL display a list of currently connected users in the diagram toolbar.

#### Scenario: Users shown in toolbar

- **GIVEN** 3 users are connected to diagram `D1`
- **WHEN** any user looks at the diagram toolbar
- **THEN** they see avatars or name badges for all 3 connected users (including themselves)
- **AND** each avatar uses the user's assigned color

#### Scenario: User joins — toolbar updates

- **GIVEN** 2 users are connected to diagram `D1`
- **WHEN** a third user connects
- **THEN** the toolbar indicator updates to show 3 users within 2 seconds

#### Scenario: User leaves — toolbar updates

- **GIVEN** 3 users are connected to diagram `D1`
- **WHEN** one user disconnects
- **THEN** the toolbar indicator updates to show 2 users within 5 seconds

### Requirement: Connection status indicator

The system SHALL display the current WebSocket connection status to the user.

#### Scenario: Connected state

- **GIVEN** a user opens a multiplayer-enabled diagram
- **WHEN** the WebSocket connection is established
- **THEN** a status indicator shows "Connected" or equivalent visual cue

#### Scenario: Reconnecting state

- **GIVEN** a user is editing a diagram in multiplayer mode
- **WHEN** the WebSocket connection drops temporarily
- **THEN** the status indicator shows "Reconnecting..." or equivalent
- **AND** the user's local edits are preserved
- **AND** when reconnection succeeds, local state is synchronized

#### Scenario: Disconnected state with fallback

- **GIVEN** a user is editing a diagram in multiplayer mode
- **WHEN** the WebSocket connection fails permanently (multiple reconnect attempts fail)
- **THEN** the status indicator shows "Disconnected" or equivalent warning
- **AND** the diagram falls back to single-user REST save mode

### Requirement: User color assignment

The system SHALL assign deterministic, distinct colors to each user for cursor and selection rendering.

#### Scenario: Consistent color per user

- **GIVEN** user A connects to diagram `D1`, disconnects, and reconnects
- **WHEN** user A's cursor is rendered on other users' canvases
- **THEN** user A has the same color both times

#### Scenario: Color derived from user identity

- **GIVEN** a user with a known user ID
- **WHEN** the system computes their cursor color
- **THEN** the color is derived deterministically from their user ID (e.g., hash-based)
- **AND** the color is distinguishable from the default tldraw selection color
