## Why

The owner asked to be able to pick which of an entity's photographs a diagram card shows. It was
never built, and reviewing why turned up three separate gaps rather than one missing control.

**1. A diagram card always shows the primary image, and nothing can change that per card.**
`buildShapeCreateArgs` bakes `entity.portraitUrl ?? entity.image` into the shape at drop time, and
`diagram-hydration.ts:64-78` **overwrites it from the primary on every diagram load**. So the same
character shows the same photo in every diagram, for ever. There is no per-shape image field
anywhere: `grep 'imageId|image_id'` across the whole schema returns **zero** rows, and the diagrams
table stores only a tldraw `snapshot`.

That overwrite is the load-bearing half of this change. A picker added without touching hydration
would appear to work and be silently reverted on the next load — this codebase's most repeated
defect shape: a value that is accepted and does nothing.

**2. An object cannot have several photographs at all.** `entity_images` is entity-generic and its
`entity_images_one_primary` partial unique index is the "exactly one main image" guarantee, but the
HTTP surface exists for only three types — `characters`, `locations`, `organizations` (5 routes
each, 15 in total). There is **no `entities/[slug]/images`**, so an item, a piece of lore or an arc
has exactly one image, set through `entity upload-image`, and no gallery. The owner named objects
explicitly, so this is in scope, not a footnote.

Measured on `berlin-en-tinieblas`: `julia-kirchner` has **2** images and
`donde-aparecio-theo` (a location) has **2** — so real multi-image entities already exist and the
choice is not hypothetical. `der-nachtkurier` has 0, and every object has none, because they cannot.

**3. Organizations are the one type whose card never refreshes.** Hydration sets `characterName`,
`entityName`, `locationName` and their images, and for `factionCard` it sets `factionName` **and
not `crestUrl`**. Change an organization's image and every card already on a diagram keeps the old
crest permanently, while the other three types update on load. Two lines, fixed here because it is
the same file and the same reasoning.

## What Changes

- **A generic entity gallery.** Five routes under `entities/[slug]/images/`, mirroring the three
  existing sets field for field, so an object, a piece of lore or an arc can hold several
  photographs and name one primary. `EntityImageGallery.vue` is already parameterised by
  `imagesUrl`, so the client side is a mount, not a new component.
- **A per-shape image override.** Shape props gain `imageOverrideId?: string` — an image **id**,
  not a URL. It lives in the tldraw snapshot, so there is no migration and Hocuspocus syncs it like
  any other prop.
- **Hydration respects the override** instead of overwriting it, and falls back to the primary when
  the referenced image no longer exists. An id that has been deleted must degrade to the primary,
  never to a broken image.
- **`diagrams/entities/batch` returns each entity's gallery** as `images: [{ id, url }]`, so
  hydration can resolve an override and the picker can offer the choices without a second request.
- **The picker lives in `EntityPopover`**, which a shape's `onDoubleClick` already opens. The
  `aleph:entity-preview` event gains `shapeId`, because one entity can be placed as several shapes
  and the override is per shape — without it the picker could only address "some" card.
- **`crestUrl` is refreshed by hydration**, like every other type's image.

## Non-Goals

- No new tldraw shape, and no change to how a shape looks beyond which image it shows.
- Not a bulk "set this image on every card of this entity" action. The whole point is per card;
  the global behaviour already exists as "choose the main portrait".
- Not changing what "primary" means, nor the `entity_images_one_primary` index.
- No `aleph-cli` command for the override. The override belongs to a diagram shape, and the CLI has
  no shape-level surface; the CLI **does** gain nothing here and that is stated rather than assumed.

## Impact

- Affected specs: `entity-image-gallery` (new capability), `diagram-entity-palette` (MODIFIED)
- Affected code: `server/api/campaigns/[id]/entities/[slug]/images/**` (new),
  `server/api/campaigns/[id]/diagrams/entities/batch.get.ts`, `app/utils/diagram-hydration.ts`,
  `app/utils/diagram-shapes.ts`, the five `react/shapes/*Shape.tsx` that carry an image,
  `app/components/diagrams/EntityPopover.vue`, `app/pages/campaigns/[id]/diagrams/[diagramId].vue`,
  `app/pages/campaigns/[id]/entities/[slug]/{index,edit}.vue`, `i18n/locales/{en,es}.json`
- Migrations: **none.** `entity_images` already carries everything the gallery needs, and the
  override lives in the snapshot.
- **aleph-cli**: the new gallery routes mirror `characters/[slug]/images`, which the CLI already
  covers with five commands — `character images`, `image-add`, `image-update`,
  `image-set-primary`, `image-remove` (names verified against `--help`, not guessed). `entity`
  has only `upload-image`, so the same five land there and both skill files are updated, as
  `CLAUDE.md` requires whenever the HTTP surface grows.
