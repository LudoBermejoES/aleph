# Tasks — add-osm-maps

## 0. Antes de tocar código

- [ ] 0.1 Confirmar con el propietario la política de teselas por defecto: usar
      `tile.openstreetmap.org` en desarrollo/tráfico bajo, con la URL configurable, según
      `design.md` D4 — o preferir de entrada un proveedor comercial. Es una decisión de
      producto (coste, política de uso), no técnica.
- [ ] 0.2 Confirmar el contacto (email/URL) que identificará a Aleph en el `User-Agent` de
      las llamadas a Nominatim (`design.md` D3) — Nominatim lo pide para poder avisar antes
      de bloquear, y hace falta un valor real, no un placeholder.

## 1. Esquema de datos (fundamento)

- [ ] 1.1 `server/db/schema/maps.ts`: añadir `type` (`text`, no nulo, por defecto `'image'`),
      `centerLat`/`centerLng` (`real`, nulos), `defaultZoom` (`integer`, nulo). Migración
      Drizzle correspondiente; toda fila existente queda con `type: 'image'` sin tocar
      ninguna otra columna.
- [ ] 1.2 No tocar `mapPins` — su forma no cambia (`design.md` D2). Añadir solo la
      documentación en el propio esquema (comentario) de que `lat`/`lng` significan cosas
      distintas según `maps.type`.
- [ ] 1.3 Prueba unitaria: crear un mapa sin `type` explícito y comprobar que persiste como
      `'image'` (no-regresión para todas las filas/tests existentes).

## 2. Geocodificación server-side

- [ ] 2.1 `server/services/geocoding.ts` (nuevo): llamada a
      `https://nominatim.openstreetmap.org/search` con `User-Agent` propio vía
      `runtimeConfig` (mismo patrón que `server/utils/ai.ts`), limitador de 1 req/s de
      proceso (un timestamp de última llamada, no una cola distribuida — `design.md` D3),
      caché en memoria de proceso por texto normalizado con expiración.
- [ ] 2.2 `POST /api/campaigns/[id]/maps/geocode` (nuevo), gateado `editor+`, cuerpo
      `{ query: string }`, devuelve candidatos `{ displayName, lat, lng }[]`.
- [ ] 2.3 Prueba unitaria del limitador: dos llamadas seguidas sin esperar producen como
      mínimo 1s de diferencia entre las dos peticiones salientes reales (mockeando el
      `fetch` externo, no llamando a Nominatim de verdad en tests).
- [ ] 2.4 Prueba unitaria de caché: la misma consulta normalizada dos veces solo dispara una
      llamada saliente.
- [ ] 2.5 Prueba de integración: `POST /geocode` sin rol `editor+` responde 403; con rol
      válido pero geocodificador simulado caído, responde con un error claro (no 500 opaco).

## 3. Creación/edición de mapas OSM

- [ ] 3.1 `POST /api/campaigns/[id]/maps` y `PUT .../maps/[slug]`: aceptar `type`,
      `centerLat`/`centerLng` (validado `-90..90`/`-180..180` cuando se envían), `defaultZoom`
      opcional. `type: 'image'` sigue sin exigir ninguno de estos tres.
- [ ] 3.2 `app/components/forms/MapForm.vue`: selector de tipo (`image`/`osm`); cuando es
      `osm`, mostrar campo de dirección/ciudad + botón de búsqueda explícito (nunca disparado
      por tecla, `design.md` D3) + selector de zoom, y mostrar el resultado geocodificado
      (nombre + coordenadas) para confirmación antes de guardar (`design.md` D7). También
      aceptar lat/lng directos como alternativa a buscar por texto.
- [ ] 3.3 Prueba de integración: crear un mapa `osm` por dirección persiste `centerLat`/
      `centerLng`/`defaultZoom` resueltos; crear uno por coordenadas directas no dispara
      ninguna llamada de geocodificación.
- [ ] 3.4 Prueba E2E (Playwright): flujo completo de creación de un mapa `osm` por ciudad,
      viendo el resultado de confirmación antes de guardar.

## 4. `MapViewer.client.vue`: rama OSM

- [ ] 4.1 Prop nueva (`mapType`, o derivarlo de los props ya existentes) que decide la rama:
      `osm` usa el CRS por defecto de Leaflet y `map.setView([centerLat, centerLng],
    defaultZoom)`; `image` sigue exactamente como hoy (`design.md` D1). Sin tocar una sola
      línea del camino `image` existente.
- [ ] 4.2 Capa de teselas OSM: `L.tileLayer(tileUrl, { attribution: '...' , maxZoom: 19,
    ... })`, con `tileUrl` configurable (no hardcodeado a `tile.openstreetmap.org` en el
      componente — viene del servidor, ver 0.1).
