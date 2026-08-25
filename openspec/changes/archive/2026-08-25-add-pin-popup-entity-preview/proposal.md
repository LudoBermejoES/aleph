## Why

Today a pin's popup is a name and two links:

```
Berghain
Ver entidad
Eliminar pin
```

The owner wants it to read like a little index card — the linked entity's image plus a couple of
sentences of description — so a player hovering the map gets a sense of the place/person/faction
without leaving it. Three entity types are actually pinned today: **location, character,
organization** (the live map holds 13 pins, all locations).

The image half of this is already solved: `entityImageUrl` is joined, visibility-filtered, and
rendered on the MARKER itself (`improve-map-pin-markers-and-deletion`,
`move-pins-and-resolve-entity-images`). This change is about the POPUP, which currently shows no
image at all, and about the text, which does not exist anywhere in the response.

**The hard constraint, stated explicitly by the owner:** this popup is visible to anyone who can
view the map, players included. A location's markdown can end in a `:::secret{.dm}` block (e.g.
Berghain's "Notas secretas del DJ"), and leaking one word of it into a popup is a real breach in a
live campaign. Every text source this change reads has to go through whatever secret-stripping rule
already applies to it before a byte of it reaches the excerpt — never after, never around it.

**The three entity types do not store their text the same way, and one of them has no secret rule
at all:**

| Type           | Where the text lives                                                                                          | Secret stripping                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `location`     | markdown file (`entities.filePath`)                                                                           | `stripSecretBlocks` (co_dm+ sees everything)            |
| `character`    | markdown file (`entities.filePath`), same convention                                                          | `stripSecretBlocks`, same rule                          |
| `organization` | `organizations.description` **column** — there is no file, `entities.filePath` is `''` for every organization | none exists for this field, and none should be invented |

`entities` itself has no content column — only `filePath`/`contentHash`. The text has to be read
server-side, from a file for two of the three types and from a column for the third.

## What Changes

- **The pins endpoints (`GET .../pins`, `GET .../maps/[slug]`, `POST .../pins`,
  `PATCH .../pins/[pinId]`) return one new field, `entityExcerpt`**: a short, plain-text,
  already-visibility-filtered excerpt of the linked entity's description, or `null` when there is
  none (no linked entity, an entity type this change doesn't cover, empty text, or an entity the
  viewer isn't allowed to see — same rule `entityImageUrl`/`entityType` already follow).
- **For `location` and `character`**, the excerpt is built from the entity's markdown file: read it
  (tolerating a missing/unreadable file — one bad entity must never 500 the whole pins list),
  run it through the SAME `stripSecretBlocks(content, role)` the entity's own page already applies,
  and only THEN flatten the surviving markdown to plain text and truncate it. Stripping happens
  before excerpting, never after — a test proves this ordering with a fixture whose first
  paragraph is a secret block.
- **For `organization`**, the excerpt is built straight from the `organizations.description`
  column — no file, no secret stripping (the column has no secret-block convention and this change
  does not invent one) — but it still passes through the SAME `isEntityVisibleTo` gate the image
  and type already use, so an organization the viewer cannot see contributes no text.
- **A pure, dependency-free markdown/HTML flattener** (`server/services/text-excerpt.ts`) turns
  either a raw-markdown body (location/character, pre-`autoLink`) or a plain-text-ish column
  (organization) into a single-line excerpt, truncated at a word boundary. Character text is taken
  from BEFORE `autoLinkContent` runs — that function emits HTML links, and an excerpt has no need
  for them — so the flattener never has to un-render markup `autoLink` itself produced.
- **The popup (`buildPinPopupHtml` in `app/utils/mapPinMarker.ts`) grows an image and an excerpt
  paragraph**, both escaped like every other interpolated field in that module, and the popup
  gains a `maxWidth` (Leaflet's `bindPopup` option) so an image-plus-paragraph card doesn't spill
  off a phone screen. "Ver entidad", "Eliminar pin" and shift-click-to-explore are unchanged.

## Non-Goals

- Any entity type beyond location/character/organization. A pin linked to an item, event, session,
  etc. gets `entityExcerpt: null` — inventing a text source for a type with none established would
  be worse than showing nothing.
- Rendering the excerpt as formatted markdown/HTML in the popup. It is flattened to plain text on
  purpose (see design.md's Decisions) — the popup is a hand-built HTML string, not a markdown
  renderer, and a subset-HTML renderer is unnecessary risk for two sentences of text.
- Populating `entities.boardSummary` as a pre-computed excerpt. That column exists, is empty on all
  44 locations today, and — because it cannot vary by viewer role — could not satisfy the secret
  rule even if it were populated. Not touched by this change.
- Caching excerpts across requests. See design.md's Cost section for the per-request dedupe this
  change DOES do, and what is deliberately left for later if pin counts grow much past today's 13.
