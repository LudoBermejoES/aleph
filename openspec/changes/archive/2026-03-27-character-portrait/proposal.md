## Why

Characters have no visual representation — GMs and players can't associate a face with a character, which is a core part of TTRPG immersion. The `images/` upload infrastructure already exists; it just isn't wired to characters yet.

## What Changes

- **Add `portraitUrl` column** to the `characters` table (nullable text, stores a relative API path)
- **New API endpoint** `POST /api/campaigns/[id]/characters/[slug]/portrait` — accepts multipart image upload, stores file, updates `portraitUrl` on the character
- **New API endpoint** `GET /api/campaigns/[id]/characters/[slug]/portrait` — serves the portrait image file
- **Character detail page** in the web UI shows the portrait (upload button for editors/DMs, read-only display for others)
- **Character list** shows a portrait thumbnail next to each character name
- **CLI** `aleph character upload-portrait --campaign <id> --slug <slug> --file <path>` — uploads a local image file as a character portrait

## Capabilities

### New Capabilities

- `character-portrait`: Upload, store, serve, and display a portrait image per character

### Modified Capabilities

- `character-management`: Character create/show APIs and CLI commands now include `portraitUrl` in their responses

## Impact

- `server/db/schema/characters.ts` — add `portraitUrl` column
- `server/db/migrations/` — new migration
- `server/api/campaigns/[id]/characters/[slug]/portrait.post.ts` — upload endpoint
- `server/api/campaigns/[id]/characters/[slug]/portrait.get.ts` — serve endpoint
- `server/api/campaigns/[id]/characters/[slug].get.ts` — include `portraitUrl` in response
- `server/api/campaigns/[id]/characters/index.get.ts` — include `portraitUrl` in list response
- `app/pages/campaigns/[id]/characters/[slug].vue` — portrait display + upload UI
- `app/components/CharacterPortrait.vue` — reusable portrait component
- `i18n/locales/en.json` + `es.json` — new i18n keys
- `cli/src/commands/character.js` — new `upload-portrait` subcommand
- `cli/src/lib/client.js` — multipart upload method
