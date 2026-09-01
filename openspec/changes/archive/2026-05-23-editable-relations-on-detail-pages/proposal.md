## Why

Relations between entities (character ↔ character, character ↔ organization, character ↔ location, organization ↔ location) can currently only be **viewed** on entity detail pages. To create, edit, or delete a relation, the user must leave the detail page and either navigate to `/campaigns/[id]/relations/new` (or `/relations/[id]/edit`), or open the tldraw diagram and use the relationship dialog there. This is friction for the most common authoring task: while editing a character, the user wants to say "she's the sister of X and a member of Y" without context-switching.

Additionally, organization-member roles and location-link metadata are not editable inline — to change a member's role the user must delete and re-add them.

## What Changes

- Add a **Relations panel** to the character, organization, and location detail pages that lists all relations involving that entity grouped by type and supports inline **Add**, **Edit**, and **Delete** actions for each.
- The Add flow reuses the same relation types and validation as `/relations/new` (entity-relation, org-member, char-location, org-location), with the source entity pre-filled to the current entity.
- The Edit flow allows changing the relation type, forward/reverse labels, attitude score, and description without changing source/target entities (matching the constraints of `/relations/[id]/edit`).
- Inline edit of **org member roles** on the organization detail page (no more delete + re-add).
- Inline edit of **location link metadata** (role or description) on the location detail page.
- Existing `/relations/new` and `/relations/[id]/edit` pages remain functional (no removal) for cases where the user wants to manage relations independently of any single entity.
- No server data-model changes — this is a UI-only change layered on existing relations endpoints.

## Capabilities

### New Capabilities

- `entity-relations-panel`: A reusable detail-page panel that displays all relations for an entity and supports add/edit/delete inline without navigation. Used by character, organization, and location detail pages.

### Modified Capabilities

- `relationship-graph`: Add scenarios covering inline editing from entity detail pages (the underlying data model and endpoints are unchanged, but the spec needs to acknowledge the new UI surface as a supported authoring path).
- `organization-membership`: Add scenario for editing a member's role inline without deleting and re-adding.
- `location-management`: Add scenarios for editing the metadata of inhabitant / organization links inline.

## Impact

- **Affected pages**: `app/pages/campaigns/[id]/characters/[slug]/index.vue`, `app/pages/campaigns/[id]/organizations/[slug]/index.vue`, `app/pages/campaigns/[id]/locations/[slug]/index.vue`.
- **New components**: a shared `EntityRelationsPanel.vue` and supporting dialogs (`RelationFormDialog.vue` reusing the same fields as `RelationForm.vue`).
- **Existing endpoints reused** (no new endpoints): `POST/PUT/DELETE /api/campaigns/:id/relations/*`, `PATCH /api/campaigns/:id/organizations/:slug/members/:characterId` (new — needed for inline role edit), location link PATCH (new — needed for inline metadata edit).
- **New endpoints**: `PATCH /api/campaigns/:id/organizations/:slug/members/:characterId` (member role), `PATCH /api/campaigns/:id/locations/:slug/inhabitants/:characterId` and `PATCH /api/campaigns/:id/locations/:slug/organizations/:organizationId` (location link metadata). These are thin wrappers over existing services.
- **aleph-cli impact**: YES — the new PATCH endpoints for org member and location link edits should be exposed via the CLI (`organization member update`, `location inhabitant update`, `location org update`) and reflected in `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md`.
- **Tests**: unit tests for the new panel logic; integration tests for the new PATCH endpoints; E2E tests for the add/edit/delete flow on each of the three detail pages.
- **i18n**: new keys in `i18n/locales/en.json` and `i18n/locales/es.json` for panel labels, dialog text, and confirmation messages.

## Divergencias respecto a lo implementado (añadido en el triaje del 2026-09-01, tarea 9.5)

Esta sección se escribe **después** de archivar el cambio, midiendo el árbol contra lo que este
`proposal.md` prometía. Lo que hay en él arriba se deja intacto: es lo que se propuso, no lo que se
entregó.

- **De los tres endpoints PATCH prometidos, se entregaron dos.**
  `PATCH /api/campaigns/:id/organizations/:slug/members/:characterId` existe
  (`server/api/campaigns/[id]/organizations/[slug]/members/[characterId]/index.patch.ts`) y tiene
  test de integración. `PATCH /api/campaigns/:id/locations/:slug/organizations/:organizationId`
  **también existe** (`.../locations/[slug]/organizations/[organizationId].patch.ts`, guarda
  `editor+`, cuerpo `{ description: string }`), aunque las tareas 1.2/1.5/1.8 lo dieran por
  imposible — lo que sí es cierto es que **no tiene ningún test de integración**: ningún fichero
  bajo `tests/` hace un PATCH a esa ruta, así que su matriz de autorización nunca se ha ejercitado
  por HTTP. `PATCH /api/campaigns/:id/locations/:slug/inhabitants/:characterId` **no existe**: esa
  tabla no tiene columna editable y el enlace es solo alta/baja.

- **La paridad de CLI quedó incompleta y no por imposibilidad.** Se añadió
  `organization member update`; `location organization update` **no** se añadió, pese a que su
  endpoint sí existe. `location inhabitant update` sí es imposible, por lo anterior.

- **Los E2E se escribieron pero nunca se ejecutaron.** Las tareas 7.1–7.3 crearon
  `tests/e2e/relations-panel-{character,organization,location}.spec.ts`; la 7.4 («correrlos») se
  quedó sin marcar. Al ejecutarlos por primera vez el 2026-09-01, **4 de 16 fallan de forma
  determinista** en la misma aserción (`[role="alertdialog"]` tras pulsar Delete). El detalle y la
  causa localizada están en la tarea 7.4 de `tasks.md`.
