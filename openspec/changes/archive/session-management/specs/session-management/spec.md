# Delta for Session Management

## ADDED Requirements

### Requirement: Session Lifecycle API

The system SHALL provide API endpoints for session scheduling and status tracking.

#### Scenario: Scheduling a new session
- GIVEN an authenticated DM for a campaign
- WHEN they send a POST request to `/api/sessions` with date, time, and optional notes
- THEN a session record is created with status "scheduled"
- AND invited players receive a notification

#### Scenario: Updating session status
- GIVEN a scheduled session owned by the requesting DM
- WHEN they send a PATCH request to `/api/sessions/:id` with a new status
- THEN the session status transitions (e.g., scheduled -> active -> completed)
- AND the status change timestamp is recorded
