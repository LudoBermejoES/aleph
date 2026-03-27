# server-deployment Specification

## Purpose
TBD - created by archiving change deploy-to-server. Update Purpose after archive.
## Requirements
### Requirement: CI/CD deploys on push to master
The system SHALL automatically deploy to the production server when code is pushed to the `master` branch, after tests pass.

#### Scenario: Successful deploy after push
- **WHEN** a developer pushes to `master` and all tests pass
- **THEN** the system builds the Nuxt app, uploads the archive to the server, and restarts the application via PM2

#### Scenario: Deploy blocked by failing tests
- **WHEN** a developer pushes to `master` and tests fail
- **THEN** the deploy step is not executed and the current production version remains running

### Requirement: Data preserved across deploys
The deployment process SHALL preserve `data/`, `content/`, and `logs/` directories and the `.env` file between deploys.

#### Scenario: Database survives deploy
- **WHEN** a new version is deployed
- **THEN** the SQLite database at `data/aleph.db` is untouched and available after restart

#### Scenario: Backup created before deploy
- **WHEN** a deployment starts
- **THEN** a timestamped backup of `data/`, `content/`, `logs/`, and `.env` is created before any changes

### Requirement: HTTPS with auto-renewing certificates
The server SHALL serve the application over HTTPS using Let's Encrypt certificates that auto-renew.

#### Scenario: HTTP redirects to HTTPS
- **WHEN** a client connects via HTTP (port 80)
- **THEN** the server responds with a 301 redirect to HTTPS (port 443)

#### Scenario: Certificate auto-renewal
- **WHEN** a certificate is within 30 days of expiration
- **THEN** Certbot renews it automatically and Nginx reloads

### Requirement: Health check endpoint
The API SHALL expose `GET /api/health` that returns the application status.

#### Scenario: Health check responds OK
- **WHEN** a GET request is made to `/api/health`
- **THEN** the server responds with 200 and `{ "status": "ok" }`

### Requirement: WebSocket proxy for real-time collaboration
Nginx SHALL proxy WebSocket connections to Hocuspocus for real-time document collaboration.

#### Scenario: WebSocket upgrade succeeds
- **WHEN** a client sends a WebSocket upgrade request
- **THEN** Nginx forwards the upgrade headers to the Node.js server and the connection is established

