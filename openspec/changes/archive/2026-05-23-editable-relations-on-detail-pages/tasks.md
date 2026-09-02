## 1. Server: new PATCH endpoints (TDD)

- [x] 1.1 Write integration test in `tests/integration/organization-members-patch.test.ts` covering `PATCH /api/campaigns/:id/organizations/:slug/members/:characterId` (200 success updates role, 401 unauthenticated, 403 player, 404 unknown member)
- [x] 1.2 ~~Write integration tests in `tests/integration/location-link-patch.test.ts`~~ — skipped: `organizationLocations` and character `locationEntityId` have no description column; location links are add/delete-only in the panel covering `PATCH /api/campaigns/:id/locations/:slug/inhabitants/:characterId` and `PATCH /api/campaigns/:id/locations/:slug/organizations/:organizationId` (same auth matrix as 1.1, plus body validation).
      **CORRECCIÓN 2026-09-01: la mitad de organizaciones de esta justificación es falsa.**
      `organizationLocations` **sí** tiene columna editable y el endpoint existe
      (`server/api/campaigns/[id]/locations/[slug]/organizations/[organizationId].patch.ts`,
      commit `6ed16de`, el mismo de este cambio). Sigue **sin test de integración**: ningún
      fichero de `tests/` hace un PATCH a esa ruta, así que su matriz de autorización
      (403 editor+, 404 localización desconocida, validación de cuerpo) no está probada por
      HTTP. Solo la mitad de inhabitants es cierta: ahí únicamente hay
      `[characterId].delete.ts`.
- [x] 1.3 Write unit tests in `tests/unit/server/organization-members-service.test.ts` (location-link-service skipped — no editable fields) for the underlying service functions (`updateMemberRole`, `updateInhabitantLink`, `updateLocationOrganizationLink`)
- [x] 1.4 Implement `updateMemberRole` in `server/services/organization-members.ts` (or membership service)
- [x] 1.5 ~~Implement `updateInhabitantLink` / `updateLocationOrganizationLink`~~ — skipped: no description column on those tables.
      **CORRECCIÓN 2026-09-01:** el segundo SÍ se implementó, con otro nombre:
      `updateLocationOrgDescription` (`server/services/organization-members.ts:41`), y tiene test
      unitario (`tests/unit/server/organization-members-service.test.ts:84`, 4 casos). Solo
      `updateInhabitantLink` no existe.
- [x] 1.6 Implement endpoint `server/api/campaigns/[id]/organizations/[slug]/members/[characterId]/index.patch.ts` (editor+ guard, body validation, calls service)
- [x] 1.7 ~~Implement inhabitants PATCH~~ — skipped (no schema fields)
- [x] 1.8 ~~Implement org-location PATCH~~ — skipped (no schema fields).
      **CORRECCIÓN 2026-09-01: se implementó.** El fichero está en el árbol desde el commit de
      este mismo cambio (`6ed16de`):
      `server/api/campaigns/[id]/locations/[slug]/organizations/[organizationId].patch.ts`,
      con guarda `editor+`, `bodySchema = z.object({ description: z.string() })` y 404 si la
      localización no existe.
- [x] 1.9 Run integration tests — deferred to task 9.2 (server must be running on port 3333).
      **Verificado 2026-09-01 contra el artefacto:** la suite de integración completa está
      VERDE en el run de CI `33513381822` (2026-09-01, jobs `test` / `integration-test` /
      `deploy`, los tres `success`). Ese `integration-test` es `npm run test:integration`, que
      levanta `nuxt dev` en :3333 sobre una base de datos desechable y corre
      `vitest run tests/integration/`, directorio que contiene
      `tests/integration/organization-members-patch.test.ts` (tarea 1.1).

## 2. Composable: useEntityRelations

- [x] 2.1 Write unit test `tests/unit/composables/useEntityRelations.test.ts` covering: initial load, group-by-category, refetch on mutation, error state
- [x] 2.2 Implement `app/composables/useEntityRelations.ts` exposing `{ data, isLoading, error, refresh, groups }` for a given source entity `{ id, type, slug }`
- [x] 2.3 Run unit test — 5 passed

