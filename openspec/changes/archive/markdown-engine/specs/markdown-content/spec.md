# Delta for Markdown Content

## ADDED Requirements

### Requirement: Filesystem Watcher

The system SHALL detect external file changes and sync to database automatically.

#### Scenario: External file modification detected
- GIVEN a markdown file managed by the system
- WHEN an external editor modifies the file on disk
- THEN the filesystem watcher detects the change
- AND the database metadata (updated timestamp, content hash) is refreshed

#### Scenario: New file added externally
- GIVEN a campaign content directory monitored by the watcher
- WHEN a new `.md` file is placed in the directory
- THEN the system indexes the file and creates a corresponding database record
