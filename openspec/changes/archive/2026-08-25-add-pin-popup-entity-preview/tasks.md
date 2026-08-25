## 1. El aplanador de texto (módulo puro, sin dependencias)

- [x] 1.1 `server/services/text-excerpt.ts`: `flattenToPlainText` (código, imágenes, enlaces,
      etiquetas HTML literales, marcadores de cabecera/cita/lista, énfasis) + `buildExcerpt`
      (aplana y trunca en un límite de palabra con elipsis). NO escapa HTML — eso sigue siendo
      trabajo exclusivo de `escapeHtml` en `mapPinMarker.ts` (design D5).
- [x] 1.2 Pruebas unitarias puras: cada elemento markdown por separado, un texto más corto que el
      límite queda intacto, un texto más largo trunca en un espacio (no a mitad de palabra), texto
      vacío devuelve cadena vacía, y una etiqueta HTML literal (el caso `autoLinkContent` evita que
      lleguemos a ver, pero que una columna de texto libre sí podría contener) se elimina.

## 2. El servicio: excerpt por tipo, en el orden correcto

- [x] 2.1 `selectJoinedPins` (`server/services/maps.ts`): añadir `entities.filePath` y
      `organizations.description` a la proyección (ninguno de los dos añade un JOIN nuevo — ambas
      tablas ya están unidas). Extender `JoinedPinRow`.
- [x] 2.2 `withEntityVisibility`: cuando la entidad NO es visible, anular también estos dos campos
      nuevos junto a `entityType`/`entitySlug`/`entityImageUrl` — nunca dejarlos pasar sin querer.
- [x] 2.3 Función interna que resuelve el excerpt por `entityType`: - `location`/`character`: `safeReadEntityFile(filePath)` (tolerante a fichero ausente,
      design D2) → `stripSecretBlocks(content, role)` → `buildExcerpt(...)`. UN solo camino para
      los dos tipos, no dos copias (design D3) — nunca pasar por `autoLinkContent`. - `organization`: `buildExcerpt(organizations.description)` directo, sin `stripSecretBlocks`
      (design D4) — la columna no tiene ese formato y no se le inventa uno. - cualquier otro tipo, o entidad no visible: `null`.
- [x] 2.4 Deduplicar lecturas de fichero dentro de una misma petición: un `Map<filePath,
Promise<string|null>>` sembrado ANTES del `await`, no después (design, Cost) — dos pines a la
      misma entidad comparten una sola lectura.
- [x] 2.5 `getPinsWithEntity`/`getPinWithEntity` pasan a ser `async`. Actualizar sus tres puntos de
      llamada (`maps/[slug]/index.get.ts`, `maps/[slug]/pins/index.get.ts`,
      `maps/[slug]/pins/index.post.ts`, `maps/[slug]/pins/[pinId]/index.patch.ts`) para `await`
      — los cuatro ya están dentro de un `defineEventHandler(async ...)`.
- [x] 2.6 `PinWithEntity` gana `entityExcerpt: string | null`.

## 3. Pruebas del servicio (con ficheros reales, no simulados)

- [x] 3.1 Fixture con el PRIMER párrafo secreto (`:::secret{.dm}` seguido de texto público). Prueba
      que **falla antes del arreglo**: con un rol `player`, `entityExcerpt` no contiene el texto
      secreto y sí contiene el texto público que sigue. Esta es la prueba de orden de operaciones
      que pide el encargo — escribirla primero, confirmar que falla contra una implementación
      naïve (excerpt antes de `stripSecretBlocks`), luego arreglar.
  - [x] 3.1a Mismo fixture, rol `dm`/`co_dm`: el excerpt puede incluir el contenido antes secreto.
- [x] 3.2 Mismo par de pruebas (secreto primero / rol DM) para un `character` — el mismo camino de
      código que 3.1, no una copia con lógica distinta.
- [x] 3.3 `organization`: `entityExcerpt` refleja `organizations.description` aplanado y truncado,
      SIN pasar por `stripSecretBlocks` (una descripción que casualmente contenga la sintaxis
      `:::secret{...}` como texto literal debe aparecer tal cual, no filtrada).
  - [x] 3.3a Una organización cuya visibilidad excluye al espectador: `entityExcerpt: null`, igual
        que ya ocurre con `entityImageUrl`/`entityType`.
