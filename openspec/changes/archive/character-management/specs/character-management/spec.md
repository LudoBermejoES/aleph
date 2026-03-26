# Delta for Character Management

## ADDED Requirements

### Requirement: Character CRUD API

The system SHALL provide API endpoints for character profile management.

#### Scenario: Creating a character via API
- GIVEN an authenticated user with at least Player role in a campaign
- WHEN they send a POST request to `/api/characters` with name, class, and stats
- THEN a character record is created in the database
- AND a corresponding markdown file is written to the campaign's characters directory

#### Scenario: Retrieving a character via API
- GIVEN a character that exists in the campaign
- WHEN an authorized user sends a GET request to `/api/characters/:id`
- THEN the response includes the character profile data and computed stats
- AND visibility rules are enforced based on the requester's role
