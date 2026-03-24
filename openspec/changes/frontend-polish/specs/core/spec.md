# Delta for Core

## ADDED Requirements

### Requirement: Frontend Auth Integration

The system SHALL use Better Auth's official Vue client SDK for all authentication operations in the browser, ensuring proper CSRF handling, session management, and cookie flow.

#### Scenario: User registers in the browser
- GIVEN a user on the registration page
- WHEN they submit valid credentials
- THEN the Better Auth client SDK handles the request with proper CSRF tokens
- AND a session cookie is set
- AND the user is redirected to the dashboard

#### Scenario: Health check endpoint
- GIVEN any client
- WHEN they request GET /api/health
- THEN the server returns { status: 'ok', timestamp, version }
- AND no authentication is required