- [x] 3.4 Fichero ausente en disco para una entidad `location`/`character` referenciada por un pin:
      la petición de pines entera sigue funcionando; solo ese pin tiene `entityExcerpt: null`; los
      demás pines conservan los suyos.
- [x] 3.5 Dos pines a la MISMA entidad: ambos devuelven el excerpt correcto (prueba de corrección
      del camino deduplicado, no de conteo de lecturas).
- [x] 3.6 `getPinWithEntity` (usado por POST/PATCH) devuelve la misma forma que `getPinsWithEntity`
      para un pin — mismo contrato que design D1 de `improve-map-pin-markers-and-deletion` ya exige
      para el resto de los campos.
- [x] 3.7 Actualizar `tests/unit/server/maps-service.test.ts`: las llamadas existentes a
      `getPinsWithEntity`/`getPinWithEntity` pasan a `await` (ahora son async).

## 4. El popup

- [x] 4.1 `PopupPin` (`app/utils/mapPinMarker.ts`) gana `entityImageUrl`/`entityExcerpt` opcionales.
      `buildPinPopupHtml` los interpola escapados con `escapeHtml`, igual que el resto de campos.
- [x] 4.2 Orden dentro del popup: nombre → imagen (si hay) → párrafo de excerpt (si hay) → "Ver
      entidad" → pista de exploración → botón de borrar. Nada de lo existente cambia de orden entre
      sí.
- [x] 4.3 El contenedor gana un `max-width` en su estilo en línea (adicional al `min-width` que ya
      tiene). `MapViewer.client.vue`'s `marker.bindPopup(...)` gana la opción `maxWidth` de Leaflet
      a juego — es la que de verdad gobierna el ancho on-screen (design D6).
- [x] 4.4 `app/types/api.ts`: `MapPin` gana `entityExcerpt: string | null`, documentado igual que
      `entityImageUrl`/`entityType`/`entitySlug`.
- [x] 4.5 Pruebas unitarias puras (`tests/unit/mapPinMarker.test.ts`): imagen presente/ausente,
      excerpt presente/ausente, escape de caracteres HTML-significativos en ambos campos nuevos, y
      que un pin SIN estos campos (el caso de hoy) produce el mismo HTML que antes de este cambio
      salvo por el `max-width` del contenedor.

## 5. Verificación

- [x] 5.1 `npm run test:unit` en verde. Reportar el recuento antes/después.
- [x] 5.2 `npx prettier --check .` y `npx eslint . --ext .ts,.vue,.tsx` limpios en todo el
      repositorio — leer el código de salida del comando, nunca a través de una tubería.
- [x] 5.3 NO ejecutar `npm run test:integration` en esta máquina (el servidor de desarrollo no
      abre el puerto 3333 aquí — fallo de entorno conocido, no de la suite).
- [x] 5.4 `openspec validate add-pin-popup-entity-preview --strict` en verde.
- [x] 5.5 NO hacer commit ni push. Un push a aleph despliega a una wiki de campaña en producción.

## Cierre

CERRADO y desplegado (run 32892803167: test + integration-test + deploy en verde). El popup de un
pin muestra ya la imagen de la entidad y un extracto de su texto.

Lo que de verdad valida este cambio es la prueba del orden, y está demostrada en rojo antes de
arreglarla: se extrae DESPUÉS de filtrar los bloques secretos, nunca antes. El motivo es más
afilado que «el primer párrafo podría ser secreto» -- truncar primero puede cortar DENTRO del
bloque, antes de su `:::` de cierre, y entonces la expresión regular ya no lo reconoce: el truncado
destruye la marca que permite verlo. La prueba está dimensionada para eso (cuerpo secreto de ~300
caracteres cortado a 200) y se verificó parcheando el orden al revés, viendo el secreto aparecer en
la salida del fallo.

Cobertura por tipo: lugar y personaje leen su markdown y pasan por `stripSecretBlocks`; una
organización usa su columna `description`, sin filtro de secretos porque ahí no existe -- con una
prueba de frontera de que un `:::secret{...}` escrito literalmente en esa columna NO se filtra.

NO verificado en navegador: los popups de personaje y organización solo contra fixtures, porque los
pines del mapa son todos de lugares. Queda anotado en vez de darse por comprobado.
