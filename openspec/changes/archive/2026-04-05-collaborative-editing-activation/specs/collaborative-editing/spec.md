# Collaborative Editing -- Specification

## MODIFIED Requirements

### Requirement: Editor connects to Hocuspocus in collaborative mode

The system SHALL connect the TipTap editor to the Hocuspocus WebSocket server when the `collaborative` prop is true, using a document name derived from the campaign and resource identifiers.

#### Scenario: Entity editor opens in collaborative mode via query param

- **Given** a user with `editor` or higher role in a campaign
- **And** the user navigates to `/campaigns/{id}/entities/{slug}/edit?collab=true`
- **When** the edit page renders the EntityForm with MarkdownEditor
- **Then** the MarkdownEditor receives `collaborative=true` and `documentName="campaign:{id}:entity:{slug}"`
- **And** a HocuspocusProvider connects to the configured WebSocket URL
- **And** the editor uses Yjs-backed Collaboration extension instead of local History

#### Scenario: Entity editor opens in solo mode by default

- **Given** a user navigates to `/campaigns/{id}/entities/{slug}/edit` (no `collab` param)
- **When** the edit page renders the EntityForm with MarkdownEditor
- **Then** `collaborative` is false
- **And** no WebSocket connection is established
- **And** the editor uses standard History extension

#### Scenario: Session editor opens in collaborative mode

- **Given** a user with `dm` or `co_dm` role navigates to session edit with `?collab=true`
- **When** the SessionForm renders
- **Then** the MarkdownEditor connects to Hocuspocus with `documentName="campaign:{id}:session:{sessionId}"`

#### Scenario: Quest editor opens in collaborative mode

- **Given** a user with `editor` or higher role navigates to quest edit with `?collab=true`
- **When** the QuestForm renders
- **Then** the MarkdownEditor connects to Hocuspocus with `documentName="campaign:{id}:quest:{questId}"`

---

### Requirement: Multiple users see each other's cursors

The system SHALL display live cursor positions and colored labels for all connected users in a collaborative editing session.

#### Scenario: Two users editing the same entity see live cursors

- **Given** user A and user B both have the entity editor open in collaborative mode for the same entity
- **When** user A types in the editor
- **Then** user B sees user A's cursor position with a colored label showing user A's name
- **And** user A sees user B's cursor position with a colored label showing user B's name

#### Scenario: User cursor color is consistent across sessions

- **Given** a user with ID "abc123"
- **When** they open any collaborative editor
- **Then** their cursor color is derived deterministically from their user ID (same color every time)

---

### Requirement: WebSocket URL works in production

The system SHALL resolve the Hocuspocus WebSocket URL from the `NUXT_PUBLIC_HOCUSPOCUS_URL` runtime config, falling back to a derived URL based on the current page origin.

#### Scenario: WS URL from runtime config

- **Given** `NUXT_PUBLIC_HOCUSPOCUS_URL` is set to `wss://aleph.ludobermejo.es/collab`
- **When** the editor initializes in collaborative mode
- **Then** the HocuspocusProvider connects to `wss://aleph.ludobermejo.es/collab`

#### Scenario: WS URL falls back to derived value

- **Given** `NUXT_PUBLIC_HOCUSPOCUS_URL` is not set (empty string)
- **And** the page is served from `https://aleph.ludobermejo.es`
- **When** the editor initializes in collaborative mode
- **Then** the HocuspocusProvider connects to `wss://aleph.ludobermejo.es:3334`

#### Scenario: WS URL in local development

- **Given** `NUXT_PUBLIC_HOCUSPOCUS_URL` is not set
- **And** the page is served from `http://localhost:3000`
- **When** the editor initializes in collaborative mode
- **Then** the HocuspocusProvider connects to `ws://localhost:3334`

---

### Requirement: Collaboration indicator shows connected users

The system SHALL display a collaboration indicator that shows connection status and the names of other connected users in real time.

#### Scenario: Indicator shows when editing alone

- **Given** a user opens the editor in collaborative mode
- **And** no other users are connected to the same document
- **When** the collaboration indicator renders
- **Then** it shows a green connection dot and "Editing alone" text

#### Scenario: Indicator shows peer names when others join

- **Given** user A is editing an entity in collaborative mode
- **When** user B connects to the same document
- **Then** user A's indicator updates to show "Editing with B" and a colored dot matching B's cursor color
- **And** user B's indicator shows "Editing with A"

#### Scenario: Indicator reflects disconnection

- **Given** user A and user B are co-editing
- **When** user B closes their browser tab
- **Then** user A's indicator updates back to "Editing alone"

#### Scenario: Indicator shows connection status

- **Given** the user is in collaborative mode
- **When** the WebSocket connection is lost
- **Then** the indicator dot changes from green to yellow (reconnecting)
- **And** if reconnection fails, the dot changes to red (disconnected)

---

### Requirement: Hocuspocus server handles session and quest documents

The Hocuspocus server SHALL authenticate and authorize WebSocket connections for session and quest document types, rejecting invalid document names and insufficient permissions.

#### Scenario: Hocuspocus authenticates session document

- **Given** a valid WS token for user with `dm` role
- **When** the provider connects with `documentName="campaign:{id}:session:{sessionId}"`
- **Then** authentication succeeds and the document loads

#### Scenario: Hocuspocus authenticates quest document

- **Given** a valid WS token for user with `editor` role
- **When** the provider connects with `documentName="campaign:{id}:quest:{questId}"`
- **Then** authentication succeeds and the document loads

#### Scenario: Hocuspocus rejects invalid document type

- **Given** a valid WS token
- **When** the provider connects with `documentName="campaign:{id}:invalid:{slug}"`
- **Then** authentication fails with "Invalid document name format"

#### Scenario: Hocuspocus rejects player role

- **Given** a valid WS token for user with `player` role
- **When** the provider connects with any document name
- **Then** authentication fails with "Insufficient permissions to edit"
