# Design — mapas OpenStreetMap y arrastrar-y-soltar

## D1. Por qué `CRS.Simple` no puede quedarse como está

`openspec/specs/maps/spec.md` tiene hoy una obligación literal: _"The system SHALL render
all maps using Leaflet.js with CRS.Simple and L.tileLayer."_ Eso era cierto porque hasta
ahora solo existía un tipo de mapa. Un mapa OSM real necesita la proyección Web Mercator
(`EPSG:3857`, la que Leaflet usa por defecto cuando no se pasa `crs`), porque sus teselas
están generadas en esa proyección por el propio OpenStreetMap — pedirle a Leaflet que las
interprete como `CRS.Simple` las deformaría o las colocaría en el sitio equivocado.

Esto no es un matiz de implementación, es una contradicción real con un requisito SHALL ya
existente, así que este cambio **modifica** ese requisito (`## MODIFIED Requirements` en el
delta de `maps`) para acotarlo a `type: 'image'` en vez de dejarlo escrito como si aplicara
a todo mapa. La rama del código es pequeña — un `if (props.mapType === 'osm')` en
`MapViewer.client.vue` que evita el bloque de cálculo de `bounds`/`scale` y llama a
`map.setView([centerLat, centerLng], zoom)` en vez de `map.fitBounds(bounds)` — pero el
contrato que describe tiene que dejar de mentir sobre el caso nuevo.

## D2. La ambigüedad `lat`/`lng`, resuelta por el tipo del mapa padre

`mapPins.lat`/`mapPins.lng` son `real` en el esquema desde el principio — nunca fueron
enteros de píxel, así que no hace falta ninguna migración de tipo de columna. Lo que sí es
nuevo es que **el mismo par de columnas pasa a tener dos significados posibles**:

- Mapa `image` (como hoy, ahora dicho explícitamente): `lat`/`lng` son la coordenada en
  unidades del sistema `CRS.Simple` escalado — la misma transformación que
  `MapViewer.client.vue` ya aplica al pintar (`pinScale = 256 / max(imageWidth, imageHeight)`,
  con el signo invertido en `lat` porque Leaflet crece hacia arriba y la imagen hacia abajo).
  Ese pixel-scale nunca estuvo escrito en el spec de `maps`; este cambio lo documenta por
  primera vez, precisamente porque ahora hay un segundo significado con el que se podría
  confundir.
- Mapa `osm`: `lat`/`lng` son grados WGS84 reales (`-90..90`, `-180..180`), sin ninguna
  transformación — se pasan directos a `L.marker([lat, lng])`.

**La resolución no es una columna nueva en `mapPins`.** Un pin no necesita saber su propio
tipo: lo hereda de `mapPins.mapId → maps.id → maps.type`. El renderer YA tiene que cargar el
mapa padre para pintar nada, así que leer `maps.type` en ese mismo punto no añade una
consulta. Lo que sí es nuevo, y obligatorio, es que el servidor **valide el rango** al crear
un pin sobre un mapa `osm` (`-90<=lat<=90`, `-180<=lng<=180`) — sobre un mapa `image` esa
validación no tendría sentido (una imagen de 8000px de ancho excede esos límites con
normalidad) y no se aplica.

## D3. Geocodificación: por qué desde el servidor y no desde el navegador

"Seleccionar una dirección o ciudad" significa llamar al geocodificador de OpenStreetMap,
**Nominatim**. Su política de uso (`operations.osmfoundation.org` / `nominatim.org/release-
docs/latest/api/Search/`) exige, entre otras cosas:

- Un `User-Agent` o `Referer` HTTP que identifique la aplicación que llama.
- Máximo **1 petición por segundo**, de forma absoluta (no por usuario).
- Nada de autocompletar disparando una petición por cada tecla pulsada.
- Cachear resultados en vez de repetir la misma búsqueda.
- Nada de geocodificación masiva/en lote.

La decisión de dónde vive esta llamada **no es de estilo, es técnica**: un `fetch()` desde
el navegador **no puede fijar la cabecera `User-Agent`** — es una de las cabeceras "forbidden"
que el propio estándar `fetch` prohíbe que JavaScript establezca; el navegador siempre manda
la suya propia (`Mozilla/5.0 ...`), indistinguible de cualquier otro sitio. Nominatim pide
explícitamente una cabecera identificable, así que la llamada **tiene que** hacerse desde el
servidor, donde Aleph ya controla sus propias cabeceras salientes (mismo patrón que
`server/utils/ai.ts` habla con un proveedor externo vía `runtimeConfig`).

De ahí, tres consecuencias de diseño:

1. **Un endpoint propio**, p. ej. `POST /api/campaigns/[id]/maps/geocode`, gateado a
   `editor+` (igual que crear un mapa), que reenvía la consulta a
   `https://nominatim.openstreetmap.org/search` con un `User-Agent` fijo que identifica
   Aleph y, si `runtimeConfig` trae un contacto (email/URL), lo añade — Nominatim lo pide
   explícitamente para poder avisar antes de bloquear un uso problemático.
