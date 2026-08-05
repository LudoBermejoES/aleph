## Context

This is the third time this codebase closes this exact gap — characters and organizations always had it solved; quests got it in `relatable-quests` (archived as `2026-08-05-relatable-quests`); this change applies the same, now-proven pattern to sessions and arcs. Read that change's design.md first; this one only records what differs.

The shared pattern: give a table's rows a mirror row in `entities` by reusing the table's own `id` as `entities.id` (the same trick `organizations` originated), instead of adding a new FK column. `autoLinkContent`/relation lookups/`GET /entities/:slug` all key off `entities.id`, so once a row exists there, `relation create/list/delete` work with zero changes to `relation.js`, `client.js`, or the relation API — this was verified for quests and there is no reason it would differ for sessions or arcs, since neither the CLI nor the relations endpoint has ever had type-specific logic.

Two things differ from the quest case and need their own decisions:

1. **Sessions name their own title field `title`, not `name`.** `game_sessions.title` maps to `entities.name` on the mirror row; there is no other naming mismatch.
2. **Arcs have neither `createdAt`/`updatedAt` nor a `logFilePath`.** Quests and sessions both write a markdown file per row (`resolveEntityPath` + `writeEntityFile`) and already track timestamps; arcs are pure DB rows — `arcs.description` is stored directly in the `arcs` table, no `.md` file exists per arc. This affects what the mirror entity's `filePath` and `createdAt`/`updatedAt` are populated with (see Decisions).

## Goals / Non-Goals

**Goals:**

- Session and arc slugs resolve through `GET /api/campaigns/:id/entities/:slug`, so `relation create/list/delete` work on them with zero CLI code changes.
- Existing sessions and arcs (all of them, across all campaigns — the backfill is not scoped to one campaign) get backfilled so they're immediately relatable without recreating anything.
- After deployment, the Berlín en Tinieblas campaign's sessions and arcs that have actual narrative content get their relations populated from that content (see Migration Plan — this is a content task, not a code task, and depends on the code + deploy steps completing first).

**Non-Goals:**

- Deprecating or changing `game_sessions.arcId`/`chapterId` (the existing session→arc/chapter assignment) or `arcs.subCampaignId`. Those are structural, single-valued FKs; relations are the separate, many-to-many, custom-labeled graph layer, exactly as `parentQuestId` and quest relations coexist today.
- Rendering session/arc nodes in the entity-graph visualization (`graph.vue`). Same deferred open question as quests and arcs-autolink; not required for relation support to work.
- Populating relations for every campaign. The content-population pass (see Migration Plan) is scoped to Berlín en Tinieblas because that is the only campaign with individually-authored session summaries/notes and arc descriptions rich enough to extract real relations from — the other three campaigns (Arcadia, Kult, Kingmaker) were not part of this request and have not been surveyed for content quality. A future change can extend the pass if wanted.

## Decisions

### Decision: mirror both `game_sessions` and `arcs` using the shared-id pattern, no new columns

Same as quests: `game_sessions.id === entities.id` and `arcs.id === entities.id` for their respective mirror rows. No schema migration for either table.

### Decision: one shared slug per row, assigned via `ensureUniqueSlug`

Same as quests' Decision 3: `sessions/index.post.ts` and `arcs/index.post.ts` currently do bare `slugify()` with no collision check — a pre-existing gap, not introduced here — and switching both to `ensureUniqueSlug(db, campaignId, name)` fixes that gap and gives the campaign-wide uniqueness the entities table requires, in one move. Renames (`PUT`) do not change the slug (matches every existing entity type — slugs are assigned once, at creation).

### Decision: mirror entity `filePath` for arcs is `''`, not a real file

Quests and sessions have a real `.md` file to point `entities.filePath` at (`entities.filePath` is `NOT NULL`). Arcs don't. `organizations` already established the precedent for entity types with no backing file (`filePath: ''` in `createOrganizationWithEntity`) — arcs follow that precedent exactly.

### Decision: mirror entity `createdAt`/`updatedAt` for arcs use `new Date()`, not a copied value

