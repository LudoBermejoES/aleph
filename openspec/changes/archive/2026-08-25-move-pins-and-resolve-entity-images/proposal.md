## Why

Two requests from the owner after using the new markers, and the second one has a measured cause.

**1. A pin cannot be moved.** It can be created by dropping an entity and it can now be deleted, but
a pin dropped one street off has to be deleted and re-created. There is also **no endpoint to move
one**: `server/api/campaigns/[id]/maps/[slug]/pins/[pinId]/` contains only `index.delete.ts`, and the
CLI offers only `pins` / `pin-add` / `pin-delete`. So this needs a write endpoint, not just a
Leaflet flag.

**2. The markers show generic type icons instead of the entities' real images.** Measured, and the
cause is that **an entity's main image lives in three different places depending on its type**, and
the join added by `improve-map-pin-markers-and-deletion` reads only one of them:

| Entity type      | Where its main image actually lives                                    | Reached by the current join? | Populated                                         |
| ---------------- | ---------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------- |
| **location**     | `entities.image_url`                                                   | **yes**                      | **40 of 44**                                      |
| **character**    | `characters.portrait_url`, via `characters.entity_id → entities.id`    | no                           | **48 of 50**                                      |
| **organization** | `organizations.image_url`, via `organizations.entity_id → entities.id` | no                           | column + `image.get`/`image.post` endpoints exist |

There is also a fourth, canonical source: `entity_images` with `is_primary = 1`, whose partial unique
index `entity_images_one_primary` **is** the "exactly one main image" guarantee (the schema comment
says so explicitly, and says only locations have a gallery UI today).

The owner has named the three types that matter: **characters, locations and organizations.** So the
gap is concrete rather than general — characters and organizations, the two whose image is on a
sibling table, show a type icon while their portrait exists and is served by a working endpoint.

A correction worth recording, because it was briefly believed and is wrong: `entities.image_url` is
NOT unpopulated. A 50-row sample suggested 1 of 50, but that page was 42 characters and 3 locations;
across all locations it is 40 of 44. The column is the _locations'_ home, and locations should
already be rendering their images today. If the owner sees a generic icon on a **location** pin, that
is a separate defect from this one and must be diagnosed, not assumed fixed by this change.

## What Changes

- **A pin can be dragged to a new position.** Editor+ only, on both map types, persisted. The map is
  not rebuilt and the viewport does not move — the same rule
  `improve-map-pin-markers-and-deletion` established for create and delete.
- **A new endpoint to move a pin**, accepting the new coordinates and nothing else, gated like the
  existing POST/DELETE. The CLI gains the matching command, because every endpoint in this project's
  CLI has one.
- **The marker resolves the entity's main image across all four sources**, in a declared priority
  order, so a character shows its portrait, an organization its image, and a location its gallery or
  legacy image. The type icon stays as the fallback for an entity that genuinely has none, and the
  plain coloured dot for a pin with no entity at all.

## Non-Goals

- Editing a pin's label, colour, group or linked entity. Only its position.
- Building a gallery UI for characters or organizations. This change only READS what exists.
- Moving a pin between maps, or reparenting it into a nested map.
- Changing how `image` maps convert coordinates.
