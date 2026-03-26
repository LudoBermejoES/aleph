# Design: Session Management

## Technical Approach

### Session Storage

- `sessions` table: `id, campaign_id, title, slug, session_number, scheduled_date, status (planned|active|completed|cancelled), summary, arc_id, chapter_id, created_at, updated_at`
- Session log stored as markdown: `content/campaigns/{slug}/sessions/{session_slug}.md`
- Log file uses frontmatter for session metadata; body is the narrative log

### Attendance Tracking

- `session_attendance` table: `id, session_id, user_id, character_id, rsvp_status (pending|accepted|declined|tentative), attended (boolean)`
- RSVP set by players before session; `attended` confirmed by DM after session

### Story Structure

- `arcs` table: `id, campaign_id, name, slug, description, sort_order, status (active|completed|planned)`
- `chapters` table: `id, arc_id, name, slug, description, sort_order`
- Sessions link to a chapter (and transitively to an arc) via `chapter_id`
- Arc and chapter ordering maintained via `sort_order` for drag-and-drop reordering

### Quest Tracking

- `quests` table: `id, campaign_id, name, slug, description, status (active|completed|failed|abandoned), parent_quest_id, entity_id (nullable), is_secret, assigned_character_ids (JSON), created_at, updated_at`
- Nested sub-quests via `parent_quest_id` (self-referential)
- Secret quests (`is_secret = true`) hidden from players without explicit permission
- Quest content stored as `.md` file: `content/campaigns/{slug}/quests/{quest_slug}.md`

### Decision/Consequence Tracking

Inspired by Kanka's Arcana system, four decision types:

- **Choice**: A decision point with named options and the selected outcome
- **Role**: A die roll or skill check that altered the story
- **Count**: A tracked quantity (e.g., faction reputation, countdown)
- **Destiny**: A fated event triggered by accumulated choices

Schema:
- `decisions` table: `id, session_id, campaign_id, type (choice|role|count|destiny), title, description, entity_id (nullable)`
- `consequences` table: `id, decision_id, description, entity_id (nullable), revealed (boolean)`

### Service Layer (TDD)

Business logic extracted into `server/services/sessions.ts` -- pure functions tested in isolation:

- `nextSessionNumber(currentMax)` -- calculates next session number
- `canTransitionQuestStatus(from, to)` -- validates quest status transitions against allowed rules
- `filterSecretQuests(quests, role)` -- filters secret quests for non-DM roles
- `filterRevealedConsequences(consequences, role)` -- filters unrevealed consequences for non-DM roles
- `VALID_QUEST_TRANSITIONS` -- exported constant defining allowed status transitions

Same architecture as character-management: thin API handlers calling services + DB.

### API Endpoints

```
GET/POST       /api/campaigns/:id/sessions
GET/PUT/DELETE /api/campaigns/:id/sessions/:slug
PATCH          /api/campaigns/:id/sessions/:slug/attendance
GET/POST       /api/campaigns/:id/arcs
GET/POST       /api/campaigns/:id/quests
GET/PUT/DELETE /api/campaigns/:id/quests/:slug
GET/POST       /api/campaigns/:id/sessions/:slug/decisions
```
