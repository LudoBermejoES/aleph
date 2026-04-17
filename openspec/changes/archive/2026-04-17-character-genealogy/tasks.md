## 1. Data model & migration

- [x] 1.1 Add `birthYear` (integer, nullable), `deathYear` (integer, nullable), `gender` (text, nullable) columns to `server/db/schema/characters.ts` in the Drizzle schema.
- [x] 1.2 Generate a Drizzle migration in `server/db/migrations/` that adds the three columns to `characters` (all nullable, no default).
- [x] 1.3 Add a second migration (same change set) that seeds three builtin rows in `relationTypes` per existing campaign — `parent_of`, `spouse_of`, `sibling_of` — using `ON CONFLICT (campaign_id, slug) DO UPDATE SET is_builtin = 1` so pre-existing user rows get promoted rather than overwritten.
- [x] 1.4 Update the campaign-creation code path (seed/bootstrap in `server/services/` or wherever new campaigns get their initial relation types) so newly created campaigns get the three builtin family types automatically.
- [x] 1.5 **Unit test** (`tests/unit/db/characters-schema.spec.ts`): assert the three new columns exist, are nullable, and an inserted row with all three set round-trips through Drizzle correctly.
- [x] 1.6 **Integration test** (`tests/integration/migrations/family-relation-types.spec.ts`): spin up a DB, run migrations, create two campaigns (one pre-migration via raw insert, one post-migration via the creation code path), and assert both campaigns end up with the three builtin family relation types flagged `isBuiltin=true`.

## 2. Genealogy service module

- [x] 2.1 Create `server/services/genealogy.ts` exposing pure functions: `canonicalizeSymmetricPair(a, b)`, `detectCycle(parentEntityId, childEntityId, db)`, `validateYearCoherence(parent, child)`, `buildTree(focusCharacter, depth, db)`, `layoutTree(nodes, edges)` (returns nodes with `x`, `y`, `generation`).
- [x] 2.2 Implement `buildTree`: BFS up through `parent_of` edges, down through reverse `parent_of` edges, lateral through `spouse_of` edges, cap at configurable depth (default 3, hard cap 10).
- [x] 2.3 Implement `layoutTree`: layered Walker-style; spouse pairs treated as a single super-node; deterministic ordering by birthYear ascending (nulls last), then slug ascending; row height and node-width constants exported.
- [x] 2.4 **Unit test** (`tests/unit/services/genealogy-layout.spec.ts`): given a hand-built graph, assert parent is centered above children, spouse pairs are adjacent, generations are correct, layout is deterministic across repeated calls, and tie-breaking matches the spec.
- [x] 2.5 **Unit test** (`tests/unit/services/genealogy-validation.spec.ts`): cover `detectCycle` (direct, transitive, self, bounded depth), `validateYearCoherence` (hard reject vs soft warn cases), `canonicalizeSymmetricPair`.
- [x] 2.6 **Unit test** (`tests/unit/services/genealogy-traversal.spec.ts`): given seeded relations, assert `buildTree` returns the expected nodes and edges for various `depth` values and stops at the hard cap of 10.

## 3. Server API — character demographic fields

- [x] 3.1 Update the `PUT /api/campaigns/[id]/characters/[slug]` handler to accept `birthYear`, `deathYear`, `gender` in the body, with server-side lowercase+trim on `gender` and partial-update semantics (omitted keys untouched, explicit `null` nulls out).
- [x] 3.2 Enforce the hard-reject rule: reject if both years present and `deathYear < birthYear` (return 400 with a clear error code).
- [x] 3.3 Update `GET /api/campaigns/[id]/characters/[slug]` response and the list endpoint to include the three new fields.
- [x] 3.4 **Integration test** (`tests/integration/api/character-demographics.spec.ts`): authenticated PUT updates the three fields; omitted keys preserve state; explicit null clears; invalid year pair returns 400; unauthenticated PUT returns 401.

