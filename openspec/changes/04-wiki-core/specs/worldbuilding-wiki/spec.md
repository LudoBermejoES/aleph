# Delta for Worldbuilding Wiki

## ADDED Requirements

### Requirement: Entity CRUD API

The system SHALL provide RESTful API endpoints for entity lifecycle management.

#### Scenario: Creating an entity via API
- GIVEN an authenticated user with Editor role or higher
- WHEN they send a POST request to `/api/entities` with a valid payload
- THEN a new entity is created with a database record and a markdown file on disk
- AND the response includes the entity ID and resource URL

#### Scenario: Deleting an entity via API
- GIVEN an authenticated user with permission to delete the entity
- WHEN they send a DELETE request to `/api/entities/:id`
- THEN the entity record is removed from the database
- AND the corresponding markdown file is deleted from disk