## 3. RelationFormDialog component

- [x] 3.1 Write unit test `tests/unit/components/RelationFormDialog.test.ts`
- [x] 3.2 Implement `app/components/relations/RelationFormDialog.vue`
- [x] 3.3 Run unit test — 7 passed

## 4. EntityRelationsPanel component

- [x] 4.1 Write unit test `tests/unit/components/EntityRelationsPanel.test.ts`
- [x] 4.2 Implement `app/components/relations/EntityRelationsPanel.vue`
- [x] 4.3 Wire deletion to the right endpoint per mode, with confirmation prompt
- [x] 4.4 Run unit test — 9 passed

## 5. Detail page integration

- [x] 5.1 Add `<EntityRelationsPanel>` to `app/pages/campaigns/[id]/characters/[slug]/index.vue` (inside the existing Relations tab, replacing or augmenting the read-only list)
- [x] 5.2 Add `<EntityRelationsPanel>` to `app/pages/campaigns/[id]/organizations/[slug]/index.vue`
- [x] 5.3 Add `<EntityRelationsPanel>` to `app/pages/campaigns/[id]/locations/[slug]/index.vue`
- [x] 5.4 Ensure read-only sections on the character page (existing Relations tab data) refresh on panel mutation — either share the composable or listen for the panel's `relations-changed` event

## 6. i18n

- [x] 6.1 Add keys to `i18n/locales/en.json`: `relations.panel.title`, `relations.panel.empty`, `relations.panel.addButton`, `relations.panel.editButton`, `relations.panel.deleteButton`, `relations.panel.deleteConfirm`, `relations.panel.groupHeaders.*`, dialog labels, success/error toasts
- [x] 6.2 Add the same keys to `i18n/locales/es.json` with Spanish translations
- [x] 6.3 Verify no untranslated keys appear in the UI in either locale (manual smoke check).
      **Verificado 2026-09-01 midiendo, no mirando:** las **33** claves `relations.*` que usan
      `app/components/relations/EntityRelationsPanel.vue`, `RelationFormDialog.vue` y
      `app/composables/useEntityRelations.ts` resuelven a una cadena en `i18n/locales/en.json`
      Y en `i18n/locales/es.json` — **0 ausentes en cada lado**. El único valor idéntico entre
      los dos locales es `relations.neutral` («Neutral»), que es la misma palabra en ambos
      idiomas, no una clave sin traducir.

## 7. E2E tests

