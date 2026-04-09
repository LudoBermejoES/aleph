## 1. Schema migration

- [x] 1.1 Add `imageUrl: text('image_url')` column to the organizations table in `server/db/schema/organizations.ts`
- [x] 1.2 Create migration `server/db/migrations/0021_organization_image.sql` with `ALTER TABLE organizations ADD COLUMN image_url TEXT`

## 2. Image upload and serving endpoints

- [x] 2.1 Create `server/api/campaigns/[id]/organizations/[slug]/image.post.ts` — multipart upload, MIME validation (PNG/JPEG/WEBP), 10MB limit, magic byte detection, store in `content/campaigns/<slug>/organizations/<orgSlug>/image.ext`, update imageUrl in DB
- [x] 2.2 Create `server/api/campaigns/[id]/organizations/[slug]/image.get.ts` — serve the image file with correct Content-Type, 404 if no image
- [x] 2.3 Update `server/api/campaigns/[id]/organizations/[slug]/index.get.ts` — include `imageUrl` in response
- [x] 2.4 Update `server/api/campaigns/[id]/organizations/[slug]/index.put.ts` — accept optional `imageUrl` field in body schema, update in DB

## 3. Graph API and diagram integration

- [x] 3.1 Update `server/services/graph-builder.ts` — fetch org imageUrl when building org nodes, replace hardcoded `image: null` with actual value
- [x] 3.2 Update `server/api/campaigns/[id]/diagrams/entities/index.get.ts` — return org `imageUrl` as `portraitUrl` in entity panel search results
- [x] 3.3 Update `server/utils/diagram-helpers.ts` — extend `buildFactionCardShape` to accept optional `imageUrl` and pass as `crestUrl` prop
- [x] 3.4 Update `app/utils/diagram-shapes.ts` — extend `buildShapeCreateArgs` for organization type to pass `image`/`portraitUrl` as `crestUrl` prop
- [x] 3.5 Update `server/utils/diagram-generator.ts` — fetch org imageUrl in generateFactionWeb and pass to buildFactionCardShape

## 4. CLI support

- [x] 4.1 Add `upload-image` subcommand to `cli/src/commands/organization.js` — reads file, POSTs multipart to `/api/campaigns/:id/organizations/:slug/image`
- [x] 4.2 Update `docs/claude-skill.md` with the new `organization upload-image` command
- [x] 4.3 Update `.claude/skills/aleph-cli/SKILL.md` with the new command

## 5. Tests

- [x] 5.1 Integration test: POST org image upload returns 200 with imageUrl
- [x] 5.2 Integration test: GET org image serves the file with correct Content-Type
- [x] 5.3 Integration test: GET org returns imageUrl field
- [x] 5.4 Integration test: POST upload rejected for player role (403)
- [x] 5.5 Integration test: POST upload rejected for invalid MIME type (422)
- [x] 5.6 Unit test: buildFactionCardShape with imageUrl sets crestUrl prop
- [x] 5.7 Unit test: buildShapeCreateArgs for organization with image sets crestUrl

## 6. Upload existing Arcadia org images

- [x] 6.1 Create script to upload the 14 org images from `/Users/ludo/code/arcadia/docs/assets/img/characters/` to aleph.ludobermejo.es using the new endpoint
