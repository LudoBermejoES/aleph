# Proposal: Entity Image Gallery for Characters and Organizations

## Why

The `2026-08-03-add-location-image-gallery` change introduced a general-purpose `entity_images`
table that was deliberately named entity-generic so it could be reused. Characters and
organizations are still limited to a single image each — a portrait overwrites the previous one,
and there is no way to attach art references, faction banners, or scene images to an org —
so the table should do the job it was designed for.

## What Changes

- Add a **character portrait gallery**: many images per character, one marked primary.
  `characters.portraitUrl` becomes the derived mirror of the primary (no existing consumer
  changes).
- Add an **organization image gallery**: many images per organization, one marked primary.
  `organizations.imageUrl` becomes the derived mirror of the primary.
- New gallery API routes under `/api/campaigns/:id/characters/:slug/images/` and
  `/api/campaigns/:id/organizations/:slug/images/` — list, upload, serve, patch (caption /
  order / primary), delete.
- Adapt the existing `portrait.post.ts` and `organizations/[slug]/image.post.ts` routes to
  create/replace the primary gallery image instead of writing an orphan file.
- Backfill: existing `characters.portraitUrl` and `organizations.imageUrl` values become
  primary gallery rows in a new migration.
- Gallery panels on character and organization detail pages (view for members, manage for
  editors+) and on their edit pages.
- aleph-cli new subcommands: `character images/image-add/image-update/image-set-primary/image-remove`
  and the same five for `organization`. Both skill files updated and kept in sync.
- Export/import extended to handle `characterImages` and `organizationImages` so galleries
  survive a round-trip.

## Capabilities

### New Capabilities

- `character-image-gallery`: storage (reusing `entity_images` table), upload/list/serve/update/
  delete endpoints, caption and ordering, exactly-one-primary invariant, propagation to
  `characters.portraitUrl`, gallery UI on character detail and edit pages, backfill migration,
  aleph-cli commands.
- `organization-image-gallery`: same pattern for organizations — storage (reusing
  `entity_images` table), API routes, exactly-one-primary invariant, propagation to
  `organizations.imageUrl`, gallery UI on organization detail and edit pages, backfill
  migration, aleph-cli commands.

### Modified Capabilities

- `entity-image`: `POST /entities/:slug/image` is not used for characters or organizations
  (they have dedicated routes), so no change needed here. The existing route's behaviour for
  locations is unchanged.
- `campaign-export`: the export payload gains `characterImages` and `organizationImages`
  arrays; the import restorer handles them. These are spec-level additions to existing
  `campaign-export` behaviour.
- `campaign-export-images`: the images collector must walk the new gallery URLs for characters
  and organizations; import must rewrite those URLs to the new campaign.

## Impact

### Affected code

| Area       | Files                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema     | No new table — `entity_images` already exists. New migration for character + org backfill only.                                                                                     |
| API        | New `server/api/campaigns/[id]/characters/[slug]/images/` routes (`index.get`, `index.post`, `[imageId].get`, `[imageId].patch`, `[imageId].delete`)                                |
| API        | New `server/api/campaigns/[id]/organizations/[slug]/images/` routes (same five)                                                                                                     |
| API        | `server/api/campaigns/[id]/characters/[slug]/portrait.post.ts` — adapted to create primary gallery image                                                                            |
| API        | `server/api/campaigns/[id]/organizations/[slug]/image.post.ts` — adapted to create primary gallery image                                                                            |
| Services   | `server/services/entity-images.ts` — already exists; reused. `server/services/campaign-export.ts`, `server/services/campaign-import.ts` — extended for character/org images         |
| Components | New `app/components/CharacterImageGallery.vue` and `app/components/OrganizationImageGallery.vue` (or a single generic `EntityImageGallery.vue` that both reuse — decided in design) |
| Pages      | `app/pages/campaigns/[id]/characters/[slug]/index.vue`, `.../[slug]/edit.vue`; `app/pages/campaigns/[id]/organizations/[slug]/index.vue`, `.../[slug]/edit.vue`                     |
| Storage    | Files under `{contentDir}/characters/{slug}/images/{imageId}.{ext}` and `{contentDir}/organizations/{slug}/images/{imageId}.{ext}`                                                  |
| i18n       | `i18n/locales/en.json`, `i18n/locales/es.json`                                                                                                                                      |

### aleph-cli impact — YES

New server API endpoints are added, so per project rules both skill files and the CLI must be
updated together:

- `cli/src/commands/character.js` — add `images`, `image-add`, `image-update`, `image-set-primary`, `image-remove`
- `cli/src/commands/organization.js` — add the same five
- `cli/src/lib/client.js` — reuses existing `postMultipart()` helper; a `patch()` method may need adding if absent
- `docs/claude-skill.md` — shareable skill, updated to document new command surface
- `.claude/skills/aleph-cli/SKILL.md` — local skill, updated + `version` bump in frontmatter
