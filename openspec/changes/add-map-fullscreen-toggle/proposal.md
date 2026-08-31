## Why

El mapa se ve en el hueco que le deja la página: 600 px de alto, y a lo ancho lo que sobra
después de la barra lateral y del panel de entidades. Para un mapa de ciudad eso es poco. El
mapa vivo de la campaña de Berlín es de tipo `osm` con **28 pines** repartidos por la ciudad;
a la escala que hace falta para que quepan todos, los marcadores se solapan y la mitad del
trabajo es arrastrar el mapa a ciegas.

No hay ninguna forma de agrandarlo. El visor recibe su altura como una prop fija
(`:height="600"` en `app/pages/campaigns/[id]/maps/[slug]/index.vue`) y no existe en todo el
proyecto ningún patrón de pantalla completa que reutilizar: `grep -ri fullscreen app/` no
devuelve nada.

La petición, literal, es «un botón o control en el mapa para que pudiera crecer a ventana
completa».

## What Changes

- **Un control en el propio mapa** que lo hace ocupar la ventana entera, y que vuelve a
  dejarlo como estaba. Visible en los DOS estados, y ofrecido ya en el estado reducido, que es
  el único con el que se abre un mapa.
- **Se sale también con `Escape`**, no solo con el botón.
- **La vista sobrevive a las dos transiciones**: el centro y el zoom que tenía al expandir son
  los que tiene expandido, y los que recupera al volver. Un control que además te mueve de
  sitio estorba más de lo que ayuda.
- **Leaflet se entera del cambio de tamaño.** Es el requisito de fondo y el único cuyo
  incumplimiento es MUDO: Leaflet guarda el tamaño de su contenedor en caché y traduce
  coordenadas a píxeles con ese valor, así que sin avisarle el mapa queda descuadrado --
  medido en esta rama con el aviso desactivado: **312 px** de desfase entre un pin y el punto
  donde debería estar.
- Funciona igual en los dos tipos de mapa que existen, `image` (CRS.Simple, coordenadas en
  píxeles) y `osm` (WGS84).

## Non-Goals

- **No se usa la API de pantalla completa del navegador** (`element.requestFullscreen()`). Ver
  D1: saca el mapa de la aplicación y puede fallar sin dejar rastro.
- No se recuerda el estado entre visitas. Un mapa se abre siempre reducido, igual que el
  candado de los pines se abre siempre cerrado y por la misma razón.
- No cambia nada de la disposición de la página del mapa fuera del visor, ni el panel de
  entidades, ni la lista de pines.
- No se añade un modo de presentación (ocultar controles, pantalla limpia). Es un cambio de
  tamaño, no una vista nueva.

## Impact

- `app/utils/mapViewport.ts` (nuevo), `app/components/MapViewer.client.vue`.
- `i18n/locales/en.json`, `i18n/locales/es.json` (tres claves).
- `tests/unit/map-viewport.test.ts`, `tests/unit/components/MapViewerViewport.test.ts`,
  `tests/e2e/map-fullscreen.spec.ts` (nuevos).
- **Sin impacto en aleph-cli**: no se toca ningún endpoint, ni el modelo de datos, ni la
  autenticación. Es estado de componente en el navegador y no se persiste, así que no hay nada
  que un comando pudiera leer o escribir.
