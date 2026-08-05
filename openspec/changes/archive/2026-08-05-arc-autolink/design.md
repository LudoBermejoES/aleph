## Context

`autoLinkContent(content, campaignId, currentEntityId, db)` (`server/services/autolink-render.ts`) builds an Aho-Corasick automaton from every entity's name, aliases, and DB-backed nicknames in a campaign, matches whole words case-insensitively, and rewrites matches into `:entity-link{slug="..." name="..." type="..."}` directives. Every existing call site passes a real `entities.id` as `currentEntityId`:

- `sessions/[slug]/render.get.ts` → `session.id` (sessions have a mirror row in `entities`)
- `characters/[slug]/index.get.ts` → `entity.id`
- `entities/[slug]/index.get.ts` and `render.get.ts` → `entity.id`

`currentEntityId` is used for exactly one thing, read directly from the function body:

```ts
if (currentEntityId) {
  matches = matches.filter((m) => m.entityId !== currentEntityId)
}
```

`matches[].entityId` is always drawn from `allEntities`, which is queried straight from the `entities` table for the campaign. So `currentEntityId` only ever does useful work when it equals a real `entities.id` — its sole purpose is "don't let this entity's own name link to itself."

Arcs (`arcs/index.get.ts`) have no row in `entities`. Quests recently gained one (`quests.id === entities.id`, a mirror row created in `quests/index.post.ts` and kept in sync in `quests/[slug]/index.put.ts`), but arcs were not given the same treatment and doing so is a materially bigger change (new mirror-row lifecycle, insert/update/delete sync, migration considerations) than "wire an existing render function into a read path."

## Goals / Non-Goals

**Goals:**

- Call `autoLinkContent` on `arc.description` and each `chapter.description` in `arcs/index.get.ts`, after `stripSecretBlocks`, so entity names/aliases/nicknames written in arc or chapter narrative text become clickable links, matching session/character/entity content.
- Cover chapters in the same pass as arcs, in this same change.

**Non-Goals:**

- Mirroring arcs (or chapters) into the `entities` table so they can be linked _to_, or so they have a "real" self id. That is the same pattern used for quests, but it's a data-model change with its own lifecycle/migration concerns and is out of scope for what is meant to be a narrow read-path fix. Flagged below as an open question for a possible future change.
- Any change to the auto-link algorithm, automaton, or exclusion-zone logic itself.
- Any new API endpoint, render/preview endpoint, or frontend template change (the existing `<MDC>` render path already consumes whatever `arcs/index.get.ts` returns).

## Decisions

### Decision: pass `null` for `currentEntityId` when auto-linking arc/chapter descriptions

Since arcs and chapters have no row in `entities`, there is no real id to exclude self-matches with. `autoLinkContent` already treats a falsy `currentEntityId` as "no self-exclusion" (`if (currentEntityId) { ... }`), which is exactly correct here: an arc or chapter can never be the target of one of its own auto-links (it isn't in the automaton at all, since the automaton is built purely from `entities` rows), so there is nothing to exclude in the first place. `null` says this plainly.

**Alternative considered: pass `arc.id` (or `chapter.id`) instead of `null`.** This would also work, for a subtler reason worth recording: `matches[].entityId` values only ever come from `allEntities`, i.e. real `entities.id` values. `arcs.id` and `chapters.id` live in a different table/id-space and — barring an id collision, which UUIDs make practically impossible — can never equal any `entities.id`. So `matches.filter(m => m.entityId !== arc.id)` would filter out zero matches, identical in effect to passing `null`. Rejected in favor of `null` because it is honest about intent ("there is no self entity here") rather than relying on a non-obvious "this id happens to never match" argument that a future reader would have to re-derive from the filter's implementation.

### Decision: chapters are in scope, not a follow-up

Chapter descriptions are returned by the same `arcs/index.get.ts` handler, already go through the identical `stripSecretBlocks`-but-no-`autoLinkContent` gap, and render through the identical `<MDC :value="chapter.description" />` pattern on the same arc detail page (`app/pages/campaigns/[id]/arcs/[slug]/index.vue`). There is no reason to treat them separately — doing so would leave half the same page's narrative text unlinked for no benefit. Both are fixed in the same endpoint edit.

### Decision: no new render/preview endpoint

Unlike sessions, arcs have no dedicated `render.get.ts` and the arc detail page's `MarkdownEditor` (`app/components/MarkdownEditor.client.vue`) has no live-rendered preview pane while editing — it shows raw markdown source only, and the rendered `<MDC>` view is shown solely in the non-editing view, sourced from `arcs/index.get.ts`. Fixing that one endpoint therefore fixes every place arc/chapter descriptions are rendered today. No new endpoint or preview wiring is needed.

## Risks / Trade-offs

- **Extra queries per arcs-list request — measured, and mitigated within this change.** The original plan (see prior revision of this section) was to accept the same N+1-per-request cost the session/entity endpoints already have, on the theory that arc/chapter counts per campaign are small. Implementation proved that wrong empirically: a controlled A/B run of `tests/integration/cli/session-arc.test.ts` (which exercises `GET /arcs` repeatedly against a campaign accumulating arcs and chapters) showed the endpoint's total test time roughly **doubling** (~20s → ~40s) once `autoLinkContent` was wired in, one call per arc description plus one per chapter description, each re-querying all campaign entities/nicknames and rebuilding the automaton from scratch. Unlike session/character/entity endpoints, which render exactly one content field per request, `arcs/index.get.ts` renders `1 + N_chapters` fields per arc across potentially several arcs in one response — the N+1 shape compounds within a single request here in a way it doesn't elsewhere.
  **Mitigation implemented**: split `autoLinkContent` into `buildAutolinkContext(campaignId, db)` (the DB query + automaton build) and `applyAutolink(content, currentEntityId, context)` (the pure matching/rewrite step), keeping `autoLinkContent` itself as a thin wrapper calling both — so every other existing call site is unaffected. `arcs/index.get.ts` now calls `buildAutolinkContext` once per request and reuses the result across every arc and chapter description. Re-ran the same A/B comparison after this change: 3/3 clean runs at 10-22s, matching the pre-auto-link baseline — the regression is gone.
- **`stripSecretBlocks` must run before `autoLinkContent`, not after** — reversing the order could auto-link text that a DM-only secret block should have hidden from a lower-role viewer, or link text inside a block that gets stripped anyway (wasted work, not a correctness bug, but still ordered after to match every existing call site's convention). → Mitigated by explicitly ordering `autoLinkContent(stripSecretBlocks(text, role), campaignId, null, db)`, matching the existing pattern in `entities/[slug]/index.get.ts`.

## Migration Plan

No DB migration. Deploy is a single server-side code change to `arcs/index.get.ts`; takes effect on next request, no rollback complexity (revert the diff to restore prior behavior).

## Open Questions

- **Should arcs (and/or chapters) eventually get a mirror row in `entities`, the way quests recently did?** That would let other content link _to_ an arc (`:entity-link{slug="act-i"}`) and give a "real" self id for symmetry with other call sites. This is explicitly out of scope here — the user asked to close the auto-linking gap, not to fold arcs into the entity graph — but is worth a future proposal if arc-to-arc or arc-to-entity cross-linking becomes a desired feature.