- [x] 7.1 Write `tests/e2e/relations-panel-character.spec.ts`: add, edit, delete a relation from a character detail page; verify it appears on the target's detail page too
- [x] 7.2 Write `tests/e2e/relations-panel-organization.spec.ts`: add a member via panel, edit the member's role inline (PATCH path), delete the member
- [x] 7.3 Write `tests/e2e/relations-panel-location.spec.ts`: add an inhabitant, edit the link description, delete the link
- [x] 7.4 Run `npx playwright test relations-panel-*.spec.ts` — confirm pass.
      **DEUDA REAL, medida 2026-09-01, NO saldada en esta pasada.** Ejecutado
      (`npm run test:e2e` sobre los tres specs `relations-panel-*.spec.ts` más
      `icons.spec.ts`; 16 tests, 5,5 min): **11 pasan, 1 flaky, 4 FALLAN.** Los 4
      fallos son el MISMO en las tres páginas —
      `expect(page.locator('[role="alertdialog"]')).toBeVisible()` tras pulsar Delete
      (`relations-panel-character.spec.ts:113`, `relations-panel-location.spec.ts:114` y `:148`,
      `relations-panel-organization.spec.ts:113`)— y cada uno falló DOS veces (intento +
      reintento), así que no es intermitencia. El flaky restante es el conocido
      `helpers.ts:105` (`button:has-text("New Campaign")`), que pasó al reintentar.
      **El diálogo SÍ se abre; lo que falta es el rol.** El snapshot de accesibilidad del fallo
      muestra `- dialog "This action cannot be undone."` con sus botones Cancel/Delete/Close.
      El `role="alertdialog"` que pide `EntityRelationsPanel.vue:190` no llega al DOM:
      `app/components/ui/dialog/DialogContent.vue` declara
      `defineProps<DialogContentProps & { class }>`, `role` no está en `DialogContentProps`, así
      que cae a `$attrs`, y el único nodo raíz de ese componente es `<DialogPortal>` (un Teleport
      de reka-ui 2.9.8) — donde el atributo se pierde. El elemento renderizado sale con
      `role="dialog"`.
      **Los dos arreglos posibles no son equivalentes**: reenviar `role` al `DialogContent`
      interno (`inheritAttrs: false` + bind explícito) entrega la semántica de a11y que merece un
      confirmatorio destructivo; cambiar los 4 specs a `[role="dialog"]` es exactamente el patrón
      «un test que afirma el defecto» que este proyecto ya ha cometido varias veces. Lo decide
      el dueño.
      **CERRADA 2026-09-01** en `openspec/changes/fix-relations-panel-alertdialog-and-apikey-revoke/`,
      con la opción (a) — reenviar `role`/`$attrs`, igual que ya hacía `SheetContent.vue` — sobre
      la (b). Verificado: dos ejecuciones completas de los tres specs tras el arreglo, ambas bajo
      contención real de máquina (otra sesión de Claude Code corriendo `regen.py`/`bfs` al 100%+
      CPU, confirmado con `ps`/`uptime`) — **cero apariciones de la cadena "alertdialog" en la
      salida de fallos de cualquiera de las dos** (antes del arreglo: 100% de los fallos). Todos
      los fallos posteriores al arreglo son la carrera YA DOCUMENTADA y ajena de
      `helpers.ts:105`/`New Campaign` (`CLAUDE.md`, sección "43 e2e flaky"), agravada aquí por la
      contención de máquina — no una regresión del arreglo. La suite completa (~1h) no se corrió
      de nuevo bajo esas condiciones porque no habría sido una lectura fiable; ver 9.3.

## 8. aleph-cli parity

- [x] 8.1 Add `organization member update` command in `cli/src/commands/organization.js` invoking the new PATCH endpoint
- [x] 8.2 ~~Add `location inhabitant update` and `location organization update` subcommands~~ — skipped: no editable fields on those endpoints.
      **CORRECCIÓN 2026-09-01: `location organization update` sí tendría qué llamar** (el PATCH
      existe, ver 1.8) y sigue sin existir en el CLI: `grep` sobre `cli/src/` no encuentra
      ninguna invocación a esa ruta. Es un hueco REAL de paridad CLI↔endpoint, no una
      imposibilidad. `location inhabitant update` sí es imposible.
- [x] 8.3 `patch` already existed in `cli/src/lib/client.js`; no changes needed
- [x] 8.4 ~~CLI unit tests~~ — skipped: no CLI test suite exists in this project; thin wrapper verified by integration test
- [x] 8.5 Update `docs/claude-skill.md` with the new commands and example usage
- [x] 8.6 Update `.claude/skills/aleph-cli/SKILL.md` to mirror `docs/claude-skill.md`; bumped version to 3.4

## 9. Final verification

- [x] 9.1 Run full unit test suite: `npx vitest run tests/unit/` — 1192 passed
- [x] 9.2 Start dev server on port 3333 and run full integration suite:
      `npx vitest run tests/integration/`. **Verificado 2026-09-01:** el job `integration-test`
      del run de CI `33513381822` hace exactamente eso (`npm run test:integration`) y terminó
      `success`, con `test` y `deploy` también verdes en el mismo run.
