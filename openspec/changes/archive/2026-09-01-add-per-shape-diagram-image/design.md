# Design

## D1 — The override is an image ID, stored in the tldraw snapshot

Shape props gain `imageOverrideId?: string`. Two decisions in one:

**In the snapshot, not the database.** A shape's props already live in `diagram_snapshots.snapshot`,
which Hocuspocus syncs and the REST fallback persists. A new optional prop therefore needs no
migration and no new table, and an older snapshot that lacks it simply reads as `undefined`. Adding
it to each `RecordProps` validator as `T.optional(T.string)` is backward-compatible; a **required**
prop would reject every existing snapshot, which is the trap here.

**An ID, not a URL.** A URL baked into a shape is a dead link the moment the image is deleted, and
nothing would ever repair it — the card would show a broken image for ever, on a canvas where a
missing image is indistinguishable from a slow one. An ID can be resolved, and when it resolves to
nothing the shape falls back to the primary, which is always correct and always present.

**Rejected — a `diagram_shape_images` table.** It duplicates what the snapshot already stores,
introduces a second source of truth for shape state that the multiplayer path does not sync, and
buys nothing: nothing needs to query "which shapes use image X".

## D2 — Hydration must RESPECT the override; this is the change, not the picker

`diagram-hydration.ts` currently rewrites `portraitUrl` on every diagram load from the entity's
primary. A picker alone would be reverted on the next load, and the reversion would look like a
save failure rather than a design flaw. So hydration becomes:

```
if shape.props.imageOverrideId is set AND that id is in data.images
    -> use that image's url
otherwise
    -> use data.portraitUrl   (the primary, i.e. today's behaviour)
```

The fallback branch is what makes a deleted image degrade gracefully instead of breaking. It also
means an override never has to be cleaned up when an image is deleted: it goes stale harmlessly.

## D3 — `batch` returns the gallery, so one request serves both readers

`diagrams/entities/batch` gains `images: { id, url }[]` per entity. Hydration needs it to resolve an
override; the picker needs it to show the choices. Fetching it twice, or adding a second endpoint,
would make the picker's open a round trip and hydration's resolution a second one.

The cost is bounded, and the payload per image is an id and a path. `batch` already caps at 100 ids
per call.

**The figure first written here — "1–2 images" — was too low, and getting it right took three
measurements that disagreed. Keep the disagreement; it is the useful part.**

| measured                                               | multi-image entities       | max |
| ------------------------------------------------------ | -------------------------- | --- |
| whole local `data/aleph.db`                            | **190** of 1041 image rows | 4   |
| local db, the 4 REAL campaigns only                    | **10**                     | 4   |
| PRODUCTION, `berlin-en-tinieblas`, locations only (45) | **8** of 45                | 4   |

The 190 is real rows and a misleading answer: that database also holds **1,447 throwaway campaigns**
created by the integration suite, and it grew 150 → 170 → 190 across one afternoon _while the tests
ran_. A count over "the database" therefore measures the test fixtures, not the campaign. The real
distribution is production's: most entities hold one image, a handful reach 2–4, the largest is 4
(`edificio-leeren`, and one Berlin location).

So the conclusion of D3 stands and the original number did not: returning the gallery is cheap, but
the picker has real work — a canvas of 100 shapes carries on the order of 100–130 image rows, not
100–200, and multi-image entities exist in four types including `item`.

Two further cautions for whoever measures this next:

- **`data/aleph.db` is a dev copy and lags production.** It has no `donde-aparecio-theo` and no
  `der-nachtkurier`, and **no entity of type `item` in `berlin-en-tinieblas`** — while production
  has three, one of them with an uploaded image. A conclusion of the form "the owner's request is
  entirely prospective" is true of the local file and false of the live campaign.
- The three per-type gallery endpoints exist in production; the generic entity one does not until
  this change deploys, so a production count can only cover characters, locations and organizations.

`images` MUST obey the same `dm_only` visibility rule the rest of that endpoint obeys — an image
list is a disclosure like any other.

## D4 — The picker lives in `EntityPopover`, and the event must carry the SHAPE id

A shape's `onDoubleClick` already dispatches `aleph:entity-preview`, the diagram page already
listens for it, and the page already holds `editorInstance` and calls `updateShapes`. So the whole
path exists; what is missing is one field.

