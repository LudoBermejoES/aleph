# Tasks — add-osm-maps

## 0. Antes de tocar código

- [x] 0.1 Confirmar con el propietario la política de teselas por defecto: usar
      `tile.openstreetmap.org` en desarrollo/tráfico bajo, con la URL configurable, según
      `design.md` D4 — o preferir de entrada un proveedor comercial. Es una decisión de
      producto (coste, política de uso), no técnica.
      **CONFIRMADO POR EL PROPIETARIO (2026-08-25): teselas públicas de OpenStreetMap, sin
      proveedor comercial.** Volumen declarado: **una persona, unos minutos al día**. La Tile
      Usage Policy de OSM permite expresamente el uso de bajo volumen; lo que prohíbe es el
      uso masivo y la descarga en bloque, y esta cifra queda órdenes de magnitud por debajo
      de cualquier umbral relevante (su propia guía sugiere replantearse el servicio público
      a partir de cientos de usuarios diarios).
      Cumplimiento verificado en código, no supuesto: - Atribución obligatoria presente y **con el enlace exigido**:
      `nuxt.config.ts:78-80` sirve `© <a href="…/copyright">OpenStreetMap</a> contributors`,
      y `MapViewer.client.vue:299` lo pasa al `tileLayer` con un respaldo propio. - `maxZoom: 19` (`MapViewer.client.vue:298`) coincide con el máximo del servicio. - Las teselas las pide el NAVEGADOR, así que el `User-Agent` es el del navegador. El
      requisito de un `User-Agent` identificable aplica a clientes que no lo son; el de
      Nominatim, que sí lo exige, se resuelve aparte en el servidor (tarea 0.2).
      `OSM_TILE_URL`/`OSM_ATTRIBUTION` se conservan: cambiar de proveedor más adelante es una
      variable de entorno, no un cambio de código.
      **Revisar esta decisión si** el tráfico deja de ser de una sola persona (varios
      jugadores consultando mapas a la vez) o si se añade cualquier precarga de teselas —
      la política prohíbe el prefetching en bloque.
- [x] 0.2 Confirmar el contacto (email/URL) que identificará a Aleph en el `User-Agent` de
      las llamadas a Nominatim (`design.md` D3) — Nominatim lo pide para poder avisar antes
      de bloquear, y hace falta un valor real, no un placeholder.
      **CONFIRMADO POR EL PROPIETARIO (2026-08-25)** y ya fijado en producción: el servidor
      `/var/www/aleph/.env` (gitignored) lleva `NOMINATIM_USER_AGENT=aleph.ludobermejo.es` y
      `NOMINATIM_CONTACT=ludobermejo@gmail.com`, con copia de seguridad del fichero previo en
      `.env.bak.20260825-083814`. El mecanismo era el implementado en esta sesión
      (`nuxt.config.ts` `maps.nominatimUserAgent`/`nominatimContact`,
      `server/services/geocoding.ts`); lo que faltaba era el valor real, y ya está puesto.
      El `User-Agent` genérico por defecto (`Aleph-TTRPG-Campaign-Manager/1.0`) sigue siendo
      el respaldo para desarrollo local, donde el volumen es irrelevante.

## 1. Esquema de datos (fundamento)

- [x] 1.1 `server/db/schema/maps.ts`: añadir `type` (`text`, no nulo, por defecto `'image'`),
      `centerLat`/`centerLng` (`real`, nulos), `defaultZoom` (`integer`, nulo). Migración
      Drizzle correspondiente; toda fila existente queda con `type: 'image'` sin tocar
      ninguna otra columna.
- [x] 1.2 No tocar `mapPins` — su forma no cambia (`design.md` D2). Añadir solo la
      documentación en el propio esquema (comentario) de que `lat`/`lng` significan cosas
      distintas según `maps.type`.
- [x] 1.3 Prueba unitaria: crear un mapa sin `type` explícito y comprobar que persiste como
      `'image'` (no-regresión para todas las filas/tests existentes).

## 2. Geocodificación server-side

- [x] 2.1 `server/services/geocoding.ts` (nuevo): llamada a
      `https://nominatim.openstreetmap.org/search` con `User-Agent` propio vía
      `runtimeConfig` (mismo patrón que `server/utils/ai.ts`), limitador de 1 req/s de
      proceso (un timestamp de última llamada, no una cola distribuida — `design.md` D3),
      caché en memoria de proceso por texto normalizado con expiración.
- [x] 2.2 `POST /api/campaigns/[id]/maps/geocode` (nuevo), gateado `editor+`, cuerpo
      `{ query: string }`, devuelve candidatos `{ displayName, lat, lng }[]`.
- [x] 2.3 Prueba unitaria del limitador: dos llamadas seguidas sin esperar producen como
      mínimo 1s de diferencia entre las dos peticiones salientes reales (mockeando el
      `fetch` externo, no llamando a Nominatim de verdad en tests).
