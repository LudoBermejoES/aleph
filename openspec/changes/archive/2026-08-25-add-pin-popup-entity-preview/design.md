## Context

`getPinsWithEntity`/`getPinWithEntity` (`server/services/maps.ts`) already join a pin's linked
entity and return `entityImageUrl`/`entityType`/`entitySlug`, filtered by `withEntityVisibility` so
an entity the viewer cannot see contributes none of those fields — only the bare pin. Both
functions are synchronous today (plain `.get()`/`.all()` calls, no I/O).

`buildPinPopupHtml` (`app/utils/mapPinMarker.ts`) is a pure, framework-free function that hand-builds
an HTML string for Leaflet's `bindPopup`. Every interpolated field is escaped via this module's own
`escapeHtml` — closed by `improve-map-pin-markers-and-deletion` after `pin.label` went in unescaped
for a while.

The text itself lives in three different places depending on entity type (see proposal.md's table),
and is read by three different existing endpoints in three different ways:

- `locations/[slug].get.ts:81,100`: `safeReadEntityFile(entity.filePath)` (tolerates a missing
  file, returning a stub) → `stripSecretBlocks(file.content, role)`.
- `characters/[slug]/index.get.ts:83-88,125`: `readEntityFile(entity.filePath)` in a hand-rolled
  `try/catch` that falls back to an empty stub → `stripSecretBlocks(file.content, role)` →
  `autoLinkContent(...)`, which **emits HTML** (turns recognized entity names into `<a>` tags).
- `organizations/[slug]/index.get.ts`: no file read at all. `org.description` is returned as-is,
  with no secret-block handling anywhere in that route.

## Decisions

### D1. Read the file (or column) fresh per request; do not add a content cache

The pins endpoints already do one query per request; this change adds, at most, one file read per
_distinct_ linked location/character entity on the map (organizations need no file at all — their
text is already in the joined row). Rejected: pre-computing and storing an excerpt on write (in
`entities.boardSummary` or a new column). Two reasons, not one:

1. **A stored excerpt cannot vary by viewer role.** The whole point of this change is that a
   `dm`/`co_dm` viewer's excerpt and a player's excerpt of the SAME entity can legitimately differ
   (if the entity's first paragraph happens to be secret). A single stored string can only be one
   of those, and picking the harsher one always shows less than an authorized viewer should see;
   picking the laxer one is the exact leak this change exists to prevent.
2. The owner's brief flagged this directly: `boardSummary` exists, is empty on all 44 locations
   today, and "note a STORED summary could not vary by role, which is exactly what the secret rule
   requires, so do not 'fix' this by populating it."

### D2. Which read helper, per type, and why fault-isolation matters more here than at a single-entity page

`locations/[slug].get.ts` uses `safeReadEntityFile` (swallows a read error, returns `null`);
`characters/[slug]/index.get.ts` uses `readEntityFile` directly inside its own `try/catch`. Both
exist because a single-entity page is already scoped to ONE file — a hand-rolled fallback there
costs nothing extra.

The pins endpoint is different: it reads **N files in one response**, one per pinned
location/character. If entity #7's file has been deleted from disk but its DB row hasn't (a real,
recoverable inconsistency — nothing else in this codebase treats it as impossible) and that read
throws unguarded, the WHOLE map's pins fail, taking down entities #1-6's perfectly good excerpts
with it. So this change reuses `safeReadEntityFile` uniformly for both location and character reads
(not `readEntityFile` — a per-call `try/catch` around N reads is the same thing with more code), and
a missing file degrades to `entityExcerpt: null` for that one pin, no different from an entity with
no description at all.

### D3. Character text is read from BEFORE `autoLinkContent`, not from the endpoint's `content` field

`characters/[slug]/index.get.ts` returns `content: autoLinkContent(stripSecretBlocks(file.content,
role).trim())` — HTML, not plain text (recognized entity names become `<a href="...">` tags).
Reusing that shape naively would either print visible `<a href="...">` tags in the popup (if
escaped) or inject live markup into it (if not) — the exact "same field name, different contents"
trap this project has been bitten by before.

This change takes the excerpt from `stripSecretBlocks(file.content, role)` directly — the same
point in the pipeline `locations/[slug].get.ts` already stops at — and never calls `autoLinkContent`
at all. A two-sentence popup excerpt has no need for cross-entity hyperlinks; skipping `autoLink`
also means the flattener never has to un-render markup that function itself produced.

One consequence: this makes location and character excerpts go through the **identical** two-step
pipeline (`safeReadEntityFile` → `stripSecretBlocks` → flatten), so the implementation is one code
path parameterized by nothing except which of the two `entityType`s it's handling, not two similar
copies that can drift.

### D4. Organization text skips secret-stripping on purpose, but not the visibility gate

`organizations.description` has no secret-block convention anywhere in this codebase (grepped: not
one call to `stripSecretBlocks` in any organization route). Inventing one here would be
implementing a feature the owner didn't ask for, on a field format nothing else treats that way.

What it must NOT skip is the entity-level visibility check `withEntityVisibility` already applies to
`entityImageUrl`/`entityType`/`entitySlug`: an organization the viewer cannot see must contribute
`entityExcerpt: null` exactly like it already contributes no image. This is a plain visibility gate
on a column already present in the same joined row (`organizations.description`, added to
`selectJoinedPins`'s existing LEFT JOIN on `organizations` — no new join, no new query).

### D5. A pure flattener, order of operations, and where escaping happens

New module `server/services/text-excerpt.ts`, dependency-free like `mapPinMarker.ts` (no HTTP/DB):

```
buildExcerpt(source: string, maxLength = 200): string
```

Order, always: **strip secrets (caller's job, per-type) → flatten markdown to plain text (this
module's job) → truncate at a word boundary with an ellipsis**. Never the reverse — an excerpt taken
BEFORE stripping could truncate mid-secret-block and still leak the opening words of a secret
paragraph; a fixture whose first paragraph is a `:::secret{.dm}` block, tested for a `player` role,
is the regression test for this ordering specifically.

The flattener strips fenced/inline code, images (dropped, not kept as alt text), links (kept as
their visible text), literal HTML tags (defense in depth — organization descriptions are a free-text
column with no format contract), heading/blockquote/list markers, and emphasis markers, then
collapses whitespace to single spaces.

**Escaping is NOT this module's job.** `buildExcerpt` returns plain text that may still contain
`<`, `&`, `"` as ordinary characters (a location titled `Berghain <East>` is unlikely but not
impossible). `app/utils/mapPinMarker.ts`'s existing `escapeHtml` — the same function that already
escapes `label`/`entityId`/image URLs — is the single place responsible for making any interpolated
field HTML-safe, so the excerpt goes through it exactly like every other field in that popup.

### D6. Popup layout and `maxWidth`

`buildPinPopupHtml` gains two optional `PopupPin` fields, `entityImageUrl` and `entityExcerpt`
(the marker-building side of the module already has `entityImageUrl` on a separate `MarkerPin`
interface — the popup gets its own copy of the field on `PopupPin`, since the two interfaces already
diverge and forcing them to share one would couple marker-drawing to popup-drawing for no reason).

Rendered, in order: name → image (if present, `object-fit: cover` inside a fixed height, matching
the `cover`-not-`contain` rule `improve-map-pin-markers-and-deletion` D2 already established for the
marker) → excerpt paragraph (if present) → "Ver entidad" → explore hint → delete button. All
unchanged fields keep their existing order relative to each other.

The container's inline style keeps its existing `min-width` and gains a `max-width` (≈220px);
`MapViewer.client.vue`'s `marker.bindPopup(html, { maxWidth: ... })` call gains the matching Leaflet
option, because Leaflet's own popup sizing (default `maxWidth: 300`, and no width cap at all
without one) is what actually governs how wide the popup grows on screen — the container's CSS
`max-width` alone does not stop Leaflet's popup chrome from being sized to fit an oversized image.

## Cost

One pins request now does, at most, one file read per **distinct** `filePath` among the map's
location/character pins (organizations add zero — their text is already in the joined row, no I/O).
At today's scale (13 pins, all locations, each ~1KB of markdown) this is immaterial.

At 100 pins: worst case 100 concurrent local file reads if every pin points to a different
location/character entity. Two mitigations, both in this change, neither a cache:

1. **Per-request dedupe.** Two pins linked to the SAME entity (a location pinned twice on one map)
   share one read, via a `Map<filePath, Promise<string | null>>` keyed BEFORE the read starts (not
   after it resolves) — a synchronous check simultaneous with `Promise.all` cannot dedupe if pins
   are visited resolve-then-check.
2. **The excerpt is capped at 200 characters of OUTPUT, not of input** — the whole file is still
   read, but flattening/truncation is O(file size), which stays tiny (these are hand-written
   markdown pages, not book chapters).

Not done here, left for later if pin density genuinely grows past today's 13: reading only the first
N KB of a file instead of the whole thing, or a request-scoped cross-request cache keyed on
`(filePath, contentHash, role)`. Neither is needed yet and both add real complexity (the second
needs an invalidation story `boardSummary` already showed isn't free).

## Risks

- **`getPinsWithEntity`/`getPinWithEntity` become `async`.** Every call site
  (`maps/[slug]/index.get.ts`, `maps/[slug]/pins/index.get.ts`, `maps/[slug]/pins/index.post.ts`,
  `maps/[slug]/pins/[pinId]/index.patch.ts`) is already inside an async `defineEventHandler`, so
  this is an added `await`, not a handler restructure — but it is a breaking change to the
  function's own signature, and the existing unit tests in `maps-service.test.ts` call it
  synchronously and must be updated to `await` it in the same change, or they silently compare
  Promise objects instead of pin arrays.
- **A malformed/huge organization `description`** flattens and truncates like anything else — no
  new risk beyond what `buildExcerpt`'s truncation already handles, since there is no secret-marker
  syntax in that column to strip in the first place.
