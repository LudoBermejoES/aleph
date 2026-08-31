## 1. El estado, sin Vue y sin Leaflet

- [x] 1.1 `app/utils/mapViewport.ts` -- `createMapViewport({ onChange })` con `expanded`,
      `mode`, `toggle()`, `expand()`, `collapse()` y `handleKey()`. Mismo criterio que
      `mapPinGeometry.ts`/`pinFocusQueue.ts`: la decisión vive fuera del componente para poder
      probarla sin montar Leaflet.
- [x] 1.2 El cambio de estado y el aviso son UNA operación (`set()` escribe y notifica), no dos
      cosas que haya que acordarse de hacer juntas. Es lo que hace imposible expandir sin
      avisar (design D2).
- [x] 1.3 El aviso va DESPUÉS de escribir el estado, para que quien lo reciba mida ya el nuevo.
- [x] 1.4 Una no-transición NO avisa: `collapse()` estando reducido no hace nada. Un
      `invalidateSize()` gratuito hace un `panBy` y dispara el `zoomend` que re-escala pines.
- [x] 1.5 `handleKey` devuelve si ha CONSUMIDO la tecla. Estando reducido devuelve `false`, para
      no robarle `Escape` a un diálogo abierto encima (design D6).
- [x] 1.6 `mapViewportWrapperClass` devuelve la cadena de clases COMPLETA por estado, no un
      objeto condicional: `relative` y `fixed` son la misma propiedad CSS y el ganador lo
      decide el orden de la hoja de Tailwind, no el del atributo (design D3).
- [x] 1.7 `mapViewportWrapperStyle(true, h)` devuelve `{}`: expandido la altura la da `inset-0`,
      y dejar los 600px convertiría la ventana completa en una banda de 600px.

## 2. El control en el visor

- [x] 2.1 `MapViewer.client.vue` -- botón con `data-testid="map-viewport-toggle"`, rótulo que
      nombra la acción disponible, `aria-pressed`, `title`, y `focus-visible:ring`.
- [x] 2.2 Arriba a la derecha, no abajo: la esquina inferior derecha es donde Leaflet pinta la
      atribución de los mosaicos, obligatoria en un mapa `osm`.
- [x] 2.3 El conmutador y el panel de capas pasan al MISMO contenedor de flujo. Los dos estaban
      posicionados en `absolute top-3 right-3` y se taparían (design, Riesgos).
- [x] 2.4 Aviso de «pulsa Esc» visible solo con el mapa expandido.
- [x] 2.5 `applyViewportResize()`: capturar centro/zoom, `await nextTick()`,
      `invalidateSize()`, reponer la vista. En ese orden (design D4).
- [x] 2.6 Bloquear el desplazamiento del `body` mientras el mapa ocupa la ventana, y soltarlo al
      reducir Y al desmontarse -- solo si lo puso este componente.
- [x] 2.7 Escuchador de `keydown` en `document`, puesto en `onMounted` y quitado en
      `onUnmounted`.
- [x] 2.8 De paso: `v-if="layers.length"` y `v-if="groups.length"` pasan a `?.length`. Las dos
      props están declaradas OPCIONALES y el template las desreferenciaba sin proteger, así que
      montar el visor sin ellas reventaba el render entero. Salió al escribir la prueba de
      componente, no se buscaba.

## 3. i18n -- los DOS ficheros

- [x] 3.1 `maps.expand`, `maps.collapse`, `maps.collapseHint` en `i18n/locales/en.json` **y** en
      `i18n/locales/es.json`. Es la regla de la casa y el `CLAUDE.md` la nombra: el único
      directorio de locales que se carga es `i18n/locales/`.
- [x] 3.2 Añadirlas a `tests/unit/i18n/locale-keys.test.ts`, que es lo que impide que una se
      quede solo en un idioma.

## 4. Pruebas

- [x] 4.1 `tests/unit/map-viewport.test.ts` -- 20 pruebas sobre el módulo: transiciones, avisos,
      no-transiciones, orden del aviso, `Escape` según estado, clases y estilo por estado.
- [x] 4.2 `tests/unit/components/MapViewerViewport.test.ts` -- el visor MONTADO, con un doble de
      Leaflet, y **por partida doble: una vez por tipo de mapa** (`image` y `osm`). 14 pruebas
      x 2 = 28. Es lo que guarda el CABLEADO: que cada transición termine en un
      `invalidateSize()`.
- [x] 4.3 `tests/e2e/map-fullscreen.spec.ts` -- la prueba que de verdad importa, con Leaflet real
      y píxeles reales: un pin colocado en el centro que el mapa declara debe seguir pintándose
      en el centro del contenedor después de expandir (design D5). Un test por tipo de mapa.
- [x] 4.4 Mutación-testear cada guarda y exigir que se ponga roja. Nueve mutaciones en la capa
      unitaria/componente, todas muertas: sin `invalidateSize()` (8 fallos), sin reponer la
      vista (2), control visible solo expandido (22), sin escuchador de `Escape` (2), expandido
      conserva la altura (3), avisar antes de cambiar el estado (1), avisar en las
      no-transiciones (1), `Escape` consumido también reducido (2), expandido conserva
      `relative` (3).
- [x] 4.5 Mutación-testear el e2e, que es el único que ve el defecto mudo: sin
      `invalidateSize()`, **312 px** de desfase contra una tolerancia de 3, en los DOS tipos de
      mapa. **Y una trampa de método que casi lo dio por bueno**: en este equipo el servidor de
      desarrollo NO recoge los cambios de fichero (el proyecto está en `/mnt/c`, y el vigilante
      de Vite no ve los eventos), así que las tres primeras mutaciones «sobrevivieron»
      sirviendo el código ORIGINAL. Una mutación al e2e exige reiniciar el servidor, y se
      comprueba antes con una mutación VISIBLE (renombrar el `data-testid`) que el navegador
      recibe de verdad el código nuevo.
- [x] 4.6 Quitar la reposición de la vista NO pone rojo el e2e -- `invalidateSize()` ya conserva
      el centro. Se deja, se documenta por qué, y se dice que la guarda es la prueba de
      componente y no el e2e (design D4).

## 5. Verificación

- [x] 5.1 `npx vitest run tests/unit/` completo, antes y después.
- [x] 5.2 `npx playwright test tests/e2e/map-fullscreen.spec.ts` verde en los dos tipos de mapa.
- [x] 5.3 `npx eslint` y `npx prettier --check` sobre todo lo tocado.
