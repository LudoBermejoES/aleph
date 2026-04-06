## Why

Campaign export is fully implemented and produces a versioned JSON file covering 24 resource types, but there is no way to import that file back — making exports effectively one-way backups with no restore path. Import closes the loop and enables campaign portability (sharing campaigns, migrating between instances, restoring from backup).

## What Changes

- New `POST /api/campaigns/import` endpoint that accepts a campaign export JSON, remaps all internal IDs to new ones, reconstructs cross-resource relationships, and creates a fully populated campaign owned by the authenticated user.
- New import service `server/services/campaign-import.ts` that handles ID mapping, dependency-ordered insertion, and relationship reconstruction for all 24 resource types.
- New UI button on the campaigns list page (`app/pages/campaigns/index.vue`) to upload a `.json` export file and trigger import with progress/error feedback.
- New CLI command `aleph campaign import <file>` (with `--name` override option).
- Full test coverage: unit (import service ID mapping logic), integration (API endpoint), E2E (upload flow).

## Capabilities

### New Capabilities

- `campaign-import`: Accepts a versioned campaign export JSON, remaps IDs, reconstructs all relationships, and creates a new campaign with all its data intact.

### Modified Capabilities

- `campaign-export`: No requirement changes — export format is already import-ready at version "1.0". No delta spec needed.
- `aleph-cli`: New `campaign import` subcommand added to the existing CLI campaign command surface.

## Impact

- **New files**: `server/api/campaigns/import.post.ts`, `server/services/campaign-import.ts`
- **Modified files**: `app/pages/campaigns/index.vue` (import button + upload handler), `cli/src/commands/campaign.js` (new import subcommand), `docs/claude-skill.md`, `.claude/skills/aleph-cli/SKILL.md`
- **No schema changes**: import reuses existing tables; no new migrations needed
- **No new dependencies**: uses existing Drizzle ORM, better-auth session, and Nitro patterns
- **aleph-cli impact**: YES — new endpoint requires new CLI subcommand and skill file updates
