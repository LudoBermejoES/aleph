# Tasks: Session Management

## 1. Database Schema

- [ ] 1.1 Create `sessions` schema with status enum, scheduling fields, chapter link
- [ ] 1.2 Create `session_attendance` schema with RSVP and attended fields
- [ ] 1.3 Create `arcs` and `chapters` schemas with sort ordering
- [ ] 1.4 Create `quests` schema with parent_quest_id, status, secret flag
- [ ] 1.5 Create `decisions` and `consequences` schemas
- [ ] 1.6 Generate and apply migration

## 2. Session CRUD API

- [ ] 2.1 Implement session create/read/update/delete endpoints
- [ ] 2.2 Implement session list with filtering by status, arc, date range
- [ ] 2.3 Auto-increment session_number per campaign on create
- [ ] 2.4 Create/update session log `.md` file on session save
- [ ] 2.5 Add RBAC permission checks (DM manages, players view)

## 3. Attendance API

- [ ] 3.1 Implement RSVP endpoint (player sets own status)
- [ ] 3.2 Implement attendance confirmation endpoint (DM marks attended)
- [ ] 3.3 Return attendance summary with session detail response

## 4. Story Structure API

- [ ] 4.1 Implement arc CRUD with sort order management
- [ ] 4.2 Implement chapter CRUD scoped to arcs
- [ ] 4.3 Implement session-to-chapter linking on session create/update

## 5. Quest API

- [ ] 5.1 Implement quest CRUD with nested sub-quest support
- [ ] 5.2 Implement quest status transitions with validation
- [ ] 5.3 Filter secret quests from player responses unless permitted
- [ ] 5.4 Store quest content as `.md` files via content engine

## 6. Decision/Consequence API

- [ ] 6.1 Implement decision CRUD scoped to sessions
- [ ] 6.2 Implement consequence CRUD linked to decisions
- [ ] 6.3 Support consequence reveal toggle (DM reveals to players)

## 7. Session Pages

- [ ] 7.1 Create `app/pages/campaigns/[id]/sessions/index.vue` (list with upcoming/past grouping)
- [ ] 7.2 Create `app/pages/campaigns/[id]/sessions/[slug].vue` (detail with log viewer)
- [ ] 7.3 Build attendance RSVP component
- [ ] 7.4 Build session log editor (markdown textarea with preview)
- [ ] 7.5 Build quest list component with status badges and nesting
- [ ] 7.6 Build decision timeline component on session detail page
- [ ] 7.7 Create `app/pages/campaigns/[id]/quests/index.vue` (quest board view)

## 8. Tests (TDD)

### Unit Tests (Vitest)

- [ ] 8.1 Test session number auto-increment: creating sessions in sequence produces incrementing numbers per campaign
- [ ] 8.2 Test quest status transition validation: only valid transitions allowed (e.g., active→completed, active→failed; not completed→active)
- [ ] 8.3 Test quest secret filtering: secret quests excluded from result set when user is player role

### Integration Tests (@nuxt/test-utils)

- [ ] 8.4 Test session lifecycle: create session (status=scheduled) → update to active → update to complete; verify status at each step
- [ ] 8.5 Test session CRUD: create, read, update, delete; verify session list filtering by status and date range
- [ ] 8.6 Test attendance tracking: player RSVPs "yes"; DM confirms attendance; GET session returns attendance summary with both fields
- [ ] 8.7 Test RSVP restriction: player can only set own RSVP status, cannot modify another player's
- [ ] 8.8 Test quest CRUD with sub-quests: create parent quest → create child quest with parent_quest_id; verify nesting in response
- [ ] 8.9 Test quest status transitions via API: PATCH quest status from active to completed succeeds; invalid transition returns 400
- [ ] 8.10 Test decision recording: create decision scoped to session; create consequence linked to decision; verify response includes consequence
- [ ] 8.11 Test consequence reveal toggle: hidden consequence not visible to player; DM reveals it; player can now see it
- [ ] 8.12 Test session RBAC: DM can create/edit sessions; player can view but not create/edit
- [ ] 8.13 Test arc and chapter ordering: create arcs with sort order; reorder; verify new order persists

### Component Tests (@vue/test-utils)

- [ ] 8.14 Test attendance RSVP component: renders RSVP options, emits selected status on click
- [ ] 8.15 Test quest list component: renders quests with status badges, displays nested sub-quests indented
