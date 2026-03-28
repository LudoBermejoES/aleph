## Why

Characters have portrait images (upload, display, serve), but all other entity types (locations, factions, NPCs, creatures, items, lore, events) have no image support. DMs and players want to attach representative images to any wiki entry — a city skyline, a faction sigil, a magic item illustration — to make the campaign world more visual and immersive. The upload infrastructure already exists for character portraits and editor inline images; extending it to all entities is a natural next step.

## What Changes

- Add an `imageUrl` column to the `entities` table (nullable text field)
- Create `POST /api/campaigns/:id/entities/:slug/image` endpoint for multipart image upload (mirroring the character portrait pattern)
- Create `GET /api/campaigns/:id/entities/:slug/image` endpoint to serve the stored image with caching headers
- Create a reusable `EntityImage.vue` component (similar to `CharacterPortrait.vue`) with view/upload modes and size variants
- Display entity images on entity detail pages, entity list cards, and entity edit forms
- Add `entity upload-image` CLI command (mirroring `character upload-portrait`)
- Generate a DB migration for the new column

## Capabilities

### New Capabilities
- `entity-image`: Upload, store, serve, and display images for any entity type. Covers the API endpoints, DB schema change, frontend component, and CLI command.

### Modified Capabilities
- `worldbuilding-wiki`: Entity detail and list views gain image display support
- `aleph-cli`: New `entity upload-image` command added to the CLI command surface

## Impact

- **Schema**: `server/db/schema/entities.ts` — add `imageUrl` column; new migration in `server/db/migrations/`
- **API**: Two new endpoints under `server/api/campaigns/[id]/entities/[slug]/` — `image.post.ts` and `image.get.ts`
- **Frontend**: New `app/components/EntityImage.vue`; changes to `app/pages/campaigns/[id]/entities/[slug]/index.vue` (detail), `app/pages/campaigns/[id]/entities/index.vue` (list), `app/pages/campaigns/[id]/entities/[slug]/edit.vue` (edit form)
- **CLI**: `cli/src/commands/entity.js` — new `upload-image` subcommand; `cli/src/lib/client.js` if multipart helper is needed
- **Disk storage**: Images stored at `content/campaigns/{campaignSlug}/entities/{entitySlug}/image.{ext}` (same pattern as character portraits)
- **Skill files**: `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` must be updated with the new command
