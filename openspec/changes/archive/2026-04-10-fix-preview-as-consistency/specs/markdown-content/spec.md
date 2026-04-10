## ADDED Requirements

### Requirement: Arc and quest descriptions support secret blocks

Arc description, chapter description, and quest description text fields SHALL have secret blocks stripped server-side by the GET endpoints based on the caller's effective role. The fields remain stored as plain `text` in the database (no file migration).

#### Scenario: GET arc — player role strips secrets

- **WHEN** a player requests `GET /api/campaigns/:id/arcs`
- **THEN** the `description` field of each arc has secret blocks removed

#### Scenario: GET quest — player role strips secrets

- **WHEN** a player requests `GET /api/campaigns/:id/quests/:slug`
- **THEN** the `description` field has secret blocks removed

#### Scenario: GET arc with preview_as=player

- **WHEN** a DM requests `GET /api/campaigns/:id/arcs?preview_as=player`
- **THEN** the arc descriptions are returned with secrets stripped as if for a player