## 4. Server API — family link endpoints

- [x] 4.1 Create `server/api/campaigns/[id]/characters/[slug]/family/index.post.ts` that wraps `entityRelations` insert; resolves the builtin relation type by slug; normalizes `type: 'child'` into a `parent_of` row with swapped source/target; canonicalizes symmetric pairs; runs validation (self-link, non-character end, cross-campaign, duplicate, cycle, year coherence).
- [x] 4.2 Create `server/api/campaigns/[id]/characters/[slug]/family/[relationId].delete.ts`.
- [x] 4.3 Return soft warnings in the POST response `warnings: string[]` for year anomalies.
- [x] 4.4 Ensure cascading delete still works (it should — `entityRelations` already cascades on `entities.id`).
- [x] 4.5 **Integration test** (`tests/integration/api/character-family.spec.ts`): create four characters, exercise all four `type` values, assert single-row storage for symmetric types, assert cycle rejection (direct + transitive), duplicate rejection, self-link rejection, non-character rejection, cross-campaign 404, unauthenticated 401, year-coherence warning in response, and cascade cleanup on character delete.

## 5. Server API — genealogy endpoint

- [x] 5.1 Create `server/api/campaigns/[id]/characters/[slug]/genealogy.get.ts` that calls `buildTree` + `layoutTree`, accepts `depth` query param (default 3, cap 10, reject invalid), returns `{ focus, nodes, edges, warnings }`.
- [x] 5.2 **Integration test** (`tests/integration/api/genealogy-endpoint.spec.ts`): build a four-generation fixture with spouses and siblings; assert node/edge shape, generation numbers, spouse adjacency, depth cap behavior, invalid-depth 400, unknown-slug 404, unauthenticated 401, empty-tree response for a lone character, and deterministic output across two successive calls.

## 6. Frontend — character edit form demographic inputs

- [x] 6.1 Add `birthYear`, `deathYear`, `gender` fields to the character edit/create form (Vue component under `app/components/characters/` or wherever the form lives). Use shadcn-vue inputs; number inputs for years, select-with-free-text for gender.
- [x] 6.2 Wire the form to the updated PUT endpoint.
- [x] 6.3 **Unit test** (`tests/unit/components/character-edit-form.spec.ts`) using Vitest + Vue Test Utils: assert the three fields render, bind to the model, and submit correctly; assert empty inputs send `null` not `undefined`.

## 7. Frontend — `GenealogyNodeShape` tldraw util

- [x] 7.1 Create `app/components/diagrams/react/shapes/GenealogyNodeShape.tsx` modeled on `NPCTokenShape`; render name, year label (`"YYYY"`, `"YYYY–ZZZZ"`, or no label), portrait or placeholder, and background color derived from `gender` (male→blue, female→pink, else→gray).
- [x] 7.2 Register the shape util with `TldrawWrapper.tsx` for the new page.
- [x] 7.3 **Unit test** (`tests/unit/shapes/genealogy-node-shape.spec.ts`): exercise the year-label formatter (`formatYearLabel(birthYear, deathYear)`) and gender-to-color mapping as pure functions.

## 8. Frontend — genealogy page

- [x] 8.1 Create `app/pages/campaigns/[id]/characters/[slug]/genealogy.vue`. On mount, fetch `/genealogy?depth=3`, hydrate a tldraw snapshot from the server-layout payload, register the `GenealogyNodeShape` and `RelationshipArrowShape`, and render.
- [x] 8.2 Persist the snapshot using the existing tldraw snapshot persistence mechanism (mirror the pattern used in other canvas pages).
- [x] 8.3 Add a "Recompute layout" button that re-queries the endpoint and overwrites the stored snapshot after a confirmation dialog.
- [x] 8.4 Add a "View genealogy" button on the character detail page linking to the new route.
- [x] 8.5 **E2E test** (`tests/e2e/character-genealogy.spec.ts`): log in → create three characters (Agnus, Zen, Ben) via the UI or API → add `parent_of` Zen→Agnus and Agnus→Ben via the CLI or API helper → navigate from Agnus's character page to `/genealogy` → assert the tldraw canvas renders three nodes, Zen above Agnus and Ben below, and the expected connectors exist.
- [x] 8.6 **E2E test** (same file, second scenario): edit Agnus's `birthYear` and `deathYear` in the edit form → return to the genealogy page → assert the Agnus node displays the year range.
- [x] 8.7 **E2E test** (same file, third scenario): click "Recompute layout" on a manually repositioned snapshot, confirm, and assert that Agnus's node position returns to the server-computed coordinates.

