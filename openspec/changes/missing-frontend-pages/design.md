# Missing Frontend Pages -- Design

## Context

Aleph's server layer already exposes full CRUD for quests, arcs, chapters, and entity templates. The frontend has partial coverage: quests have list + edit but no detail view; arcs/chapters and entity templates have no pages at all. Sessions reference arcs/chapters via foreign keys, and entities reference templates, but users cannot manage these resources from the browser.

Existing patterns in the codebase:
- Pages live under `app/pages/campaigns/[id]/` with `index.vue` (list), `new.vue`, `[slug]/index.vue` (detail), `[slug]/edit.vue`.
- API calls go through `useCampaignApi()` composable.
- Forms use dedicated `app/components/forms/` components.
- Breadcrumbs, `LoadingSkeleton`, `EmptyState`, and `ErrorToast` are used consistently.

## Goals

- Provide read-only quest detail accessible by clicking a quest in the list.
- Provide arc and chapter CRUD pages so DMs can organize their campaign narrative.
- Provide template management so DMs can define reusable entity structures.
- Follow existing page/component conventions exactly (breadcrumbs, layout, API composable).

## Non-Goals

- Real-time collaboration on arcs/templates (plain HTTP CRUD is sufficient).
- Drag-and-drop reordering in the quest list or arc list (sortOrder can be edited via fields for now, DnD is only for template fields).
- Bulk operations on quests or templates.
- Quest log / journal (rich text editing with Hocuspocus) -- quests already use `logFilePath` for this; the detail page just links to it.

## Decisions

### Quest detail layout

The detail page will show a card-style layout:
- Header: quest name + status badge (reusing the same icon/color pattern from the list page).
- Metadata row: parent quest (link), linked entity (link), secret badge.
- Assigned characters: chip list with links to character detail.
- Description: rendered markdown or plain text block.
- Sub-quests: same indented list style as the quest list page, each linking to its own detail.
- Actions: Edit button linking to the edit page.

This mirrors the pattern used by `characters/[slug]/index.vue` and `entities/[slug]/index.vue`.

### Arcs & Chapters: standalone pages vs. section in sessions area

**Decision: standalone pages under `campaigns/[id]/arcs/`.**

Rationale:
- Arcs and chapters are their own domain objects, not sub-resources of sessions.
- The session form already has arc/chapter pickers; adding a "Manage Arcs" link there provides the navigation bridge.
- Standalone pages allow a clean list > detail > edit flow.
- Chapters are managed inline within the arc detail page (no separate `/chapters/` route) since chapters are always scoped to an arc and the list is typically short.

Routes:
- `/campaigns/[id]/arcs/` -- list + create form
- `/campaigns/[id]/arcs/[slug]/` -- detail with inline chapter management (add, edit, delete, reorder)

### Template editor field reordering approach

**Decision: simple up/down arrow buttons, not full drag-and-drop.**

Rationale:
- Template field lists are typically 5-15 items -- arrow buttons are perfectly usable at this scale.
- Avoids adding a DnD library dependency (vuedraggable / @vueuse/integrations).
- Keeps the implementation straightforward and testable.
- Each field row shows: label, key, type badge, required indicator, up/down/delete buttons.
- "Add field" button at the bottom opens an inline form with: key, label, fieldType select, required toggle, and type-specific options (e.g., select options as comma-separated values).

If users later request DnD, it can be layered on top without changing the data model.

### Template selection when creating entities

The existing entity create form (`entities/new.vue` or `EntityForm.vue`) will gain a template picker dropdown. When a template is selected, the form pre-populates with the template's fields as additional structured inputs below the standard entity fields.
