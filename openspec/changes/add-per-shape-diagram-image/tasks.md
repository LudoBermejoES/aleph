# Tasks

Two workstreams, **1 (server)** and **2 (client)**, are independent because the contract between
them is fixed here: `batch` returns `images: { id, url }[]` per entity. Do not renegotiate it.
Workstream 3 (e2e) needs both.

## 1. Server — the generic entity gallery and the batch contract

- [x] 1.1 Read `server/api/campaigns/[id]/characters/[slug]/images/` in full — all five files — and
      mirror them under `entities/[slug]/images/`. Mirror, do not refactor into a shared handler: the
      three existing sets differ in which sibling column they mirror the primary into, and unifying
      them is a bigger change this one must not smuggle in (design D6).
- [x] 1.2 The mirror target for a generic entity is `entities.image_url`, which the palette, the
      map pins and `batch` already read.
- [x] 1.3 The `isPrimary: true` promotion must be ONE transaction: clear every other, set the
      target, update `entities.image_url`. `isPrimary: false` on the current primary of a non-empty
      gallery is a 400.
- [x] 1.4 Enforce the roles the spec states (`player` to read, `editor` to write) and the `dm_only`
      rule. Check how the character set does it rather than inventing a second pattern.
- [x] 1.5 `diagrams/entities/batch.get.ts`: add `images: { id, url }[]` per entity, from
      `entity_images` ordered by `sortOrder`, under the SAME visibility filter that endpoint already
      applies (it filters `dm_only` already — read it, do not add a second mechanism).
- [x] 1.6 **Decide the pre-gallery image question with a measurement, not an assumption.** Objects
      today carry `entities.image_url` with no `entity_images` row. Count how many entities are in that
      state before choosing between backfilling a row and treating the column as an unlisted fallback.
      Record the count and the choice in `design.md`. Whichever you choose, an entity that had an image
      before this change MUST still show it afterwards.
- [x] 1.7 Integration tests: the five routes, the transactional promotion, the 400, the roles, the
      `dm_only` rule, and `batch` returning `images`. Assert **rows**, never that a key exists — the
      suite for this very endpoint already had a test that `expect(data).toHaveProperty('wiki')`
      satisfied with a permanently empty array.
- [x] 1.8 CLI: add `entity images | image-add | image-update | image-set-primary | image-remove`,
      mirroring the `character` commands (names verified against `--help`). Update BOTH skill files and
      bump the local skill's frontmatter `version`. Run the endpoint-parity check.

## 2. Client — the override, the hydration rule, the picker

- [ ] 2.1 Add `imageOverrideId?: string` to the shapes that display an image, in BOTH the
      `TLBaseShape` type and the `RecordProps` validator, as `T.optional(T.string)`, plus
      `getDefaultProps`. A REQUIRED prop rejects every existing snapshot — that is the trap.
      Shapes: `NPCTokenShape`, `EntityCardShape`, `LocationPinShape`, `FactionCardShape`, and check
      `MapTokenShape`/`GenealogyNodeShape`/`AnchorTokenShape` for an image prop before deciding.
- [ ] 2.2 `app/utils/diagram-shapes.ts`: carry `imageOverrideId` through `buildShapeCreateArgs`
      (undefined at drop time — a freshly dropped card shows the primary).
- [ ] 2.3 `app/utils/diagram-hydration.ts` — **the load-bearing change.** Resolve
      `imageOverrideId` against `data.images`; use the primary when it is unset or does not resolve.
      Today this file overwrites the image unconditionally, so without this the picker is reverted on
      every load and looks like a failed save.
- [ ] 2.4 Same file: set `crestUrl` on `factionCard`, by the same rule. It is the only type whose
      image hydration never refreshes.
- [ ] 2.5 `aleph:entity-preview`: add `shapeId` to the detail in every shape's `onDoubleClick`, and
      read it in `[diagramId].vue`'s listener. Without it the picker cannot say WHICH card.
- [ ] 2.6 `EntityPopover.vue`: show the gallery as thumbnails, mark the current one, emit the chosen
      id. Do not reach into the tldraw editor from here — the page owns the handle and every other
      shape write already goes through it (design D4).
- [ ] 2.7 `[diagramId].vue`: on that emit, `updateShapes` the one shape's `imageOverrideId`, and let
      the existing save path persist it.
- [ ] 2.8 No picker in read-only mode. Pass an explicit flag; do not rely on the
      `onAlephEntityPreview` read-only branch, since the popover is reachable from the entity panel too.
- [ ] 2.9 One image, or none: no picker, or a single already-selected thumbnail. Never an empty
      control that does nothing.
- [ ] 2.10 Mount `EntityImageGallery.vue` on the entity page (`entities/[slug]/{index,edit}.vue`)
      pointed at the new `imagesUrl`. It is already parameterised by URL — this is a mount, not a new
      component.
- [ ] 2.11 i18n in `i18n/locales/{en,es}.json` ONLY (the canonical dir per `CLAUDE.md`; `locales/`
      and `app/i18n/locales/` are stale duplicates).
- [ ] 2.12 Unit tests for the resolution rule as a pure function: override resolves; unset falls
      back; unresolvable id falls back; two shapes of one entity resolve independently.

## 3. E2E

- [ ] 3.1 Two cards of one entity on a canvas, one switched: assert they show different images, that
      a reload keeps it, and that the entity's primary did not change.
- [ ] 3.2 A deleted overridden image falls back to the primary and shows no broken image.
- [ ] 3.3 A read-only viewer is offered no picker.
- [ ] 3.4 An object gains a second photograph through the new gallery and is then switchable on a
      diagram — the owner's actual request, end to end.

## 4. Verification — and how NOT to fool yourself

Every one of these was measured on 2026-08-31 and each cost real time:

- [x] 4.1 **Mutation-check every new guard**: break the thing it covers and require RED. A test that
      stays green against the original bug is worthless; this repo has nine recorded instances of a test
      that asserted the bug.
- [x] 4.2 **`nuxt dev` does NOT hot-reload `server/api`.** A mutation check against a running server
      reported 15/15 GREEN twice and 6/15 RED after a restart. Restart between the edit and the run.
- [ ] 4.3 **The first Playwright run after a restart fails on cold page compilation**, whatever the
      code says. Warm the pages (`curl http://localhost:3333/register`) or discard the first run. Read
      WHICH LINE failed: a failure in the setup helper and one in the assertion look identical in the
      summary and mean opposite things.
- [x] 4.4 **Start the server as `STARTUP_BACKFILLS_ENABLED=false`** and wait on `/api/health`
      returning 200, never on the port. The boot goes `000 → 503 → 200`.
- [x] 4.5 **A red CLI integration suite on `/mnt/c` is usually the mount**: 4.8–8.0 s per CLI spawn
      against a 5000 ms timeout. Re-run a failing file ALONE before believing it.
- [x] 4.6 **CI's `test` job is `format:check` → eslint → unit, in that order**, and `deploy` sits
      behind it. Run `npm run format:check` before pushing; a green eslint says nothing about it.
- [x] 4.7 Full suites green (or every failure explained and reproduced as environmental), then
      report. Do NOT commit and do NOT push — hand back for review.