2. **Un limitador de 1 req/s de PROCESO, no por usuario ni por campaña** — un timestamp de
   la última llamada saliente compartido por todo el servidor Nitro, porque el límite de
   Nominatim es sobre la IP de origen, no sobre quién lo pidió. Se documenta como limitación
   conocida en el proposal: si Aleph pasara a correr en varias réplicas, este contador de
   proceso dejaría de ser suficiente y haría falta un limitador compartido (Redis o
   equivalente) — no existe hoy en Aleph y añadirlo solo para esto sería desproporcionado.
3. **Nunca dispararla en cada tecla.** La interfaz pide una búsqueda explícita (un botón, o
   como mínimo una espera de varios cientos de ms tras dejar de escribir Y un mínimo de
   caracteres) — no una consulta por combinación de teclas. El resultado se cachea en
   servidor por texto de consulta normalizado, con una expiración razonable (horas, no
   minutos: una dirección no cambia), para no repetir la misma búsqueda dos veces.

## D4. Teselas de OSM: la política de uso es un riesgo real, no un trámite

El servicio público de teselas (`tile.openstreetmap.org`) tiene su propia
[Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/), y es más estricta
de lo que parece a primera vista: exige atribución visible ("© OpenStreetMap contributors"),
un `User-Agent` válido, y explícitamente desaconseja/prohíbe sin permiso previo el "heavy
use" — la política nombra literalmente _"distributing an app that uses tiles from
openstreetmap.org"_ como el tipo de uso que requiere autorización, no autoservicio.

Aleph es exactamente eso: una aplicación autoalojada con usuarios reales. Este cambio **no
pretende resolver ese riesgo**, porque hacerlo bien (tesela propia, o un proveedor comercial
con SLA) es un trabajo aparte y no bloquea poder USAR el tipo de mapa en una campaña con
pocos usuarios. Lo que sí hace, para no cerrar la puerta a resolverlo después sin otro
cambio de spec:

- La URL de teselas es **configurable** (`runtimeConfig`, mismo patrón que `ai`/`backup`),
  con el servicio público de OSM como valor por defecto — así que apuntar a un proveedor de
  pago (MapTiler, Thunderforest, Stadia…) el día que el tráfico lo justifique es un cambio de
  variable de entorno, no de código.
- La atribución (`attribution` de Leaflet) es **obligatoria** en la capa OSM, nunca opcional
  — a diferencia de la capa de un mapa `image`, que no la necesita porque el DJ es el autor.
- El proposal lo deja escrito como riesgo NO cerrado (`Non-goals`), en vez de callarlo.

## D5. CSP y ejecución fuera de línea

Se ha revisado `nuxt.config.ts` y no hay ninguna directiva `Content-Security-Policy` ni
cabecera equivalente configurada en este proyecto hoy — no hay ningún bloqueo conocido para
cargar teselas de un host externo desde el navegador. Si en el futuro Aleph añade una CSP,
tendrá que incluir el host de teselas configurado en `img-src`/`connect-src`; se anota aquí
para que quien la añada no rompa este tipo de mapa sin saberlo, pero no es una tarea de este
cambio.

Sobre "que siga funcionando sin salida a internet": un mapa `image` ya funciona sin red hoy
(teselas servidas por el propio Aleph desde disco) y **sigue funcionando exactamente igual**
tras este cambio — nada de lo que se añade aquí lo toca. Un mapa `osm`, por construcción,
necesita red en el servidor (geocodificar) y en el navegador (cargar teselas); no hay forma
de que sea real y funcione sin conexión sin además cachear/paquetizar teselas, que es
justamente el Non-goal de D4. La página del mapa debe degradar con un mensaje de error claro
si la geocodificación o la carga de teselas falla por falta de red — no con una pantalla en
blanco ni con un `imageOverlay` improvisado.

## D6. Arrastrar-y-soltar: por qué para los dos tipos de mapa, y por qué no reutiliza una UI existente

No hay HOY ningún camino de creación de pin en la interfaz web (verificado: cero coincidencias de
`dragover|ondrop|dataTransfer|draggable` en `MapViewer.client.vue` y en las páginas de mapas;
`useMapApi.ts` no tiene `createPin`; la página de detalle de mapa solo lista pines). Así que
arrastrar-y-soltar no reemplaza ni compite con nada existente en la web — es la PRIMERA forma
de crear un pin desde la interfaz.

Con eso establecido, restringirlo a un solo tipo de mapa no tendría justificación técnica: el
esquema de pin es el mismo (`mapPins`), el endpoint es el mismo
(`POST /maps/[slug]/pins`), y la única diferencia entre los dos tipos es CÓMO se calcula el
`lat`/`lng` a partir del punto donde se soltó la entidad — una rama de cuatro líneas en el
handler de `drop`, no una función distinta. Partir la función en dos (arrastrar solo en OSM,
mantener el resto de mapas sin ninguna forma de crear un pin desde la web) habría dejado el
producto más inconsistente, no menos: un DJ con un mapa dibujado a mano seguiría sin poder
crear un pin desde la interfaz, mientras que uno con un mapa real sí podría.

