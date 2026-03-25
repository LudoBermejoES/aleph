# Tasks: Session Management

## 1. Database Schema

- [x] 1.1 Create `sessions` schema with status enum, scheduling fields, chapter link
- [x] 1.2 Create `session_attendance` schema with RSVP and attended fields
- [x] 1.3 Create `arcs` and `chapters` schemas with sort ordering
- [x] 1.4 Create `quests` schema with parent_quest_id, status, secret flag
- [x] 1.5 Create `decisions` and `consequences` schemas
- [x] 1.6 Generate and apply migration

## 2. Session CRUD API

- [x] 2.1 Implement session create/read/update/delete endpoints
- [x] 2.2 Implement session list with filtering by status
- [x] 2.3 Auto-increment session_number per campaign on create
- [x] 2.4 Create/update session log `.md` file on session save
- [x] 2.5 Add RBAC permission checks (DM/Co-DM manages, players view)

## 3. Attendance API

- [x] 3.1 Implement RSVP endpoint (player sets own status via PATCH)
- [x] 3.2 Implement attendance confirmation (attended flag in PATCH)
- [x] 3.3 Return attendance summary with session detail response

## 4. Story Structure API

- [x] 4.1 Implement arc CRUD (GET list with chapters, POST create)
- [x] 4.2 Implement chapter CRUD scoped to arcs (dedicated endpoints)
- [x] 4.3 Implement session-to-chapter linking on session create/update

## 5. Quest API

- [x] 5.1 Implement quest CRUD with nested sub-quest support
- [x] 5.2 Implement quest status transitions with validation (via service)
- [x] 5.3 Filter secret quests from player responses (via service)
- [x] 5.4 Store quest content as `.md` files via content engine

## 6. Decision/Consequence API

- [x] 6.1 Implement decision CRUD scoped to sessions (POST create, GET list)
- [x] 6.2 Implement consequence CRUD linked to decisions (POST create)
- [x] 6.3 Implement consequence reveal toggle endpoint (PATCH)

## 7. Session Pages

- [x] 7.1 Create `app/pages/campaigns/[id]/sessions/index.vue` (list with upcoming/past grouping)
- [x] 7.2 Create `app/pages/campaigns/[id]/sessions/[slug].vue` (detail with log viewer)
- [x] 7.3 Build attendance display in session detail (inline)
- [x] 7.4 Build session log editor (markdown textarea with preview toggle)
- [x] 7.5 Build quest list with status badges and nesting (inline in quests page)
- [x] 7.6 Build decision timeline component on session detail page
- [x] 7.7 Create `app/pages/campaigns/[id]/quests/index.vue` (quest board view)

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
- [x] 8.23 Test decision recording and consequence attachment
- [x] 8.24 Test consequence reveal toggle
- [x] 8.25 Test session RBAC: player cannot create sessions

### Component Tests

- [ ] 8.26 Test attendance RSVP component
- [ ] 8.27 Test quest list component with nesting
