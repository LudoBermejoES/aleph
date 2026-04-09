## Why

Organizations are the only major entity type without image support. Characters have `portraitUrl`, entities have `imageUrl`, but the organizations table has no image column. The `factionCard` tldraw shape already supports a `crestUrl` prop for displaying an org logo/crest, but it's never populated because there's nowhere to store the URL. This means org cards in diagrams always show a plain letter fallback, and the entity panel shows no thumbnail for organizations.

The Arcadia campaign has 14 org images ready to upload (faction logos, crests) sitting in the docs but with no way to get them into Aleph.

## What Changes

- **Schema migration**: Add `imageUrl` text column (nullable) to the `organizations` table
- **Image upload endpoint**: `POST /api/campaigns/:id/organizations/:slug/image` — mirrors the existing entity image upload pattern (multipart form, MIME validation, size limit)
- **API updates**: Organization GET returns `imageUrl`, PUT accepts `imageUrl`
- **Graph API**: Org nodes return actual `imageUrl` instead of hardcoded `null`
- **Diagram integration**: `buildFactionCardShape` passes `imageUrl` as `crestUrl`, entity panel search returns org `imageUrl` as `portraitUrl`
- **CLI**: New `organization upload-image` command
- **Upload script**: Bulk upload the 14 existing Arcadia org images

## Capabilities

### New Capabilities

- `organization-images`: Image upload, storage, and display for organizations across API, diagrams, and CLI

### Modified Capabilities

## Impact

- **server/db/schema/organizations.ts** — add `imageUrl` column
- **server/db/migrations/0021_organization_image.sql** — ALTER TABLE migration
- **New endpoint: server/api/campaigns/[id]/organizations/[slug]/image.post.ts** — image upload
- **Modified: server/api/campaigns/[id]/organizations/[slug]/index.get.ts** — return imageUrl
- **Modified: server/api/campaigns/[id]/organizations/[slug]/index.put.ts** — accept imageUrl
- **Modified: server/services/graph-builder.ts** — populate org node image field
- **Modified: server/api/campaigns/[id]/diagrams/entities/index.get.ts** — return org imageUrl as portraitUrl
- **Modified: server/utils/diagram-helpers.ts** — buildFactionCardShape accepts imageUrl → crestUrl
- **Modified: app/utils/diagram-shapes.ts** — buildShapeCreateArgs for factionCard passes image
- **CLI: cli/src/commands/organization.js** — add upload-image command
- **Docs: docs/claude-skill.md + .claude/skills/aleph-cli/SKILL.md** — document new command
- **CLI impact**: New command `organization upload-image`
