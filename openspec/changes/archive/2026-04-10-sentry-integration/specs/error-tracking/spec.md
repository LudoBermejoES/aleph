## ADDED Requirements

### Requirement: Client-side error capture

The application SHALL capture unhandled JavaScript errors and Vue component errors on the client and report them to Sentry.

#### Scenario: Unhandled client error

- **WHEN** an unhandled JavaScript error occurs in the browser
- **THEN** the error SHALL be reported to Sentry with a full stack trace

#### Scenario: Vue component error

- **WHEN** a Vue component throws an error during rendering or in a lifecycle hook
- **THEN** the error SHALL be captured by Sentry with component context

### Requirement: Server-side error capture

The application SHALL capture unhandled errors in Nitro API routes and server middleware and report them to Sentry.

#### Scenario: API route throws an error

- **GIVEN** the application is running in production mode
- **WHEN** a server API route throws an unhandled error
- **THEN** the error SHALL be reported to Sentry with a full stack trace

#### Scenario: Server-side capture requires production build

- **GIVEN** the application is running in development mode
- **WHEN** a server error occurs
- **THEN** the error SHALL NOT be sent to Sentry (dev-mode limitation)

### Requirement: Source map upload

The build process SHALL upload source maps to Sentry so that production stack traces are human-readable.

#### Scenario: Successful source map upload during build

- **GIVEN** `SENTRY_AUTH_TOKEN` is set in the CI environment
- **WHEN** `nuxt build` runs
- **THEN** client source maps SHALL be uploaded to Sentry
- **AND** source maps SHALL NOT be served to browsers (hidden)

#### Scenario: Missing auth token

- **GIVEN** `SENTRY_AUTH_TOKEN` is not set
- **WHEN** `nuxt build` runs
- **THEN** the build SHALL succeed without source map upload

### Requirement: Performance tracing

The application SHALL sample a percentage of requests for performance tracing on both client and server.

#### Scenario: Client performance trace

- **WHEN** a page navigation occurs
- **THEN** there SHALL be a 10% chance it is traced and sent to Sentry

#### Scenario: Server performance trace

- **WHEN** an API request is handled
- **THEN** there SHALL be a 10% chance it is traced and sent to Sentry

### Requirement: Production server startup

The production server SHALL start with the Sentry server config imported before the application initializes.

#### Scenario: PM2 starts with Sentry instrumentation

- **WHEN** PM2 starts the application in production
- **THEN** it SHALL use `--import ./.output/server/sentry.server.config.mjs` as a Node.js argument