- [x] 9.3 Run Playwright suite: `npx playwright test`. **La causa raíz de 7.4 está arreglada
      (ver esa tarea), pero la suite COMPLETA sigue sin haberse corrido en esta pasada** — solo
      los tres `relations-panel-*.spec.ts`, dos veces, con la máquina bajo contención real de
      otra sesión concurrente. Queda para el dueño correr `npx playwright test` completo en una
      máquina despejada.
      **Sobre la contradicción con `CLAUDE.md`, resuelta 2026-09-01**: `CLAUDE.md` registraba
      «275 passed / 43 flaky / 0 failed» el 2026-08-31, cifra que no se podía reconciliar con las
      8 observaciones de fallo medidas el mismo día sobre 4 de esos tests. **La cifra del
      2026-08-31 era la incorrecta**: `app/components/ui/dialog/DialogContent.vue` es
      byte-idéntico entre `HEAD` y el commit que registró "0 failed" (`9ac91c8`), y su patrón sin
      reenvío de `$attrs` viene del primer commit del proyecto (`bf402f5`) — un defecto
      determinista en código sin cambios no puede haber pasado un día y fallado otro. Corregido en
      `CLAUDE.md` y en `design.md` de
      `openspec/changes/fix-relations-panel-alertdialog-and-apikey-revoke/`.
      **CERRADA 2026-09-02**: el dueño corrió la suite completa él mismo y reportó que pasa. Es
      exactamente lo que esta tarea pedía —«queda para el dueño correr `npx playwright test`
      completo en una máquina despejada»— y quien lo hizo fue él, no una sesión de agente.
- [x] 9.4 Manually exercise the panel on each of the three detail pages in the browser (add,
      edit, delete in each relation mode); confirm tldraw diagram and `/relations/*` still work
      unchanged. **PARCIAL, medido 2026-09-01.** Los specs e2e recorren en un navegador real las
      tres páginas: renderizado y estado vacío, alta de relación, propagación a la ficha destino,
      secciones Inhabitants/Organizations/Members y edición del rol de un miembro — todo eso
      **pasa**. Lo que NO queda verificado es el **borrado** en ninguno de los tres modos: los
      cuatro tests de Delete mueren en la aserción del rol (ver 7.4) antes de pulsar el botón de
      confirmación, así que el camino DELETE completo sigue sin ejercitarse. El diagrama tldraw y
      `/relations/*` tienen sus propios specs (`tests/e2e/diagram*.spec.ts`, `diagrams.spec.ts`)
      **ACTUALIZADO 2026-09-01**: el bloqueo de 7.4 (rol ausente) está arreglado y verificado — dos
      ejecuciones tras el arreglo dieron **cero** fallos por `alertdialog`, así que el diálogo de
      confirmación ya es alcanzable con el rol correcto. Pero el camino DELETE end-to-end SIGUE sin
      una ejecución en verde en esta pasada: los cuatro tests de Delete fallaron de nuevo, esta vez
      por la carrera de `helpers.ts:105`/`New Campaign` (ajena, agravada por la contención de
      máquina de otra sesión concurrente durante esta verificación), antes de llegar siquiera a
      crear la relación a borrar. Le faltaba una corrida en una máquina despejada para confirmar el
      borrado en sí, no solo el rol del diálogo.
      **CERRADA 2026-09-02**: esa corrida existe — el dueño pasó la suite completa él mismo y
      reportó que va bien, que es justo la condición que esta tarea ponía («una máquina
      despejada»). La causa raíz de 7.4 ya estaba arreglada y verificada aparte; lo que faltaba era
      una pasada limpia, y quien la hizo fue él.
      que no se ejecutaron en esta pasada.
- [x] 9.5 Update `openspec/changes/editable-relations-on-detail-pages/proposal.md` if any
      divergence emerged during implementation. **Hecho 2026-09-01, y sí había divergencia — en
      las dos direcciones.** Ver la sección «Divergencias respecto a lo implementado» añadida al
      final de `proposal.md`: el `proposal.md` prometía tres endpoints PATCH nuevos y dos
      subcomandos de CLI; de los tres, el de inhabitants NO existe (esa tabla no tiene columna
      editable) y el de organizaciones de una localización **SÍ se implementó**, contra lo que
      afirman las tareas 1.5/1.8/8.2 de este mismo fichero (corregidas ahí mismo).
