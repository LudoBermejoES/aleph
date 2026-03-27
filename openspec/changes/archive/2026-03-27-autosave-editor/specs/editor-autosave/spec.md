## ADDED Requirements

### Requirement: Draft persistence to localStorage

The system SHALL automatically persist the Markdown editor's content to `localStorage` while the user is editing, so that unsaved changes survive accidental tab closure or browser crash.

#### Scenario: Content is saved to localStorage while typing
- **GIVEN** a user is editing a character, session, quest, or wiki entity
- **WHEN** the user types in the Markdown editor
- **THEN** the editor content is written to `localStorage` under the key `aleph:draft:{campaignId}:{entityType}:{slug}` within 1 second of the last keystroke

#### Scenario: Draft key for new records
- **GIVEN** a user is on the "new record" creation form (no slug yet)
- **WHEN** the user types in the Markdown editor
- **THEN** the content is stored under the key `aleph:draft:{campaignId}:{entityType}:new`

#### Scenario: localStorage quota exceeded
- **GIVEN** the browser's localStorage is full
- **WHEN** the editor attempts to write a draft
- **THEN** the error is silently caught and the user experience is not interrupted

### Requirement: Draft restore banner on revisit

The system SHALL detect a saved draft on editor mount and prompt the user to restore or discard it.

#### Scenario: Draft detected on page load
- **GIVEN** a user previously left an edit page without saving
- **AND** a draft exists in `localStorage` that differs from the currently server-saved content
- **WHEN** the user opens the edit page again
- **THEN** a restore banner is shown above the editor with two options: "Restore draft" and "Discard"

#### Scenario: No banner when draft matches server content
- **GIVEN** a draft exists in `localStorage`
- **AND** the draft content is identical to the server-saved content
- **WHEN** the user opens the edit page
- **THEN** no restore banner is shown

#### Scenario: User restores draft
- **WHEN** the user clicks "Restore draft" in the banner
- **THEN** the editor content is replaced with the draft content
- **AND** the banner is dismissed

#### Scenario: User discards draft
- **WHEN** the user clicks "Discard" in the banner
- **THEN** the draft is removed from `localStorage`
- **AND** the banner is dismissed
- **AND** the editor retains the server-saved content

### Requirement: Draft cleared on successful save

The system SHALL remove the `localStorage` draft when the form is successfully submitted.

#### Scenario: Draft cleared after save
- **GIVEN** a user has an in-progress draft stored in `localStorage`
- **WHEN** the user submits the form and the server returns a success response
- **THEN** the corresponding `localStorage` key is deleted

#### Scenario: Draft retained after failed save
- **GIVEN** a user has an in-progress draft stored in `localStorage`
- **WHEN** the user submits the form and the server returns an error
- **THEN** the `localStorage` draft is NOT deleted

### Requirement: Autosave disabled when no draft key is provided

The system SHALL only activate autosave behaviour when a `draftKey` is explicitly provided to the editor component.

#### Scenario: Editor without draftKey has no autosave
- **GIVEN** a `MarkdownEditor` is rendered without a `draftKey` prop (or with `draftKey` set to null)
- **WHEN** the user types content
- **THEN** nothing is written to `localStorage`
- **AND** no restore banner is ever shown
