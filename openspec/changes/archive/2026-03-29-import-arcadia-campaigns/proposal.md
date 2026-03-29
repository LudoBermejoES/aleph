## Why

The Arcadia TTRPG universe has 15 years of campaign history across 6 campaigns and 92+ sessions documented in `/Users/ludo/code/arcadia/docs/campaigns/`. None of this data exists in the Aleph server yet. Importing it via the CLI enables the team to manage, search, and link all historical and active campaign data from within Aleph.

## What Changes

- Create a CLI script/command (`aleph import-arcadia`) that reads the Arcadia docs directory and seeds the Aleph server with all campaigns, session groups, and sessions via existing API endpoints
- The importer will create 6 campaigns: La Familia, Génesis, La Fuerza Oculta, Reformatorio Nueva Esperanza, Crematorio La Tranquilidad, Hospital
- Each campaign gets session groups where applicable (La Fuerza Oculta has player groups corresponding to narrative arcs)
- Sessions are created with titles, dates, statuses, and AI notes / manual notes imported into the session content fields
- The script is idempotent: re-running it skips already-existing campaigns/sessions

## Capabilities

### New Capabilities
- `arcadia-importer`: A standalone Node.js import script (`cli/src/commands/import-arcadia.js`) that reads the Arcadia docs directory structure and calls Aleph API endpoints to create campaigns, session groups, and sessions with their content (ai_notes, manual_notes, summary)

### Modified Capabilities
<!-- None — all required API endpoints already exist after the session-groups-and-content-types change -->

## Impact

- New file: `cli/src/commands/import-arcadia.js`
- New file: `cli/bin/import-arcadia.js` (standalone runnable script, not wired into the main aleph CLI)
- Reads from: `/Users/ludo/code/arcadia/docs/campaigns/`
- Writes to: Aleph server via HTTP API (campaigns, session-groups, sessions, session content)
- No schema changes, no migrations — uses existing endpoints
- aleph-cli: No changes to existing commands; the importer is a standalone script
