## MODIFIED Requirements

### Requirement: Session and Story Schema

The system SHALL store session scheduling, adventure logs, story structure, and decision tracking.

#### Scenario: Session and story tables

- GIVEN the campaign/session management system
- WHEN sessions and story elements are managed
- THEN the following tables are used:
  - `sessions` (id, campaign_id, number, title, scheduled_at, status, arc_id, chapter_id, created_at, updated_at)
  - `session_attendance` (session_id, user_id, status)
  - `arcs` (id, campaign_id, name, description, sort_order, status)
  - `chapters` (id, arc_id, name, description, sort_order, status)
  - `decisions` (id, session_id, campaign_id, description, decision_type, outcome, decided_by_json, consequence_json, linked_entity_id, created_at)
  - `quests` (id, campaign_id, name, description, status, parent_quest_id, visibility, assigned_to_json, created_at, updated_at)
- AND `status` for sessions is one of: 'scheduled', 'in_progress', 'completed', 'cancelled'
- AND `status` for arcs/chapters is one of: 'planned', 'active', 'completed', 'skipped'
- AND `status` for quests is one of: 'active', 'completed', 'failed', 'abandoned', declared in
  exactly one shared module that the validation schemas and the transition rules both read
- AND `decision_type` is one of: 'choice', 'role', 'count', 'destiny' (inspired by Amsel Tome Arcana)
- AND session content/notes live in `.md` files, not in the database
