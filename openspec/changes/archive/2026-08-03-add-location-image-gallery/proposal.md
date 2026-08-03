# Proposal: Location Image Gallery

## Why

A location is the one entity type people want to _look at_. A tavern, a ruined keep, a city
district — the table wants the exterior, the map of the cellar, the NPC's back room, the
handout the DM shows when the party walks in. Aleph gives every entity exactly **one** image
(`entities.imageUrl`, `server/db/schema/entities.ts:18`), so today the second picture of a
place has nowhere to go, and uploading it silently destroys the first
(`server/api/campaigns/[id]/entities/[slug]/image.post.ts` overwrites `image.{ext}` in place).

It is worse than a limit of one for locations specifically: **locations show no image at all.**
`app/pages/campaigns/[id]/locations/[slug]/index.vue` renders no image element, and the list
endpoint's explicit column select (`server/api/campaigns/[id]/locations/index.get.ts:43-58`)
does not include `imageUrl`. A location that has an image — set through the generic entity edit
page — displays it nowhere in the locations UI. So this change has to do two things at once:
give locations a gallery, and give locations an image surface at all.

## What Changes

- Add a **location image gallery**: many images per location, each with an optional caption, in
  an order the editor controls.
- Add a **primary image** selection. Exactly one image in a non-empty gallery is primary, and
  the primary is what every other surface shows — the location list, the detail header, map-pin
  popovers, relation cards, search results.
- Keep `entities.imageUrl` as the **derived mirror** of the primary image rather than a second
  source of truth. Every consumer that already reads `imageUrl` keeps working with no change,
  and there is no state in which the gallery and `imageUrl` disagree. See
  [design.md](design.md).
- Add gallery endpoints under `/api/campaigns/:id/locations/:slug/images` — list, upload,
  update (caption / order / primary), delete.
- Add `imageUrl` to the location **list** response so the locations index can finally show a
  thumbnail.
- Add a gallery panel to the location detail page (view for members, manage for editors+) and
  gallery management to the location edit page.
- Adapt the existing `POST /api/campaigns/:id/entities/:slug/image` route so that when the
  entity is a location it records a gallery image instead of writing an orphan file. This is
  the drift-avoidance point: without it, two write paths would fight over `imageUrl`.
- Backfill: existing locations that already have an `imageUrl` get a gallery row for it, marked
  primary, so nothing that is visible today disappears.
- **Not breaking.** No column is removed, no URL shape changes, no existing response field
  changes type.

## Capabilities

### New Capabilities

- `location-image-gallery`: multiple images per location — storage model, upload/list/update/
  delete endpoints, caption and ordering, the exactly-one-primary invariant, the primary's
  propagation to `entities.imageUrl`, the gallery UI on the location detail and edit pages, and
  the aleph-cli commands.

### Modified Capabilities

- `location-management`: the location list response gains `imageUrl`; the detail response gains
  `images` and `primaryImageUrl`; the detail and edit pages gain a gallery panel. These are
  spec-level additions to endpoints and pages that capability already owns.
- `entity-image`: `POST /entities/:slug/image` gains location-specific behaviour — for an entity
  of `type = 'location'` it creates or replaces the **primary gallery image** rather than
  writing `image.{ext}` and setting `imageUrl` directly. Behaviour for every other entity type
  is unchanged.
- `campaign-export`: the export payload gains a `locationImages` array so a gallery survives an
  export/import round-trip; import restores it.
- `campaign-export-images`: the `images` map must embed gallery image files, and import must
  rewrite gallery URLs to the new campaign — today the collector only walks
  `entities.imageUrl` and a few sibling fields (`server/services/campaign-export.ts:110-112`),
  so gallery images would export as dead links.

## Impact

### Affected code

| Area       | Files                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema     | new `server/db/schema/entity-images.ts` (`entityImages` table), export from `server/db/schema/index.ts`, new migration in `server/db/migrations/` (incl. the imageUrl backfill) |
| API        | new `server/api/campaigns/[id]/locations/[slug]/images/` routes (`index.get`, `index.post`, `[imageId].patch`, `[imageId].delete`, `[imageId].get`)                             |
| API        | `server/api/campaigns/[id]/locations/[slug].get.ts` (add `images`, `primaryImageUrl`), `.../locations/index.get.ts` (add `imageUrl` to the select and to `mapRow`)              |
| API        | `server/api/campaigns/[id]/entities/[slug]/image.post.ts` (location branch)                                                                                                     |
| Services   | new `server/services/entity-images.ts` — the primary invariant, ordering, file paths; `server/services/campaign-export.ts`, `server/services/campaign-import.ts`                |
| Components | new `app/components/LocationImageGallery.vue`; `app/components/EntityImage.vue` unchanged and reused for thumbnails                                                             |
| Pages      | `app/pages/campaigns/[id]/locations/[slug]/index.vue`, `.../[slug]/edit.vue`, `.../locations/index.vue`                                                                         |
| Storage    | files under `{campaign.contentDir}/locations/{slug}/images/{imageId}.{ext}`                                                                                                     |
| i18n       | `i18n/locales/en.json`, `i18n/locales/es.json`                                                                                                                                  |

### aleph-cli impact — YES

This change adds server API endpoints **and** a data model, so per the project rules the CLI and
**both** skill files must be updated together:

- `cli/src/commands/location.js` — `images`, `image-add`, `image-update`, `image-set-primary`,
  `image-remove` (the file has 11 commands today and no image command at all)
- `cli/src/lib/client.js` — reuses the existing `postMultipart()` helper (`client.js:74`); a
  `patch()` helper may need adding if one is absent
- `docs/claude-skill.md` — the shareable skill
- `.claude/skills/aleph-cli/SKILL.md` — the local skill, with a `version` bump in frontmatter

### Risks

- **Two write paths to one field.** `entities.imageUrl` is currently written by the entity image
  endpoint and would now also be written by the gallery. Mitigated by making the gallery the
  only writer for locations and routing the entity endpoint through it — asserted by a test, not
  by convention.
- **The exactly-one-primary invariant.** "Which image is the main one" is the whole point of the
  feature, and a partial-index invariant enforced by SQLite is the only version of it that
  cannot rot. Deleting the primary must promote another image, not leave the location primary-less.
- **Storage layout change for locations.** Images move from a single `entities/{slug}/image.{ext}`
  to `locations/{slug}/images/{id}.{ext}`. The backfill must copy, not move-and-hope, and the old
  file stays readable until the migration is verified.
- **Export/import silently dropping galleries.** A campaign exported before the export collector
  is updated would import as a location with no pictures and no error. The round-trip test is
  the gate, not the export code review.
- **Scope.** Only locations. Characters keep `portraitUrl`, organizations keep their single
  image. The table is deliberately entity-generic so a later change can widen it without a
  second migration, but no other entity type gains a gallery here.