The event detail carries `entityId`, `campaignId` and `slug` — **not the shape id**. One entity can
be dropped onto a canvas many times, so without the shape id a picker could only say "change this
entity's card" and would have to guess which one. `shapeId` is added to the detail, and the page
passes it to the popover, which emits the chosen image id back for the page to write with
`updateShapes`.

**Rejected — having the popover reach into the editor itself.** The popover is a plain Vue component
outside the tldraw React island; the page is the only place that legitimately owns the editor
handle, and every other shape write already goes through it.

## D5 — Read-only mode must not offer the picker

`onAlephEntityPreview` already branches on `readOnly` and opens a new tab instead of the popover, so
a viewer never reaches the picker by that path. The popover still receives an explicit flag rather
than relying on that, because the same component is reachable from the entity panel.

## D6 — The generic entity gallery mirrors an existing set exactly

The five new routes under `entities/[slug]/images/` are a field-for-field mirror of
`characters/[slug]/images/`, including the transactional `isPrimary` promotion and the rejection of
`isPrimary: false` on a non-empty gallery. Deliberately not a refactor into a shared handler: the
three existing sets differ in which sibling column they mirror the primary into
(`characters.portrait_url`, `organizations.image_url`, `entities.image_url`), and unifying them is a
larger change that this one should not smuggle in.

For a generic entity the mirror target is `entities.image_url`, which is what
`diagrams/entities/batch`, the palette and the map pins already read.

**One consequence worth stating**: an object today has an `entities.image_url` set directly by
`entity upload-image` with **no `entity_images` row**. The gallery must therefore treat "no rows but
a non-empty `image_url`" as a legitimate starting state and not lose that image — the same backfill
question `character-image-gallery` answered for portraits. Whether to backfill a row or leave the
column as an unlisted fallback is task 1.6's job to decide with a measurement, not to assume.

### D6.1 — Task 1.6, measured: no global backfill; the FIRST gallery upload adopts the old image

**The measurement** (local `data/aleph.db`, 2026-08-31, entities with a non-empty `image_url` and
zero `entity_images` rows):

| scope                                                                                                             | entities in that state                                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| the four real campaigns (`berlin-en-tinieblas`, `arcadia-la-fuerza-oculta`, `kult`, `kingmaker`) — 4,601 entities | **0**                                                                                                       |
| whole database — 10,088 entities, 1,447 campaigns                                                                 | **45** (31 `item`, 8 `location`, 6 `character`), every one of them in a throwaway integration-test campaign |

So a global backfill would migrate **zero** real rows, and it would have to MOVE FILES
(`entities/<slug>/image.<ext>` → `entities/<slug>/images/<uuid>.<ext>`) to do it. Two further
measurements that decided it:

- **The producer is still open.** `entities/[slug]/image.post.ts` keeps writing the single-file
  shape for every non-`location` type, and `entity upload-image` keeps calling it. A one-off
  backfill would therefore be stale again on the next upload — this is not a state that can be
  closed by migrating once.
- **Closing the producer is not available either**: `tests/integration/entity-image.test.ts` pins
  `imageUrl` to exactly `/api/campaigns/<id>/entities/<slug>/image` in three places, so making that
  route delegate to the gallery (as the `location` branch already does) is a separate change.

**The choice: lazy adoption on write, no migration.** `entities.image_url` stays an unlisted
fallback for as long as the gallery is empty — a `GET` never writes — and
`adoptLegacyEntityImage()` folds the old file in as gallery row `sortOrder: 0`, `isPrimary: true`
the moment the FIRST gallery image is POSTed. So:

- listing a legacy-only entity returns `[]` and the column is untouched; the entity still shows its
  image everywhere that reads `imageUrl` (entity page, palette, map pins, `batch.portraitUrl`);
- the first `image-add` yields **two** rows, the older photograph still primary, rather than
  silently displacing it — which is what a fallback-only choice would have done, because
  `syncPrimaryImageUrl()` rewrites `image_url` from the new primary;
- it is idempotent by construction (`hasImages()` short-circuits) and a no-op when the column is
  empty, is not the legacy URL, or the file is missing — a dangling column must not turn an upload
  into a 500.

Covered by two integration tests ("the first upload adopts it", "adoption happens once"), both
mutation-checked.

### D6.2 — The generic route DELEGATES the mirror column instead of always writing `entities.image_url`

