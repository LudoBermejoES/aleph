## 1. El arrastre deja de reconstruir el mapa

- [x] 1.1 Comparar la fila que devuelve `POST .../pins` con la que devuelve `GET .../pins`. Si no
      coinciden en forma (`lat`, `lng`, `entityId`, `label`, `groupId`, `color`, `childMapId`),
      igualar el POST al GET en el servidor — no maquillarlo en el cliente (design D1).
      No coincidían (`POST` devolvía solo `{ id }`); alineado en el servidor vía
      `server/services/maps.ts`'s `getPinWithEntity`, que comparte la misma consulta con `GET`.
- [x] 1.2 `app/pages/campaigns/[id]/maps/[slug]/index.vue`, `onPinDrop` (~línea 214): sustituir
      `await load()` por añadir la fila creada a `mapData.value.pins`.
- [x] 1.3 Prueba: crear un pin no debe desmontar `MapViewer`. Verificar que el centro y el zoom no
      cambian, no solo que el marcador aparece — es lo que el defecto rompía.
      VERIFICADO 2026-08-25 con Playwright real contra el sitio EN VIVO
      (`https://aleph.ludobermejo.es/campaigns/4b2adca6-fa7e-47b9-87f9-b0a0e9c6e1e4/maps/berlin`,
      sesión autenticada, mapa "Berlin en tinieblas", 24 pines de partida). Método: arrastré una
      entidad ("Melchior Viermetz", sin pin previo) a un punto vacío del mapa y comparé, antes y
      después del drop, (a) el `z/x/y` de los 5 primeros tiles OSM cargados, (b) el
      `transform: translate3d(...)` inline de los 24 marcadores YA existentes, y (c) el
      `transform` del `.leaflet-map-pane`. Los tres eran byte-idénticos antes y después: mismos 5
      tiles (`/13/4400/2686.png` etc.), las 24 transformaciones de marcador sin cambiar un solo
      píxel, `paneTransform` en `translate3d(0px, 0px, 0px)` en ambas capturas — solo apareció un
      25º marcador nuevo en la posición exacta del drop. Zoom (13) y centro (implícito en el
      `paneTransform` + posiciones de marcador) no cambiaron. Pin de prueba renombrado a
      `ZZZ-PRUEBA-PLAYWRIGHT` y borrado inmediatamente después de medir; el mapa volvió a sus 24
      pines (confirmado tras recargar la página). Capturas en
      `/tmp/claude-1000/-mnt-c-code-wod20/de8e17ce-5a7e-4cc6-af65-f2e5383d9f18/scratchpad/`
      (`01-map-initial.png`, `03-after-pin-created.png`).

## 2. El marcador es la imagen de la entidad

- [x] 2.1 `GET .../pins`: unir la entidad enlazada y devolver su URL de imagen y su tipo. Respetar la
      visibilidad que ya aplica el endpoint de entidades: si el espectador no puede ver la entidad,
      devolver el pin **sin** esos campos, nunca omitir el pin (design D3).
- [x] 2.2 Actualizar los tipos en `app/types/api.ts` para los campos nuevos.
- [x] 2.3 `MapViewer.client.vue`, `renderPins` (~línea 269): los tres niveles del design D2 —
      imagen de la entidad en círculo con `background-size: cover`; si no hay imagen, icono por
      tipo; si no hay entidad, el punto de color actual sin cambios.
- [x] 2.4 Un icono **distinto y legible a ~32px** por cada tipo de entidad. Enumerado desde
      `server/services/entity-types.ts`'s `BUILTIN_TYPES` (los 10 tipos reales del esquema:
      character, location, faction, item, event, lore, quest, note, session, arc), no inventados.
      Un tipo personalizado de campaña cae al glifo `default`.
- [x] 2.5 Escapar cualquier dato de entidad que se interpole en el HTML del icono o del popup.
      `pin.label` ya va sin escapar en `bindPopup` (~línea 289): cerrado, junto con `entityId`,
      `campaignId` y `entityImageUrl`.
- [x] 2.6 Prueba: los tres niveles, y que una imagen no cuadrada sale recortada al círculo y no
      deformada. Cubierto a nivel de función pura (`tests/unit/mapPinMarker.test.ts`): las tres
      capas, `background-size:cover` (nunca `contain`), y el escape de HTML en label/entityId/URL.

## 3. Borrar un pin desde la interfaz

- [x] 3.1 Confirmar que `DELETE .../pins/[pinId]` funciona y qué permiso exige. Ya existe
      (`server/api/campaigns/[id]/maps/[slug]/pins/[pinId]/index.delete.ts`); si le falta el gate
      de editor+, ese es un hallazgo aparte que hay que reportar, no arreglar por inercia.
      Confirmado: ya exige `hasMinRole(role, 'editor')` (403 si no). Nada que arreglar.
- [x] 3.2 Cliente: método de borrado en `useMapApi.ts` si no está. Añadido `deleteMapPin`.
- [x] 3.3 Acción de borrado en el popup del marcador. Enganchar el manejador cuando Leaflet ya ha
      insertado el DOM (`popupopen` o la superficie de eventos de Leaflet) — un `@click` de Vue en
      una cadena de HTML no se enlaza nunca (design, Riesgos).
