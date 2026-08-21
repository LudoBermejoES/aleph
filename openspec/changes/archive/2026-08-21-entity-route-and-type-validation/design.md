## Context

A link the app renders on its own session page 404ed. The session _El maniquí en el armario_ relates
to the `lore` entity `la-vieja-del-maniqui`, and the relations panel linked it to
`/campaigns/<id>/lores/la-vieja-del-maniqui`, which is not a route.

## Goals / Non-Goals

**Goals:** every entity link resolves; a type the campaign does not declare cannot be written.

**Non-Goals:** dedicated pages for `event`, `note`, `lore`; retiring any type; touching the mapping
table.

## Decisions

### D1 — Use the helper that already existed, and change nothing else

`app/utils/entity-routes.ts` already exported `entityDetailPath()` with the right mapping and an
`entities` fallback, and `EntityPopover.vue` and `SearchCommand.vue` already used it.
`EntityRelationsPanel.vue` was the only place in `app/` building the segment as `${type}s`. So the
whole UI fix is one line plus an import. Diagnosing it as "the mapping is missing" — which the first
pass of this change did — would have led to adding rows that were actively wrong (D2).

### D2 — Do NOT map a type onto a page that lists a different kind of record

A first pass added `faction -> organizations` and `item -> items`, and the pre-existing test failed on
the second. Both were wrong for the same reason: `/items/` is the economy-items page and
`/organizations/` lists real organization records. A wiki entity of type `item` or `faction` is
neither, so those mappings would route it to a page that resolves only if some _other_ kind of record
happens to share its slug — a 404 that looks like a data problem instead of a routing one. The generic
view always works. `tests/unit/utils/entity-routes.test.ts` uses `item` as its canonical "type with no
dedicated page" precisely to pin this, and it did its job.

The general rule, now in the spec: sharing a name with a page is not evidence of sharing a record
kind with it.

### D3 — Validate the type at the point of entry

The CLI accepted any string for `--type`, which is how a `type: npc` entity came to exist in a
campaign whose registered set has no `npc`. One `GET /entity-types` before the POST removes the class,
and listing the valid set in the error makes the fix obvious. It degrades safely: if the server
reports no types, creation proceeds rather than being blocked.

### D4 — `exitCode`, not `process.exit()`, after an await

`process.exit(1)` in this new guard aborted the process with a libuv assertion and exit **127** on
Windows, because the entity-types socket was still open. The sibling guards in the same file exit
cleanly only because they run before any network call — which is why this was not visible from
copying their shape. `process.exitCode = 1` plus `return` lets node drain and exit 1.

### D5 — Model the pair as a character, not an entity

This campaign models NPCs as characters with `--type npc` (Elke Brandt, Falko Oesau), which get an
entity mirror of type `character` and live at `/characters/<slug>`. So the mis-typed
`los-dos-hombres-de-abrigo` entity was deleted and recreated as an NPC character. Side benefit: the
pair now appears in the character list with every other NPC instead of only in the entity index.

## Risks / Trade-offs

**[The fallback hides missing pages]** → It does, deliberately: a reader reaching a generic page that
renders the content correctly is strictly better than a 404. The new test asserts every _registered_
type lands somewhere real, so a future type that deserves its own page is a design choice rather than
a broken link.

**[Validation costs a request per entity create]** → One `GET` against a small table, on a command
that already does a POST. Cheap next to writing a record the UI cannot categorise.

**[Deleting and recreating the pair dropped its relations]** → Known and handled: both were recreated
in the same pass, verified by listing the session's relations afterwards.
