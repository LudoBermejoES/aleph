# Tasks: Logging & Process Management

## 1. Winston Logger Setup

- [x] 1.1 Install winston and winston-daily-rotate-file
- [x] 1.2 Create `server/utils/logger.ts`: centralized logger with console (dev) + JSON file (prod) transports
- [x] 1.3 Configure log levels: error, warn, info, http, debug
- [x] 1.4 Configure daily rotation for production: 10MB max file size, 14 days retention
- [x] 1.5 Create audit logger transport: `logs/audit.log` (JSON, no rotation)
- [x] 1.6 Add LOG_LEVEL env variable support (default: 'debug' in dev, 'info' in prod)
- [x] 1.7 Replace all `console.log`/`console.error` in server code with logger calls

## 2. Request Logging

- [x] 2.1 Create `server/middleware/00.logger.ts`: log every HTTP request (method, path, status, duration ms)
- [x] 2.2 Use 'http' log level for request logs
- [x] 2.3 Exclude static asset requests and health checks from logging
- [x] 2.4 Include request ID header (X-Request-Id) for tracing

## 3. Audit Logging

- [x] 3.1 Create `server/utils/audit.ts`: audit log helper functions
- [x] 3.2 Log auth events: login success/failure, logout, registration
- [x] 3.3 Log permission events: role change, permission grant/revoke, visibility change
- [x] 3.4 Log campaign lifecycle: create, delete, member join/leave
- [x] 3.5 Audit log entries include: timestamp, userId, action, target, details, IP

## 4. PM2 Process Management

- [x] 4.1 Install pm2 as a production dependency
- [x] 4.2 Create `ecosystem.config.cjs`: single fork instance, memory limit 512M, log paths
- [x] 4.3 Update Dockerfile: install pm2, use `pm2-runtime` as CMD
- [x] 4.4 Update docker-compose.yml: mount logs/ volume
- [x] 4.5 Add npm scripts: `start:prod` (pm2-runtime), `pm2:status`, `pm2:logs`
- [x] 4.6 Create `logs/` directory with .gitkeep, add `logs/*.log` to .gitignore

## 5. Tests (TDD)

### Unit Tests

- [x] 5.1 Test logger creation: logger instance has correct log levels configured
- [x] 5.2 Test logger respects LOG_LEVEL env: setting 'warn' suppresses info messages
- [x] 5.3 Test audit logger: calling auditLog() writes structured JSON with required fields (timestamp, userId, action)
- [x] 5.4 Test request logger middleware: logs method, path, and status for a request

### Integration Tests

- [x] 5.5 Test request logging: make API request, verify log entry created with correct path and status
- [x] 5.6 Test audit logging: login via API, verify audit log entry with userId and action='login'