Quests and sessions both already have `createdAt`/`updatedAt` columns to copy onto their mirror row at backfill time. Arcs have neither. The backfill and the create endpoint both stamp the arc's mirror entity with the current time — this is a cosmetic inaccuracy for backfilled arcs (their mirror entity's `createdAt` will read as "whenever this change was deployed," not the arc's real creation time, which was never recorded), not a functional one; nothing depends on an arc's `entities.createdAt` being historically accurate, and no other column exists to source it from.

### Decision: `entities.type` values are `'session'` (already seeded) and `'arc'` (not seeded, added as a new built-in type)

`server/services/entity-types.ts`'s `BUILTIN_TYPES` already includes `{ slug: 'session', ... }` — sessions were, like quests, clearly meant to be first-class entities from early on. Arcs have no entry. Adding one (`{ slug: 'arc', name: 'Arc', icon: 'book', sortOrder: 10 }` or similar) is low-risk — `entity_types` is a per-campaign UI-affordance list (which types show up in the generic "create entity" picker and its icon), not a constraint on the `entities.type` column itself (that column is a plain, unconstrained `text`, same as it was for `quest` before this precedent existed). Adding the row is optional for relations to function but keeps the type taxonomy honest and consistent with how quests were treated.
_Alternative considered_: skip seeding `arc` in `entity_types` since nothing strictly requires it. Rejected — it's a two-line addition and leaves `entities.type = 'arc'` rows appearing with no icon/label wherever `entity_types` is consulted (e.g. a generic "browse by type" filter), a small but pointless inconsistency to leave behind.

### Decision: no new query needed for CLI/relation verification — same finding as quests, re-confirmed rather than assumed

`relation.js`'s `resolveEntitySlug` and the relations API's validation are 100% generic (re-checked in this change, not just carried over from the quest finding, since it would be easy for a future refactor to have added type-specific logic in between). No changes needed there; verified live during implementation (see tasks.md Verification section).

## Risks / Trade-offs