## 9. i18n

- [x] 9.1 Add `characters.genealogy.*` keys to `i18n/locales/en.json` and `i18n/locales/es.json`: `title`, `viewButton`, `recomputeLayout`, `recomputeConfirm`, `depthLabel`, `emptyState`, `warnings.parentYoungerThanChild`, `warnings.parentDiedBeforeChildBirth`.
- [x] 9.2 Add `characters.family.*` keys to the same two files: `addLink`, `removeLink`, `types.parent`, `types.child`, `types.spouse`, `types.sibling`, `errors.cycle`, `errors.selfLink`, `errors.duplicate`, `errors.nonCharacterEnd`, `errors.crossCampaign`.
- [x] 9.3 Add `characters.demographics.*` keys: `birthYear`, `deathYear`, `gender`, `genderPresets.male`, `genderPresets.female`, `genderPresets.nonbinary`, `genderPresets.unknown`.
- [x] 9.4 Confirm via `rg` / Grep that no new keys were added to the stale `locales/` or `app/i18n/locales/` directories.

## 10. aleph-cli

- [x] 10.1 Extend `cli/src/commands/character.js` `update` subcommand with `--birth-year`, `--death-year`, `--gender` flags; omitted flags must not be sent; `--death-year ""` translates to `null` in the PUT body.
- [x] 10.2 Add `cli/src/commands/character.js` `family-add` subcommand with `--type` (parent|child|spouse|sibling) and `--target` flags, wired to `POST .../family`.
- [x] 10.3 Add `family-remove` subcommand with `--relation-id` flag, wired to `DELETE .../family/[relationId]`.
- [x] 10.4 Add `genealogy` subcommand with `--depth` and `--format json|ascii` flags; implement an ASCII renderer that indents by generation and joins spouse pairs on the same line with `=`.
- [x] 10.5 Add helpers in `cli/src/lib/client.js` for the new endpoints if needed.
- [x] 10.6 Update `docs/claude-skill.md` with the new commands and flags.
- [x] 10.7 Update `.claude/skills/aleph-cli/SKILL.md` with identical content for the new commands and bump the frontmatter `version`.
- [x] 10.8 **Unit test** (`tests/unit/cli/character-family.spec.js`): test the new command argument parsers and the ASCII tree renderer as pure functions.
- [x] 10.9 **Integration test** (`tests/integration/cli/character-family.spec.js`): spawn the CLI against the running server on port 3333, run `family-add`, `family-remove`, `genealogy` (both formats), and `update --birth-year`; assert exit codes, stdout contents, and resulting server state.

## 11. Documentation & wrap-up

- [x] 11.1 Add a short "Genealogies" section to the relevant README or docs page describing how to set birthYear/deathYear/gender, add family links, and view the tree.
- [x] 11.2 Run the full test suite: `npx vitest run tests/unit/`, `npx vitest run tests/integration/` (with the server running on port 3333), `npx playwright test`. All green before archiving.
- [x] 11.3 Self-review: re-read the proposal, confirm every spec requirement is covered by at least one task, confirm every task touching the server API has a matching integration test and every user-facing change has an E2E test.
- [x] 11.4 Prepare for `/opsx:archive` — ensure no tasks are left unchecked.