- [ ] 4.3 Renderizado de pines en un mapa `osm`: `L.marker([pin.lat, pin.lng])` directo, sin
      la transformación `pinScale` que sí se sigue aplicando para `image`.
- [ ] 4.4 Prueba de componente/unitaria: dado `mapType: 'osm'`, el mapa se inicializa sin
      `CRS.Simple` y con `setView` en el centro esperado (mock de Leaflet o comprobación de
      las opciones pasadas al constructor).

## 5. Arrastrar-y-soltar

- [ ] 5.1 Panel de entidades embebido en
      `app/pages/campaigns/[id]/maps/[slug]/index.vue` (buscable/filtrable por tipo, mismo
      patrón que `app/pages/campaigns/[id]/entities/index.vue`), visible solo a `editor+`
      (`design.md` D6: no existe hoy ningún camino de creación de pin en la web; este panel
      es la primera pieza de UI que lo permite).
- [ ] 5.2 Hacer arrastrables los ítems del panel (`draggable="true"` + `dataTransfer` con el
      `entityId`); `MapViewer.client.vue` gana handlers `dragover`/`drop` sobre el contenedor
      del mapa.
- [ ] 5.3 En el `drop`: `map.mouseEventToLatLng(event)`; para `image`, invertir la misma
      escala de píxel que usa `renderPins` antes de guardar; para `osm`, guardar el resultado
      tal cual. Llamar a la función nueva `createMapPin` de `useMapApi.ts` (no existía,
      `design.md` D6) contra el endpoint ya existente `POST .../pins`.
- [ ] 5.4 `useMapApi.ts`: añadir `createMapPin(slug, body)` y `geocodeAddress(query)`.
- [ ] 5.5 Rol: si el usuario no es `editor+`, el panel no ofrece arrastre (o el `drop` no
      dispara la llamada); el servidor sigue siendo la fuente de verdad del rol (ya gateado).
- [ ] 5.6 Prueba de integración: `POST .../pins` con un `lat`/`lng` fuera de rango sobre un
      mapa `osm` responde 422; el mismo rango sobre un mapa `image` se acepta sin más
      (no-regresión).
- [ ] 5.7 Prueba E2E (Playwright): arrastrar una entidad desde el panel y soltarla sobre un
      mapa `image` y sobre un mapa `osm`; comprobar en ambos casos que el pin aparece sin
      recargar la página y que navegar/recargar lo conserva.

## 6. CLI (`aleph-cli`) — obligatorio, toca endpoints existentes y nuevos

- [ ] 6.1 `cli/src/commands/map.js`: `map create` gana `--type`, `--address`, `--lat`/`--lng`
      directos, `--zoom`; al usar `--address`, imprimir el nombre geocodificado y las
      coordenadas resueltas en la salida (`design.md` D7 — transparencia también en CLI).
- [ ] 6.2 `map pin-add`/`map pins`: sustituir `--x`/`--y` y las claves `x`/`y` por
      `--lat`/`--lng` y `lat`/`lng`, alineado con el contrato real del endpoint (ver
      `proposal.md`, hallazgo: `pin-add` está roto hoy porque el servidor exige `lat`/`lng`
      obligatorios y el CLI enviaba `x`/`y`). No mantener las banderas viejas en paralelo.
- [ ] 6.3 Prueba de integración del CLI: `aleph map pin-add --lat --lng` contra un servidor
      real de pruebas crea el pin (hoy fallaría con 422; esta prueba debe ponerse en rojo
      contra el código actual antes del fix, y en verde después — mutación comprobada).
- [ ] 6.4 `docs/claude-skill.md` (bump de versión en la cabecera) y
      `.claude/skills/aleph-cli/SKILL.md` (bump de versión en el frontmatter) — actualizar
      la referencia de `map create`/`map pin-add`/`map pins` A LA VEZ en los dos ficheros,
      igual que las nuevas banderas de tipo/dirección/coordenadas.

## 7. Verificación

- [ ] 7.1 `npx vitest run` (unitarias + integración) en verde, incluyendo las suites nuevas
      de 2.x/3.x/5.x/6.x.
- [ ] 7.2 `npx playwright test` (E2E) en verde para los flujos de 3.4 y 5.7.
- [ ] 7.3 `npx eslint .` en verde — recordar que el hook `pre-push` de husky ya lo ejecuta
      completo y tarda ~3 minutos en esta máquina; no saltarlo con `--no-verify`.
- [ ] 7.4 Confirmar que `server/services/campaign-export.ts` incluye las columnas nuevas de
      `maps` sin cambio de código (ya lo hace, `SELECT *` — `proposal.md`/`design.md` D7);
      añadir una prueba que lo demuestre explícitamente en vez de darlo por hecho.
- [ ] 7.5 `openspec validate add-osm-maps --strict` en verde antes de considerar el cambio
      listo para implementar.