- **[Risk] Sessions are far more numerous than quests were** (the Berlín en Tinieblas campaign alone has ~88 sessions vs. the 9 quests the last change backfilled) — the backfill's per-row collision check (`ensureUniqueSlug`-equivalent) runs once per row at boot. → **Mitigation**: this is O(n) work at boot, not per-request; the quest backfill's own empirical test (231 pre-existing quests in the local dev DB, `migrated: 231` in a single boot) showed this scales fine at this order of magnitude. No further mitigation needed.
- **[Risk] The content-population pass is manual judgment, not mechanical** — deciding "does this session/arc actually mention this character/location" requires reading prose, unlike the code changes which are mechanical and testable. → **Mitigation, revised during implementation**: rather than reading all 88 sessions by hand, the pass reused the server's own auto-link detection (`autoLinkContent`, the same mechanism `arc-autolink` wired into arc/chapter descriptions) as the mention-extraction step — every `:entity-link{...}` already present in a session's rendered summary/notes or an arc's rendered description is a text match the system itself considers a reference, computed once and read back via the API rather than re-derived by eye. This turns "does this session mention X" from a judgment call into a mechanical query, at the cost of inheriting the auto-linker's own false-positive risk (a name that's also a common word) — mitigated by a mandatory dry run, a sample review, and excluding confirmed-bad matches before any relation was created live (see tasks.md 9.5 for the specific false positives found and excluded: a character and an organization whose names doubled as ordinary Spanish words, and — more broadly — every `session`-type match, since session titles in this campaign are frequently narrative phrases/creature names/epithets that recur in unrelated prose).
- **[Risk] Over-creating relations** — a careless pass could create a relation for every passing mention, producing graph noise rather than a signal. → **Mitigation**: apply the same bar already used earlier in this project for character/NPC creation ("worth creating if it could plausibly come up again," not "every name that appears once") — a session/arc gets a relation to an entity when that entity is a meaningful participant in what happened, not for incidental namedrops.
- **[Risk, discovered during implementation] Giving arcs a unique slug makes an existing, spec'd 409-disambiguation scenario unreachable through the API.** `openspec/specs/session-management/spec.md`'s "Ambiguous arc slug returns 409" scenario explicitly depends on being able to create two arcs sharing a slug ("which the schema permits because `arcs` has no unique constraint on `(campaignId, slug)`") — true at the schema level before _and_ after this change, since no migration adds that constraint. But `ensureUniqueSlug` at the application level now prevents the create endpoint from ever producing that duplicate, so an integration test can no longer construct the precondition without a raw DB insert. Two existing tests in `tests/integration/session-arc-slug.test.ts` asserted the old contract (`expect(t1.slug).toBe(t2.slug)`) and failed once this change landed — not a flake, a direct consequence of the fix. → **Mitigation**: the 409-disambiguation code in `resolveArcChapterSlugs` is untouched and still correct for any arc rows that predate this fix (or reach duplicate slugs by some other means); only the two tests were updated, to assert the new behavior (distinct, individually-resolvable slugs) instead of the now-unreachable-via-API ambiguous case. The live spec's scenario text is left as-is since it remains literally true at the schema level — this is a narrower, practical note, not a requirement violation.

## Migration Plan

1. Schema: none. Add the `arc` row to `BUILTIN_TYPES` in `entity-types.ts` (affects newly-created campaigns' seed data only — existing campaigns get it via a small backfill alongside the entity backfill, or it's simply absent for them, which is harmless since `entity_types` is UI-affordance-only).
2. Code: update `sessions/index.post.ts`, `sessions/[slug]/index.put.ts`, `sessions/[slug]/index.delete.ts`, `arcs/index.post.ts`, `arcs/[slug]/index.put.ts`, `arcs/[slug]/index.delete.ts` per the decisions above. Add `server/db/backfills/session-entities.ts` and `server/db/backfills/arc-entities.ts` (or one combined file — implementation's call), wired into `server/plugins/migrations.ts`.
3. Tests: unit (backfill logic, slug de-duplication) + integration (creation registers mirror entity, relation create/list/delete succeeds for session-to-session, session-to-arc, session-to-character, etc., rename syncs the mirror entity, delete cascades relations), mirroring `relatable-quests`' test suite structure.
4. **Deploy**: commit, push to `master` (triggers the existing GitHub Actions deploy workflow), then verify against the live server (`aleph.ludobermejo.es`) that the boot-time backfill actually ran — e.g. `entity show <some-existing-session-slug>` should resolve where it previously would have 404'd.
5. **Populate relations from existing content** (Berlín en Tinieblas only, after step 4 confirms the backfill is live):
   - For each session that has a `summary`, `manual_notes`, or `ai_notes` content record (not every session does — many of the 86 historical sessions only exist as rows referenced by arc-level summaries in `sesiones/berlin_en_tinieblas/arcs/*.md`, with no per-session content of their own in Aleph): read that content, identify the characters/locations/organizations/quests it actually depicts as present or central, and `relation create` the session to each, with a short forward/reverse label describing the connection (e.g. "tuvo lugar en" / "fue escenario de" for a location; "participó en" / "contó con" for a character).
   - For each arc that has a non-trivial `description` (all 12 in the repo's `sesiones/berlin_en_tinieblas/arcs/*.md` do): same process, using the arc's description as the source text.
   - Skip sessions/arcs with no real content to read (an empty or placeholder description/summary) — there is nothing to extract a relation from, and inventing one would violate the "verify before proposing" standard this project already holds itself to.
   - This step is expected to create on the order of a few hundred relations across ~88 sessions and 12 arcs; exact count depends on how much each session/arc's content actually names.

Rollback: reverting the code diff removes the mirror-entity behavior for new rows; existing mirror rows and any relations created during the population pass are untouched by a revert (they're just `entities`/`entity_relations` rows like any other) and remain valid — a rollback does not need to undo the content-population pass.

## Open Questions

- **Should the entity-graph visualization eventually render session/arc nodes?** Same deferred question as the quest and arc-autolink changes; not required here.
- **Should the content-population pass extend to Arcadia, Kult, and Kingmaker later?** Out of scope for this change (see Non-Goals); a natural follow-up once someone wants it.
