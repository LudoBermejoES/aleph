## Requirements

### Requirement: Per-Session Typed Content

The system SHALL support three distinct content types per session: manual notes (written by the DM during play), AI notes (generated or pasted from an AI tool), and a summary (post-session recap). Each type is stored independently and displayed in its own tab on the session detail page.

#### Scenario: Viewing session content tabs

- **WHEN** a user opens a session detail page
- **THEN** three tabs are shown: Manual Notes, AI Notes, Summary
- **AND** tabs with no content show an empty placeholder
- **AND** tabs with content render the markdown

#### Scenario: Editing a content type

- **WHEN** a DM or editor clicks into a content tab in edit mode
- **THEN** a markdown editor is shown for that specific content type
- **AND** saving updates only that type, leaving others unchanged

#### Scenario: Storing content

- **WHEN** content is saved for a session and type
- **THEN** `PUT /api/campaigns/:id/sessions/:slug/content` with `{ type, content }` upserts the record
- **AND** only one record per `(session, type)` combination exists

#### Scenario: Reading all content for a session

- **WHEN** `GET /api/campaigns/:id/sessions/:slug/content` is called
- **THEN** an object is returned with keys `manual_notes`, `ai_notes`, `summary`
- **AND** missing types return `null` for their value

#### Scenario: Content types are independent

- **WHEN** a DM saves AI notes
- **THEN** the manual notes and summary for that session are unaffected
