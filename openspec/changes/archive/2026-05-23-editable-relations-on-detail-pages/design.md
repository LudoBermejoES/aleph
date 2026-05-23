## Context

Aleph currently stores all entity-to-entity links in the `relations` table (typed, bidirectional, with attitude + description), plus two specialized tables for membership (`organization_members`) and location links (`location_inhabitants`, `location_organizations`).

Today, the only way to **create, edit or delete** these links is:

- The `/campaigns/[id]/relations/new` page (entry + `RelationForm.vue`)
- The `/campaigns/[id]/relations/[id]/edit` page (full editor)
- The tldraw diagram's `RelationshipDialog.vue` (limited to "add", handles the 4 modes: entity-relation, org-member, char-location, org-location)
- Inline add/remove of org members and location inhabitants/orgs on their respective detail pages — but with no edit and no metadata

The relations data layer (`server/services/relations.ts` + endpoints) and the relation form fields (`RelationForm.vue`) are already feature-complete. The gap is purely UI surface area on the three detail pages plus two new PATCH endpoints for member-role and link-metadata inline edits.

Affected files (read for context before implementing):

- `app/pages/campaigns/[id]/characters/[slug]/index.vue`
- `app/pages/campaigns/[id]/organizations/[slug]/index.vue`
- `app/pages/campaigns/[id]/locations/[slug]/index.vue`
- `app/components/diagrams/RelationshipDialog.vue` (reference for the 4-mode logic)
- `app/components/forms/RelationForm.vue` (reusable form fields)
- `server/api/campaigns/[id]/relations/**`
- `server/api/campaigns/[id]/organizations/[slug]/members/**`
- `server/api/campaigns/[id]/locations/[slug]/{organizations,inhabitants}/**`

## Goals / Non-Goals

**Goals:**

- Allow users to **add, edit and delete** any relation involving the current entity directly from its detail page, without navigation.
- Make member roles and location-link metadata editable inline.
- Reuse existing relation services, endpoints, and validation — no new data model.
- Keep the diagram and `/relations/*` pages working unchanged (parallel surfaces, not a replacement).
- Maintain role-based access: only `editor+` can mutate; `player`/`visitor` see read-only.

**Non-Goals:**