D6 says the mirror target is `entities.image_url`, and that is right for a generic entity — but the
generic routes accept an entity of **any** type, and the entity page (task 2.10) points
`EntityImageGallery` at them for every type. Writing `entities.image_url` unconditionally would make
these routes a SECOND writer over the same `entity_images` rows the character/location/organization
galleries already own, mirroring into a different column — two sources of truth that disagree, this
codebase's most repeated defect.

So `resolveEntityImageKind()` picks the kind from the row that actually exists (`characters` /
`organizations` by `entity_id`, `type === 'location'`), never from the `entities.type` string —
which is per-campaign DATA and is spelled `faction` in `entity_types` while `entities.type` reads
`organization`. A character reached through `/entities/<slug>/images` therefore writes its file to
`characters/<slug>/images/`, gets a `characters/...` URL, and mirrors into
`characters.portrait_url`, exactly as the dedicated route would. Verified by an integration test
that lists the same row through both routes and reads the bytes through both.

## D7 — The organization crest fix

Hydration sets an image for `npcToken`, `entityCard` and `locationPin`, and for `factionCard` sets
only `factionName`. It gains `crestUrl`, resolved through the same override-then-primary rule. This
is a real defect on its own: an organization's card never refreshes its crest today.

### D7.1 — The crest has to REACH hydration: `batch` never read `organizations.image_url`

D7 is only half a fix. `batch.get.ts` resolved the main image as
`characters.portrait_url ?? entities.image_url`, and an organization's primary is mirrored into
**`organizations.image_url`** (D6.2's deliberate choice), a table that endpoint never joined. So
every organization answered `portraitUrl: null`.

Measured on `data/aleph.db`, and it is not a corner:

| organizations                                   | count          |
| ----------------------------------------------- | -------------- |
| with a crest in `organizations.image_url`       | **109**        |
| …of those, invisible to `batch` before this fix | **109 (100%)** |
| …with `entities.image_url` also set             | **0**          |
| with a crest but no `entity_id` (unjoinable)    | **0**          |

Harmless while nothing consumed it; destructive the moment D7 made hydration WRITE `crestUrl`,
because `null` stopped meaning "leave the card alone" and started meaning "erase the crest", and
hydration persists.

**Precedence: specialised column first, `entities.image_url` last.**

1. `characters.portrait_url`
2. `organizations.image_url`
3. `entities.image_url`

Two reasons, neither of them new. **It is already adjudicated in this codebase**: `maps.ts:211`
resolves the same question for map pins with the same order
(`move-pins-and-resolve-entity-images/design.md` D3), so map pins never had this hole — batch was
the reader left behind, and matching it keeps two readers of one question from drifting. And it is
**the ownership rule of D6.2**: `syncPrimaryImageUrl()` maintains the specialised column inside the
gallery's own transaction, whereas a character's or organization's `entities.image_url` can only
have been written by the legacy single-file `entities/:slug/image` route — an unsynced second
writer. When they disagree, the transactional one is the truth. Today they never disagree (0 of
109), so this decides the future, not the present.

Like `maps.ts`, this deliberately does **not** switch on `entities.type`: a location can carry both
a gallery image and `entities.image_url`, and a campaign's custom entity type matches no branch.

**Not adopted, and stated rather than assumed:** `maps.ts` puts a fourth source FIRST — the
`entity_images` row with `is_primary = 1`. Measured, adding it would change **29** entities
DB-wide (11 location, 9 character, 9 organization) and **0** in the four real campaigns; every one
of the 29 is a test campaign where a mirror column drifted from its gallery. Left out as
out-of-scope: it would change the character and location branches too, nothing pins that behaviour,
and papering a drift over in `batch` would hide a `syncPrimaryImageUrl` bug rather than fix it.

**Quests and maps checked, not assumed.** The whole schema has exactly four image columns
(`grep 'image_url\|portrait_url' server/db/schema/*.ts`): the three above plus
`sub_campaigns.image_url`, which has no `entity_id`, never appears in `entities`, and cannot reach a
diagram. Quests have no image column at all and `SHAPE_IMAGE_PROP_KEY` has no `questNode` entry, so
a quest card renders no image — `entities.image_url` is its whole answer and `batch` already read
it. Map pins are the reader that already had the fix. **Organizations were the only hole.**
