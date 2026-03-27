## Why

TTRPG campaigns are rich with factions, guilds, armies, cults, and other groups that characters belong to — yet Aleph has no first-class model for these organizations. DMs currently work around this gap by using entity wiki entries or character descriptions, losing the structured relationship data (who belongs to what, in what role) that is central to campaign storytelling.

## What Changes

- New `organizations` table storing organization metadata per campaign (name, slug, description, type, status)
- New `organization_members` join table linking characters to organizations with a free-text role field
- Full CRUD REST API under `/api/campaigns/:id/organizations` including member management sub-routes
- Four frontend pages: list, create, edit, and detail (with member management UI)
- Character detail page gains an "Organizations" section showing memberships
- Campaign sidebar gains an "Organizations" navigation link
- `aleph-cli` gains an `organization` command group (list, create, show, delete, member add, member remove)
- i18n keys in `en.json` and `es.json` for all new UI strings
- Unit, integration, and E2E test coverage

## Capabilities

### New Capabilities

- `organization-management`: Core CRUD for organizations within a campaign — create, list, read, update, delete organizations; includes DB schema (organizations + organization_members tables), API endpoints, and all frontend pages
- `organization-membership`: Adding and removing characters from organizations with a role; includes the member sub-routes, the member management UI on the detail page, and the "Organizations" section on the character detail page

### Modified Capabilities

- `character-management`: Character detail page gains a new read-only "Organizations" section listing memberships (organization name + role). No requirement changes to existing character CRUD — display only.

## Impact

**DB / Schema**
- New file: `server/db/schema/organizations.ts` (organizations + organization_members tables)
- Updated: `server/db/schema/index.ts` to export new tables
- New Drizzle migration under `server/db/migrations/`

**Server API**
- New route directory: `server/api/campaigns/[id]/organizations/`
  - `index.get.ts`, `index.post.ts`
  - `[slug]/index.get.ts`, `[slug]/index.put.ts`, `[slug]/index.delete.ts`
  - `[slug]/members/index.post.ts`
  - `[slug]/members/[characterId]/index.delete.ts`

**Frontend**
- New pages under `app/pages/campaigns/[id]/organizations/`
  - `index.vue` (list), `new.vue` (create), `[slug]/index.vue` (detail), `[slug]/edit.vue` (edit)
- Updated: `app/pages/campaigns/[id]/characters/[slug]/index.vue` — add Organizations section
- Updated: campaign sidebar component — add Organizations nav link
- New/updated i18n keys in `app/i18n/en.json` and `app/i18n/es.json`

**aleph-cli** — YES, CLI impact
- New file: `cli/src/commands/organization.js` — command group with list, create, show, delete, member-add, member-remove subcommands
- Updated: `cli/src/index.js` to register the new command
- Updated: `docs/claude-skill.md` to document the new `organization` commands
