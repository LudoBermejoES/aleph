# Proposal: Campaign Data Export

## Why

Aleph stores all campaign data in a local SQLite database with no way to extract it in a portable format. Users who invest months building a campaign world have no safety net beyond database backups -- no human-readable export, no way to migrate data to another tool, and no way to share campaign data outside the app. This creates vendor lock-in anxiety that discourages adoption. A JSON export gives users confidence that their data is always accessible and portable.

## What Changes

- Add a server endpoint `GET /api/campaigns/:id/export` that assembles all campaign data into a single nested JSON document
- Support selective export via query parameters (choose which resource types to include)
- Add an "Export Campaign" button on the campaign dashboard that triggers a browser download
- Add a `campaign export` CLI command with format and output options
- Add i18n keys for export UI labels in English and Spanish

## Capabilities

1. **Full campaign JSON export** -- Dumps all campaign data (entities, characters, sessions, locations, organizations, quests, maps metadata, calendars, timelines, relations, items, inventories, currencies, shops, arcs, chapters, session groups, tags, entity types, templates, rolls) as a single structured JSON file
2. **Selective export** -- Query parameter `include` accepts a comma-separated list of resource types, so users can export only what they need (e.g., `?include=entities,characters,sessions`)
3. **Frontend download button** -- On the campaign dashboard, a visible "Export Campaign" button for DMs and co-DMs that triggers a file download
4. **CLI export command** -- `aleph campaign export <id> [--format json] [--include types] [--output file.json]` for scripted/automated exports
5. **Future-ready for import** -- The export format is designed with enough structure (version field, resource type keys, ID references) that a future import feature can consume it directly

## Impact

### Server
- New endpoint: `GET /api/campaigns/:id/export` in `server/api/campaigns/[id]/`
- New service: `server/services/campaign-export.ts` with data assembly logic
- Authorization: restricted to DM and co-DM roles

### Frontend
- New UI component or button on campaign dashboard page
- Download triggered via browser fetch + blob URL

### CLI (aleph-cli)
- New subcommand in `cli/src/commands/campaign.js`: `export`
- Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md`

### i18n
- New keys in `i18n/locales/en.json` and `i18n/locales/es.json`

### Testing
- Unit tests for the export service (data assembly, selective filtering)
- Integration tests for the API endpoint (auth, full export, selective export)
- E2E test for the download button flow
