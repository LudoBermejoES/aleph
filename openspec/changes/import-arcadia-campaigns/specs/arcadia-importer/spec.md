## ADDED Requirements

### Requirement: Standalone import script exists and is runnable
The system SHALL provide a standalone Node.js script at `cli/bin/import-arcadia.js` that can be executed directly with `node cli/bin/import-arcadia.js` to import all Arcadia campaign data into a running Aleph server.

#### Scenario: Script runs without arguments and shows usage
- **WHEN** the script is run with no arguments and `~/.aleph/config.json` is missing
- **THEN** the script SHALL print an error explaining that aleph-cli must be configured first (`aleph login`) and exit with code 2

#### Scenario: Script runs successfully with valid config
- **WHEN** `~/.aleph/config.json` contains a valid `url` and `apiKey`
- **THEN** the script SHALL authenticate all API calls using `X-API-Key` header and proceed with the import

---

### Requirement: Campaigns are created idempotently
The importer SHALL create each of the 6 Arcadia campaigns (La Familia, Génesis, La Fuerza Oculta, Reformatorio Nueva Esperanza, Crematorio La Tranquilidad, Hospital) via `POST /api/campaigns`. If a campaign with the same name already exists, it SHALL skip creation and reuse the existing campaign ID.

#### Scenario: First run creates all campaigns
- **WHEN** no Arcadia campaigns exist in Aleph
- **THEN** 6 campaigns are created, each with a name, description, and slug

#### Scenario: Re-run skips existing campaigns
- **WHEN** the script is run a second time and all campaigns already exist
- **THEN** no duplicate campaigns are created; the script proceeds using existing IDs

---

### Requirement: Session groups are created for La Fuerza Oculta
The importer SHALL create session groups for La Fuerza Oculta corresponding to its documented narrative phases (e.g., "Los Fugitivos", "Profesionalización Heroica", "Independencia Heroica", etc.) so sessions can be filtered by arc.

#### Scenario: Groups are created on first run
- **WHEN** La Fuerza Oculta campaign is created
- **THEN** its narrative-phase groups are created via `POST /api/campaigns/:id/session-groups`

#### Scenario: Groups are skipped on re-run
- **WHEN** groups with the same slug already exist
- **THEN** the importer logs "skipped" and reuses existing group slugs for session assignment

---

### Requirement: Sessions are imported with metadata and content
For each source session file, the importer SHALL create a session in Aleph with:
- `title` extracted from the Jekyll front-matter `title` field (stripped of campaign prefix)
- `scheduledDate` parsed from the filename date suffix (e.g., `session-20-2025-06-15.md` → `2025-06-15`) or null if absent
- `status` set to `completed` for all historical sessions
- `groupSlug` assigned where applicable (La Fuerza Oculta sessions mapped to their narrative phase group)

#### Scenario: Session with date in filename
- **WHEN** a file is named `session-20-2025-06-15.md`
- **THEN** the session is created with `scheduledDate: "2025-06-15"` and `status: "completed"`

#### Scenario: Session without date in filename
- **WHEN** a file is named `session-01.md`
- **THEN** the session is created with `scheduledDate: null` and `status: "completed"`

#### Scenario: Duplicate session slug is skipped
- **WHEN** a session with the same slug already exists in the campaign
- **THEN** the importer logs "skipped" and continues without error

---

### Requirement: Session content is imported from corresponding markdown files
After creating each session, the importer SHALL upload content to the three content slots:
- `manual_notes`: body of the session `.md` file (front-matter stripped)
- `ai_notes`: body of the matching `ai-notes/<date>-gemini-notes.md` file (if exists)
- `summary`: body of the matching `ai-notes-summary/<date>-gemini-notes.md` file (if exists)

Matching is done by date string (e.g., `2025-06-15`) present in both the session filename and the notes filename.

#### Scenario: Session with all three content types
- **WHEN** a session file, a corresponding ai-notes file, and a corresponding ai-notes-summary file all exist for the same date
- **THEN** all three content types are uploaded via `PUT /api/campaigns/:id/sessions/:slug/content`

#### Scenario: Session with only manual notes
- **WHEN** a session file exists but no ai-notes files match its date (e.g., La Familia sessions)
- **THEN** only `manual_notes` is uploaded; `ai_notes` and `summary` are skipped

#### Scenario: Front-matter is stripped from content
- **WHEN** a markdown file begins with `---` YAML front-matter
- **THEN** the front-matter block is removed before storing the content in Aleph

---

### Requirement: Import produces clear console progress output
The importer SHALL log each action to stdout so the operator can follow progress and identify failures.

#### Scenario: Successful campaign creation
- **WHEN** a campaign is created successfully
- **THEN** the script prints: `✓ Created campaign: <name>`

#### Scenario: Skipped campaign
- **WHEN** a campaign already exists
- **THEN** the script prints: `→ Skipped campaign: <name> (already exists)`

#### Scenario: Successful session creation
- **WHEN** a session is created successfully
- **THEN** the script prints: `  ✓ Session <N>: <title>`

#### Scenario: HTTP error
- **WHEN** an API call fails with a non-2xx status
- **THEN** the script prints the error message and continues (does not abort the whole import)
