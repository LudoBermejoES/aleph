## Context

`EntityRelationsPanel` + `useEntityRelations` + `RelationFormDialog` already back the character/organization/location detail pages. `useEntityRelations`'s `load()` function already branches generically on `entity.type` (only `'organization'` and `'location'` trigger extra fetches; anything else falls through to empty arrays for those groups while always fetching the generic `entity-relations` list), and `RelationFormDialog` already takes `sourceEntity.type` as a plain `string` with no closed union. Neither needed behavior changes — only the `EntityType` TypeScript union was too narrow.

While wiring the panel onto quest/session/arc pages and exercising "Add Relation" against them in a live E2E run, every submission failed with a 422 unless a relation type was explicitly chosen from the dropdown. Root cause: `RelationFormDialog.handleSave()` always sends `relationTypeId: form.relationTypeId || null` and `description: form.description || null` — explicit `null`, not an omitted key — but `POST /relations` and `PUT /relations/:id` validated those fields as `z.string().optional()`, which rejects `null`. This is unrelated to entity type and was already broken for character/organization/location; it just wasn't caught because no existing E2E test exercises the "no type selected" path all the way through completion (they were flagged flaky/failing independently for an unrelated Dialog `role` prop-forwarding issue on the delete-confirmation flow, which is out of scope here).

## Goals / Non-Goals

**Goals:**

- Relations become visible and manageable from quest, session, and arc detail pages.
- The "Add Relation" flow works when no relation type is picked (the common path, since forward/reverse labels are typically hand-typed).

**Non-Goals:**

- No change to `useEntityRelations`'s fetch logic or to `RelationFormDialog`'s UI — both are already generic.
- Not fixing the unrelated pre-existing `role="alertdialog"` prop-forwarding warning on the delete-confirmation dialog (breaks 3 already-existing E2E tests for character/org/location delete flows; tracked separately, does not block this change).
- Not building a mobile-specific layout for the panel — the existing panel markup is reused as-is.

## Decisions

- **Widen the type instead of adding a new prop or component.** `entityType` becomes `'character' | 'organization' | 'location' | 'quest' | 'session' | 'arc'` in both `useEntityRelations.ts` and `EntityRelationsPanel.vue`. Alternative considered: a separate lightweight panel for non-grouped entity types — rejected, since the existing panel already degrades correctly (only the generic `entityRelations` group renders) with zero logic changes.
- **Fix the schema, not the dialog.** `relationTypeId`/`description` become `z.string().nullable().optional()` on the two endpoints. Alternative considered: change `RelationFormDialog` to omit the keys instead of sending `null` — rejected because `null` is the more correct signal for "explicitly cleared" (matters for the PUT/edit path, where omitting a key means "leave unchanged" but sending `null` means "clear it"), and the POST endpoint's existing fallback logic (`if (!relationTypeId) { ...use campaign's custom type... }`) already treats `null` and `undefined` identically, so no other code path changes.
- **Placement mirrors the organization/location pattern** (a plain block on the page, not a tab), since quest/session/arc pages have no tab system, matching how organization/location already embed the panel directly.

## Risks / Trade-offs

- [Widening `EntityType` is a public composable/prop type used elsewhere] → Confirmed via `vue-tsc --noEmit` (full project typecheck, 0 errors) that no other call site assumed the narrower union.
- [Schema loosening could mask a client bug that should send a real value] → Scoped narrowly to `nullable()` (not `any`/`unknown`); a missing target entity or label is still rejected by existing required-field checks in the dialog and by `sourceEntityId`/`targetEntityId` still being required strings.

## Migration Plan

Standard deploy: merge, CI runs unit/integration/E2E, push to `master` triggers the existing GitHub Actions deploy to `aleph.ludobermejo.es`. No data migration — no schema/table changes, only Zod request-validation and frontend type/UI changes. Rollback is a plain revert.
