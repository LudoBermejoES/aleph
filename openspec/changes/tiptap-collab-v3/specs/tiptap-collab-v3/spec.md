## MODIFIED Requirements

### Requirement: Collaboration cursor display
The editor SHALL display remote users' caret positions and names using the `@tiptap/extension-collaboration-caret` extension (replacing `@tiptap/extension-collaboration-cursor`).

#### Scenario: Remote user cursor visible
- **WHEN** two users are editing the same document
- **THEN** each user sees the other's caret position with a colored label showing their name

#### Scenario: CI installs without peer dependency conflicts
- **WHEN** `npm ci` runs in GitHub Actions (without `--legacy-peer-deps`)
- **THEN** installation succeeds with no ERESOLVE errors
