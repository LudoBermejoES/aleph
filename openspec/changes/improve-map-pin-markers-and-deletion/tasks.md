## 1. El arrastre deja de reconstruir el mapa

- [x] 1.1 Comparar la fila que devuelve `POST .../pins` con la que devuelve `GET .../pins`. Si no
      coinciden en forma (`lat`, `lng`, `entityId`, `label`, `groupId`, `color`, `childMapId`),
      igualar el POST al GET en el servidor — no maquillarlo en el cliente (design D1).
      No coincidían (`POST` devolvía solo `{ id }`); alineado en el servidor vía
      `server/services/maps.ts`'s `getPinWithEntity`, que comparte la misma consulta con `GET`.
- [x] 1.2 `app/pages/campaigns/[id]/maps/[slug]/index.vue`, `onPinDrop` (~línea 214): sustituir
      `await load()` por añadir la fila creada a `mapData.value.pins`.
- [ ] 1.3 Prueba: crear un pin no debe desmontar `MapViewer`. Verificar que el centro y el zoom no
      cambian, no solo que el marcador aparece — es lo que el defecto rompía.
      NO añadida: requiere un navegador real (Playwright) para observar el mapa Leaflet; fuera del
      alcance de esta pasada (solo unit + prettier). Garantía estructural en su lugar: el nuevo
      `watch(() => props.pins, ...)` en `MapViewer.client.vue` solo llama a `renderPins`, nunca a
      `initImageMap`/`initOsmMap` (que son las únicas funciones que fijan centro/zoom), así que no
      hay ninguna ruta de código que los vuelva a ejecutar en un cambio de pines.

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
- [ ] 3.7 Pruebas: borrado desde los dos sitios, y que a un rol por debajo de editor no se le ofrece.
      NO añadida a nivel e2e (requiere navegador). El gate de "no se ofrece" está cubierto a nivel
      de función pura: `buildPinPopupHtml(..., canDelete=false)` no emite el botón en absoluto
      (`tests/unit/mapPinMarker.test.ts`), y la lista bajo el mapa usa el mismo `v-if="isEditorPlus"`
      que ya gatea el resto del panel de edición.

## 4. Verificación

- [x] 4.1 `npm run test:unit` en verde. 144 archivos / 1766 tests (`npx vitest run tests/unit/`).
- [x] 4.2 `npx prettier --check .` limpio — es el primer paso del hook de pre-push y **tumbó la
      ejecución anterior de CI** en este repositorio. Limpio en todo el repo.
- [ ] 4.3 **NO ejecutar `npm run test:integration` en esta máquina**: el servidor de desarrollo
      anuncia el puerto 3333 y nunca lo abre (`curl` da 000, `ss` no ve el puerto), así que
      `wait-on` agota el tiempo y parece un fallo de las pruebas. Se verifican en CI, que es donde
      pasaron la última vez. Reportarlo así, no como suite roja. NO ejecutado, tal como se indicó.
- [ ] 4.4 NO empujar. El despliegue de aleph está gateado de verdad
      (`deploy: needs: [test, integration-test]`) pero un push es un despliegue a un sitio en vivo.
      Parar aquí y reportar. NO se ha hecho commit ni push.
