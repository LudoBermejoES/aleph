## ADDED Requirements

### Requirement: Diagrams table
A `diagrams` table stores diagram metadata: id, campaignId, title, description, diagramType, createdBy, createdAt, updatedAt.

#### Scenario: Create diagram record
- **WHEN** POST `/api/campaigns/:id/diagrams` is called with `{ title, diagramType? }`
- **THEN** a new diagram record is created with the given title and type defaults to `freeform`

#### Scenario: Update diagram metadata
- **WHEN** PUT `/api/campaigns/:id/diagrams/:diagramId` is called with `{ title?, description? }`
- **THEN** the diagram record is updated and `updatedAt` is refreshed

#### Scenario: Delete diagram
- **WHEN** DELETE `/api/campaigns/:id/diagrams/:diagramId` is called
- **THEN** the diagram and all associated snapshots are deleted (cascade)

### Requirement: Diagram snapshots table
A `diagram_snapshots` table stores tldraw store snapshots as JSON text: id, diagramId, snapshot, version, createdAt.

#### Scenario: Save snapshot
- **WHEN** PUT `/api/campaigns/:id/diagrams/:diagramId/snapshot` is called with `{ snapshot }`
- **THEN** a new snapshot record is inserted with incrementing version number, and diagram `updatedAt` is refreshed

#### Scenario: Load latest snapshot
- **WHEN** GET `/api/campaigns/:id/diagrams/:diagramId/snapshot` is called
- **THEN** the latest snapshot (highest version) for that diagram is returned

### Requirement: Diagram CRUD API
RESTful endpoints under `/api/campaigns/:id/diagrams/`.

#### Scenario: List diagrams
- **WHEN** GET `/api/campaigns/:id/diagrams` is called by an authenticated campaign member
- **THEN** all diagrams for the campaign are returned with metadata (no snapshots)

#### Scenario: Get single diagram
- **WHEN** GET `/api/campaigns/:id/diagrams/:diagramId` is called
- **THEN** the diagram metadata is returned

#### Scenario: Auth enforcement
- **WHEN** a non-member requests any diagram endpoint
- **THEN** 401 or 403 is returned

- **WHEN** a player requests a write endpoint (POST, PUT, DELETE)
- **THEN** 403 is returned

- **WHEN** a dm, co_dm, or editor requests a write endpoint
- **THEN** the operation succeeds

### Requirement: Snapshot size guard
Snapshots exceeding a reasonable size limit are rejected.

#### Scenario: Oversized snapshot
- **WHEN** a snapshot exceeding 5MB is submitted
- **THEN** 413 Payload Too Large is returned