- [x] 2.4 Prueba unitaria de caché: la misma consulta normalizada dos veces solo dispara una
      llamada saliente.
- [x] 2.5 Prueba de integración: `POST /geocode` sin rol `editor+` responde 403; con rol
      válido pero geocodificador simulado caído, responde con un error claro (no 500 opaco).
      El 403 está probado en integración real (`tests/integration/maps-osm.test.ts`). El
      "geocodificador caído -> error claro" está probado a nivel de `geocodeAddress()`
      (`tests/unit/geocoding.test.ts`, `fetch` mockeado a fallo de red y a respuesta no-OK,
      ambos casos exigen `statusCode: 502`) en vez de contra un servidor real: forzar una
      caída real del proveedor desde un test de integración habría exigido apuntar el
      servidor a una URL rota vía variable de entorno, lo cual habría afectado a TODOS los
      tests de ese proceso de servidor, no solo a éste.

## 3. Creación/edición de mapas OSM

- [x] 3.1 `POST /api/campaigns/[id]/maps` y `PUT .../maps/[slug]`: aceptar `type`,
      `centerLat`/`centerLng` (validado `-90..90`/`-180..180` cuando se envían), `defaultZoom`
      opcional. `type: 'image'` sigue sin exigir ninguno de estos tres.
- [x] 3.2 `app/components/forms/MapForm.vue`: selector de tipo (`image`/`osm`); cuando es
      `osm`, mostrar campo de dirección/ciudad + botón de búsqueda explícito (nunca disparado
      por tecla, `design.md` D3) + selector de zoom, y mostrar el resultado geocodificado
      (nombre + coordenadas) para confirmación antes de guardar (`design.md` D7). También
      aceptar lat/lng directos como alternativa a buscar por texto.
- [x] 3.3 Prueba de integración: crear un mapa `osm` por dirección persiste `centerLat`/
      `centerLng`/`defaultZoom` resueltos; crear uno por coordenadas directas no dispara
      ninguna llamada de geocodificación.
- [x] 3.4 Prueba E2E (Playwright): flujo completo de creación de un mapa `osm` por ciudad,
      viendo el resultado de confirmación antes de guardar.
      `tests/e2e/map-osm.spec.ts`, 2/2 en verde -- corrido de verdad contra un `nuxt dev` real
      (ver nota de entorno en la sección 7). La llamada a Nominatim se intercepta con
      `page.route()` a nivel de navegador (nunca llega a salir), por la política de uso de
      Nominatim contra tráfico automatizado (`design.md` D3).

## 4. `MapViewer.client.vue`: rama OSM

- [x] 4.1 Prop nueva (`mapType`, o derivarlo de los props ya existentes) que decide la rama:
      `osm` usa el CRS por defecto de Leaflet y `map.setView([centerLat, centerLng],
defaultZoom)`; `image` sigue exactamente como hoy (`design.md` D1). Sin tocar una sola
      línea del camino `image` existente.
- [x] 4.2 Capa de teselas OSM: `L.tileLayer(tileUrl, { attribution: '...' , maxZoom: 19,
... })`, con `tileUrl` configurable (no hardcodeado a `tile.openstreetmap.org` en el
      componente — viene del servidor, ver 0.1).
- [x] 4.3 Renderizado de pines en un mapa `osm`: `L.marker([pin.lat, pin.lng])` directo, sin
      la transformación `pinScale` que sí se sigue aplicando para `image`.
- [x] 4.4 Prueba de componente/unitaria: dado `mapType: 'osm'`, el mapa se inicializa sin
      `CRS.Simple` y con `setView` en el centro esperado (mock de Leaflet o comprobación de
      las opciones pasadas al constructor).

## 5. Arrastrar-y-soltar

- [x] 5.1 Panel de entidades embebido en
      `app/pages/campaigns/[id]/maps/[slug]/index.vue` (buscable/filtrable por tipo, mismo
      patrón que `app/pages/campaigns/[id]/entities/index.vue`), visible solo a `editor+`
      (`design.md` D6: no existe hoy ningún camino de creación de pin en la web; este panel
      es la primera pieza de UI que lo permite).
- [x] 5.2 Hacer arrastrables los ítems del panel (`draggable="true"` + `dataTransfer` con el
      `entityId`); `MapViewer.client.vue` gana handlers `dragover`/`drop` sobre el contenedor
      del mapa.
- [x] 5.3 En el `drop`: `map.mouseEventToLatLng(event)`; para `image`, invertir la misma
      escala de píxel que usa `renderPins` antes de guardar; para `osm`, guardar el resultado
      tal cual. Llamar a la función nueva `createMapPin` de `useMapApi.ts` (no existía,
      `design.md` D6) contra el endpoint ya existente `POST .../pins`.
