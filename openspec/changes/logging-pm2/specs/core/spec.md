# Delta for Core

## ADDED Requirements

### Requirement: Structured Logging

The system SHALL use Winston for structured, leveled logging across all server code, with PM2 for production process management.

#### Scenario: Request logging
- GIVEN a running Aleph server
- WHEN any HTTP request is received
- THEN the request is logged with method, path, status code, and response duration
- AND static asset requests are excluded from logging

#### Scenario: Audit logging for security events
- GIVEN a user performing a security-sensitive action (login, role change, permission change)
- WHEN the action completes
- THEN an audit log entry is written with timestamp, userId, action type, target, and details
- AND audit logs are stored in a separate file and never auto-rotated

#### Scenario: Production process management
- GIVEN Aleph deployed via Docker
- WHEN the container starts
- THEN PM2 manages the Node.js process with auto-restart on crash
- AND memory usage is capped at 512MB with automatic restart on exceeded limit