- Redesign the diagram canvas or its `RelationshipDialog`. The diagram remains the primary visual editor.
- Migrate `/relations/new` and `/relations/[id]/edit` into modals or remove them. Power users may still prefer the dedicated pages.
- New relation types or semantics. The set of built-in types stays as-is.
- Bulk-edit or multi-select operations (out of scope; one relation at a time).
- Real-time presence updates inside the panel (the detail pages don't have Hocuspocus presence today; refresh after mutation is acceptable).

## Decisions

### 1. Single shared `EntityRelationsPanel.vue` component

**Decision:** Build one panel component used by all three detail pages, parameterized by the source entity (`{ id, slug, type: 'character' | 'organization' | 'location', name }`). The panel internally groups relations by category (entity-relation, org-member, char-location, org-location) and shows them with the right action set.

**Alternatives considered:**

- Three separate panels per page — rejected. Most logic (list + add + edit + delete) is identical; divergence would lead to drift.
- Render directly inline per page — rejected. Same drift risk; the panel needs to manage dialogs and refetch logic.

### 2. Dialogs reuse `RelationForm.vue`, not `RelationshipDialog.vue`

**Decision:** Add a thin `RelationFormDialog.vue` that wraps the existing `RelationForm.vue` (already used by `/relations/new` and `/relations/[id]/edit`). The detail-page panel opens this dialog for add and edit.

**Why:** `RelationForm.vue` already implements all field validation, type pickers, attitude slider, and label auto-fill. `RelationshipDialog.vue` is diagram-specific (handles canvas selection, presence, shape creation) and shouldn't be coupled to detail-page flows.

**Alternatives considered:**

- Extend `RelationshipDialog.vue` to cover both flows — rejected. The diagram dialog has canvas-side responsibilities (shape creation, presence) that don't belong on detail pages.
- Build a brand-new form — rejected. Duplicates `RelationForm.vue`.

### 3. New PATCH endpoints for member role and link metadata

**Decision:** Add three new endpoints, each thin wrappers over the existing services:

- `PATCH /api/campaigns/:id/organizations/:slug/members/:characterId` — body `{ role?: string }`
- `PATCH /api/campaigns/:id/locations/:slug/inhabitants/:characterId` — body `{ description?: string }`
- `PATCH /api/campaigns/:id/locations/:slug/organizations/:organizationId` — body `{ description?: string }`

All require `editor+` role (matching the existing POST/DELETE counterparts).

**Why:** The current API surface only has POST (add) and DELETE (remove) for these links. Inline edit requires a partial update.

**Alternatives considered:**

- Reuse PUT with full body — rejected. PUT semantics require sending the whole representation; clients would need to re-fetch first.
- Force users to delete + re-add — current state, explicitly rejected by the proposal.

### 4. Refetch instead of optimistic UI

**Decision:** After a successful add/edit/delete, the panel refetches the relations list for the entity (single GET call) and re-renders. No optimistic update.

**Why:** Relations involve cross-cutting effects (e.g. creating a `member_of` relation also affects the org's member list). Optimistic UI would have to mirror server logic; refetching keeps the client thin and correct.

**Trade-off:** One extra round-trip per mutation. Acceptable — these are low-frequency edit actions, not high-throughput.

### 5. CLI parity

**Decision:** Expose the three new PATCH endpoints in `aleph-cli`:

- `organization member update --campaign <id> --org <slug> --character <slug> --role <text>`
- `location inhabitant update --campaign <id> --location <slug> --character <slug> --description <text>`
- `location organization update --campaign <id> --location <slug> --organization <slug> --description <text>`

Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` together (per CLAUDE.md).

**Why:** CLAUDE.md mandates CLI parity for any new API endpoints.

### 6. Permissions: hide vs. disable for non-editors

**Decision:** Players and visitors see the relations list (read-only) but no add/edit/delete buttons. Editors+ see all action buttons.

**Why:** Matches the existing pattern on these detail pages where members lists are visible to all but management actions are gated.

## Risks / Trade-offs

- **[Risk]** Stale cache on the character page's read-only relations tab after editing via the new panel → **Mitigation:** the panel emits a `relations-changed` event that the parent page uses to refetch the read-only tab data, or both views consume the same composable (`useEntityRelations(entityId)`) so a single refetch updates everything.

- **[Risk]** Conflict between the diagram's `RelationshipDialog` and the new panel dialog if both are open in different tabs → **Mitigation:** none needed. Last-write-wins is acceptable for relations (no version field today, same as today's behavior across the diagram + `/relations/*` pages).

- **[Risk]** Test surface grows substantially (3 pages × add/edit/delete × 4 relation modes) → **Mitigation:** factor the panel into unit-testable composables; cover the happy path per page with E2E and exhaustively cover edge cases at the component-unit level.

- **[Trade-off]** Three places now allow relation mutations (diagram, `/relations/*`, detail panel). Users could be confused about where to edit. **Mitigation:** treat the detail panel as the recommended path; future cleanup of `/relations/new` and `/relations/[id]/edit` can be a follow-up change if usage drops.

- **[Trade-off]** The new PATCH endpoints add to the API surface. **Mitigation:** they're tiny wrappers; keep them aligned with REST conventions and document in `docs/claude-skill.md`.

## Migration Plan

No data migration required (UI + new endpoints only).

Rollout steps:

1. Ship new PATCH endpoints with tests.
2. Ship `EntityRelationsPanel.vue` + `RelationFormDialog.vue` behind a feature flag (`featureRelationsPanel`) if desired, otherwise straight to all three pages.
3. Update CLI + docs.
4. Update i18n keys.
5. Update E2E tests for the three detail pages.

Rollback: revert the page-level imports of the panel; the new PATCH endpoints are additive and can stay.
