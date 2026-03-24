# Proposal: Logging & Process Management

## Why

Aleph needs structured logging for debugging, auditing, and monitoring in production. Console.log is insufficient -- we need log levels, file rotation, and structured JSON output. PM2 provides process management (auto-restart, clustering, zero-downtime reload) essential for a self-hosted app running 24/7.

## What Changes

- Integrate Winston as the structured logging library across server code
- Configure PM2 as the production process manager with ecosystem config
- Create a centralized logger service used by all server code
- Add log levels (error, warn, info, http, debug) with environment-based filtering
- Configure log file rotation and structured JSON format for production
- Update Dockerfile to use PM2 instead of raw `node` for production
- Add request logging middleware (HTTP method, path, status, duration)
- Add audit logging for security-sensitive operations (login, role changes, permission changes)

## Scope

### In scope
- Winston logger setup with transports (console dev, JSON file production)
- PM2 ecosystem config (ecosystem.config.cjs)
- Log file rotation (daily, max 14 days retention)
- Request logging middleware (Nitro server middleware)
- Audit log for auth/permission events
- Update Dockerfile and docker-compose for PM2
- Logger DI for testability (mock logger in tests)

### Out of scope
- External log aggregation (ELK, Grafana Loki) -- future enhancement
- Client-side error tracking
- APM/tracing

## Dependencies
- project-setup