**Restricción real de navegador, no de diseño**: el arrastre HTML5 (o cualquier librería de
arrastre en Vue) no cruza una navegación de página — el elemento arrastrable y la zona donde
se suelta tienen que estar en el mismo DOM al mismo tiempo. La lista de entidades de la
campaña vive en `app/pages/campaigns/[id]/entities/index.vue`, una ruta distinta de la del
mapa. Este cambio añade un panel de entidades (buscable/filtrable, reutilizando el mismo
patrón de filtro por tipo que ya existe en esa página) **embebido en la página del mapa**,
que es de donde se arrastra — no hace arrastrable la página de entidades ya existente, porque
eso no funcionaría.

El cálculo de coordenadas en el `drop`:

- Mapa `image`: Leaflet ya expone el punto soltado en sus propias unidades `CRS.Simple`
  (`map.mouseEventToLatLng(event)`); se invierte la misma transformación de escala que
  `renderPins` usa al pintar, para volver a las unidades de píxel de la imagen original antes
  de guardar — así los pines creados por arrastre quedan en el mismo sistema que los que ya
  existían (creados hoy solo por API/CLI).
- Mapa `osm`: `map.mouseEventToLatLng(event)` YA da grados WGS84 reales — se guardan tal
  cual, sin transformación.

En ambos casos el resultado se envía al mismo endpoint existente, con el mismo cuerpo
(`lat`, `lng`, `entityId`, `label`) que ya acepta hoy — no hay endpoint nuevo para pines,
solo el uso, por primera vez, del que ya estaba escrito.

## D7. Berlín es una ciudad real: qué se hace con eso

El riesgo señalado es concreto: geocodificar "la capilla de los PJ" en Berlín produce una
coordenada de una calle que existe de verdad, en una base de datos de una campaña que
también es real. Tres decisiones, ninguna de ellas un mecanismo de ocultación nuevo:

1. **No se cambia el modelo de visibilidad.** `maps.visibility` y `mapPins.visibility` ya
   soportan `public`/`members`/`dm_only`/`specific_users`/`private`
   (`server/utils/permissions.ts`), y `filterPinsByVisibility` ya filtra pines por rol en
   servidor (`server/services/maps.ts`) — un pin con una dirección sensible se protege
   marcándolo `dm_only`, exactamente como ya se protegería hoy un pin sobre un mapa dibujado
   con un secreto de trama. No hace falta un nivel nuevo para "esto es además una dirección
   real"; el mismo control ya cubre el caso.
2. **Transparencia antes de guardar.** El resultado de geocodificar SIEMPRE se muestra al
   usuario (nombre resuelto por Nominatim + coordenadas) antes de confirmar la creación o
   edición de un mapa `osm` — en la interfaz web como paso de confirmación, en el CLI como
   línea impresa en la salida de `map create`. Así el DJ ve exactamente qué dato real está a
   punto de quedar guardado, en vez de que una búsqueda ambigua ("la iglesia de la esquina")
   resuelva silenciosamente a una coordenada que no era la que tenía en mente.
3. **La exportación de campaña hereda esto sin cambio de código, y eso es parte del riesgo,
   no un descuido.** `server/services/campaign-export.ts` ya hace `SELECT * FROM maps` sin
   lista de columnas — las columnas nuevas (`type`, `centerLat`, `centerLng`, `defaultZoom`)
   saldrán en cualquier exportación futura automáticamente. Es el comportamiento correcto
   (una exportación completa debe incluir todo el mapa), pero significa que compartir un
   export de campaña que use mapas OSM comparte también esas coordenadas reales — el mismo
   nivel de confianza que ya existe hoy para cualquier dirección o nombre real que un DJ
   decida escribir en prosa dentro de una ficha.

## D8. `parentMapId` y mapas de tipo mixto

`maps.parentMapId` es hoy puramente una relación de árbol para breadcrumbs y clic-para-entrar
por un pin con `childMapId` — no depende en ningún punto del código de qué sistema de
coordenadas use el mapa. Un mapa mundo (`image`, dibujado a mano) con un pin que enlaza a un
mapa `osm` de una ciudad real dentro de esa misma campaña es coherente y no necesita ningún
tratamiento especial: cada mapa resuelve su propio `type` de forma independiente al
renderizarse, y la navegación entre ellos ya funciona por slug, no por coordenada compartida.
Este cambio no restringe qué tipos pueden anidarse entre sí, y lo dice explícitamente en el
delta de `maps` (ver `specs/maps/spec.md`, requisito "Nested Map Hierarchy" modificado) para
que quede como comportamiento contractual, no como una casualidad de la implementación.

## D9. `MapViewer.client.vue` sigue siendo solo-cliente, y eso no cambia con OSM

El visor ya es `.client.vue` y ya se monta detrás de `<ClientOnly>` en la página de detalle —
Leaflet necesita `window`/`document` y nunca se ha intentado renderizar en servidor. Añadir
un segundo modo de tesela no cambia esa restricción ni la empeora: sigue habiendo exactamente
un componente que no participa de SSR, igual que hoy. Lo único nuevo en términos de SSR es el
endpoint de geocodificación, que es una ruta de servidor normal (Nitro), sin relación con el
renderizado de la página.
