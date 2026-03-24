# Delta for Core

## ADDED Requirements

### Requirement: Project Initialization

The system SHALL be deployable as a single Node.js process with Docker support.

#### Scenario: Single-process startup
- GIVEN a fresh checkout of the repository
- WHEN the operator runs `npm start` or launches the Docker container
- THEN the application starts as a single Node.js process serving both API and frontend
- AND the process exits with a non-zero code if required environment variables are missing

#### Scenario: Docker deployment
- GIVEN a valid Dockerfile in the repository root
- WHEN the operator builds and runs the container
- THEN the application is accessible on the configured port
- AND SQLite data persists via a mounted volume
