## MODIFIED Requirements

### Requirement: Real-Time Collaborative Editing

The system SHALL support real-time co-editing of wiki entries, session logs, and diagrams.

#### Scenario: Two users editing the same entry

- **GIVEN** two users open the same wiki entry for editing simultaneously
- **WHEN** both make changes
- **THEN** changes merge in real-time via CRDT (Y.js) without conflicts
- **AND** each user sees the other's cursor with a name label
- **AND** the resulting content is serialized to markdown and saved to the `.md` file

#### Scenario: Edit presence indicators

- **GIVEN** a user browsing the wiki
- **WHEN** another user is editing an entry
- **THEN** a small avatar/indicator shows on the entry card and page
- **AND** this does not prevent navigation or viewing

#### Scenario: Collaborative map editing

- **GIVEN** two DMs editing a map simultaneously
- **WHEN** one adds a pin and another moves a region
- **THEN** both changes apply without conflict
- **AND** both see live updates on the map canvas

#### Scenario: Collaborative diagram editing

- **GIVEN** two editors open the same tldraw diagram simultaneously
- **WHEN** one creates a shape and another moves an existing shape
- **THEN** both changes sync in real-time via `@tldraw/sync` protocol
- **AND** each user sees the other's cursor with a name label and color
- **AND** the diagram state is persisted to the `diagramSnapshots` table by the server room