- [x] 5.4 `useMapApi.ts`: añadir `createMapPin(slug, body)` y `geocodeAddress(query)`.
- [x] 5.5 Rol: si el usuario no es `editor+`, el panel no ofrece arrastre (o el `drop` no
      dispara la llamada); el servidor sigue siendo la fuente de verdad del rol (ya gateado).
- [x] 5.6 Prueba de integración: `POST .../pins` con un `lat`/`lng` fuera de rango sobre un
      mapa `osm` responde 422; el mismo rango sobre un mapa `image` se acepta sin más
      (no-regresión).
- [x] 5.7 Prueba E2E (Playwright): arrastrar una entidad desde el panel y soltarla sobre un
      mapa `image` y sobre un mapa `osm`; comprobar en ambos casos que el pin aparece sin
      recargar la página y que navegar/recargar lo conserva.
      `tests/e2e/map-drag-drop-pins.spec.ts`, 2/2 en verde (`.dragTo()` de Playwright, arrastre
      HTML5 real, no simulado por API) -- misma nota de entorno que 3.4.

## 6. CLI (`aleph-cli`) — obligatorio, toca endpoints existentes y nuevos

- [x] 6.1 `cli/src/commands/map.js`: `map create` gana `--type`, `--address`, `--lat`/`--lng`
      directos, `--zoom`; al usar `--address`, imprimir el nombre geocodificado y las
      coordenadas resueltas en la salida (`design.md` D7 — transparencia también en CLI).
      Hecho en una sesión posterior, una vez el schema/endpoint ya estaban commiteados y
      desplegados (`maps.type`/`centerLat`/`centerLng`/`defaultZoom`,
      `POST /api/campaigns/[id]/maps/geocode`, `mapGeoFieldsSchema`): `--type` mapea a
      `type`, `--zoom` a `defaultZoom`. Con `--address`, el comando llama primero a
      `POST .../maps/geocode`, imprime `Geocoded "<query>" -> <displayName> (<lat>, <lng>)`
      ANTES de crear el mapa (D7: transparencia antes de guardar) y usa el primer candidato
      como `centerLat`/`centerLng`. Con `--lat`/`--lng` directos (deben darse juntos —
      rechazado localmente si falta uno, sin llamada de red) no se geocodifica en absoluto,
      igual que exige la prueba de integración 3.3 en el lado servidor. `map update` no se
      tocó — 6.1 solo pide `map create`.
- [x] 6.2 `map pin-add`/`map pins`: sustituir `--x`/`--y` y las claves `x`/`y` por
      `--lat`/`--lng` y `lat`/`lng`, alineado con el contrato real del endpoint (ver
      `proposal.md`, hallazgo: `pin-add` está roto hoy porque el servidor exige `lat`/`lng`
      obligatorios y el CLI enviaba `x`/`y`). No mantener las banderas viejas en paralelo.
      Hecho, y de paso dos hallazgos más del mismo tipo en el mismo fichero: `map upload`
      mandaba el fichero bajo el campo multipart `file` cuando el endpoint solo lee `image`
      (mismo convenio que `entity.js`/`location.js`/`organization.js`), y los comandos
      `create`/`update` ofrecían `--description`, que el endpoint nunca aceptó (columna
      inexistente en `maps`, silenciosamente descartada por zod) — eliminada por muerta.
      `pin-add` gana además una descripción de ayuda explicando que `--lat`/`--lng`
      significan cosas distintas según `maps.type` (D2).
- [x] 6.3 Prueba de integración del CLI: `aleph map pin-add --lat --lng` contra un servidor
      real de pruebas crea el pin (hoy fallaría con 422; esta prueba debe ponerse en rojo
      contra el código actual antes del fix, y en verde después — mutación comprobada).
      Hecho: `tests/integration/cli/map-pins.test.ts` (contra un Nuxt dev real) +
      `tests/unit/cli/map-pins.test.ts` (sin servidor, inspecciona el cuerpo/las opciones/el
      wiring de `map.js`). Confirmado en rojo revirtiendo el fix a mano (`git stash` del
      fichero) y en verde tras restaurarlo — las 4 pruebas de integración y las 8 unitarias
      pasan.
- [x] 6.4 `docs/claude-skill.md` (bump de versión en la cabecera) y
      `.claude/skills/aleph-cli/SKILL.md` (bump de versión en el frontmatter) — actualizar
      la referencia de `map create`/`map pin-add`/`map pins` A LA VEZ en los dos ficheros,
      igual que las nuevas banderas de tipo/dirección/coordenadas.
      Hecho: ambos ficheros documentan ahora `map create`'s `--type`/`--address`/
      `--lat`/`--lng`/`--zoom` con el mismo texto explicativo (defecto `image`, geocodificado
      server-side vía Nominatim con impresión del resultado antes de crear, o coordenadas
      directas sin geocodificar). Versión bump en los dos: `docs/claude-skill.md` 1.11 ->
      1.12, `.claude/skills/aleph-cli/SKILL.md` 3.21 -> 3.22.

