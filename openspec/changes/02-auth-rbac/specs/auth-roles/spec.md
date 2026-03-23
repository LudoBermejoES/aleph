# Delta for Auth Roles

## ADDED Requirements

### Requirement: Better Auth Integration

The system SHALL use Better Auth for credential authentication with SQLite-backed sessions.

#### Scenario: Session persistence in SQLite
- GIVEN a user who has authenticated via Better Auth
- WHEN the server restarts
- THEN the user's session remains valid because sessions are stored in SQLite
- AND expired sessions are pruned automatically

#### Scenario: Credential authentication flow
- GIVEN a visitor submitting login credentials
- WHEN Better Auth validates the credentials
- THEN an httpOnly session cookie is issued
- AND the session record is written to the SQLite sessions table