- [x] 3.4 Acción de borrado en la lista de pines bajo el mapa (`index.vue:122`), mismo manejador.
- [x] 3.5 Pedir confirmación. Gate `isEditorPlus`, igual que el arrastre; el servidor sigue mandando.
- [x] 3.6 Al borrar, quitar el pin de `mapData.value.pins` — sin `load()`, misma regla que 1.2.
- [x] 3.7 Pruebas: borrado desde los dos sitios, y que a un rol por debajo de editor no se le ofrece.
      PARCIALMENTE VERIFICADO 2026-08-25 con Playwright real contra el sitio EN VIVO, sesión DM
      (rol `dm`, ve el candado y el borrado — ver nota de rol más abajo): - Borrado desde el POPUP del marcador: creé un pin de prueba (arrastrando "Melchior
      Viermetz"), lo renombré a `ZZZ-PRUEBA-PLAYWRIGHT`, hice clic en el marcador (abrió el
      popup con "View Entity" / "Delete pin"), pulsé "Delete pin", confirmé el diálogo nativo
      ("Delete this pin? This action cannot be undone."). Red de red: `DELETE
      .../maps/berlin/pins/a9d96700-...` → 200. Marcadores en el DOM: 25 → 24. - Borrado desde la LISTA bajo el mapa: creé un segundo pin de prueba (arrastrando "Elsa
      Hettich"), lo renombré igual, y pulsé el botón "Delete pin" de esa fila en la lista de
      Pins (no el popup). Mismo diálogo de confirmación, `DELETE
      .../maps/berlin/pins/e816afdd-...` → 200. Marcadores: 25 → 24. - Tras ambas pruebas, recargué la página: 24 marcadores, ningún pin de prueba sobrevive.
      NO VERIFICADO: "que a un rol por debajo de editor no se le ofrece". La única cuenta
      disponible en esta sesión es DM (rol `dm`, por encima de `editor`), que es precisamente el
      rol que SÍ ve el borrado, así que esta cuenta no puede probar la mitad negativa. Miré la
      página de Members de esta campaña (solo lectura, sin tocar nada): existen miembros reales
      con rol `player` (por debajo de `editor` en la jerarquía `dm > co_dm > editor > player >
    visitor`, leída de las `<option>` del propio `<select>` de rol), pero no tengo credenciales
      de ninguno, y las reglas de esta pasada prohíben crear, invitar o descender a nadie para
      conseguirlas. Sigue cubierto solo a nivel de función pura (como ya constaba: `canDelete=false`
      no emite el botón, y la lista usa el mismo `v-if="isEditorPlus"`), no en un navegador real.
      Casilla dejada sin marcar porque el enunciado completo de 3.7 no está verificado end-to-end.

## 4. Verificación

- [x] 4.1 `npm run test:unit` en verde. 144 archivos / 1766 tests (`npx vitest run tests/unit/`).
- [x] 4.2 `npx prettier --check .` limpio — es el primer paso del hook de pre-push y **tumbó la
      ejecución anterior de CI** en este repositorio. Limpio en todo el repo.
- [x] 4.3 RESTRICCIÓN, NO ENTREGABLE (respetada) -- **NO ejecutar `npm run test:integration` en esta máquina**: el servidor de desarrollo
      anuncia el puerto 3333 y nunca lo abre (`curl` da 000, `ss` no ve el puerto), así que
      `wait-on` agota el tiempo y parece un fallo de las pruebas. Se verifican en CI, que es donde
      pasaron la última vez. Reportarlo así, no como suite roja. NO ejecutado, tal como se indicó.
- [x] 4.4 RESTRICCIÓN, NO ENTREGABLE (respetada en su momento; el empuje lo hizo luego el propietario) -- NO empujar. El despliegue de aleph está gateado de verdad
      (`deploy: needs: [test, integration-test]`) pero un push es un despliegue a un sitio en vivo.
      Parar aquí y reportar. NO se ha hecho commit ni push.

## Nota de método

Las casillas 4.3 y 4.4 estaban mal redactadas por mí: son RESTRICCIONES de ejecución («no corras la
integración en esta máquina», «no empujes»), no entregables. Una lista de tareas con instrucciones
dentro es incerrable por construcción -- nunca se «cumplen», solo se respetan. Quedan marcadas como
respetadas y anotadas como lo que son, para que la próxima spec no repita el error: las
restricciones van en el encabezado o en design.md, no como casillas.

## Cierre de 3.7 -- dos niveles de evidencia, no equiparados

**Verificado en navegador real** (sesión Playwright autenticada contra el sitio en vivo): borrar
desde el popup del marcador y borrar desde la lista bajo el mapa. Los dos pasan por el `confirm()`
nativo, los dos disparan `DELETE .../pins/<id>` con **200**, y el recuento de marcadores baja 25 -> 24
en ambos casos. Tras recargar la página, 24 marcadores, el conjunto original.

**Verificado solo en prueba unitaria**: que a un rol por debajo de editor NO se le ofrezca la acción.
`tests/unit/mapPinMarker.test.ts:225` -- «includes the delete button, with the pin id, only when
canDelete is true» -- comprueba que el botón no llega ni al DOM sin permiso, que es la garantía real.
NO se comprobó de punta a punta: la única cuenta disponible es `dm`, que está por encima de editor y
es justamente la que SÍ debe ver la acción. Existen miembros con rol `player` en la campaña, pero no
hay credenciales suyas y crear o degradar un usuario para probarlo estaba prohibido.

Se cierra así a propósito: la tarea pedía comprobar el gate, no comprobarlo por una vía concreta, y
la unitaria cubre el caso negativo en el punto donde se decide. Queda anotado para que nadie lea
«e2e» donde dice «unitaria».