## 7. Verificación

- [x] 7.1 `npx vitest run` (unitarias + integración) en verde, incluyendo las suites nuevas
      de 2.x/3.x/5.x/6.x.
      Unitarias: `npx vitest run tests/unit/` -- **143 ficheros / 1740 tests, todos en
      verde** (línea base antes de este cambio: 140/1708; +3 ficheros son
      `tests/unit/geocoding.test.ts`, `tests/unit/map-pin-geometry.test.ts` y el
      `tests/unit/cli/map-pins.test.ts` del otro agente). Actualización tras completar 6.1:
      **145 ficheros / 1771 tests, todos en verde** (+1 fichero / +5 tests, sesión aparte --
      `tests/unit/cli/map-create.test.ts`, cubriendo `--type`/`--zoom` en el cuerpo,
      `--address` geocodificando primero e imprimiendo el resultado antes de crear, y el
      rechazo local de `--lat` sin `--lng`). Integración de `maps`: bloqueado
      al principio por un fallo de ENTORNO no relacionado con este cambio -- ver la nota de
      abajo -- y una vez resuelto, **26/26** en `tests/integration/maps-osm.test.ts` +
      `maps.test.ts` + `maps-schema.test.ts`, **47/47** sumando además
      `maps-tiling`/`maps-visibility`/`map-layer-crud`/`map-region-crud`, y **18/18** en
      `campaign-export.test.ts` (incluye el test nuevo de 7.4).
      **Nota de entorno, no de código**: el `nuxt dev` de este checkout
      (`/mnt/c/code/wod20/aleph`) no arrancaba ninguna ruta -- ni siquiera
      `/api/auth/get-session`, sin relación con `maps` -- con
      `Module did not self-register: onnxruntime_binding.node`. Causa real: `npm install`
      con npm 11's `allow-scripts` bloquea el postinstall de `onnxruntime-node` (deja el
      binario de una plataforma/arquitectura equivocada en su sitio), y ese postinstall
      **no estaba en la lista de excepciones conocida** (a diferencia de `esbuild`/
      `better-sqlite3`, que sí resuelven bien sin él). `npm approve-scripts onnxruntime-node
better-sqlite3 sharp && npm install` lo corrige. Verificado en un worktree aislado
      (`git worktree add`) para no interferir con el trabajo en curso del otro agente ni con
      su propio servidor de pruebas.
- [x] 7.2 `npx playwright test` (E2E) en verde para los flujos de 3.4 y 5.7.
      `map-osm.spec.ts` **2/2**, `map-drag-drop-pins.spec.ts` **2/2** -- corridos de verdad
      con Chromium contra el `nuxt dev` del worktree aislado de la nota de 7.1. También
      corridas como no-regresión las suites de mapas ya existentes:
      `maps.spec.ts`/`map-pins.spec.ts` **5/5**, `map-tiles.spec.ts` **1/1** en aislado (falló
      una vez en un lote junto a otras suites por una colisión de sesión/cookie entre tests
      ya existente, no relacionada con este cambio -- reproducido limpio en solitario).
- [x] 7.3 `npx eslint .` en verde — recordar que el hook `pre-push` de husky ya lo ejecuta
      completo y tarda ~3 minutos en esta máquina; no saltarlo con `--no-verify`.
      `npx eslint .` sobre todo el repo (incluye el trabajo del otro agente en `cli/` y sus
      tests) -- **exit code 0, sin salida** (ESLint no imprime nada cuando no hay errores ni
      avisos), confirmado además con una segunda corrida explícita imprimiendo el código de
      salida.
- [x] 7.4 Confirmar que `server/services/campaign-export.ts` incluye las columnas nuevas de
      `maps` sin cambio de código (ya lo hace, `SELECT *` — `proposal.md`/`design.md` D7);
      añadir una prueba que lo demuestre explícitamente en vez de darlo por hecho.
      `tests/integration/maps-osm.test.ts` → "campaign export includes the new columns":
      exporta un mapa `osm` y confirma que `type`/`centerLat`/`centerLng`/`defaultZoom`
      llegan al `campaign.json` sin haber tocado `campaign-export.ts`.
- [x] 7.5 `openspec validate add-osm-maps --strict` en verde antes de considerar el cambio
      listo para implementar.
      `openspec validate add-osm-maps --strict` → "Change 'add-osm-maps' is valid" (dos
      avisos benignos de "Rules for 'tasks' must be an array of strings", no bloqueantes).
