## ADDED Requirements

### Requirement: Session supports deletion

The `DELETE /api/campaigns/:id/sessions/:slug` endpoint SHALL be part of the session management API surface, completing full CRUD for sessions.

#### Scenario: DELETE endpoint exists alongside GET and PUT

- **WHEN** the server is running
- **THEN** `DELETE /api/campaigns/:id/sessions/:slug` is a valid route returning 200 or 404 (not 405 Method Not Allowed)
