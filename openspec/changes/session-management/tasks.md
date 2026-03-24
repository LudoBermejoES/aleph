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

### Unit Tests -- Service Functions (Vitest)

- [x] 8.1 Test nextSessionNumber: returns max+1 (3 tests)
- [x] 8.2 Test canTransitionQuestStatus: valid/invalid transitions, same status, unknown status (9 tests)
- [x] 8.3 Test filterSecretQuests: DM/co_dm see all, player/editor see non-secret only (5 tests)
- [x] 8.4 Test filterRevealedConsequences: DM sees all, player sees revealed only (2 tests)

### Schema Tests (`:memory:` SQLite)

- [x] 8.5 Test session auto-increment number via DB query
- [x] 8.6 Test attendance tracking rows
- [x] 8.7 Test quest sub-nesting via parent_quest_id
- [x] 8.8 Test quest status transition validation logic
- [x] 8.9 Test secret quest filtering
- [x] 8.10 Test decisions with consequences and reveal flag
- [x] 8.11 Test arc-chapter ordering

### Integration Tests (API)

- [x] 8.12 Test session create with auto-increment number
- [x] 8.13 Test second session gets number 2
- [x] 8.14 Test session detail includes attendance and log
- [x] 8.15 Test session status update via PUT
- [x] 8.16 Test attendance RSVP via PATCH
- [x] 8.17 Test session list returns sessions
- [x] 8.18 Test quest create
- [x] 8.19 Test quest sub-quest creation
- [x] 8.20 Test quest valid status transition
- [x] 8.21 Test quest invalid status transition returns 400
- [x] 8.22 Test quest list
- [ ] 8.23 Test decision recording and consequence attachment
- [ ] 8.24 Test consequence reveal toggle
- [ ] 8.25 Test session RBAC: player cannot create sessions

### Component Tests

- [ ] 8.26 Test attendance RSVP component
- [ ] 8.27 Test quest list component with nesting
