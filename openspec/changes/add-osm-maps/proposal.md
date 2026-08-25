# Añadir mapas reales (OpenStreetMap) y arrastrar-y-soltar para crear pines

## Why

Hoy en Aleph un "mapa" es siempre una imagen subida por el DJ, tileada y renderizada con
Leaflet + `CRS.Simple` (`app/components/MapViewer.client.vue`, comentario propio: _"Always
use tileLayer — all maps are tiled"_). Eso es correcto para un mapa de fantasía dibujado a
mano, pero no sirve para una campaña ambientada en un lugar real: no hay forma de decir "el
refugio de los PJ está en esta calle de Berlín" sobre un mapa que existe de verdad.

Leaflet, `@vue-leaflet/vue-leaflet` y `@geoman-io/leaflet-geoman-free` **ya están instalados**
(`package.json`) y `MapViewer.client.vue` ya usa `L.tileLayer` de forma genérica — el visor
acepta cualquier `tileUrl`, solo asume `CRS.Simple` y una caja de límites en píxeles derivada
de `imageWidth`/`imageHeight`. Y `mapPins.lat`/`mapPins.lng` (`server/db/schema/maps.ts`) ya
son `real`, no enteros de píxel: la columna ya puede alojar una coordenada geográfica de
verdad sin tocar su tipo. La pieza que falta no es una librería nueva ni una tabla nueva; es
un segundo modo de mapa, un centro/zoom iniciales elegibles por dirección, y un mecanismo de
creación de pines que hoy **no existe en ninguna superficie del producto** (verificado, ver
más abajo).

### Lo que se pidió, y lo que se ha medido antes de proponer nada

1. **Un tipo de mapa nuevo servido por teselas de OSM**, en vez de una imagen subida.
2. **Elegir el encuadre inicial por dirección o ciudad, más un zoom**, al crear ese mapa.
3. **Arrastrar cualquier entidad al mapa para crear un pin.**

Sobre (3), la medición cambia el tamaño del encargo: **hoy no existe ningún camino para crear
un pin desde la interfaz web.** `app/pages/campaigns/[id]/maps/[slug]/index.vue` solo LISTA
pines (`mapData.pins`); no hay formulario, no hay clic-para-crear, no hay botón. El propio
`openspec/specs/maps/spec.md` ya describe un escenario "Creating a pin" (clic en el mapa) que
**nunca se implementó** — es spec aspiracional, no comportamiento real. Y `useMapApi.ts` no
tiene ninguna función `createPin`/`addPin`. La única superficie donde crear un pin funciona
hoy es la API (`POST /api/campaigns/[id]/maps/[slug]/pins`, ya escrita y con rol `editor+`) y
el CLI — y el CLI está **roto**: `aleph map pin-add --x --y` (`cli/src/commands/map.js:148`,
documentado igual en `openspec/specs/aleph-cli/spec.md` línea 87) envía `{label, x, y,
entitySlug}`, pero el endpoint exige `{lat, lng, ...}` con `lat`/`lng` **obligatorios**
(`server/api/campaigns/[id]/maps/[slug]/pins/index.post.ts`, validados con Zod vía
`validateBody`, que responde 422 si faltan). Sin `lat`/`lng` en el cuerpo, todo `pin-add` de
hoy falla con "Validation failed". Este cambio toca exactamente ese contrato (añade una
segunda semántica de coordenada, geográfica) así que es el momento correcto de corregirlo,
no un cambio aparte.

Además, arrastrar-y-soltar tiene una restricción que no es de diseño sino de navegador: **el
arrastre HTML5 no cruza una navegación de página.** La lista de entidades vive en
`app/pages/campaigns/[id]/entities/index.vue`, la vista de mapa en otra ruta — para poder
arrastrar una entidad a un mapa, las dos tienen que convivir en el mismo DOM. Esto obliga a
un panel de entidades embebido en la propia página del mapa; no basta con "hacer arrastrable
la lista que ya existe".

## What Changes

- **Nuevo tipo de mapa `osm`** (junto al `image` de hoy), servido por teselas estándar de
  OpenStreetMap con la proyección Web Mercator (`EPSG:3857`) por defecto de Leaflet —
  `CRS.Simple` queda **acotado explícitamente a mapas `image`**, porque aplicarlo a teselas
  reales sería incorrecto (ver `design.md` D1).
- **Encuadre inicial por dirección/ciudad + zoom**, resuelto contra el geocodificador de OSM
  (Nominatim) **desde el servidor**, nunca desde el navegador — el porqué (una cabecera que
  el navegador no deja fijar) está en `design.md` D3, junto con la política de uso que hay
  que respetar (límite de 1 petición/segundo, nada de autocompletar por cada tecla, resultado
  cacheado).
- **Arrastrar-y-soltar para crear un pin**, para los DOS tipos de mapa por igual (mismo
  esquema de pin, mismo endpoint, sin motivo para partir la función en dos — ver
  `design.md` D6), con un panel de entidades embebido en la página del mapa como origen del
  arrastre.
- **La ambigüedad `lat`/`lng` se resuelve por el tipo del mapa padre**, no por convención
  implícita: en un mapa `image` siguen siendo la coordenada en unidades CRS.Simple ya
  derivada del píxel (como hoy, documentado explícitamente por primera vez); en un mapa `osm`
  son grados WGS84 reales. Ver `design.md` D2.
- **El CLI se corrige, no se ignora**: `aleph map create` gana `--type`, `--address`,
  `--lat`/`--lng` directos y `--zoom`; `aleph map pin-add`/`aleph map pins` dejan de hablar de
  `x`/`y` y pasan a `--lat`/`--lng`, alineados con el contrato real del endpoint.
- **Confirmación de lo que se guarda**, antes de guardar: tanto en la interfaz como en el CLI,
  el resultado de la geocodificación (nombre resuelto + coordenadas) se muestra ANTES o
  INMEDIATAMENTE DESPUÉS de crear el mapa — ver `design.md` D7, motivado por que esta
  campaña es real y Berlín es una ciudad real.

## Capabilities

- `maps` — tipo de mapa OSM, geocodificación de encuadre inicial, arrastrar-y-soltar de
  pines, corrección de la semántica `lat`/`lng` documentada por tipo de mapa.
- `aleph-cli` — `map create`/`map pin-add`/`map pins` actualizados al nuevo contrato.

## Impact

- **Sí afecta a `aleph-cli`** (regla del proyecto: toda entidad de dato/endpoint nuevo debe
  evaluarse para el CLI). `cli/src/commands/map.js`, `docs/claude-skill.md` y
  `.claude/skills/aleph-cli/SKILL.md` necesitan actualizarse a la vez — ver `tasks.md`.
- **Esquema de datos** (`server/db/schema/maps.ts`): `maps` gana `type` (`image` por defecto,
  compatible con todas las filas existentes), `centerLat`, `centerLng`, `defaultZoom`;
  ninguna columna existente cambia de tipo. `mapPins` no cambia de forma — solo se documenta
  lo que `lat`/`lng` significan según el tipo del mapa al que pertenece el pin.
- **`app/components/MapViewer.client.vue`**: rama nueva para `type === 'osm'` (CRS por
  defecto, `setView(centro, zoom)` en vez de `fitBounds` sobre límites en píxeles, sin
  transformación de escala en los pines); handlers de `dragover`/`drop` nuevos, para los dos
  tipos.
- **`app/components/forms/MapForm.vue`**: selector de tipo, campos de dirección/zoom cuando
  el tipo es `osm`.
- **Nueva página o panel**: un picker de entidades embebido en
  `app/pages/campaigns/[id]/maps/[slug]/index.vue`, origen del arrastre.
- **Nuevo endpoint de geocodificación server-side**, con límite de tasa propio y sin caché
  compartida entre procesos (ver `design.md` D3 y D8: Aleph corre como un único proceso Nitro
  en `/var/www/aleph`, así que un limitador en memoria de proceso es suficiente hoy pero no
  escalaría a varias réplicas).
- **`useMapApi.ts`**: gana `createMapPin` (no existía) y `geocodeAddress`.
- **No afecta** a `campaign-export`: `server/services/campaign-export.ts` ya vuelca
  `SELECT * FROM maps`/`mapPins` sin lista de columnas explícita, así que las columnas nuevas
  salen en la exportación sin tocar ese servicio — lo cual es en sí mismo parte del riesgo de
  privacidad tratado en `design.md` D7, no un trabajo pendiente.

## Non-goals

- **No servidor de teselas propio ni caché de teselas.** Se usa el servicio público de OSM
  por defecto, con la URL configurable por variable de entorno para poder apuntar a un
  proveedor de pago sin otro cambio — pero este cambio NO implementa ese proxy/caché. Es un
  riesgo real de política de uso, tratado como tal en `design.md` D4, no resuelto aquí.
- **No autohospedar Nominatim.** Se llama al servicio público con las limitaciones de su
  política de uso. Un Nominatim propio es una mejora futura, no parte de este cambio.
- **No hay modo sin conexión para mapas OSM.** Un mapa `image` sigue funcionando
  completamente offline, como hoy; un mapa `osm` necesita red tanto en el servidor
  (geocodificación) como en el navegador (teselas), y este cambio no incluye ningún paquete
  de teselas descargable ni caché local.
- **No se implementa el escenario "Creating a pin" (clic en el mapa) ya descrito en el spec
  de `maps`.** Sigue sin construirse; arrastrar-y-soltar es un camino distinto y adicional,
  no una implementación de ese escenario pendiente.
- **No se tocan los pesos de tileo/aspecto de los mapas `image`** (`design.md` de
  `map-viewer-overhaul`, ya archivado) ni su pipeline de subida — quedan exactamente como
  están, solo pasan a estar acotados de forma explícita a `type: 'image'`.
- **No se añade ningún nivel de visibilidad nuevo ni redacción automática de direcciones
  reales.** Se reutiliza `visibility` tal cual existe hoy en `maps` y en `mapPins`
  (`public`/`members`/`dm_only`/`specific_users`/`private`, `server/utils/permissions.ts`).
  El riesgo de poner una dirección real de la campaña sobre un mapa real se trata mostrando
  al DJ lo que se va a guardar antes de guardarlo (`design.md` D7), no con un mecanismo de
  ocultación nuevo.
